// electron/main/agent-server.ts
// HTTP server for /state, /permission, /question, /health endpoints
// 权限审批 + AskUserQuestion 提问共用一个 FIFO 卡片队列：先来后到，同一时刻只在悬浮岛显示队首一张卡，
// 处理完（允许/拒绝/取消/超时，或提问被作答/关闭）队首后，再提升显示下一张。

import * as http from "http"
import * as fs from "fs"
import * as path from "path"
import { createAgentStateMachine, type AgentLogicalState } from "./agent-state-machine"
import { findPermissionToResolve } from "./permission-match"
import log from "./logger"

const DEFAULT_PORT = 60000
const MAX_PORT = 60019
// 卡片成为队首（被悬浮岛展示）后的处理时限；超时则自动结束该卡：权限→cancel，提问→静默收起
const HEAD_TIMEOUT_MS = 120_000

/** 权限审批卡：可承载答题回调（Claude Code 等待 PermissionRequest hook 的响应） */
export interface PermissionCard {
  kind: "permission"
  sessionId: string
  toolName: string
  toolInput: any
  suggestions: string[] | null
  resolve: (behavior: string) => void
  reject: (reason: string) => void
  createdAt: number
  /** Claude Code 为该工具调用分配的 tool_use_id。后端在用户已从 Claude Code 原生界面处理完成事件时，
   *  按 session+tool_use_id 精确关闭对应权限卡。不序列化到前端（SafeCard 不含此字段），只作后端精确匹配用。 */
  toolUseId: string | null
}

/** AskUserQuestion 提问卡。
 *  answerable=true：由 /permission 背书、可作答——用户提交走 resolve(answers) 回 allow+updatedInput.answers，
 *  关闭/超时走 reject() 回 deny（干净关闭被挂起的 /permission 连接）。
 *  answerable=false：只读回退卡（无 /permission 连接、无法注入答案的预授权场景），只通知不答案。 */
export interface QuestionCard {
  kind: "question"
  sessionId: string
  toolName: string
  toolInput: any
  questions: any[] | null
  answerable: boolean
  resolve: (answers: Record<string, unknown>) => void
  reject: (reason: string) => void
  createdAt: number
}

export type CardItem = PermissionCard | QuestionCard

/** 供 IPC/渲染层使用的纯净卡片（去除 resolve/reject 函数，无法序列化） */
export type SafeCard =
  | { kind: "permission"; sessionId: string; toolName: string; toolInput: any; suggestions: string[] | null; createdAt: number }
  | { kind: "question"; sessionId: string; toolName: string; toolInput: any; questions: any[] | null; answerable: boolean; createdAt: number }

let runtimeDir: string | null = null

function getRuntimeDir(): string {
  if (runtimeDir) return runtimeDir
  runtimeDir = path.join(require("os").homedir(), ".erzhi-recording")
  return runtimeDir
}

