// electron/main/claude-hook-manager.ts
// Manages Claude Code hook installation/uninstallation and health monitoring
// Reference: clawd-on-desk project's hooks format (per-event hooks with event name as argv)

import * as fs from "fs"
import * as path from "path"
import * as os from "os"
import log from "./logger"

const CLAUDE_SETTINGS_PATH = path.join(os.homedir(), ".claude", "settings.json")
const HOOK_MARKER_NAME = "erzhi-recording"
const WATCH_INTERVAL_MS = 5 * 60 * 1000
const MAX_REPAIR_RETRIES = 3

// Claude Code CLI 支持的事件列表
const HOOK_EVENTS = [
  "SessionStart",
  "SessionEnd",
  "UserPromptSubmit",
  "PreToolUse",
  "PostToolUse",
  "PostToolUseFailure",
  "Stop",
  "StopFailure",
  "ApiError",
  "Notification",
  "PermissionRequest",
]

// 新格式：每个事件一个 hook 条目（clawd-on-desk 风格）
interface ClaudeHookCommand {
  type: "command"
  command: string
  async?: boolean
  timeout?: number
  shell?: string
}

interface ClaudeHookHttp {
  type: "http"
  url: string
  timeout?: number
}

type ClaudeHook = ClaudeHookCommand | ClaudeHookHttp

interface ClaudeHookGroup {
  matcher?: string
  hooks: ClaudeHook[]
}

type ClaudeHooksConfig = Record<string, ClaudeHookGroup[]>

// 旧格式（我们之前用的，不工作）
interface OldClaudeHookEntry {
  name: string
  script: string
  events: string[]
}

export interface HookManagerStatus {
  installed: boolean
  scriptExists: boolean
  claudeExists: boolean
  healthy: boolean
  repairFailures: number
  manualFixRequired: boolean
}

