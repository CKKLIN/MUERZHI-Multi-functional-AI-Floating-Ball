# AI Agent 集成实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在二支录制的悬浮岛中集成 Claude Code 状态监控与权限审批功能

**Architecture:** 主进程内启动 Agent Bridge（HTTP 服务器 + 状态机 + hook 管理），通过 IPC 与悬浮岛通信。hook 脚本是零依赖 Node.js 文件，被 Claude Code 调用后 POST 到本机 HTTP 服务。

**Tech Stack:** Electron 28, TypeScript, Vue 3, Node.js (内置模块 only for hook script)

## Global Constraints

- Hook 脚本必须只使用 Node.js 内置模块（fs, http, path）
- 端口范围：23338-23342，与 Clawd 的 23333-23337 不冲突
- Hook 使用 marker `name: "erzhi-recording-state"`，不覆盖其他应用的 hook
- 退出时不卸载 Claude Code hooks（避免影响其他应用）
- 所有文件路径使用 `path.join(__dirname, ...)` 而非字符串拼接

---

### Task 1: Hook 脚本（clawd-hook.js）

**Files:**
- Create: `electron/main/clawd-hook.js`
- 注意：这是纯 JavaScript，不是 TypeScript。Claude Code 用 Node.js 直接执行。

**Interfaces:**
- Consumes: stdin JSON from Claude Code hook system (事件 payload)
- Produces: HTTP POST to `127.0.0.1:{port}/state` or `/permission`; stdout JSON for Claude Code

- [ ] **Step 1: 创建 Hook 脚本骨架，实现 stdin 读取和事件分发**

```javascript
// electron/main/clawd-hook.js
// 零依赖 Node.js hook 脚本 — 由 Claude Code 调用
// stdin 读取事件 JSON → HTTP POST 到本机 /state 或 /permission

const http = require("http");
const CLAWD_HOOK_TRIGGER_EVENTS = new Set([
  "SessionStart", "SessionEnd", "UserPromptSubmit",
  "PreToolUse", "PostToolUse", "PostToolUseFailure",
  "Stop", "StopFailure", "ApiError", "Notification",
]);

function readStdin() {
  return new Promise((resolve) => {
    let body = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk) => { body += chunk; });
    process.stdin.on("end", () => resolve(body));
    // 超时 3 秒，防止 stdin 永远不会 end
    setTimeout(() => resolve(body), 3000);
  });
}

function postToClawd(path, payload, port) {
  return new Promise((resolve) => {
    const data = JSON.stringify(payload);
    const req = http.request({
      hostname: "127.0.0.1", port, path,
      method: "POST",
      headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(data) },
      timeout: 5000,
    }, (res) => {
      let body = "";
      res.on("data", (c) => { body += c; });
      res.on("end", () => resolve({ status: res.statusCode, body }));
    });
    req.on("error", () => resolve(null));
    req.on("timeout", () => { req.destroy(); resolve(null); });
    req.write(data);
    req.end();
  });
}

async function main() {
  const raw = await readStdin();
  if (!raw || !raw.trim()) {
    process.stdout.write(JSON.stringify({}) + "\n");
    return;
  }
  let event;
  try { event = JSON.parse(raw); } catch {
    process.stdout.write(JSON.stringify({}) + "\n");
    return;
  }

  // 从 argv 获取端口（由 Claude Code settings.json 传入）
  // 格式: node clawd-hook.js <port>
  const port = parseInt(process.argv[2], 10) || 23338;

  const eventName = event.event || event.event_name || "";
  const sessionId = event.session_id || event.sessionId || "";
  const state = event.state || "";
  const toolName = event.tool_name || event.toolName || "";
  const toolInput = event.tool_input || event.toolInput || null;

  // PermissionRequest 走 /permission
  if (eventName === "PermissionRequest") {
    const result = await postToClawd("/permission", {
      tool_name: toolName,
      tool_input: toolInput,
      session_id: sessionId,
      permission_suggestions: event.permission_suggestions || null,
      source_pid: process.ppid,
      cwd: process.cwd(),
    }, port);
    if (result && result.body) {
      process.stdout.write(result.body + "\n");
    } else {
      process.stdout.write(JSON.stringify({}) + "\n");
    }
    return;
  }

  // 非权限事件走 /state
  if (!sessionId || !eventName || !state) {
    process.stdout.write(JSON.stringify({}) + "\n");
    return;
  }

  const payload = {
    session_id: sessionId,
    state,
    event: eventName,
    source_pid: process.ppid,
    cwd: process.cwd(),
    tool_name: toolName,
    tool_input: toolInput,
    model: event.model || null,
    context_usage: event.context_usage || event.contextUsage || null,
    permission_suspect: event.permission_suspect === true,
  };

  await postToClawd("/state", payload, port);
  process.stdout.write(JSON.stringify({}) + "\n");
}

main().catch(() => {
  process.stdout.write(JSON.stringify({}) + "\n");
});
```

- [ ] **Step 2: 添加 shebang 和基本测试（手动验证）**

确保文件开头有 `#!/usr/bin/env node`（可选但推荐）。

