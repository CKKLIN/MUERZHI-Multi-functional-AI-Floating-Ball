// electron/main/agent-server.ts
// HTTP server for /state, /permission, /question, /health endpoints
// 权限审批 + AskUserQuestion 提问共用一个 FIFO 卡片队列：先来后到，同一时刻只在悬浮岛显示队首一张卡，
// 处理完（允许/拒绝/取消/超时，或提问被作答/关闭）队首后，再提升显示下一张。

import * as http from "http"
import * as fs from "fs"
import * as path from "path"
import { createAgentStateMachine, type AgentLogicalState } from "./agent-state-machine"
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
}

/** AskUserQuestion 提问卡：只读通知，展示问题+选项（hook 无法注入答案） */
export interface QuestionCard {
  kind: "question"
  sessionId: string
  toolName: string
  toolInput: any
  questions: any[] | null
  createdAt: number
}

export type CardItem = PermissionCard | QuestionCard

/** 供 IPC/渲染层使用的纯净卡片（去除 resolve/reject 函数，无法序列化） */
export type SafeCard =
  | { kind: "permission"; sessionId: string; toolName: string; toolInput: any; suggestions: string[] | null; createdAt: number }
  | { kind: "question"; sessionId: string; toolName: string; toolInput: any; questions: any[] | null; createdAt: number }

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

  // === 队列核心 ===

  function headCard(): CardItem | null {
    return cardQueue[0] ?? null
  }

  // 队首卡片到期：权限→发 cancel；提问→静默移除
  function expireHead(reason: string) {
    const head = headCard()
    if (!head) return
    if (head.kind === "permission") head.reject(reason) // 触发 perm.catch → 回 cancel 给 Claude
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
  function removeQuestionsForSession(sessionId: string) {
    const before = cardQueue.length
    const filtered = cardQueue.filter(c => !(c.kind === "question" && c.sessionId === sessionId))
    if (filtered.length === before) return
    cardQueue = filtered
    clearTimeout(headTimer!)
    headTimer = null
    startHeadTimer()
    notifyCard()
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

    // AskUserQuestion 答完会触发该 session 的完成事件 → 从队列收起该提问卡
    if (COMPLETION_EVENTS.includes(event)) removeQuestionsForSession(sessionId)

    log.info(`[AgentServer] /state ok, total sessions=${stateMachine.getSessions().length}`)
    sendJson(res, 200, { ok: true, app: "erzhi-recording" })
  }

  function handlePermission(data: any, res: http.ServerResponse) {
    const toolName = data.tool_name || data.toolName || "unknown"
    const toolInput = data.tool_input || data.toolInput || {}
    const sessionId = data.session_id || data.sessionId || "unknown"

    // AskUserQuestion 的 PermissionRequest 只是"允许执行提问工具"的前置请求，不是真正的审批。
    // 处理要点：
    //  1) 不占权限卡——否则会排到队首，把提问卡挡在后面（用户看到权限按钮而非问题选项）；
    //  2) 不自动放行——一旦响应 allow，就赢了 Claude 的审批竞态，Claude 不再等用户，AskUserQuestion 会被
    //     立即自动作答（几十毫秒完成）。正确做法是保持该 HTTP 连接挂起不做响应，让 Claude 的原生审批在
    //     竞态中胜出，从而保留"等待用户在 Claude 界面作答"的能力；
    //  3) 提问内容由随后的 PreToolUse → /question 以提问卡独立展示。
    if (toolName === "AskUserQuestion") {
      log.info(`[AgentServer] /permission hold AskUserQuestion (提问卡走 /question): session=${sessionId}`)
      return // 不响应 /permission，连接由 Claude 的 hook 超时自行关闭
    }

    stateMachine.updateSession(sessionId, "notification", "PermissionRequest", {
      toolName,
      toolInput,
    })

    // 排队而非顶替：每张权限卡各自持有 resolve/reject，在其 HTTP 连接上独立回包
    const item: PermissionCard = {
      kind: "permission",
      sessionId,
      toolName,
      toolInput,
      suggestions: data.permission_suggestions || null,
      resolve: () => {},
      reject: () => {},
      createdAt: Date.now(),
    }

    const perm = new Promise<string>((resolve, reject) => {
      item.resolve = resolve
      item.reject = reject
    })

    perm.then((behavior) => {
      if (res.headersSent) return
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
      res.writeHead(200, { "Content-Type": "application/json" })
      res.end(responseBody)
    }).catch((reason) => {
      if (res.headersSent) return
      stateMachine.updateSession(sessionId, "idle", "PermissionCancelled")
      const responseBody = JSON.stringify({
        hookSpecificOutput: {
          hookEventName: "PermissionRequest",
          decision: { behavior: "cancel" },
        },
      })
      log.info(`[AgentServer] /permission cancelled: ${reason}`)
      res.writeHead(200, { "Content-Type": "application/json" })
      res.end(responseBody)
    })

    cardQueue.push(item)
    if (cardQueue.length === 1) startHeadTimer()
    notifyCard()
    log.info(`[AgentServer] /permission queued: session=${sessionId}, queue=${cardQueue.length}`)
  }

  function handleQuestion(data: any, res: http.ServerResponse) {
    const sessionId = data.session_id || data.sessionId || "unknown"
    const toolName = data.tool_name || data.toolName || "AskUserQuestion"
    const toolInput = data.tool_input || data.toolInput || {}
    const questions = Array.isArray(data.questions) ? data.questions : null

    // 设 notification（优先级 3）让悬浮岛脉冲提示，且 hasActivity 触发 showAiIsland
    stateMachine.updateSession(sessionId, "notification", "AskUserQuestion", {
      toolName,
      toolInput,
    })

    const item: QuestionCard = {
      kind: "question",
      sessionId,
      toolName,
      toolInput,
      questions,
      createdAt: Date.now(),
    }

    cardQueue.push(item)
    if (cardQueue.length === 1) startHeadTimer()
    notifyCard()
    log.info(`[AgentServer] /question queued: session=${sessionId}, queue=${cardQueue.length}`)
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

  // 关闭当前的提问卡（悬浮岛「知道了」）
  function dismissQuestion() {
    const head = headCard()
    if (head && head.kind === "question") shiftHead()
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
    return { kind: "question", sessionId: head.sessionId, toolName: head.toolName, toolInput: head.toolInput, questions: head.questions, createdAt: head.createdAt }
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
    resolvePendingPermission, dismissQuestion, setOnCardChange,
  }
}