export function createClaudeHookManager(agentPort: () => number | null) {
  let watchTimer: ReturnType<typeof setInterval> | null = null
  let repairFailures = 0
  let manualFixRequired = false

  function getHookScriptPath(): string {
    try {
      const electron = require("electron")
      if (electron?.app?.isPackaged) {
        return path.join(process.resourcesPath!, "clawd-hook.js")
      }
    } catch {}
    return path.join(__dirname, "clawd-hook.js")
  }

  function getNodePath(): string {
    // 返回当前运行的 node 可执行文件路径
    // process.execPath 在 Electron 中返回 electron.exe，所以需要找真正的 node
    try {
      const { execSync } = require("child_process")
      const nodePath = execSync("where node", { encoding: "utf8" }).trim().split("\n")[0]
      if (nodePath) return nodePath
    } catch {}
    return process.execPath.replace("electron.exe", "node.exe")
  }

  function readClaudeSettings(): any | null {
    try {
      const raw = fs.readFileSync(CLAUDE_SETTINGS_PATH, "utf8")
      return JSON.parse(raw)
    } catch { return null }
  }

  function writeClaudeSettings(settings: any): boolean {
    try {
      fs.writeFileSync(CLAUDE_SETTINGS_PATH, JSON.stringify(settings, null, 2), "utf8")
      return true
    } catch (err: any) {
      log.error("Failed to write Claude settings:", err.message)
      return false
    }
  }

  // 构建单个事件的 hook 命令
  function buildHookCommand(eventName: string, scriptPath: string): { command: string; shell?: string } {
    const node = getNodePath()
    // Windows 需要 shell: "powershell"，命令需要用 & 前缀
    // 参考 clawd-on-desk 项目
    return {
      command: `& "${node}" "${scriptPath}" ${eventName}`,
      shell: "powershell",
    }
  }

  // 检查是否是旧格式的 hook
  function isOldFormat(settings: any): boolean {
    const hooks = settings.hooks
    if (!hooks || !Array.isArray(hooks)) return false
    return hooks.some((h: any) => h.name && h.events && Array.isArray(h.events))
  }

  // 移除旧格式的 hooks
  function removeOldHooks(settings: any): boolean {
    if (!isOldFormat(settings)) return false
    settings.hooks = (settings.hooks || []).filter((h: any) => !h.name?.startsWith("erzhi-recording"))
    return true
  }

  function install(): { added: boolean; updated: boolean } {
    const settings = readClaudeSettings()
    if (!settings) return { added: false, updated: false }

    const scriptPath = getHookScriptPath()
    let hooks: ClaudeHooksConfig = settings.hooks || {}

    // 移除旧格式
    removeOldHooks(settings)

    // 检查是否已有正确的 hooks
    // - PermissionRequest: HTTP hook 指向 /permission
    // - 其他事件: PowerShell command hook
    const port = agentPort() || 60000
    const hasCorrectHooks = HOOK_EVENTS.every(event => {
      const eventHooks = hooks[event] || []
      return eventHooks.some((group: ClaudeHookGroup) =>
        group.hooks?.some((h: any) => {
          if (event === "PermissionRequest") {
            return h.type === "http" && h.url?.includes("/permission")
          }
          return h.type === "command" && h.command?.startsWith("&") && h.command?.includes("clawd-hook.js") && h.shell === "powershell"
        })
      )
    })

    if (hasCorrectHooks) {
      return { added: false, updated: false }
    }

    // 安装新格式的 hooks
    for (const event of HOOK_EVENTS) {
      let hook: ClaudeHook
      if (event === "PermissionRequest") {
        // PermissionRequest 用 HTTP hook，Claude Code 会等待响应
        const port = agentPort() || 60000
        hook = {
          type: "http",
          url: `http://127.0.0.1:${port}/permission`,
          timeout: 600,
        }
      } else {
        const { command, shell } = buildHookCommand(event, scriptPath)
        hook = {
          type: "command",
          command,
          shell,
          async: true,
          timeout: 5,
        }
      }
      hooks[event] = [{ matcher: "", hooks: [hook] }]
    }

    settings.hooks = hooks
    writeClaudeSettings(settings)
    return { added: true, updated: false }
  }

  function uninstall(): { removed: boolean } {
    const settings = readClaudeSettings()
    if (!settings) return { removed: false }

    let removed = false

    // 移除旧格式
    if (isOldFormat(settings)) {
      const before = settings.hooks.length
      settings.hooks = settings.hooks.filter((h: any) => !h.name?.startsWith("erzhi-recording"))
      if (settings.hooks.length < before) removed = true
    }

    // 移除新格式
    const hooks: ClaudeHooksConfig = settings.hooks || {}
    for (const event of HOOK_EVENTS) {
      if (hooks[event]) {
        const before = hooks[event].length
        hooks[event] = hooks[event].filter((group: ClaudeHookGroup) =>
          !group.hooks?.some((h: ClaudeHookCommand) => h.command?.includes("clawd-hook.js"))
        )
        if (hooks[event].length === 0) delete hooks[event]
        else if (hooks[event].length < before) removed = true
      }
    }

    settings.hooks = hooks
    writeClaudeSettings(settings)
    return { removed }
  }

  function isInstalled(): boolean {
    const settings = readClaudeSettings()
    if (!settings) return false

    // 检查新格式
    const hooks: ClaudeHooksConfig = settings.hooks || {}
    const sampleEvent = HOOK_EVENTS[0]
    const eventHooks = hooks[sampleEvent] || []
    return eventHooks.some((group: ClaudeHookGroup) =>
      group.hooks?.some((h: ClaudeHookCommand) => h.command?.includes("clawd-hook.js"))
    )
  }

  function checkHealth(): { healthy: boolean; issues: string[] } {
    const issues: string[] = []
    const settings = readClaudeSettings()
    if (!settings) {
      issues.push("Claude settings file not found")
      return { healthy: false, issues }
    }
    if (!isInstalled()) {
      issues.push("Hook entry missing")
      return { healthy: false, issues }
    }
    const scriptPath = getHookScriptPath()
    if (!fs.existsSync(scriptPath)) {
      issues.push("Hook script file missing")
      return { healthy: false, issues }
    }
    return { healthy: issues.length === 0, issues }
  }

  function repair(): boolean {
    if (manualFixRequired) return false
    if (repairFailures >= MAX_REPAIR_RETRIES) {
      manualFixRequired = true
      return false
    }

    const result = install()
    if (result.added || result.updated) {
      const health = checkHealth()
      if (health.healthy) {
        repairFailures = 0
        return true
      }
    }

    repairFailures++
    return false
  }

  function performHealthCheck() {
    const health = checkHealth()
    if (!health.healthy) {
      log.warn("Claude hook health check failed:", health.issues.join(", "))
      repair()
    } else {
      if (repairFailures > 0) repairFailures = 0
      if (manualFixRequired) manualFixRequired = false
    }
  }

  function startWatcher() {
    if (watchTimer) return
    performHealthCheck()
    watchTimer = setInterval(performHealthCheck, WATCH_INTERVAL_MS)
    log.info("Claude hook watcher started")
  }

  function stopWatcher() {
    if (watchTimer) { clearInterval(watchTimer); watchTimer = null }
  }

  function getStatus(): HookManagerStatus {
    const health = checkHealth()
    return {
      installed: isInstalled(),
      scriptExists: fs.existsSync(getHookScriptPath()),
      claudeExists: readClaudeSettings() !== null,
      healthy: health.healthy,
      repairFailures,
      manualFixRequired,
    }
  }

  return {
    install, uninstall, isInstalled,
    startWatcher, stopWatcher, getStatus, checkHealth, repair,
  }
}
