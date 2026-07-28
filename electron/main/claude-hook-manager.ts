// electron/main/claude-hook-manager.ts
// Manages Claude Code hook installation/uninstallation and health monitoring

import * as fs from "fs"
import * as path from "path"
import * as os from "os"
import log from "./logger"

const CLAUDE_SETTINGS_PATH = path.join(os.homedir(), ".claude", "settings.json")
const HOOK_MARKER_NAME = "erzhi-recording-state"
const AUTO_START_MARKER = "erzhi-recording-auto-start"
const WATCH_INTERVAL_MS = 5 * 60 * 1000
const MAX_REPAIR_RETRIES = 3

interface ClaudeHookEntry {
  name: string
  script: string
  events: string[]
}

export interface HookManagerStatus {
  installed: boolean
  autoStart: boolean
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

  function buildHookEntry(scriptPath: string): ClaudeHookEntry {
    const port = agentPort() || 23338
    return {
      name: HOOK_MARKER_NAME,
      script: `${scriptPath} ${port}`,
      events: [
        "SessionStart", "SessionEnd", "UserPromptSubmit",
        "PreToolUse", "PostToolUse", "PostToolUseFailure",
        "Stop", "StopFailure", "ApiError", "Notification",
        "PermissionRequest",
      ],
    }
  }

  function install(): { added: boolean; updated: boolean } {
    const settings = readClaudeSettings()
    if (!settings) return { added: false, updated: false }

    const hooks: ClaudeHookEntry[] = settings.hooks || []
    const scriptPath = getHookScriptPath()
    const newEntry = buildHookEntry(scriptPath)
    const existingIdx = hooks.findIndex(h => h.name === HOOK_MARKER_NAME)

    if (existingIdx >= 0) {
      const existing = hooks[existingIdx]
      if (existing.script !== newEntry.script) {
        hooks[existingIdx] = newEntry
        settings.hooks = hooks
        writeClaudeSettings(settings)
        return { added: false, updated: true }
      }
      return { added: false, updated: false }
    }

    hooks.push(newEntry)
    settings.hooks = hooks
    writeClaudeSettings(settings)
    return { added: true, updated: false }
  }

  function uninstall(): { removed: boolean } {
    const settings = readClaudeSettings()
    if (!settings) return { removed: false }

    const hooks: ClaudeHookEntry[] = settings.hooks || []
    const filtered = hooks.filter(h => h.name !== HOOK_MARKER_NAME)
    if (filtered.length === hooks.length) return { removed: false }

    settings.hooks = filtered
    writeClaudeSettings(settings)
    setAutoStart(false)
    return { removed: true }
  }

  function isInstalled(): boolean {
    const settings = readClaudeSettings()
    if (!settings) return false
    const hooks: ClaudeHookEntry[] = settings.hooks || []
    return hooks.some(h => h.name === HOOK_MARKER_NAME)
  }

  function setAutoStart(enabled: boolean): boolean {
    const settings = readClaudeSettings()
    if (!settings) return false

    const hooks: ClaudeHookEntry[] = settings.hooks || []
    const autoIdx = hooks.findIndex(h => h.name === AUTO_START_MARKER)

    if (enabled && autoIdx < 0) {
      const scriptPath = getHookScriptPath()
      hooks.push({
        name: AUTO_START_MARKER,
        script: scriptPath,
        events: ["SessionStart"],
      })
      settings.hooks = hooks
      return writeClaudeSettings(settings)
    }

    if (!enabled && autoIdx >= 0) {
      hooks.splice(autoIdx, 1)
      settings.hooks = hooks
      return writeClaudeSettings(settings)
    }

    return true
  }

  function checkHealth(): { healthy: boolean; issues: string[] } {
    const issues: string[] = []
    const settings = readClaudeSettings()
    if (!settings) {
      issues.push("Claude settings file not found")
      return { healthy: false, issues }
    }
    const hooks: ClaudeHookEntry[] = settings.hooks || []
    const ours = hooks.find(h => h.name === HOOK_MARKER_NAME)
    if (!ours) {
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
      autoStart: (readClaudeSettings()?.hooks || []).some((h: any) => h.name === AUTO_START_MARKER),
      scriptExists: fs.existsSync(getHookScriptPath()),
      claudeExists: readClaudeSettings() !== null,
      healthy: health.healthy,
      repairFailures,
      manualFixRequired,
    }
  }

  return {
    install, uninstall, isInstalled, setAutoStart,
    startWatcher, stopWatcher, getStatus, checkHealth, repair,
  }
}
