#!/usr/bin/env node
// electron/main/clawd-hook.js
// Zero-dependency Node.js hook script — invoked by Claude Code CLI
// Usage: node clawd-hook.js <EventName>
// Reads event JSON from stdin, derives state from event name, POSTs to local server

const http = require("http");
const fs = require("fs");
const path = require("path");
const os = require("os");

// 日志文件
const LOG_FILE = path.join(os.homedir(), ".erzhi-recording", "hook.log");
const DEBUG_LOG = path.join(os.homedir(), ".erzhi-recording", "hook-debug.log");

function hookLog(...args) {
  const line = `[${new Date().toISOString()}] [CLAWD-HOOK] ${args.join(" ")}\n`;
  try { fs.appendFileSync(LOG_FILE, line); } catch {}
}

function hookDebug(...args) {
  const line = `[${new Date().toISOString()}] [DEBUG] ${args.join(" ")}\n`;
  try { fs.appendFileSync(DEBUG_LOG, line); } catch {}
}

function readStdin() {
  return new Promise((resolve) => {
    let body = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk) => { body += chunk; });
    process.stdin.on("end", () => resolve(body));
    setTimeout(() => resolve(body), 3000);
  });
}

function readRuntimePort() {
  try {
    const runtimePath = path.join(os.homedir(), ".erzhi-recording", "runtime.json");
    const raw = fs.readFileSync(runtimePath, "utf8");
    const config = JSON.parse(raw);
    return config.port || 23338;
  } catch {
    return 23338;
  }
}

function postToClawd(path, payload, port, timeoutMs) {
  return new Promise((resolve) => {
    const data = JSON.stringify(payload);
    hookLog(`POST ${port}${path} payload=${data.substring(0, 200)}`);
    const req = http.request({
      hostname: "127.0.0.1", port, path,
      method: "POST",
      headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(data) },
      // 默认 5s；PermissionRequest 走挂起审批（服务端卡片等待决策）时传更大 timeout（130s，
      // 覆盖服务端 HEAD_TIMEOUT_MS 120s），避免客户端过早 abort 写空响应。其余事件 5s 足够。
      timeout: timeoutMs || 5000,
    }, (res) => {
      let body = "";
      res.on("data", (c) => { body += c; });
      res.on("end", () => { hookLog(`RESPONSE ${res.statusCode}`); resolve({ status: res.statusCode, body }); });
    });
    req.on("error", (e) => { hookLog(`ERROR: ${e.message}`); resolve(null); });
    req.on("timeout", () => { hookLog("TIMEOUT"); req.destroy(); resolve(null); });
    req.write(data);
    req.end();
  });
}

// 事件名 → 状态映射
const EVENT_TO_STATE = {
  SessionStart: "idle",
  SessionEnd: "idle",
  UserPromptSubmit: "thinking",
  PreToolUse: "working",
  PostToolUse: "working",
  PostToolUseFailure: "error",
  Stop: "idle",
  StopFailure: "error",
  ApiError: "error",
  Notification: "notification",
  PermissionRequest: "notification",
};

async function main() {
  // 事件名从命令行参数获取（Claude Code CLI 传递方式）
  const eventName = process.argv[2] || "";

  // 调试信息
  hookDebug(`START: event=${eventName}, argv=${JSON.stringify(process.argv)}`);
  hookDebug(`ENV: HOME=${process.env.HOME}, USERPROFILE=${process.env.USERPROFILE}, HOMEPATH=${process.env.HOMEPATH}`);
  hookDebug(`homedir()=${os.homedir()}, cwd=${process.cwd()}`);
  hookDebug(`LOG_FILE=${LOG_FILE}`);

  if (!eventName) {
    hookDebug("EMPTY event name, exiting");
    process.stdout.write(JSON.stringify({}) + "\n");
    return;
  }

  hookLog(`STARTED event=${eventName} pid=${process.pid}`);

  const raw = await readStdin();
  hookLog(`STDIN: ${raw.substring(0, 300)}`);

  if (!raw || !raw.trim()) {
    hookLog("EMPTY stdin");
    process.stdout.write(JSON.stringify({}) + "\n");
    return;
  }

  let event;
  try {
    event = JSON.parse(raw);
  } catch (e) {
    hookLog(`JSON parse error: ${e.message}`);
    process.stdout.write(JSON.stringify({}) + "\n");
    return;
  }

  const port = readRuntimePort();
  const sessionId = event.session_id || event.sessionId || "";
  const state = EVENT_TO_STATE[eventName] || "idle";
  const toolName = event.tool_name || event.toolName || "";
  const toolInput = event.tool_input || event.toolInput || null;
  // tool_use_id：Claude Code 为每次工具调用分配的稳定 ID，贯穿 PermissionRequest/PreToolUse/PostToolUse*/PermissionDenied。
  // 服务端拿它按"同一工具调用"精确匹配：用户在 Claude Code 原生界面允许/拒绝后，后端据此关闭对应的权限审批卡
  // （避免"原生界面已处理、悬浮岛却还挂着审批卡"，且能精确关闭该卡挂起的 /permission 连接）。
  const toolUseId = event.tool_use_id || event.toolUseId || "";

  hookLog(`EVENT: name=${eventName}, session=${sessionId}, state=${state}, tool=${toolName}, port=${port}`);

  if (eventName === "PermissionRequest") {
    // 挂起式审批：postToClawd 传大 timeout（覆盖服务端 HEAD_TIMEOUT_MS 120s），
    // 避免客户端 5s 提前 abort 写空响应。卡片最终由悬浮岛决策 / 服务端超时兜底。
    const result = await postToClawd("/permission", {
      tool_name: toolName,
      tool_input: toolInput,
      session_id: sessionId,
      tool_use_id: toolUseId,
      permission_suggestions: event.permission_suggestions || null,
      source_pid: process.ppid,
      cwd: process.cwd(),
    }, port, 130000);
    if (result && result.body) {
      process.stdout.write(result.body + "\n");
    } else {
      process.stdout.write(JSON.stringify({}) + "\n");
    }
    return;
  }

  // AskUserQuestion 是工具调用，走 PreToolUse 触发；仅拦截 PreToolUse（PostToolUse 同名但无 questions，
  // 避免重复推送）。只读通知卡片用：把问题+选项发给悬浮岛展示，而不是注入答案（hook 无法返回工具结果）。
  if (eventName === "PreToolUse" && toolName === "AskUserQuestion") {
    await postToClawd("/question", {
      session_id: sessionId,
      tool_name: toolName,
      tool_input: toolInput,
      questions: (toolInput && toolInput.questions) || null,
    }, port);
  }

  if (!sessionId) {
    hookLog(`SKIP: missing sessionId`);
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
    tool_use_id: toolUseId,
    model: event.model || null,
    context_usage: event.context_usage || event.contextUsage || null,
    // 用户消息原文（仅 UserPromptSubmit 事件携带）：主进程取会话的首条 prompt 当标题
    prompt: event.prompt || null,
  };

  await postToClawd("/state", payload, port);
  process.stdout.write(JSON.stringify({}) + "\n");
}

main().catch((e) => {
  hookLog(`FATAL: ${e.message}`);
  process.stdout.write(JSON.stringify({}) + "\n");
});