export function createAgentServer(stateMachine: ReturnType<typeof createAgentStateMachine>) {
  let server: http.Server | null = null
  let activePort: number | null = null

  // 统一 FIFO 卡片队列（队首 = 悬浮岛当前展示的那张）
  let cardQueue: CardItem[] = []
  let headTimer: ReturnType<typeof setTimeout> | null = null
  let onCardChange: ((card: CardItem | null) => void) | null = null

  // 会话完成事件：提问被答完会触发这些，用于把该 session 对应的提问卡从队列移除（权限不在此列，见下）
  const COMPLETION_EVENTS = ["PostToolUse", "PostToolUseFailure", "Stop", "StopFailure", "SessionEnd", "ApiError"]

  // 用户已在 Claude Code 原生界面处理该权限的可靠完成事件：
  //   允许 → 工具已执行(PostToolUse) 或执行失败(PostToolUseFailure)；
  //   拒绝 → PermissionDenied。
  // 绝不使用 PreToolUse / PreToolUseFailure：实测本 Claude Code 版本里 PreToolUse 会在 /permission
  // 之后约 300ms 就抢先触发（发生在用户点"允许/拒绝"之前），若用它当"外部已批准"信号会误关还没处理的审批卡。
  // 这三个事件只在真正执行/拒绝后才到达，才是"用户已在原生界面决定"的可靠信号（对应文档 §5.4 的完成事件列表）。
  // 匹配按 session+tool_use_id 精确，缺 ID 时按「工具名+入参内容签名」回退——绝不按 session 整清，
  // 同一会话可能排队多张权限卡，误清会关掉尚未处理的另一张。
  const EXTERNAL_RESOLUTION_EVENTS = ["PostToolUse", "PostToolUseFailure", "PermissionDenied"]

  // 会话结束：Stop/SessionEnd 后该 session 不可能再执行新工具，整清它所有待审批权限卡（精确匹配覆盖不了"没执行就结束"）。
  const SESSION_END_EVENTS = ["Stop", "StopFailure", "SessionEnd"]

  const MAX_BODY_BYTES = 1 * 1024 * 1024 // 1MB：防止本地进程发超大 body OOM 主进程

  class BodyTooLargeError extends Error {
    code = "PAYLOAD_TOO_LARGE" as const
  }

  function parseBody(req: http.IncomingMessage): Promise<any> {
    return new Promise((resolve, reject) => {
      let body = ""
      req.on("data", (c: Buffer) => {
        body += c
        if (Buffer.byteLength(body) > MAX_BODY_BYTES) {
          // 超限：立即中止连接，停止累积，防止 OOM
          try { req.destroy() } catch {}
          reject(new BodyTooLargeError("Body exceeds 1MB limit"))
        }
      })
      req.on("end", () => {
        try { resolve(JSON.parse(body)) } catch { reject(new Error("Invalid JSON")) }
      })
      req.on("error", reject)
    })
  }

  function sendJson(res: http.ServerResponse, status: number, data: any) {
    res.writeHead(status, { "Content-Type": "application/json" })
    res.end(JSON.stringify(data))
  }

  // 安全写回挂起的 /permission 连接。审批可能已被外部（原生界面）抢先完成，Claude 的 hook 客户端
  // 此时多半已断开/关闭连接；对已销毁或已结束的 res 再 writeHead/end 会抛 ERR_STREAM_DESTROYED，
  // 且该写回位于 .then/.catch 内（无后续 catch），会变成 unhandledRejection 危及主进程。
  // 这里统一「先判后写 + try/catch 丢弃」，保证无论客户端是否已断开都安全。幂等：已响应过则跳过。
  function tryRespond(res: http.ServerResponse, body: string) {
    try {
      if (!res.headersSent && !res.destroyed && !res.writableEnded) {
        res.writeHead(200, { "Content-Type": "application/json" })
        res.end(body)
      }
    } catch { /* 客户端已断开，丢弃写回 */ }
  }

  // === 队列核心 ===

  function headCard(): CardItem | null {
    return cardQueue[0] ?? null
  }

  // 队首卡片到期：权限→发 cancel 回 Claude；可作答提问→回 deny（干净关闭其挂起的 /permission 连接）；只读提问→静默移除
  function expireHead(reason: string) {
    const head = headCard()
    if (!head) return
    if (head.kind === "permission") {
      head.reject(reason)                    // 触发 perm.catch → 回 cancel 给 Claude
    } else if (head.answerable) {
      head.reject(reason)                    // 触发 q.catch → 回 deny 给 Claude
    }
    shiftHead()
  }

  // 移除队首并提升下一张（同时重启队首倒计时）
  function shiftHead() {
    cardQueue.shift()
    clearTimeout(headTimer!)
    headTimer = null
    startHeadTimer()
    notifyCard()
  }

  // 只为队首起倒计时；队列空则不设
  function startHeadTimer() {
    if (headTimer) clearTimeout(headTimer)
    if (!cardQueue.length) { headTimer = null; return }
    headTimer = setTimeout(() => {
      headTimer = null
      expireHead("timeout")
    }, HEAD_TIMEOUT_MS)
  }

  // 队首（含成为队首/清空）变化时通知外层（悬浮岛）
  function notifyCard() {
    if (onCardChange) onCardChange(headCard())
  }

  // 会话完成 → 移除该 session 的提问卡（提问被答完）。权限卡不在此移除（由用户点击/超时决定）。
  // 可作答卡被移出时必须先 reject（回 deny）——否则它挂起的 /permission 连接一直不响应，Claude 等待悬挂。
  function removeQuestionsForSession(sessionId: string) {
    const before = cardQueue.length
    const removed: CardItem[] = []
    const filtered = cardQueue.filter((c) => {
      if (c.kind === "question" && c.sessionId === sessionId) { removed.push(c); return false }
      return true
    })
    if (filtered.length === before) return
    cardQueue = filtered
    for (const c of removed) {
      if (c.kind === "question" && c.answerable) c.reject("completed") // 回 deny；若是已 submit 的卡，其连接早已响应，此 reject 幂等无害
    }
    clearTimeout(headTimer!)
    headTimer = null
    startHeadTimer()
    notifyCard()
  }

  // 用户已在 Claude Code 原生界面处理某权限：移出对应的权限卡并 reject（回 cancel）。
  // reject 触发其挂起的 /permission 连接的 .catch → 回 cancel 给 Claude，让挂起的 HTTP 请求不再悬挂。
  // 匹配决策（哪张卡、tool_use_id 精确 or 内容签名回退、FIFO 取最先）抽到纯模块 permission-match.ts，
  // 便于纯 Node 单测——这里只做「找到就移除 + reject + 广播」的队列副作用。
  function resolvePermissionByCompletion(sessionId: string, data: any) {
    const idx = findPermissionToResolve(cardQueue, sessionId, data)
    if (idx === -1) return
    const [card] = cardQueue.splice(idx, 1) as [PermissionCard]
    card.reject("resolved-in-cli") // 触发 perm.catch → 回 cancel
    clearTimeout(headTimer!)
    headTimer = null
    startHeadTimer()
    notifyCard()
    log.info(`[AgentServer] permission resolved externally (CLI): session=${sessionId}, tool=${card.toolName}`)
  }

  // 会话结束：该 session 不可能再执行新工具，整清它全部待审批权限卡并 reject（回 cancel），避免连接悬挂。
  // 与 resolvePermissionByCompletion（tool_use_id 精确 + 内容签名回退，对应逐张完成事件）互补：
  // Stop/SessionEnd 属于"没执行就结束"，无完成事件可匹配，只能按 session 整清。
  function removePermissionsForSession(sessionId: string) {
    const before = cardQueue.length
    const removed: PermissionCard[] = []
    const filtered = cardQueue.filter((c) => {
      if (c.kind === "permission" && c.sessionId === sessionId) { removed.push(c); return false }
      return true
    })
    if (filtered.length === before) return
    cardQueue = filtered
    for (const c of removed) c.reject("completed") // 回 cancel，关闭挂起的 /permission 连接
    clearTimeout(headTimer!)
    headTimer = null
    startHeadTimer()
    notifyCard()
    log.info(`[AgentServer] permissions cleared for ended session=${sessionId}, count=${removed.length}`)
  }

  // === HTTP 端点 ===

  function handleState(data: any, res: http.ServerResponse) {
    const sessionId = data.session_id || data.sessionId
    const state = data.state as AgentLogicalState
    const event = data.event

    log.info(`[AgentServer] /state received: session=${sessionId}, state=${state}, event=${event}, tool=${data.tool_name || data.toolName}`)

    if (!sessionId || !state || !event) {
      log.warn(`[AgentServer] /state rejected: missing fields (sessionId=${sessionId}, state=${state}, event=${event})`)
      sendJson(res, 400, { error: "Missing required fields: session_id, state, event" })
      return
    }

    stateMachine.updateSession(sessionId, state, event, {
      agentId: data.agent_id || "claude-code",
      toolName: data.tool_name || data.toolName,
      toolInput: data.tool_input || data.toolInput,
      contextUsage: data.context_usage || data.contextUsage,
      model: data.model,
    })

    // AskUserQuestion 答完/会话结束会触发完成事件 → 从队列收起尚未提交或悬挂的提问卡
    if (COMPLETION_EVENTS.includes(event)) {
      removeQuestionsForSession(sessionId)
    }
    // 会话结束 → 整清该 session 的权限卡（Stop/SessionEnd 后不再执行新工具）
    if (SESSION_END_EVENTS.includes(event)) {
      removePermissionsForSession(sessionId)
    }
    // 携带 tool_use_id 的完成事件 → 用户已在 Claude Code 原生界面允许/拒绝，按 ID/内容签名精确关掉对应权限审批卡
    if (EXTERNAL_RESOLUTION_EVENTS.includes(event)) {
      resolvePermissionByCompletion(sessionId, data)
    }

    log.info(`[AgentServer] /state ok, total sessions=${stateMachine.getSessions().length}`)
    sendJson(res, 200, { ok: true, app: "erzhi-recording" })
  }

  function handlePermission(data: any, res: http.ServerResponse) {
    const toolName = data.tool_name || data.toolName || "unknown"
    const toolInput = data.tool_input || data.toolInput || {}
    const sessionId = data.session_id || data.sessionId || "unknown"

    // AskUserQuestion 的 PermissionRequest：这是唯一能注入答案的 hook 响应通道（/question 走 PreToolUse 无法返回答案）。
    // 不再"挂起不响应"让 Claude 原生 UI 赢竞速，而是直接生成「可作答」提问卡（见 handleAskUserQuestionPermission）。
    if (toolName === "AskUserQuestion") {
      handleAskUserQuestionPermission(res, sessionId, toolInput)
      return
    }

    stateMachine.updateSession(sessionId, "notification", "PermissionRequest", {
      toolName,
      toolInput,
    })

    // 排队而非顶替：每张权限卡各自持有 resolve/reject，在其 HTTP 连接上独立回包
    const toolUseId = data.tool_use_id || data.toolUseId || null
    const item: PermissionCard = {
      kind: "permission",
      sessionId,
      toolName,
      toolInput,
      suggestions: data.permission_suggestions || null,
      toolUseId,
      resolve: () => {},
      reject: () => {},
      createdAt: Date.now(),
    }

    const perm = new Promise<string>((resolve, reject) => {
      item.resolve = resolve
      item.reject = reject
    })

    perm.then((behavior) => {
      stateMachine.updateSession(sessionId, "idle", "PermissionResolved")
      // Claude Code PermissionRequest 要求的响应格式
      // behavior: allow / deny / cancel（always 归为 allow）
      const mappedBehavior = behavior === "always" ? "allow" : behavior
      const responseBody = JSON.stringify({
        hookSpecificOutput: {
          hookEventName: "PermissionRequest",
          decision: { behavior: mappedBehavior },
        },
      })
      log.info(`[AgentServer] /permission resolved: behavior=${behavior} -> ${mappedBehavior}`)
      tryRespond(res, responseBody)
    }).catch((reason) => {
      stateMachine.updateSession(sessionId, "idle", "PermissionCancelled")
      const responseBody = JSON.stringify({
        hookSpecificOutput: {
          hookEventName: "PermissionRequest",
          decision: { behavior: "cancel" },
        },
      })
      log.info(`[AgentServer] /permission cancelled: ${reason}`)
      tryRespond(res, responseBody)
    })

    cardQueue.push(item)
    if (cardQueue.length === 1) startHeadTimer()
    notifyCard()
    log.info(`[AgentServer] /permission queued: session=${sessionId}, queue=${cardQueue.length}`)
  }

  // AskUserQuestion 的 /permission：持住该 HTTP 连接生成「可作答」提问卡。
  //  用户提交 (resolve) → 回 allow + updatedInput.answers，Claude 把问题当作已回答继续执行；
  //  关闭/超时/会话完成 (reject) → 回 deny，干净结束，避免连接悬挂。
  function handleAskUserQuestionPermission(res: http.ServerResponse, sessionId: string, toolInput: any) {
    const questions = (Array.isArray(toolInput && toolInput.questions) && toolInput.questions) || null

    stateMachine.updateSession(sessionId, "notification", "AskUserQuestion", {
      toolName: "AskUserQuestion",
      toolInput,
    })

    const item: QuestionCard = {
      kind: "question",
      sessionId,
      toolName: "AskUserQuestion",
      toolInput,
      questions,
      answerable: true,
      resolve: () => {},
      reject: () => {},
      createdAt: Date.now(),
    }

    const q = new Promise<Record<string, unknown>>((resolve, reject) => {
      item.resolve = resolve
      item.reject = reject
    })

    q.then((answers) => {
      stateMachine.updateSession(sessionId, "idle", "QuestionAnswered")
      // updatedInput.questions 必须**原样回显模型原始的 questions**（schema 已对原始输入校验通过）：
      // 重建形状会丢 header、把 options 压成字符串，触发 Claude 的 schema 校验失败
      // （实测报：questions[].header 缺失、questions[].options[] 必须是对象）。
      const responseBody = JSON.stringify({
        hookSpecificOutput: {
          hookEventName: "PermissionRequest",
          decision: { behavior: "allow", updatedInput: { questions, answers } },
        },
      })
      log.info(`[AgentServer] AskUserQuestion answered via /permission: session=${sessionId}`)
      tryRespond(res, responseBody)
    }).catch((reason) => {
      stateMachine.updateSession(sessionId, "idle", "QuestionDenied")
      const responseBody = JSON.stringify({
        hookSpecificOutput: {
          hookEventName: "PermissionRequest",
          decision: { behavior: "deny" },
        },
      })
      log.info(`[AgentServer] AskUserQuestion denied: reason=${reason}, session=${sessionId}`)
      tryRespond(res, responseBody)
    })

    cardQueue.push(item)
    if (cardQueue.length === 1) startHeadTimer()
    notifyCard()
    log.info(`[AgentServer] AskUserQuestion (answerable) queued: session=${sessionId}, queue=${cardQueue.length}`)
  }

  // AskUserQuestion 的只读通道（PreToolUse → /question）：
  // 本 Claude 版本下同一提问总是先走 /permission 生成「可作答卡」，这里**不 push 卡片**——
  // 避免只读卡抢在用户作答前排队、答完后还冒出来的幽灵卡。
  // 但保留一条「仅通知」回退：若某场景只走 PreToolUse 而没有 /permission 连接可注入答案，
  // 至少设 notification 状态（脉冲 + hasActivity 拉起悬浮岛）提示有新提问，不让它完全静默。
  // 不建卡 → 不会产生幽灵卡；状态由后续完成事件清除。
  function handleQuestion(data: any, res: http.ServerResponse) {
    const sessionId = data.session_id || data.sessionId || "unknown"
    const toolName = data.tool_name || data.toolName || "AskUserQuestion"
    const toolInput = data.tool_input || data.toolInput || {}
    stateMachine.updateSession(sessionId, "notification", "AskUserQuestion", { toolName, toolInput })
    log.info(`[AgentServer] /question notified (read-only card removed): session=${sessionId}`)
    sendJson(res, 200, { ok: true, app: "erzhi-recording" })
  }

  function handleHealth(res: http.ServerResponse) {
    const sc = stateMachine.getSessions().length
    sendJson(res, 200, { ok: true, app: "erzhi-recording", port: activePort, sessionCount: sc })
  }

  function route(req: http.IncomingMessage, res: http.ServerResponse) {
    res.setHeader("Access-Control-Allow-Origin", "*")
    log.info(`[AgentServer] ${req.method} ${req.url}`)
    if (req.method === "POST" && req.url === "/state") {
      parseBody(req).then(d => handleState(d, res)).catch((e) => {
        log.error('[AgentServer] parseBody error:', e)
        sendJson(res, e?.code === "PAYLOAD_TOO_LARGE" ? 413 : 400, { error: e?.code === "PAYLOAD_TOO_LARGE" ? "Payload too large" : "Invalid JSON" })
      })
    } else if (req.method === "POST" && req.url === "/permission") {
      parseBody(req).then(d => handlePermission(d, res)).catch((e) => {
        log.error('[AgentServer] parseBody error:', e)
        sendJson(res, e?.code === "PAYLOAD_TOO_LARGE" ? 413 : 400, { error: e?.code === "PAYLOAD_TOO_LARGE" ? "Payload too large" : "Invalid JSON" })
      })
    } else if (req.method === "POST" && req.url === "/question") {
      parseBody(req).then(d => handleQuestion(d, res)).catch((e) => {
        log.error('[AgentServer] parseBody error:', e)
        sendJson(res, e?.code === "PAYLOAD_TOO_LARGE" ? 413 : 400, { error: e?.code === "PAYLOAD_TOO_LARGE" ? "Payload too large" : "Invalid JSON" })
      })
    } else if (req.method === "GET" && req.url === "/health") {
      handleHealth(res)
    } else {
      sendJson(res, 404, { error: "Not found" })
    }
  }

  // === 对外操作：只作用于队首（悬浮岛当前显示的这张） ===

  // 允许/拒绝当前的权限卡（悬浮岛按钮 / bridge 自动允许）
  function resolvePendingPermission(behavior: string) {
    const head = headCard()
    if (head && head.kind === "permission") {
      head.resolve(behavior) // 触发 perm.then → 回 decision 给 Claude
      shiftHead()            // 移出队列并提升下一张
    }
  }

  // 关闭当前的提问卡：可作答 → 回 deny（结束提问）；只读 → 仅收起
  function dismissQuestion() {
    const head = headCard()
    if (head && head.kind === "question") {
      if (head.answerable) head.reject("dismissed") // 触发 q.catch → 回 deny 给 Claude
      shiftHead()
    }
  }

  // 提交当前可作答提问卡的答案（悬浮岛「提交答案」）→ 回 allow+updatedInput.answers
  function submitQuestion(sessionId: string, answers: Record<string, unknown>) {
    const head = headCard()
    if (head && head.kind === "question" && head.answerable && head.sessionId === sessionId) {
      head.resolve(answers) // 触发 q.then → 回 allow+answers 给 Claude
      shiftHead()
      log.info(`[AgentServer] submitQuestion accepted: session=${sessionId}`)
    } else {
      log.warn(`[AgentServer] submitQuestion ignored: no matching answerable head for session=${sessionId}`)
    }
  }

  // 队首变化通知
  function setOnCardChange(cb: (card: CardItem | null) => void) {
    onCardChange = cb
  }

  // 当前队首的纯净数据（给 IPC / 懒加载补拉）
  function getSafeCurrentCard(): SafeCard | null {
    const head = headCard()
    if (!head) return null
    if (head.kind === "permission") {
      return { kind: "permission", sessionId: head.sessionId, toolName: head.toolName, toolInput: head.toolInput, suggestions: head.suggestions, createdAt: head.createdAt }
    }
    return { kind: "question", sessionId: head.sessionId, toolName: head.toolName, toolInput: head.toolInput, questions: head.questions, answerable: head.answerable, createdAt: head.createdAt }
  }

  function start(): Promise<number | null> {
    return new Promise((resolve) => {
      let currentPort = DEFAULT_PORT
      let currentServer: http.Server | null = null

      function tryListen() {
        if (currentPort > MAX_PORT) {
          log.error(`Agent server: all ports ${DEFAULT_PORT}-${MAX_PORT} occupied`)
          resolve(null)
          return
        }

        // 每次尝试创建一个新 server，避免旧 listener 堆积
        currentServer = http.createServer(route)

        currentServer.on("error", (err: any) => {
          if (err.code === "EADDRINUSE") {
            currentPort++
            tryListen()
          } else {
            log.error("Agent server error:", err.message)
            resolve(null)
          }
        })

        currentServer.listen(currentPort, "127.0.0.1", () => {
          activePort = currentPort
          server = currentServer
          try {
            const dir = getRuntimeDir()
            fs.mkdirSync(dir, { recursive: true })
            fs.writeFileSync(path.join(dir, "runtime.json"), JSON.stringify({ port: currentPort, pid: process.pid }), "utf8")
          } catch {}
          log.info(`Agent server listening on 127.0.0.1:${currentPort}`)
          resolve(currentPort)
        })
      }

      tryListen()
    })
  }

  function stop() {
    // 退出时把所有排队中的权限发给 Claude cancel，清空队列
    for (const c of cardQueue) {
      if (c.kind === "permission") c.reject("stopped")
    }
    cardQueue = []
    clearTimeout(headTimer!)
    headTimer = null
    if (onCardChange) onCardChange(null)
    if (server) {
      server.close()
      server = null
    }
    activePort = null
  }

  function getPort() { return activePort }

  return {
    start, stop, getPort, getSafeCurrentCard,
    resolvePendingPermission, dismissQuestion, submitQuestion, setOnCardChange,
  }
}
