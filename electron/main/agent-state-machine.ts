// electron/main/agent-state-machine.ts
// Agent state machine — tracks sessions, resolves display state, cleans stale sessions

// 日志注入（与 conversion-registry 同约定）：本模块不直接依赖 electron / electron-log，
// 便于纯 Node 单测。生产环境在 main 入口调 setStateMachineLogger(log) 注入。
export type StateMachineLogger = { info: (...a: unknown[]) => void; warn: (...a: unknown[]) => void }

let logger: StateMachineLogger = { info: () => {}, warn: () => {} }

export function setStateMachineLogger(log: StateMachineLogger): void {
  logger = log
}

export interface AgentSession {
  sessionId: string
  agentId: string
  state: AgentLogicalState
  event: string | null
  updatedAt: number
  toolName?: string
  toolInput?: any
  contextUsage?: { used: number; limit: number; percent?: number }
  model?: string
}

export type AgentLogicalState = "idle" | "thinking" | "working" | "error" | "notification"

export type DisplayState = AgentLogicalState | "done"

const STATE_PRIORITY: Record<string, number> = {
  error: 4,
  notification: 3,
  working: 2,
  thinking: 1,
  idle: 0,
}

const SESSION_STALE_MS = 10 * 60 * 1000
const WORKING_STALE_MS = 5 * 60 * 1000
const CLEANUP_INTERVAL_MS = 10 * 1000
const DONE_DURATION_MS = 2000

export type StateListener = (displayState: DisplayState, sessions: AgentSession[]) => void

export interface AgentStateMachineOptions {
  /** 注入"当前是否仍有 claude 进程存活"的判定（agent-bridge 复用 tasklist 缓存）。
   *  cleanStaleSessions 用它区分「长思考/长仍工作的活跃会话」与「真僵尸会话」。
   *  未注入时对 stale 兜底走旧行为（5min 降级 idle），保证退路可预期。 */
  isClaudeRunning?: () => boolean
}