手动验证命令：
```bash
echo '{"session_id":"test","state":"working","event":"PreToolUse"}' | node electron/main/clawd-hook.js 23338
# 应输出 {} 并静默退出（无 HTTP 服务时的 graceful 降级）
```

- [ ] **Step 3: 提交**

```bash
git add electron/main/clawd-hook.js
git commit -m "feat: add Claude Code hook script"
```

---

### Task 2: State Machine（agent-state-machine.ts）

**Files:**
- Create: `electron/main/agent-state-machine.ts`

**Interfaces:**
- Exports: `createAgentStateMachine()` → `{ updateSession, resolveDisplayState, getSessions, cleanStaleSessions, getCurrentState, start, stop }`
- Consumed by: `agent-server.ts`, `agent-bridge.ts`

- [ ] **Step 1: 实现状态机类型和核心逻辑**

```typescript
// electron/main/agent-state-machine.ts

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

const SESSION_STALE_MS = 10 * 60 * 1000     // 10 分钟
const WORKING_STALE_MS = 5 * 60 * 1000       // 5 分钟
const CLEANUP_INTERVAL_MS = 10 * 1000         // 10 秒
const DONE_DURATION_MS = 2000                 // done 状态持续 2 秒

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

    // Stop → done（2 秒后回 idle）
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
      if (p > STATE_PRIORITY[best]) best = s.state
    }
    // 如果有 done 定时器运行中，覆盖为 done
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
```

- [ ] **Step 2: 单元测试**

```typescript
// 简单验证（可在 Node 下运行，无需 Electron）
// node -e "const { createAgentStateMachine } = require('./electron/main/agent-state-machine')"
// 或通过 npm test 加入测试文件

function testStateMachine() {
  const sm = createAgentStateMachine()
  sm.start()

  // 测试基本状态流转
  sm.updateSession("s1", "thinking", "UserPromptSubmit")
  console.assert(sm.getCurrentState() === "thinking", "Should be thinking")
  console.assert(sm.getSessions().length === 1, "Should have 1 session")

  sm.updateSession("s1", "working", "PreToolUse", { toolName: "Write" })
  console.assert(sm.getCurrentState() === "working", "Should be working")

  sm.updateSession("s1", "idle", "Stop")
  console.assert(sm.getCurrentState() === "done", "Should be done after Stop")

  // 测试优先级：error > notification > working > thinking > idle
  sm.updateSession("s2", "error", "ApiError")
  console.assert(sm.getCurrentState() === "error", "Error should dominate")

  sm.stop()
  console.log("All state machine tests passed")
}
testStateMachine()
```

- [ ] **Step 3: 提交**

```bash
git add electron/main/agent-state-machine.ts
git commit -m "feat: add agent state machine"
```

---

### Task 3: HTTP 服务器（agent-server.ts）

**Files:**
- Create: `electron/main/agent-server.ts`

**Interfaces:**
- Exports: `createAgentServer(stateMachine)` → `{ start, stop, getPort, getPendingPermission }`
- Consumes: `agent-state-machine.ts` 的 `updateSession`
- Produces: `pendingPermission: { resolve: (behavior) => void, data: object } | null`

- [ ] **Step 1: 实现 HTTP 服务器**

```typescript
// electron/main/agent-server.ts
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

    // 通知状态机
    stateMachine.updateSession(sessionId, "notification", "PermissionRequest", {
      toolName,
      toolInput,
    })

    // 如果有上一个 pending 权限，超时它
    if (pendingPermission) {
      pendingPermission.reject("superseded")
      if (permissionTimeout) clearTimeout(permissionTimeout)
    }

    // 创建新的 pending permission
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

      // 超时
      permissionTimeout = setTimeout(() => {
        if (pendingPermission) {
          pendingPermission.reject("timeout")
          pendingPermission = null
          permissionTimeout = null
        }
      }, PERMISSION_TIMEOUT_MS)

      // 通知外部（悬浮岛）
      if (onPermissionRequest) onPermissionRequest(pendingPermission!)
    })

    // 等待决策并响应
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
          // 保存端口到 runtime 文件
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
```

- [ ] **Step 2: 提交**

```bash
git add electron/main/agent-server.ts
git commit -m "feat: add agent HTTP server for /state and /permission"
```

---

### Task 4: Claude Hook 管理器（claude-hook-manager.ts）

**Files:**
- Create: `electron/main/claude-hook-manager.ts`

**Interfaces:**
- Exports: `createClaudeHookManager(port)` → `{ install, uninstall, isInstalled, startWatcher, stopWatcher, setAutoStart, getStatus }`
- Consumed by: `agent-bridge.ts`

- [ ] **Step 1: 实现 hook 管理逻辑**

