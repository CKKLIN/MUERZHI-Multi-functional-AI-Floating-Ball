#!/usr/bin/env node
// src-tauri/resources/antigravity-hook.js
// Zero-dependency Node.js hook script — invoked by Antigravity (Google DeepMind)
// Configured in ~/.gemini/config/hooks.json or .agents/hooks.json
// Usage: node antigravity-hook.js <EventName>
// EventName: SessionStart | PreInvocation | PreToolUse | PostToolUse | PostInvocation | Stop

const http = require("http");
const fs = require("fs");
const path = require("path");
const os = require("os");

const LOG_FILE = path.join(os.homedir(), ".erzhi-recording", "antigravity-hook.log");
const LOG_MAX_BYTES = 4 * 1024 * 1024;

function rotateIfNeeded(file) {
  try {
    if (fs.existsSync(file) && fs.statSync(file).size > LOG_MAX_BYTES) {
      try { fs.unlinkSync(file + ".bak"); } catch {}
      fs.renameSync(file, file + ".bak");
    }
  } catch {}
}

function hookLog(...args) {
  const line = `[${new Date().toISOString()}] [ANTIGRAVITY-HOOK] ${args.join(" ")}\n`;
  try { rotateIfNeeded(LOG_FILE); fs.appendFileSync(LOG_FILE, line); } catch {}
}

function readStdin() {
  return new Promise((resolve) => {
    if (process.stdin.isTTY) return resolve("");
    let body = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk) => { body += chunk; });
    process.stdin.on("end", () => resolve(body));
    setTimeout(() => resolve(body), 500);
  });
}

function readRuntimePort() {
  try {
    const runtimePath = path.join(os.homedir(), ".erzhi-recording", "runtime.json");
    const raw = fs.readFileSync(runtimePath, "utf8");
    const config = JSON.parse(raw);
    return config.port || null;
  } catch {
    return null;
  }
}

function postToMuerzhi(endpoint, payload, port, timeoutMs) {
  return new Promise((resolve) => {
    const data = JSON.stringify(payload);
    hookLog(`POST ${port}${endpoint} payload=${data.substring(0, 200)}`);
    const req = http.request({
      hostname: "127.0.0.1",
      port,
      path: endpoint,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(data),
      },
      timeout: timeoutMs || 5000,
    }, (res) => {
      let body = "";
      res.on("data", (c) => { body += c; });
      res.on("end", () => {
        hookLog(`RESPONSE ${res.statusCode} body=${body.substring(0, 200)}`);
        resolve({ status: res.statusCode, body });
      });
    });
    req.on("error", (e) => {
      hookLog(`ERROR: ${e.message}`);
      resolve(null);
    });
    req.on("timeout", () => {
      hookLog("TIMEOUT");
      req.destroy();
      resolve(null);
    });
    req.write(data);
    req.end();
  });
}

// 需要在桌面悬浮岛上提示/审批的工具集合（修改类 / 执行类工具）
const WRITE_TOOLS = new Set([
  "run_command",
  "write_file",
  "edit_file",
  "invoke_subagent",
  "define_subagent",
]);

function safeExit(eventName) {
  if (eventName === "PreToolUse") {
    process.stdout.write(JSON.stringify({ decision: "allow" }) + "\n");
  } else {
    process.stdout.write(JSON.stringify({}) + "\n");
  }
}

