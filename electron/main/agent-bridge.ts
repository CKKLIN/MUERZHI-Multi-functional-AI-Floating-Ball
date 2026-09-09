// electron/main/agent-bridge.ts
// Agent Bridge — orchestrates the state machine, HTTP server, and hook manager
// 仅支持 Claude Code（已移除 Codex / 多工具适配器）。

import { createAgentStateMachine } from "./agent-state-machine"
import { createAgentServer, type CardItem, type SafeCard } from "./agent-server"
import { createClaudeHookManager, type HookManagerStatus } from "./claude-hook-manager"
import { getClaudeSessionTitle } from "./session-title"
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
  getAutoAllowSessions: () => string[]
  setAutoAllowSession: (sessionId: string, enabled: boolean) => string[]
  setCardExpire: (enabled: boolean, seconds: number) => void
  getCardExpire: () => { enabled: boolean; seconds: number }
}

// === 自动允许/同意设置持久化 ===
// 独立小 JSON（agent-settings.json），不与其他设置文件混用。写入端与读取端做对称白名单校验：
// 非布尔 autoAllow、非字符串数组元素一律丢弃，避免把非法类型持久化进文件（否则重启后校验失败会静默回退默认值）。
const AGENT_SETTINGS_FILE = 'agent-settings.json'

interface AgentSettings {
  autoAllow: boolean
  /** 选择性自动审批：只对这些会话（sessionId）自动放行权限；为空数组则无按会话的自动审批 */
  autoAllowSessions: string[]
  /** 审批/提问卡是否自动过期；false = 永不过期（一直等用户处理或会话结束） */
  cardExpireEnabled: boolean
  /** 过期时长（秒），UI 以分钟编辑；clamp 见 loadAgentSettings */
  cardExpireSeconds: number
}

