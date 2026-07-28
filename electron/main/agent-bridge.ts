// electron/main/agent-bridge.ts
// Agent Bridge — orchestrates the state machine, HTTP server, and hook manager

import { createAgentStateMachine } from "./agent-state-machine"
import { createAgentServer, type PendingPermission } from "./agent-server"
import { createClaudeHookManager, type HookManagerStatus } from "./claude-hook-manager"
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
  setAutoStart: (enabled: boolean) => void
}

export function createAgentBridge(config: AgentBridgeConfig = {}): AgentBridge {
  const stateMachine = createAgentStateMachine()
  const server = createAgentServer(stateMachine)
  const hookManager = createClaudeHookManager(() => server.getPort())

  let stateListener: ((state: DisplayState, sessions: AgentSession[]) => void) | null = null
  let permissionListener: ((perm: PendingPermission) => void) | null = null

  stateMachine.subscribe((state, sessions) => {
    if (stateListener) stateListener(state, sessions)
  })

  server.setOnPermissionRequest((perm) => {
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
      if (config.autoStartWatcher !== false) {
        hookManager.startWatcher()
      }
    }
  }

  function stop() {
    hookManager.stopWatcher()
    stateMachine.stop()
    server.stop()
  }

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
  function setAutoStart(enabled: boolean) { hookManager.setAutoStart(enabled) }

  function getStatus(): AgentBridgeStatus {
    return {
      serverRunning: server.getPort() !== null,
      port: server.getPort(),
      hookInstalled: hookManager.isInstalled(),
      hookManagerStatus: hookManager.getStatus(),
      displayState: stateMachine.getCurrentState(),
      pendingPermission: server.getPendingPermission(),
      sessionCount: stateMachine.getSessions().length,
    }
  }

  return {
    start, stop, getServer, getStateMachine, getHookManager, getStatus,
    setStateListener, setPermissionListener,
    resolvePermission, installHooks, uninstallHooks, setAutoStart,
  }
}
