// electron/main/agent-server.ts
// HTTP server for /state, /permission, /health endpoints

import * as http from "http"
import * as fs from "fs"
import * as path from "path"
import { createAgentStateMachine, type AgentLogicalState } from "./agent-state-machine"
import log from "./logger"

const DEFAULT_PORT = 60000
const MAX_PORT = 60019
const PERMISSION_TIMEOUT_MS = 120_000

export interface PendingPermission {
  sessionId: string
  toolName: string
  toolInput: any
  suggestions: string[] | null
  resolve: (behavior: string) => void
  reject: (reason: string) => void
  createdAt: number
}

let runtimeDir: string | null = null

function getRuntimeDir(): string {
  if (runtimeDir) return runtimeDir
  runtimeDir = path.join(require("os").homedir(), ".erzhi-recording")
  return runtimeDir
}

export function createAgentServer(stateMachine: ReturnType<typeof createAgentStateMachine>) {
  let server: http.Server | null = null
  let activePort: number | null = null
  let pendingPermission: PendingPermission | null = null
  let permissionTimeout: ReturnType<typeof setTimeout> | null = null
  let onPermissionRequest: ((perm: PendingPermission) => void) | null = null

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

    log.info(`[AgentServer] /state ok, total sessions=${stateMachine.getSessions().length}`)
    sendJson(res, 200, { ok: true, app: "erzhi-recording" })
  }

  function handlePermission(data: any, res: http.ServerResponse) {
    const toolName = data.tool_name || data.toolName || "unknown"
    const toolInput = data.tool_input || data.toolInput || {}
    const sessionId = data.session_id || data.sessionId || "unknown"

    stateMachine.updateSession(sessionId, "notification", "PermissionRequest", {
      toolName,
      toolInput,
    })

    if (pendingPermission) {
      pendingPermission.reject("superseded")
      if (permissionTimeout) clearTimeout(permissionTimeout)
    }

    const perm = new Promise<string>((resolve, reject) => {
      pendingPermission = {
        sessionId,
        toolName,
        toolInput,
        suggestions: data.permission_suggestions || null,
        resolve,
        reject,
        createdAt: Date.now(),
      }

      permissionTimeout = setTimeout(() => {
        if (pendingPermission) {
          pendingPermission.reject("timeout")
          pendingPermission = null
          permissionTimeout = null
        }
      }, PERMISSION_TIMEOUT_MS)

      if (onPermissionRequest) onPermissionRequest(pendingPermission!)
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
    } else if (req.method === "GET" && req.url === "/health") {
      handleHealth(res)
    } else {
      sendJson(res, 404, { error: "Not found" })
    }
  }

  function resolvePendingPermission(behavior: string) {
    if (pendingPermission) {
      if (permissionTimeout) clearTimeout(permissionTimeout)
      permissionTimeout = null
      pendingPermission.resolve(behavior)
      pendingPermission = null
    }
  }

  function cancelPendingPermission() {
    if (pendingPermission) {
      if (permissionTimeout) clearTimeout(permissionTimeout)
      permissionTimeout = null
      pendingPermission.reject("cancelled")
      pendingPermission = null
    }
  }

  function setOnPermissionRequest(cb: (perm: PendingPermission) => void) {
    onPermissionRequest = cb
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
    cancelPendingPermission()
    if (server) {
      server.close()
      server = null
    }
    activePort = null
  }

  function getPort() { return activePort }
  function getPendingPermission() { return pendingPermission }

  return {
    start, stop, getPort, getPendingPermission,
    resolvePendingPermission, cancelPendingPermission,
    setOnPermissionRequest,
  }
}