```typescript
// electron/main/claude-hook-manager.ts
import * as fs from "fs"
import * as path from "path"
import * as os from "os"
import log from "./logger"

const CLAUDE_SETTINGS_PATH = path.join(os.homedir(), ".claude", "settings.json")
const HOOK_MARKER_NAME = "erzhi-recording-state"
const AUTO_START_MARKER = "erzhi-recording-auto-start"
const WATCH_INTERVAL_MS = 5 * 60 * 1000  // 5 分钟巡检
const MAX_REPAIR_RETRIES = 3

interface ClaudeHookEntry {
  name: string
  script: string
  events: string[]
}

export interface HookManagerStatus {
  installed: boolean
  autoStart: boolean
  scriptExists: boolean
  claudeExists: boolean
  healthy: boolean
  repairFailures: number
  manualFixRequired: boolean
}

export function createClaudeHookManager(agentPort: () => number | null) {
  let watchTimer: ReturnType<typeof setInterval> | null = null
  let repairFailures = 0
  let manualFixRequired = false

  function getHookScriptPath(): string {
    // 开发环境：相对于 electron/main 的路径
    // 打包后：在 resources 目录下
    if (require("electron")?.app?.isPackaged) {
      return path.join(process.resourcesPath, "clawd-hook.js")
    }
    return path.join(__dirname, "clawd-hook.js")
  }

  function readClaudeSettings(): any | null {
    try {
      const raw = fs.readFileSync(CLAUDE_SETTINGS_PATH, "utf8")
      return JSON.parse(raw)
    } catch { return null }
  }

  function writeClaudeSettings(settings: any): boolean {
    try {
      fs.writeFileSync(CLAUDE_SETTINGS_PATH, JSON.stringify(settings, null, 2), "utf8")
      return true
    } catch (err: any) {
      log.error("Failed to write Claude settings:", err.message)
      return false
    }
  }

  function buildHookEntry(scriptPath: string): ClaudeHookEntry {
    const port = agentPort() || 23338
    return {
      name: HOOK_MARKER_NAME,
      script: `${scriptPath} ${port}`,
      events: [
        "SessionStart", "SessionEnd", "UserPromptSubmit",
        "PreToolUse", "PostToolUse", "PostToolUseFailure",
        "Stop", "StopFailure", "ApiError", "Notification",
        "PermissionRequest",
      ],
    }
  }

  function install(): { added: boolean; updated: boolean } {
    const settings = readClaudeSettings()
    if (!settings) return { added: false, updated: false }

    const hooks: ClaudeHookEntry[] = settings.hooks || []
    const scriptPath = getHookScriptPath()
    const newEntry = buildHookEntry(scriptPath)
    const existingIdx = hooks.findIndex(h => h.name === HOOK_MARKER_NAME)

    if (existingIdx >= 0) {
      // 更新已有条目（端口可能变化）
      const existing = hooks[existingIdx]
      if (existing.script !== newEntry.script) {
        hooks[existingIdx] = newEntry
        settings.hooks = hooks
        writeClaudeSettings(settings)
        return { added: false, updated: true }
      }
      return { added: false, updated: false }
    }

    // 追加新条目
    hooks.push(newEntry)
    settings.hooks = hooks
    writeClaudeSettings(settings)
    return { added: true, updated: false }
  }

  function uninstall(): { removed: boolean } {
    const settings = readClaudeSettings()
    if (!settings) return { removed: false }

    const hooks: ClaudeHookEntry[] = settings.hooks || []
    const filtered = hooks.filter(h => h.name !== HOOK_MARKER_NAME)
    if (filtered.length === hooks.length) return { removed: false }

    settings.hooks = filtered
    writeClaudeSettings(settings)
    // 也移除 auto-start
    setAutoStart(false)
    return { removed: true }
  }

  function isInstalled(): boolean {
    const settings = readClaudeSettings()
    if (!settings) return false
    const hooks: ClaudeHookEntry[] = settings.hooks || []
    return hooks.some(h => h.name === HOOK_MARKER_NAME)
  }

  function setAutoStart(enabled: boolean): boolean {
    const settings = readClaudeSettings()
    if (!settings) return false

    const hooks: ClaudeHookEntry[] = settings.hooks || []
    const autoIdx = hooks.findIndex(h => h.name === AUTO_START_MARKER)

    if (enabled && autoIdx < 0) {
      const scriptPath = getHookScriptPath()
      hooks.push({
        name: AUTO_START_MARKER,
        script: scriptPath,
        events: ["SessionStart"],
      })
      settings.hooks = hooks
      return writeClaudeSettings(settings)
    }

    if (!enabled && autoIdx >= 0) {
      hooks.splice(autoIdx, 1)
      settings.hooks = hooks
      return writeClaudeSettings(settings)
    }

    return true
  }

  function checkHealth(): { healthy: boolean; issues: string[] } {
    const issues: string[] = []
    const settings = readClaudeSettings()
    if (!settings) {
      issues.push("Claude settings file not found")
      return { healthy: false, issues }
    }
    const hooks: ClaudeHookEntry[] = settings.hooks || []
    const ours = hooks.find(h => h.name === HOOK_MARKER_NAME)
    if (!ours) {
      issues.push("Hook entry missing")
      return { healthy: false, issues }
    }
    const scriptPath = getHookScriptPath()
    if (!fs.existsSync(scriptPath)) {
      issues.push("Hook script file missing")
      return { healthy: false, issues }
    }
    return { healthy: issues.length === 0, issues }
  }

  function repair(): boolean {
    if (manualFixRequired) return false
    if (repairFailures >= MAX_REPAIR_RETRIES) {
      manualFixRequired = true
      return false
    }

    const result = install()
    if (result.added || result.updated) {
      // 重新验证
      const health = checkHealth()
      if (health.healthy) {
        repairFailures = 0
        return true
      }
    }

    repairFailures++
    return false
  }

  function performHealthCheck() {
    const health = checkHealth()
    if (!health.healthy) {
      log.warn("Claude hook health check failed:", health.issues.join(", "))
      repair()
    } else {
      // 健康则重置失败计数
      if (repairFailures > 0) repairFailures = 0
      if (manualFixRequired) manualFixRequired = false
    }
  }

  function startWatcher() {
    if (watchTimer) return
    // 首次立即检查
    performHealthCheck()
    watchTimer = setInterval(performHealthCheck, WATCH_INTERVAL_MS)
    log.info("Claude hook watcher started")
  }

  function stopWatcher() {
    if (watchTimer) { clearInterval(watchTimer); watchTimer = null }
  }

  function getStatus(): HookManagerStatus {
    const health = checkHealth()
    return {
      installed: isInstalled(),
      autoStart: (readClaudeSettings()?.hooks || []).some((h: any) => h.name === AUTO_START_MARKER),
      scriptExists: fs.existsSync(getHookScriptPath()),
      claudeExists: readClaudeSettings() !== null,
      healthy: health.healthy,
      repairFailures,
      manualFixRequired,
    }
  }

  return {
    install, uninstall, isInstalled, setAutoStart,
    startWatcher, stopWatcher, getStatus, checkHealth, repair,
  }
}
```

