// electron/main/agent-bridge.ts
// Agent Bridge — orchestrates the state machine, HTTP server, and hook manager

import { createAgentStateMachine } from "./agent-state-machine"
import { createAgentServer, type CardItem, type SafeCard } from "./agent-server"
import { createClaudeHookManager, type HookManagerStatus } from "./claude-hook-manager"
import { execSync } from "child_process"
import nodeFs from "node:fs"
import { join } from "node:path"
import log from "./logger"

export type { CardItem, SafeCard, HookManagerStatus }
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
  currentCard: SafeCard | null
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
  setCardListener: (listener: (card: CardItem | null) => void) => void
  resolvePermission: (behavior: string) => void
  dismissQuestion: () => void
  submitQuestion: (sessionId: string, answers: Record<string, unknown>) => void
  installHooks: () => void
  uninstallHooks: () => void
  setAutoAllow: (enabled: boolean) => void
  getAutoAllow: () => boolean
}

// === 自动允许/同意设置持久化 ===
// 独立小 JSON（agent-settings.json），不与其他设置文件混用。写入端与读取端做对称白名单校验：
// 非布尔 autoAllow 一律丢弃，避免把非法类型持久化进文件（否则重启后校验失败会静默回退默认值）。
const AGENT_SETTINGS_FILE = 'agent-settings.json'

interface AgentSettings {
  autoAllow: boolean
}

const DEFAULT_AGENT_SETTINGS: AgentSettings = { autoAllow: false }

function agentSettingsFilePath(): string {
  // 懒加载 electron：保持本文件在纯 Node 下可 import（与 conversion-registry / hw-encoder 同约定）。
  // 路径与 ai-island-settings.json 保持一致：打包走 userData，dev 落在项目根。
  const { app } = require('electron') as typeof import('electron')
  const dir = app.isPackaged ? app.getPath('userData') : join(__dirname, '..', '..')
  return join(dir, AGENT_SETTINGS_FILE)
}

function loadAgentSettings(): AgentSettings {
  try {
    const data = nodeFs.readFileSync(agentSettingsFilePath(), 'utf-8')
    const parsed = JSON.parse(data)
    return {
      autoAllow: typeof parsed.autoAllow === 'boolean' ? parsed.autoAllow : DEFAULT_AGENT_SETTINGS.autoAllow,
    }
  } catch {}
  return { ...DEFAULT_AGENT_SETTINGS }
}

function saveAgentSettings(settings: AgentSettings) {
  try {
    nodeFs.writeFileSync(agentSettingsFilePath(), JSON.stringify(settings), 'utf-8')
  } catch (e) {
    log.warn('[AgentBridge] save agent settings failed:', (e as Error)?.message ?? e)
  }
}

export function createAgentBridge(config: AgentBridgeConfig = {}): AgentBridge {
  const stateMachine = createAgentStateMachine()
  const server = createAgentServer(stateMachine)
  const hookManager = createClaudeHookManager(() => server.getPort())

  let stateListener: ((state: DisplayState, sessions: AgentSession[]) => void) | null = null
  let cardListener: ((card: CardItem | null) => void) | null = null
  // 自动同意开关持久化到 agent-settings.json（主进程 JSON 为真相源），启动时读回、切换时落盘。
  // 与 ai-island-settings.json 同模式：独立小 JSON + 白名单校验，避免把非法类型写进文件。
  let autoAllow = loadAgentSettings().autoAllow

  stateMachine.subscribe((state, sessions) => {
    if (stateListener) stateListener(state, sessions)
  })

  server.setOnCardChange((card) => {
    // 自动允许模式：权限卡一旦成队首就放行，直接跳过悬浮岛（自动允许只作用于权限，不影响提问）
    if (autoAllow && card && card.kind === "permission") {
      log.info(`[AgentBridge] auto-allow permission: tool=${card.toolName}`)
      server.resolvePendingPermission("allow")
      return
    }
    if (cardListener) cardListener(card)
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

  function setCardListener(listener: (card: CardItem | null) => void) {
    cardListener = listener
  }

  function resolvePermission(behavior: string) {
    server.resolvePendingPermission(behavior)
  }

  function dismissQuestion() {
    server.dismissQuestion()
  }

  function submitQuestion(sessionId: string, answers: Record<string, unknown>) {
    server.submitQuestion(sessionId, answers)
  }

  function installHooks() { hookManager.install() }
  function uninstallHooks() { hookManager.uninstall() }
  function setAutoAllow(enabled: boolean) { autoAllow = enabled; saveAgentSettings({ autoAllow }); log.info(`[AgentBridge] autoAllow=${enabled} (persisted)`) }
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
      currentCard: server.getSafeCurrentCard(),
      sessionCount,
      claudeRunning: checkClaudeRunning(),
    }
  }

  return {
    start, stop, getServer, getStateMachine, getHookManager, getStatus,
    setStateListener, setCardListener,
    resolvePermission, dismissQuestion, submitQuestion, installHooks, uninstallHooks,
    setAutoAllow, getAutoAllow,
  }
}
