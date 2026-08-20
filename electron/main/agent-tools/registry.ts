// electron/main/agent-tools/registry.ts
// 多工具（Codex / Gemini-CLI / OpenCode / Cline 等）的统一适配器注册表（G4）。
//
// 设计目标：
//   - 每个工具一个 ToolAdapter：探测进程 + 尽力而为地拉取真实会话状态。
//   - 绝对不影响既有 Claude Code 子系统：Claude 走 HTTP hooks + 状态机（另管），
//     这里只补"被动观测"类工具（多数无 hook，审批降级为 'none'）。
//   - 单工具失败不拖垮整体：fetchSessions 任何异常都被捕获成空列表。
//
// 本模块零依赖、可纯 Node 单测（日志经 registryLogger 注入，同 conversion-registry 范式）。

import type { AgentLogicalState } from '../agent-state-machine'

/** 适配器对外暴露的单条会话（映射到展示层） */
export interface AdapterSession {
  /** 跨工具唯一（前缀 toolId:） */
  sessionId: string
  /** 工具 id（如 codex） */
  agentId: string
  state: AgentLogicalState
  /** 最近活动 epoch ms（文件 mtime，探测所得） */
  updatedAt: number
  label?: string
}

export interface ToolAdapter {
  /** 唯一工具 id */
  id: string
  /** 展示名 i18n 词条 key（如 'tools.claudeCode'） */
  nameKey: string
  /** 是否具备可注入的审批挂钩：Claude Code 有；多数工具无 → 审批降级展示 */
  approval: 'hook' | 'none'
  /** 探测当前是否运行（同步，内部捕获异常返回 false） */
  probeRunning(): boolean
  /** 拉取该工具会话（尽力而为；任何异常返回 []） */
  fetchSessions(): AdapterSession[]
}

export interface ToolStatus {
  id: string
  nameKey: string
  running: boolean
  approval: 'hook' | 'none'
  /** "有活跃非 idle 会话" ⇒ 展示工作中 */
  working: boolean
  /** 展示层会话（id + 可选标签）；结构刻意做到最简，便于合成 Claude 条目与适配器对齐 */
  sessions: { sessionId: string; label?: string }[]
  /** 最近一次探测时间戳（0 = 尚未探测） */
  lastProbed: number
  error: boolean
}

export type RegistryLogger = { info: (...a: unknown[]) => void; warn: (...a: unknown[]) => void }

let logger: RegistryLogger = { info: () => {}, warn: () => {} }
export function setRegistryLogger(l: RegistryLogger): void {
  logger = l
}

const POLL_INTERVAL_MS = 10_000

export function createToolRegistry(adapters: ToolAdapter[], pollMs = POLL_INTERVAL_MS) {
  const statuses = new Map<string, ToolStatus>()
  for (const a of adapters) {
    statuses.set(a.id, {
      id: a.id,
      nameKey: a.nameKey,
      running: false,
      approval: a.approval,
      working: false,
      sessions: [],
      lastProbed: 0,
      error: false,
    })
  }
  let timer: ReturnType<typeof setInterval> | null = null

  function pollOnce() {
    for (const a of adapters) {
      const st = statuses.get(a.id)!
      try {
        const running = a.probeRunning()
        const sessions = a.fetchSessions()
        st.running = running
        st.sessions = sessions
        st.working = running && sessions.some(s => s.state !== 'idle')
        st.lastProbed = Date.now()
        st.error = false
        logger.info(`[ToolRegistry] ${a.id} probed: running=${running}, sessions=${sessions.length}, working=${st.working}`)
      } catch (e) {
        // 单工具失败不拖垮整体：保留上次状态并标记 error
        st.error = true
        st.lastProbed = Date.now()
        logger.warn(`[ToolRegistry] ${a.id} probe failed:`, (e as Error)?.message ?? e)
      }
    }
  }

  function start() {
    if (timer) return
    pollOnce() // 立即探测一次，避免窗口首拉为空
    timer = setInterval(pollOnce, pollMs)
  }

  function stop() {
    if (timer) { clearInterval(timer); timer = null }
  }

  function getStatus(): ToolStatus[] {
    return Array.from(statuses.values())
  }

  return { start, stop, pollOnce, getStatus }
}

export type ToolRegistry = ReturnType<typeof createToolRegistry>