- [ ] **Step 2: 提交**

```bash
git add electron/main/claude-hook-manager.ts
git commit -m "feat: add Claude hook manager with install/uninstall/watcher"
```

---

### Task 5: Agent Bridge 入口（agent-bridge.ts）

**Files:**
- Create: `electron/main/agent-bridge.ts`

**Interfaces:**
- Exports: `createAgentBridge()` → `{ start, stop, getServer, getStateMachine, getHookManager, getStatus }`
- Consumes: `agent-state-machine.ts`, `agent-server.ts`, `claude-hook-manager.ts`
- Produces: IPC events（agent-state-update, permission-request）

- [ ] **Step 1: 实现 Agent Bridge 入口**

```typescript
// electron/main/agent-bridge.ts
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
  // port getter 需要 server 启动后才能获取到，用 lazy getter
  const hookManager = createClaudeHookManager(() => server.getPort())

  let stateListener: ((state: DisplayState, sessions: AgentSession[]) => void) | null = null
  let permissionListener: ((perm: PendingPermission) => void) | null = null

  // 状态变化通知 listener
  stateMachine.subscribe((state, sessions) => {
    if (stateListener) stateListener(state, sessions)
  })

  // 权限请求通知
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

  function installHooks() {
    hookManager.install()
  }

  function uninstallHooks() {
    hookManager.uninstall()
  }

  function setAutoStart(enabled: boolean) {
    hookManager.setAutoStart(enabled)
  }

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
```

- [ ] **Step 2: 提交**

```bash
git add electron/main/agent-bridge.ts
git commit -m "feat: add AgentBridge entry point orchestrating all modules"
```

---

### Task 6: 接入主进程（index.ts + ipc-handlers.ts）

**Files:**
- Modify: `electron/main/index.ts`
- Modify: `electron/main/ipc-handlers.ts`

- [ ] **Step 1: 在 index.ts 中启动 Agent Bridge**

修改 `electron/main/index.ts`，在 `app.whenReady()` 中创建并启动 Agent Bridge：

```typescript
// 在文件顶部添加导入
import { createAgentBridge, type AgentBridge } from "./agent-bridge"

// 在全局变量区域添加
let agentBridge: AgentBridge | null = null

// 在 app.whenReady() 内，createWindow 和 createTray 之后
agentBridge = createAgentBridge({
  autoInstallHooks: false,   // 默认不自动安装，由用户设置控制
  autoStartWatcher: false,
})
agentBridge.start()
```

- [ ] **Step 2: 在 ipc-handlers.ts 中注册 IPC**

在 `registerIpcHandlers()` 中新增以下 IPC handler 调用，并新建 `registerAgentBridgeHandlers()` 函数：

