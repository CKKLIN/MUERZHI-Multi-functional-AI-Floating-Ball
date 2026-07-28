// electron/main/agent-server.ts
// HTTP server for /state, /permission, /health endpoints

import * as http from "http"
import * as fs from "fs"
import * as path from "path"
import { createAgentStateMachine, type AgentLogicalState } from "./agent-state-machine"
import log from "./logger"

const DEFAULT_PORT = 23338
const MAX_PORT = 23342
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

  function parseBody(req: http.IncomingMessage): Promise<any> {
    return new Promise((resolve, reject) => {
      let body = ""
      req.on("data", (c) => { body += c })
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

    if (!sessionId || !state || !event) {
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
      sendJson(res, 200, { behavior })
    }).catch((reason) => {
      if (res.headersSent) return
      stateMachine.updateSession(sessionId, "idle", "PermissionCancelled")
      sendJson(res, 200, { behavior: "cancel" })
    })
  }

  function handleHealth(res: http.ServerResponse) {
    sendJson(res, 200, { ok: true, app: "erzhi-recording", port: activePort })
  }

  function route(req: http.IncomingMessage, res: http.ServerResponse) {
    res.setHeader("Access-Control-Allow-Origin", "*")
    if (req.method === "POST" && req.url === "/state") {
      parseBody(req).then(d => handleState(d, res)).catch(() => sendJson(res, 400, { error: "Invalid JSON" }))
    } else if (req.method === "POST" && req.url === "/permission") {
      parseBody(req).then(d => handlePermission(d, res)).catch(() => sendJson(res, 400, { error: "Invalid JSON" }))
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
      server = http.createServer(route)
      let port = DEFAULT_PORT
      const tryListen = () => {
        if (port > MAX_PORT) {
          log.error(`Agent server: all ports ${DEFAULT_PORT}-${MAX_PORT} occupied`)
          resolve(null)
          return
        }
        server!.listen(port, "127.0.0.1", () => {
          activePort = port
          try {
            const dir = getRuntimeDir()
            fs.mkdirSync(dir, { recursive: true })
            fs.writeFileSync(path.join(dir, "runtime.json"), JSON.stringify({ port, pid: process.pid }), "utf8")
          } catch {}
          log.info(`Agent server listening on 127.0.0.1:${port}`)
          resolve(port)
        })
        server!.on("error", (err: any) => {
          if (err.code === "EADDRINUSE") {
            port++
            tryListen()
          } else {
            log.error("Agent server error:", err.message)
            resolve(null)
          }
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
