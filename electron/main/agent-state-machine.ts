// electron/main/agent-state-machine.ts
// Agent state machine — tracks sessions, resolves display state, cleans stale sessions

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

export function createAgentStateMachine() {
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
    if (state !== currentGlobalState) {
      currentGlobalState = state
      const snapshot = Array.from(sessions.values())
      for (const l of listeners) l(state, snapshot)
    }
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

    if (state === "idle" && event === "Stop") {
      doneTimer = setTimeout(() => {
        doneTimer = null
        if (sessions.has(sessionId)) {
          const s = sessions.get(sessionId)!
          s.state = "idle"
          s.updatedAt = Date.now()
        }
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
    return Array.from(sessions.values())
  }

  function cleanStaleSessions() {
    const now = Date.now()
    let changed = false
    for (const [id, s] of sessions) {
      const age = now - s.updatedAt
      if (age > SESSION_STALE_MS) {
        sessions.delete(id)
        changed = true
      } else if (s.state !== "idle" && age > WORKING_STALE_MS) {
        s.state = "idle"
        s.updatedAt = now
        changed = true
      }
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