```typescript
// 在 ipc-handlers.ts 中添加
import { ipcMain, BrowserWindow } from 'electron'
import type { AgentBridge, PendingPermission } from "./agent-bridge"
import log from './logger'

let agentBridge: AgentBridge | null = null
// 保存对 mainWindow 的引用，用于发送 Agent 状态到悬浮岛
let bridgeMainWindow: BrowserWindow | null = null

export function setAgentBridge(bridge: AgentBridge) {
  agentBridge = bridge
}

export function setBridgeMainWindow(win: BrowserWindow) {
  bridgeMainWindow = win
}

function safeSend(channel: string, ...args: any[]) {
  // 发送到主窗口（HomeView 监听）
  const wins = BrowserWindow.getAllWindows()
  for (const win of wins) {
    if (!win.isDestroyed()) {
      try { win.webContents.send(channel, ...args) } catch {}
    }
  }
  // 也发送到悬浮岛
  if (bridgeMainWindow && !bridgeMainWindow.isDestroyed()) {
    try { bridgeMainWindow.webContents.send(channel, ...args) } catch {}
  }
}

export function registerAgentBridgeHandlers() {
  if (!agentBridge) return

  // 监听状态变化 → 通知悬浮岛和主窗口
  if (!agentBridge) return
  agentBridge.setStateListener((state, sessions) => {
    safeSend('agent-state-update', {
      state,
      sessions: sessions.map(s => ({
        sessionId: s.sessionId,
        agentId: s.agentId,
        state: s.state,
        toolName: s.toolName,
        contextUsage: s.contextUsage,
        model: s.model,
        updatedAt: s.updatedAt,
      })),
    })
  })

  // 监听权限请求 → 通知悬浮岛
  agentBridge.setPermissionListener((perm) => {
    safeSend('agent-permission-request', {
      sessionId: perm.sessionId,
      toolName: perm.toolName,
      toolInput: perm.toolInput,
      suggestions: perm.suggestions,
    })
  })

  // IPC handlers
  ipcMain.handle('agent-get-status', () => {
    return agentBridge?.getStatus() ?? null
  })

  ipcMain.handle('agent-install-hooks', () => {
    agentBridge?.installHooks()
    return agentBridge?.getStatus()
  })

  ipcMain.handle('agent-uninstall-hooks', () => {
    agentBridge?.uninstallHooks()
    return agentBridge?.getStatus()
  })

  ipcMain.handle('agent-set-auto-start', (_event, enabled: boolean) => {
    agentBridge?.setAutoStart(enabled)
  })

  ipcMain.handle('agent-resolve-permission', (_event, behavior: string) => {
    agentBridge?.resolvePermission(behavior)
  })
}
```

然后在 `registerIpcHandlers()` 中调用 `registerAgentBridgeHandlers()`，并将 agentBridge 传入：

```typescript
export function registerIpcHandlers(agentBridge?: AgentBridge) {
  // ... 现有代码 ...
  
  if (agentBridge) {
    setAgentBridge(agentBridge)
    registerAgentBridgeHandlers()
  }
}
```

修改 `electron/main/index.ts` 中 `registerIpcHandlers` 的调用，传 `agentBridge`：

```typescript
registerIpcHandlers(agentBridge)
```

- [ ] **Step 3: 提交**

```bash
git add electron/main/index.ts electron/main/ipc-handlers.ts
git commit -m "feat: wire AgentBridge into main process and IPC"
```

---

### Task 7: Preload API（preload/index.ts + env.d.ts）

**Files:**
- Modify: `electron/preload/index.ts`
- Modify: `src/env.d.ts`

- [ ] **Step 1: 在 preload 中暴露 Agent API**

```typescript
// 在 electron/preload/index.ts 的 electronAPI 对象中添加：

// Agent bridge
agentGetStatus: () => ipcRenderer.invoke('agent-get-status'),
agentInstallHooks: () => ipcRenderer.invoke('agent-install-hooks'),
agentUninstallHooks: () => ipcRenderer.invoke('agent-uninstall-hooks'),
agentSetAutoStart: (enabled: boolean) => ipcRenderer.invoke('agent-set-auto-start', enabled),
agentResolvePermission: (behavior: string) => ipcRenderer.invoke('agent-resolve-permission', behavior),
onAgentStateUpdate: (callback: (data: AgentStatePayload) => void) => {
  const handler = (_event: Electron.IpcRendererEvent, data: any) => callback(data)
  ipcRenderer.on('agent-state-update', handler)
  return () => ipcRenderer.removeListener('agent-state-update', handler)
},
onAgentPermissionRequest: (callback: (data: AgentPermissionPayload) => void) => {
  const handler = (_event: Electron.IpcRendererEvent, data: any) => callback(data)
  ipcRenderer.on('agent-permission-request', handler)
  return () => ipcRenderer.removeListener('agent-permission-request', handler)
},
```

- [ ] **Step 2: 在 env.d.ts 中添加类型声明**