// 过期时长边界：下限 10s 防手滑 0；上限 1800s（30min）——Claude Code HTTP hook 超时
// （claude-hook-manager 的 HOOK_HTTP_TIMEOUT_S=1860s）必须始终覆盖此上限，改上限时同步改那里。
const CARD_EXPIRE_MIN_S = 10
const CARD_EXPIRE_MAX_S = 1800
const DEFAULT_AGENT_SETTINGS: AgentSettings = { autoAllow: false, autoAllowSessions: [], cardExpireEnabled: true, cardExpireSeconds: 300 }

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
      autoAllowSessions: Array.isArray(parsed.autoAllowSessions)
        ? parsed.autoAllowSessions.filter((s: unknown): s is string => typeof s === 'string' && s.length > 0)
        : DEFAULT_AGENT_SETTINGS.autoAllowSessions,
      cardExpireEnabled: typeof parsed.cardExpireEnabled === 'boolean' ? parsed.cardExpireEnabled : DEFAULT_AGENT_SETTINGS.cardExpireEnabled,
      cardExpireSeconds: typeof parsed.cardExpireSeconds === 'number' && Number.isFinite(parsed.cardExpireSeconds)
        ? Math.min(CARD_EXPIRE_MAX_S, Math.max(CARD_EXPIRE_MIN_S, Math.round(parsed.cardExpireSeconds)))
        : DEFAULT_AGENT_SETTINGS.cardExpireSeconds,
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
  // checkClaudeRunning 结果缓存：避免高频同步 tasklist spawn 阻塞主线程。
  // 被 getStatus（每 5s）与状态机 cleanStaleSessions（每 10s）调用，用于判断"是否仍有 claude 进程",
  // 但 claude 进程启停不需要秒级精度，缓存 30s 足够。
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

  // 状态机注入 isClaudeRunning：cleanStaleSessions 用"是否仍有 claude 进程"区分
  // 长思考的活跃会话（claude 在跑 → 不降级）与真僵尸（claude 全退出 → 5min 回收）。
  const stateMachine = createAgentStateMachine({ isClaudeRunning: checkClaudeRunning })
  // 过期时限 getter：每张卡升为队首时实时读取，设置面板改动立即对后续卡片生效
  const server = createAgentServer(stateMachine, {
    getHeadTimeoutMs: () => (cardExpireEnabled ? cardExpireSeconds * 1000 : 0),
  })
  const hookManager = createClaudeHookManager(() => server.getPort())

  let stateListener: ((state: DisplayState, sessions: AgentSession[]) => void) | null = null
  let cardListener: ((card: CardItem | null) => void) | null = null
  // 自动审批开关持久化到 agent-settings.json（主进程 JSON 为真相源），启动时读回、切换时落盘。
  // 与 ai-island-settings.json 同模式：独立小 JSON + 白名单校验，避免把非法类型写进文件。
  // autoAllow 全局放行所有权限；autoAllowSessions 只放行指名会话的权限（见 setOnCardChange）。
  const persistedSettings = loadAgentSettings()
  let autoAllow = persistedSettings.autoAllow
  let autoAllowSessions = persistedSettings.autoAllowSessions
  let cardExpireEnabled = persistedSettings.cardExpireEnabled
  let cardExpireSeconds = persistedSettings.cardExpireSeconds

  // 把两份设置一起落盘，避免只存其一导致另一份静默丢失
  function persistSettings() {
    saveAgentSettings({ autoAllow, autoAllowSessions, cardExpireEnabled, cardExpireSeconds })
  }

  stateMachine.subscribe((state, sessions) => {
    if (!stateListener) return
    // 标题增强：优先用 Claude Code 会话列表里的官方标题（~/.claude/sessions/<pid>.json 的 name，
    // 见 session-title.ts），读不到（老版本 / 目录缺失）退回状态机里首条 prompt 派生的标题。
    // 内部带 5s 扫描缓存，广播高频时不会频繁读盘。
    const enriched = sessions.map((s) => {
      const name = getClaudeSessionTitle(s.sessionId)
      return name && name !== s.title ? { ...s, title: name } : s
    })
    stateListener(state, enriched)
  })

  server.setOnCardChange((card) => {
    // 自动允许模式：权限卡一旦成队首就放行，直接跳过悬浮岛（自动允许只作用于权限，不影响提问）。
    // 放行条件 = 全局 autoAllow，或该卡所属会话被加入了 autoAllowSessions（选择性按会话审批）。
    if (card && card.kind === "permission") {
      const selective = autoAllowSessions.includes(card.sessionId)
      if (autoAllow || selective) {
        log.info(`[AgentBridge] auto-allow permission: tool=${card.toolName}, session=${card.sessionId}, global=${autoAllow}, selective=${selective}`)
        server.resolvePendingPermission("allow")
        return
      }
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
  function setAutoAllow(enabled: boolean) { autoAllow = enabled; persistSettings(); log.info(`[AgentBridge] autoAllow=${enabled} (persisted)`) }
  function getAutoAllow() { return autoAllow }

  function getAutoAllowSessions(): string[] {
    return [...autoAllowSessions]
  }

  // 把某会话加入/移出"选择性自动审批"集合，落盘并返回新集合
  function setAutoAllowSession(sessionId: string, enabled: boolean): string[] {
    const set = new Set(autoAllowSessions)
    if (enabled) set.add(sessionId)
    else set.delete(sessionId)
    autoAllowSessions = Array.from(set)
    persistSettings()
    log.info(`[AgentBridge] setAutoAllowSession: session=${sessionId}, enabled=${enabled}, count=${autoAllowSessions.length} (persisted)`)
    return [...autoAllowSessions]
  }

  // 过期开关/时长：落盘后立刻重启队首倒计时——已在展示中的那张卡立即按新时限重算，
  // 关掉过期时撤掉现有 timer（该卡改为一直等待）
  function setCardExpire(enabled: boolean, seconds: number) {
    cardExpireEnabled = !!enabled
    cardExpireSeconds = Math.min(CARD_EXPIRE_MAX_S, Math.max(CARD_EXPIRE_MIN_S, Math.round(Number(seconds) || DEFAULT_AGENT_SETTINGS.cardExpireSeconds)))
    persistSettings()
    server.restartHeadTimer()
    log.info(`[AgentBridge] setCardExpire: enabled=${cardExpireEnabled}, seconds=${cardExpireSeconds} (persisted)`)
  }

  function getCardExpire(): { enabled: boolean; seconds: number } {
    return { enabled: cardExpireEnabled, seconds: cardExpireSeconds }
  }

  function getStatus(): AgentBridgeStatus {
    const sessionsRaw = stateMachine.getSessions()
    const realCount = sessionsRaw.length
    const displayState = stateMachine.getCurrentState()
    const sessionIds = sessionsRaw.map(s => s.sessionId).join(',')
    log.info(`[AgentBridge] getStatus: real_count=${realCount}, ids=[${sessionIds}], display=${displayState}`)
    const sessionCount = stateMachine.getSessions().length
    const cRunning = checkClaudeRunning()
    return {
      serverRunning: server.getPort() !== null,
      port: server.getPort(),
      hookInstalled: hookManager.isInstalled(),
      hookManagerStatus: hookManager.getStatus(),
      displayState,
      currentCard: server.getSafeCurrentCard(),
      sessionCount,
      claudeRunning: cRunning,
    }
  }

  return {
    start, stop, getServer, getStateMachine, getHookManager, getStatus,
    setStateListener, setCardListener,
    resolvePermission, dismissQuestion, submitQuestion, installHooks, uninstallHooks,
    setAutoAllow, getAutoAllow, getAutoAllowSessions, setAutoAllowSession,
    setCardExpire, getCardExpire,
  }
}