export function createAgentStateMachine(options: AgentStateMachineOptions = {}) {
  const isClaudeRunning = options.isClaudeRunning
  const sessions = new Map<string, AgentSession>()
  let cleanupTimer: ReturnType<typeof setInterval> | null = null
  let listeners: StateListener[] = []
  let doneTimer: ReturnType<typeof setTimeout> | null = null
  let currentGlobalState: DisplayState = "idle"

  function subscribe(listener: StateListener) {
    listeners.push(listener)
    return () => { listeners = listeners.filter(l => l !== listener) }
  }

  function notify() {
    const state = resolveDisplayState()
    const snapshot = Array.from(sessions.values())
    // 始终通知前端，确保 session 数量变化能即时更新
    if (state !== currentGlobalState) {
      currentGlobalState = state
    }
    for (const l of listeners) l(currentGlobalState, snapshot)
  }

  function updateSession(
    sessionId: string,
    state: AgentLogicalState,
    event: string | null,
    opts: {
      agentId?: string
      toolName?: string
      toolInput?: any
      contextUsage?: { used: number; limit: number }
      model?: string
    } = {}
  ) {
    if (doneTimer) { clearTimeout(doneTimer); doneTimer = null }

    const existing = sessions.get(sessionId)
    const session: AgentSession = {
      sessionId,
      agentId: opts.agentId || "claude-code",
      state,
      event,
      updatedAt: Date.now(),
      toolName: opts.toolName || existing?.toolName,
      toolInput: opts.toolInput || existing?.toolInput,
      contextUsage: opts.contextUsage || existing?.contextUsage,
      model: opts.model || existing?.model,
    }
    sessions.set(sessionId, session)

    logger.info(`[StateMachine] updateSession: id=${sessionId}, state=${state}, event=${event}, total=${sessions.size}`)

    if (state === "idle" && event === "Stop") {
      doneTimer = setTimeout(() => {
        doneTimer = null
        if (sessions.has(sessionId)) {
          const s = sessions.get(sessionId)!
          s.state = "idle"
          s.updatedAt = Date.now()
        }
        logger.info(`[StateMachine] doneTimer fired for ${sessionId}, total=${sessions.size}`)
        notify()
      }, DONE_DURATION_MS)
    }

    notify()
  }

  function dismissSession(sessionId: string) {
    sessions.delete(sessionId)
    notify()
  }

  function resolveDisplayState(): DisplayState {
    let best: DisplayState = "idle"
    for (const [, s] of sessions) {
      const p = STATE_PRIORITY[s.state] ?? 0
      if (p > (STATE_PRIORITY[best] ?? 0)) best = s.state
    }
    if (doneTimer && best === "idle") return "done"
    return best
  }

  function getCurrentState(): DisplayState {
    return currentGlobalState
  }

  function getSessions(): AgentSession[] {
    const result: AgentSession[] = []
    for (const [, v] of sessions) {
      result.push(v)
    }
    return result
  }

  // 清理陈旧会话。关键：区分「仍在工作的活跃会话」与「真僵尸会话」——
  // 仅凭静默时长无法区分：长思考 / 长工具执行会静默 >5min，僵尸会话也静默。
  // 因此用 isClaudeRunning 做旁证：只要还有 claude 进程存活，非 idle 会话就可能
  // 正处于长思考，绝不因静默降级；只有 claude 进程全部退出时，非 idle 会话才确认为真僵尸。
  function cleanStaleSessions() {
    const now = Date.now()
    // null = 未注入判定（agent-bridge 会注入；纯测试/退化时走旧行为兜底）
    const claudeRunning = isClaudeRunning ? isClaudeRunning() : null
    let changed = false
    for (const [id, s] of sessions) {
      const age = now - s.updatedAt
      if (s.state === "idle") {
        // 空闲会话：纯清理，超时即删（恢复时会新建条目，无"误删活跃会话"风险）
        if (age > SESSION_STALE_MS) {
          sessions.delete(id)
          logger.info(`[StateMachine] cleanStale: removed idle ${id} (age=${Math.round(age / 1000)}s)`)
          changed = true
        }
      } else if (claudeRunning === false) {
        // claude 进程已全部退出：任一非 idle 会话都是真僵尸，5min 降级回 idle（随后按 idle 清理）
        if (age > WORKING_STALE_MS) {
          s.state = "idle"
          s.updatedAt = now
          logger.info(`[StateMachine] cleanStale: reset zombie ${id} to idle (age=${Math.round(age / 1000)}s, no claude running)`)
          changed = true
        }
      } else if (claudeRunning === null) {
        // 未注入 liveness：保留旧行为兜底，避免未知状态挂尸
        if (age > WORKING_STALE_MS) {
          s.state = "idle"
          s.updatedAt = now
          logger.info(`[StateMachine] cleanStale: reset ${id} to idle (age=${Math.round(age / 1000)}s, no liveness check)`)
          changed = true
        }
      }
      // claudeRunning === true：非 idle 会话可能正处于长思考/长工具执行，绝不因静默降级——
      // 只在 Stop/SessionEnd/权限解决等事件自然回 idle，或在 claude 全部退出后被上一分支回收。
      // 残余场景：某会话的 claude 进程已死、但另一 claude 仍存活 → 该僵尸保持 working 直到
      // 全部 claude 退出，属可接受折衷（比误判活跃会话为待机更符合用户预期）。
    }
    if (changed) notify()
  }

  function start() {
    if (cleanupTimer) return
    cleanupTimer = setInterval(cleanStaleSessions, CLEANUP_INTERVAL_MS)
  }

  function stop() {
    if (cleanupTimer) { clearInterval(cleanupTimer); cleanupTimer = null }
    if (doneTimer) { clearTimeout(doneTimer); doneTimer = null }
  }

  return {
    updateSession,
    dismissSession,
    resolveDisplayState,
    getCurrentState,
    getSessions,
    subscribe,
    cleanStaleSessions,
    start,
    stop,
  }
}