```typescript
// 在 src/env.d.ts 的 ElectronAPI 接口中添加：

// Agent bridge
agentGetStatus: () => Promise<AgentBridgeStatus | null>
agentInstallHooks: () => Promise<AgentBridgeStatus | null>
agentUninstallHooks: () => Promise<AgentBridgeStatus | null>
agentSetAutoStart: (enabled: boolean) => Promise<void>
agentResolvePermission: (behavior: string) => Promise<void>
onAgentStateUpdate: (callback: (data: AgentStatePayload) => void) => () => void
onAgentPermissionRequest: (callback: (data: AgentPermissionPayload) => void) => () => void

// 新类型定义（在 ElectronAPI 接口之外）
export interface AgentStatePayload {
  state: 'idle' | 'thinking' | 'working' | 'error' | 'notification' | 'done'
  sessions: {
    sessionId: string
    agentId: string
    state: string
    toolName?: string
    contextUsage?: { used: number; limit: number }
    model?: string
    updatedAt: number
  }[]
}

export interface AgentPermissionPayload {
  sessionId: string
  toolName: string
  toolInput: any
  suggestions: string[] | null
}

export interface AgentBridgeStatus {
  serverRunning: boolean
  port: number | null
  hookInstalled: boolean | null
  displayState: string
  pendingPermission: AgentPermissionPayload | null
  sessionCount: number
}
```

- [ ] **Step 3: 提交**

```bash
git add electron/preload/index.ts src/env.d.ts
git commit -m "feat: add Agent API to preload and type declarations"
```

---

### Task 8: 悬浮岛 UI 扩展（region-selector.ts）

**Files:**
- Modify: `electron/main/region-selector.ts`

- [ ] **Step 1: 在悬浮岛 HTML 中新增 AI 状态指示器和权限卡片

修改 `showFloatingIsland` 函数中的 HTML 模板：

在 HTML 的 CSS 中新增 AI 相关样式：
```css
/* AI 状态指示器 */
.ai-indicator {
  display:flex;align-items:center;gap:6px;flex-shrink:0;
  padding:0 6px;cursor:pointer;border-radius:6px;
  transition:background 0.15s;
}
.ai-indicator:hover{background:rgba(255,255,255,0.1)}    
.ai-dot{width:8px;height:8px;border-radius:50%;flex-shrink:0;transition:all 0.3s}
.ai-dot.idle{background:#9e9e9e}
.ai-dot.thinking{background:#ffd93d;animation:ai-breathe 1.5s ease-in-out infinite}
.ai-dot.working{background:#4ecdc4;animation:ai-pulse 0.8s ease-in-out infinite}
.ai-dot.error{background:#e94560}
.ai-dot.notification{background:#b388ff;animation:ai-pulse 0.6s ease-in-out infinite}
.ai-dot.done{background:#66bb6a;animation:ai-flash 0.3s ease 3}
@keyframes ai-breathe{0%,100%{opacity:0.4;transform:scale(0.8)}50%{opacity:1;transform:scale(1.1)}}
@keyframes ai-pulse{0%,100%{opacity:0.5;transform:scale(0.9)}50%{opacity:1;transform:scale(1.15)}}
@keyframes ai-flash{0%,100%{opacity:1}50%{opacity:0.2;transform:scale(1.3)}}
.ai-label{font-size:11px;color:rgba(255,255,255,0.6);white-space:nowrap;font-weight:500}
.ai-label.active{color:#e8e8f0}

/* 权限卡片 */
.perm-card{
  width:100%;padding:8px 12px;
  background:rgba(255,255,255,0.06);
  border-top:1px solid rgba(255,255,255,0.08);
  display:none;flex-direction:column;gap:6px;
}
.perm-card.show{display:flex}
.perm-header{font-size:11px;font-weight:600;color:#e8e8f0;display:flex;align-items:center;gap:6px}
.perm-detail{font-size:10px;color:rgba(255,255,255,0.6);word-break:break-all;line-height:1.4}
.perm-tool{color:#4ecdc4;font-weight:500}
.perm-actions{display:flex;gap:6px;margin-top:2px}
.perm-btn{
  flex:1;padding:5px 8px;border:none;border-radius:6px;
  font-size:11px;font-weight:600;cursor:pointer;
  transition:all 0.15s;
}
.perm-btn.allow{background:#4ecdc4;color:#1a1a2e}
.perm-btn.allow:hover{background:#6eddd6}
.perm-btn.deny{background:rgba(255,255,255,0.1);color:#e8e8f0}
.perm-btn.deny:hover{background:rgba(233,69,96,0.3);color:#e94560}
.perm-btn.always{background:rgba(78,205,196,0.15);color:#4ecdc4;border:1px solid rgba(78,205,196,0.3)}
.perm-btn.always:hover{background:rgba(78,205,196,0.25)}
```

在悬浮岛 HTML body 的 `.island` div 内部（在关闭按钮之后）添加：
```html
<div class="sep" id="aiSep" style="display:none"></div>
<div class="ai-indicator" id="aiIndicator" style="display:none" onclick="showAiDetail()" title="点击查看详情">
  <span class="ai-dot idle" id="aiDot"></span>
  <span class="ai-label" id="aiLabel">AI 待机</span>
</div>
```

在 `.island` 外部（作为同级元素，在权限卡片展开时整个岛变高）添加：
```html
<div class="perm-card" id="permCard">
  <div class="perm-header">
    <span>🤖</span>
    <span>Claude Code 请求权限</span>
  </div>
  <div class="perm-detail">
    <span class="perm-tool" id="permTool">工具名</span>
    <span id="permTarget">目标信息</span>
  </div>
  <div class="perm-actions">
    <button class="perm-btn allow" onclick="doAllow()">✅ 允许</button>
    <button class="perm-btn deny" onclick="doDeny()">❌ 拒绝</button>
    <button class="perm-btn always" onclick="doAlwaysAllow()">📌 始终允许</button>
  </div>
</div>
```