async function main() {
  const eventName = process.argv[2] || "";
  if (!eventName) {
    safeExit(eventName);
    return;
  }

  const raw = await readStdin();
  hookLog(`INVOKED: event=${eventName}, raw_len=${raw ? raw.length : 0}`);
  if (!raw || !raw.trim()) {
    safeExit(eventName);
    return;
  }

  let event;
  try {
    event = JSON.parse(raw);
  } catch (e) {
    hookLog(`JSON parse error: ${e.message}`);
    safeExit(eventName);
    return;
  }

  const port = readRuntimePort();
  if (!port) {
    hookLog("NO PORT: MUERZHI agent server 未运行, 安全放行工具");
    safeExit(eventName);
    return;
  }

  const sessionId = event.conversationId || event.sessionId || "antigravity-session";
  const model = event.modelName || "Antigravity";
  const toolCall = event.toolCall || null;
  const toolName = toolCall ? toolCall.name : "";
  const toolInput = toolCall ? toolCall.args : null;
  const toolUseId = String(event.stepIdx != null ? event.stepIdx : Date.now());

  hookLog(`EVENT: ${eventName}, session=${sessionId}, model=${model}, tool=${toolName}`);

  // 1. SessionStart
  if (eventName === "SessionStart") {
    await postToMuerzhi("/state", {
      session_id: sessionId,
      agent_id: "antigravity",
      state: "idle",
      event: "SessionStart",
      model,
      prompt: event.lastUserInput || null,
    }, port);
    process.stdout.write(JSON.stringify({}) + "\n");
    return;
  }

  // 2. PreInvocation (开始思考 / 请求大模型)
  if (eventName === "PreInvocation") {
    await postToMuerzhi("/state", {
      session_id: sessionId,
      agent_id: "antigravity",
      state: "thinking",
      event: "PreInvocation",
      model,
      prompt: event.lastUserInput || null,
    }, port);
    process.stdout.write(JSON.stringify({}) + "\n");
    return;
  }

  // 3. PreToolUse (工具调用前：问答交互 / 权限审批 / 状态更新)
  if (eventName === "PreToolUse") {
    // 问答工具 AskQuestion 特殊处理
    if (toolName === "ask_question" && toolInput && toolInput.questions) {
      await postToMuerzhi("/question", {
        session_id: sessionId,
        agent_id: "antigravity",
        tool_name: toolName,
        tool_input: toolInput,
        questions: toolInput.questions,
      }, port);
    }

    // 只读工具直接放行，但向悬浮岛上报 working 状态展示正在读取
    if (!WRITE_TOOLS.has(toolName) && toolName !== "ask_question") {
      await postToMuerzhi("/state", {
        session_id: sessionId,
        agent_id: "antigravity",
        state: "working",
        event: "PreToolUse",
        tool_name: toolName,
        tool_input: toolInput,
        tool_use_id: toolUseId,
        model,
      }, port);
      process.stdout.write(JSON.stringify({ decision: "allow" }) + "\n");
      return;
    }

    // 需审批工具（run_command、write_file、edit_file 等）：向 /permission 发送长轮询挂起请求
    const res = await postToMuerzhi("/permission", {
      agent_id: "antigravity",
      tool_name: toolName,
      tool_input: toolInput,
      session_id: sessionId,
      tool_use_id: toolUseId,
      source_pid: process.ppid,
      cwd: process.cwd(),
    }, port, 1860000);

    if (res && res.body) {
      try {
        const bodyObj = JSON.parse(res.body);
        const behavior = bodyObj?.hookSpecificOutput?.decision?.behavior;
        if (behavior === "allow" || behavior === "always") {
          process.stdout.write(JSON.stringify({ decision: "allow" }) + "\n");
          return;
        } else if (behavior === "deny") {
          process.stdout.write(JSON.stringify({
            decision: "deny",
            reason: "Operation denied by user via MUERZHI floating island",
          }) + "\n");
          return;
        }
      } catch (err) {
        hookLog(`Permission parse err: ${err.message}`);
      }
    }

    // 默认或超时安全回退：允许工具执行
    process.stdout.write(JSON.stringify({ decision: "allow" }) + "\n");
    return;
  }

  // 4. PostToolUse (工具执行完成)
  if (eventName === "PostToolUse") {
    const isError = !!event.error;
    await postToMuerzhi("/state", {
      session_id: sessionId,
      agent_id: "antigravity",
      state: isError ? "error" : "working",
      event: isError ? "PostToolUseFailure" : "PostToolUse",
      tool_name: toolName,
      tool_input: toolInput,
      tool_use_id: toolUseId,
      model,
    }, port);
    process.stdout.write(JSON.stringify({}) + "\n");
    return;
  }

  // 5. PostInvocation / Stop (回合结束 / 任务完成)
  if (eventName === "PostInvocation" || eventName === "Stop") {
    await postToMuerzhi("/state", {
      session_id: sessionId,
      agent_id: "antigravity",
      state: "idle",
      event: "Stop",
      model,
    }, port);
    process.stdout.write(JSON.stringify({}) + "\n");
    return;
  }

  // 其他未识别事件
  process.stdout.write(JSON.stringify({}) + "\n");
}

main().catch((e) => {
  hookLog(`FATAL: ${e.message}`);
  safeExit(process.argv[2] || "");
});
