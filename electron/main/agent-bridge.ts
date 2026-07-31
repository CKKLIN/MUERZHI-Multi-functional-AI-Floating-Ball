// electron/main/agent-bridge.ts
// Agent Bridge — orchestrates the state machine, HTTP server, and hook manager

import { createAgentStateMachine } from "./agent-state-machine"
import { createAgentServer, type PendingPermission } from "./agent-server"
import { createClaudeHookManager, type HookManagerStatus } from "./claude-hook-manager"
import { execSync } from "child_process"
import log from "./logger"

export type { PendingPermission, HookManagerStatus }
export type DisplayState = import("./agent-state-machine").DisplayState
export type AgentSession = import("./agent-state-machine").AgentSession

export interface AgentBridgeConfig {
  autoInstallHooks?: boolean
  autoStartWatcher?: boolean
  showAiState?: boolean
  enablePermissions?: boolean
}

export interface AgentBridgeStatus {
  serverRunning: boolean
  port: number | null
  hookInstalled: boolean | null
  hookManagerStatus: HookManagerStatus | null
  displayState: DisplayState
  pendingPermission: PendingPermission | null
  sessionCount: number
  claudeRunning: boolean
}

export interface AgentBridge {
  start: () => Promise<void>
  stop: () => void
  getServer: () => ReturnType<typeof createAgentServer>
  getStateMachine: () => ReturnType<typeof createAgentStateMachine>
  getHookManager: () => ReturnType<typeof createClaudeHookManager>
  getStatus: () => AgentBridgeStatus
  setStateListener: (listener: (state: DisplayState, sessions: AgentSession[]) => void) => void
  setPermissionListener: (listener: (perm: PendingPermission) => void) => void
  resolvePermission: (behavior: string) => void
  installHooks: () => void
  uninstallHooks: () => void
  setAutoAllow: (enabled: boolean) => void
  getAutoAllow: () => boolean
}

export function createAgentBridge(config: AgentBridgeConfig = {}): AgentBridge {
  const stateMachine = createAgentStateMachine()
  const server = createAgentServer(stateMachine)
  const hookManager = createClaudeHookManager(() => server.getPort())

  let stateListener: ((state: DisplayState, sessions: AgentSession[]) => void) | null = null
  let permissionListener: ((perm: PendingPermission) => void) | null = null
  let autoAllow = false

  stateMachine.subscribe((state, sessions) => {
    if (stateListener) stateListener(state, sessions)
  })

  server.setOnPermissionRequest((perm) => {
    // 自动允许模式：直接通过权限，不弹悬浮岛
    if (autoAllow) {
      log.info(`[AgentBridge] auto-allow permission: tool=${perm.toolName}`)
      server.resolvePendingPermission("allow")
      return
    }
    if (permissionListener) permissionListener(perm)
  })

  async function start() {
    stateMachine.start()
    const port = await server.start()
    if (port !== null) {
      if (config.autoInstallHooks !== false) {
        const result = hookManager.install()
        if (result.added) log.info("Claude Code hooks installed")
        if (result.updated) log.info("Claude Code hooks updated")
      }
      // watcher 仅在 hook 实际已安装时启动，否则每 5min 的健康检查无意义
      if (config.autoStartWatcher !== false && hookManager.isInstalled()) {
        hookManager.startWatcher()
      }
    }
  }

  function stop() {
    hookManager.stopWatcher()
    stateMachine.stop()
    server.stop()
  }

  function getServer() { return server }
  function getStateMachine() { return stateMachine }
  function getHookManager() { return hookManager }

  function setStateListener(listener: (state: DisplayState, sessions: AgentSession[]) => void) {
    stateListener = listener
  }

  function setPermissionListener(listener: (perm: PendingPermission) => void) {
    permissionListener = listener
  }

  function resolvePermission(behavior: string) {
    server.resolvePendingPermission(behavior)
  }

  function installHooks() { hookManager.install() }
  function uninstallHooks() { hookManager.uninstall() }
  function setAutoAllow(enabled: boolean) { autoAllow = enabled; log.info(`[AgentBridge] autoAllow=${enabled}`) }
  function getAutoAllow() { return autoAllow }

  // checkClaudeRunning 结果缓存：避免高频同步 tasklist spawn 阻塞主线程。
  // getStatus 每 5s 被调用，但 claude 进程启停不需要秒级精度，缓存 30s 足够。
  let claudeRunningCache: boolean | null = null
  let claudeRunningCacheAt = 0
  const CLAUDE_RUNNING_TTL = 30_000

  function checkClaudeRunning(): boolean {
    const now = Date.now()
    if (claudeRunningCache !== null && now - claudeRunningCacheAt < CLAUDE_RUNNING_TTL) {
      return claudeRunningCache
    }
    try {
      const { execSync } = require("child_process")
      const result = execSync("tasklist /NH /FI \"IMAGENAME eq claude.exe\"", { encoding: "utf8", timeout: 2000 })
      claudeRunningCache = result.includes("claude.exe")
    } catch {
      claudeRunningCache = false
    }
    claudeRunningCacheAt = now
    return claudeRunningCache!
  }

  function getStatus(): AgentBridgeStatus {
    const sessionsRaw = stateMachine.getSessions()
    const realCount = sessionsRaw.length
    const displayState = stateMachine.getCurrentState()
    const sessionIds = sessionsRaw.map(s => s.sessionId).join(',')
    log.info(`[AgentBridge] getStatus: real_count=${realCount}, ids=[${sessionIds}], display=${displayState}`)
    const sessionCount = stateMachine.getSessions().length
    return {
      serverRunning: server.getPort() !== null,
      port: server.getPort(),
      hookInstalled: hookManager.isInstalled(),
      hookManagerStatus: hookManager.getStatus(),
      displayState,
      pendingPermission: server.getPendingPermission(),
      sessionCount,
      claudeRunning: checkClaudeRunning(),
    }
  }

  return {
    start, stop, getServer, getStateMachine, getHookManager, getStatus,
    setStateListener, setPermissionListener,
    resolvePermission, installHooks, uninstallHooks,
    setAutoAllow, getAutoAllow,
  }
}