在 JavaScript 中添加：
```javascript
// AI 状态管理
let currentAiState = 'idle'

ipcRenderer.on('agent-state-update', (e, data) => {
  const indicator = document.getElementById('aiIndicator')
  const dot = document.getElementById('aiDot')
  const label = document.getElementById('aiLabel')
  const sep = document.getElementById('aiSep')
  
  if (!data || data.state === 'idle' && data.sessions.length === 0) {
    indicator.style.display = 'none'
    sep.style.display = 'none'
    return
  }
  
  indicator.style.display = 'flex'
  sep.style.display = 'block'
  currentAiState = data.state
  
  // 更新状态点和文字
  dot.className = 'ai-dot ' + data.state
  const labels = {
    idle: 'AI 待机', thinking: 'AI 思考中', working: 'AI 工作中',
    error: 'AI 出错了', notification: '等待审批', done: '任务完成'
  }
  label.textContent = labels[data.state] || 'AI ' + data.state
  label.classList.toggle('active', data.state !== 'idle')
  
  // 更新悬浮岛宽度
  setTimeout(resizeIsland, 50)
})

// 权限审批
ipcRenderer.on('agent-permission-request', (e, data) => {
  const card = document.getElementById('permCard')
  const tool = document.getElementById('permTool')
  const target = document.getElementById('permTarget')
  
  tool.textContent = data.toolName || '未知操作'
  const inputStr = data.toolInput ? JSON.stringify(data.toolInput).slice(0, 80) : ''
  target.textContent = inputStr ? ': ' + inputStr : ''
  
  card.classList.add('show')
  // 增加悬浮岛高度以适应权限卡片
  const island = document.getElementById('island')
  const permCardHeight = 100
  ipcRenderer.send('resize-island', island.scrollWidth, getIslandHeightWithPerm())
  setTimeout(resizeIsland, 50)
})

function getIslandHeightWithPerm() {
  return 44 + 100  // 原有高度 + 权限卡片高度
}

function doAllow() { resolvePerm('allow') }
function doDeny() { resolvePerm('deny') }
function doAlwaysAllow() { resolvePerm('always') }

function resolvePerm(behavior) {
  ipcRenderer.invoke('agent-resolve-permission', behavior)
  document.getElementById('permCard').classList.remove('show')
  setTimeout(resizeIsland, 50)
}

function showAiDetail() {
  ipcRenderer.send('show-agent-detail')
}
```

修改 `resize-island` 处理器以支持高度变化：
```typescript
ipcMain.on('resize-island', (_event: any, contentWidth: number, contentHeight?: number) => {
  if (floatingIsland && !floatingIsland.isDestroyed()) {
    const bounds = islandTargetBounds || screen.getPrimaryDisplay().bounds
    const totalW = contentWidth + 20
    const h = contentHeight || 44
    const newX = Math.round(bounds.x + (bounds.width - totalW) / 2)
    floatingIsland.setBounds({ x: newX, y: bounds.y + 4, width: totalW, height: h })
  }
})
```

- [ ] **Step 2: 提交**

```bash
git add electron/main/region-selector.ts
git commit -m "feat: add AI status indicator and permission card to floating island"
```

---

### Task 9: 设置面板（SettingsPanel.vue + HomeView.vue）

**Files:**
- Modify: `src/components/SettingsPanel.vue`
- Modify: `src/views/HomeView.vue`

- [ ] **Step 1: 在 HomeView.vue 中处理 Agent 事件**

在 HomeView.vue 的 `onMounted` 中添加：
```typescript
// 监听 Agent 状态更新
const cleanupAgentState = window.electronAPI.onAgentStateUpdate((data) => {
  // 更新响应式状态供 UI 使用
  // 目前悬浮岛自己处理显示，HomeView 主要用于状态日志
})

// 监听权限请求
const cleanupAgentPerm = window.electronAPI.onAgentPermissionRequest((data) => {
  // 主窗口可以显示一个提示
})

onUnmounted(() => {
  cleanupAgentState()
  cleanupAgentPerm()
})
```

- [ ] **Step 2: 在 SettingsPanel.vue 中新增 AI 设置标签页**

在模板底部、about-footer 之前添加：
```vue
<!-- AI 助手设置 -->
<div class="settings-group">
  <div class="group-header">AI 助手</div>
  <div class="settings-section">
    <div class="setting-row">
      <label>Claude Code 集成</label>
      <div class="setting-control">
        <button class="btn btn-sm" @click="toggleClaudeIntegration">
          {{ claudeIntegrated ? '已安装' : '未安装' }}
        </button>
      </div>
    </div>
    <div class="setting-row" v-if="claudeIntegrated">
      <label>AI 状态显示</label>
      <div class="setting-control">
        <label class="toggle">
          <input type="checkbox" v-model="showAiState" @change="saveAiSettings" />
          <span class="slider"></span>
        </label>
      </div>
    </div>
    <div class="setting-row" v-if="claudeIntegrated">
      <label>权限审批</label>
      <div class="setting-control">
        <label class="toggle">
          <input type="checkbox" v-model="enablePermissions" @change="saveAiSettings" />
          <span class="slider"></span>
        </label>
      </div>
    </div>
    <div class="setting-row" v-if="claudeIntegrated">
      <label>自动启动</label>
      <div class="setting-control">
        <label class="toggle">
          <input type="checkbox" v-model="autoStartWithClaude" @change="toggleAutoStart" />
          <span class="slider"></span>
        </label>
      </div>
    </div>
    <div class="setting-row" v-if="bridgeStatus">
      <label>端口</label>
      <span class="port-badge">{{ bridgeStatus.port || '-' }}</span>
    </div>
    <div class="setting-row">
      <label>服务状态</label>
      <span :class="['status-badge', bridgeStatus?.serverRunning ? 'online' : 'offline']">
        {{ bridgeStatus?.serverRunning ? '运行中' : '未启动' }}
      </span>
    </div>
    <div class="setting-row" v-if="bridgeStatus">
      <label>Agent</label>
      <span :class="['status-badge', bridgeStatus.sessionCount > 0 ? 'online' : 'idle']">
        {{ bridgeStatus.displayState }} ({{ bridgeStatus.sessionCount }} 会话)
      </span>
    </div>
  </div>
</div>
```

在 script 中添加响应式数据和函数：
```typescript
const claudeIntegrated = ref(false)
const showAiState = ref(true)
const enablePermissions = ref(true)
const autoStartWithClaude = ref(false)
const bridgeStatus = ref<AgentBridgeStatus | null>(null)
let statusInterval: ReturnType<typeof setInterval> | null = null

async function loadAiStatus() {
  try {
    const status = await window.electronAPI.agentGetStatus()
    if (status) {
      bridgeStatus.value = status
      claudeIntegrated.value = status.hookInstalled === true
    }
  } catch {}
}

async function toggleClaudeIntegration() {
  if (claudeIntegrated.value) {
    await window.electronAPI.agentUninstallHooks()
    claudeIntegrated.value = false
  } else {
    const status = await window.electronAPI.agentInstallHooks()
    claudeIntegrated.value = status?.hookInstalled === true
  }
  await loadAiStatus()
}

async function toggleAutoStart() {
  await window.electronAPI.agentSetAutoStart(autoStartWithClaude.value)
}

function saveAiSettings() {
  localStorage.setItem('erzhi-ai-settings', JSON.stringify({
    showAiState: showAiState.value,
    enablePermissions: enablePermissions.value,
    autoStartWithClaude: autoStartWithClaude.value,
  }))
}

function loadAiSettings() {
  try {
    const saved = localStorage.getItem('erzhi-ai-settings')
    if (saved) {
      const parsed = JSON.parse(saved)
      if (typeof parsed.showAiState === 'boolean') showAiState.value = parsed.showAiState
      if (typeof parsed.enablePermissions === 'boolean') enablePermissions.value = parsed.enablePermissions
      if (typeof parsed.autoStartWithClaude === 'boolean') autoStartWithClaude.value = parsed.autoStartWithClaude
    }
  } catch {}
}

onMounted(() => {
  loadAiSettings()
  loadAiStatus()
  statusInterval = setInterval(loadAiStatus, 5000)
})

onUnmounted(() => {
  if (statusInterval) clearInterval(statusInterval)
})
```

- [ ] **Step 3: 提交**

```bash
git add src/components/SettingsPanel.vue src/views/HomeView.vue
git commit -m "feat: add AI assistant settings tab and event handling"
```

---

### Task 10: 集成测试与调试

**Files:**
- No new files — manual verification

- [ ] **Step 1: 验证 hook 脚本**

```bash
# 模拟 Claude Code 事件
echo '{"session_id":"test1","state":"thinking","event":"UserPromptSubmit"}' | node electron/main/clawd-hook.js 23338
echo '{"session_id":"test1","state":"working","event":"PreToolUse","tool_name":"Write","tool_input":{"file_path":"test.ts"}}' | node electron/main/clawd-hook.js 23338
echo '{"session_id":"test1","state":"idle","event":"Stop"}' | node electron/main/clawd-hook.js 23338
```

- [ ] **Step 2: 启动应用验证**

```bash
npm run dev
```

验证：
1. 应用启动后，检查 23338 端口是否在监听
2. 在设置页的"AI 助手"标签页点击"安装"按钮
3. 检查 `~/.claude/settings.json` 中是否出现了 hook 条目
4. 打开 Claude Code 执行一个任务，观察悬浮岛是否显示 AI 状态变化
5. 当 Claude Code 请求权限时，验证悬浮岛是否弹出权限卡片
6. 点击 Allow/Deny 验证权限是否生效

- [ ] **Step 3: 提交最终集成**

```bash
git add .
git commit -m "feat: complete AI agent integration"
```
