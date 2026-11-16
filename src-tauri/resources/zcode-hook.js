#!/usr/bin/env node
// src-tauri/resources/zcode-hook.js
// Zero-dependency Node.js hook script — invoked by ZCode (智谱 AI 代码助手)
// Configured in ~/.zcode/cli/config.json
// Usage: node zcode-hook.js <EventName>
// Supported events: SessionStart | UserPromptSubmit | PreToolUse | PermissionRequest | PostToolUse | PostToolUseFailure | Stop

const http = require("http");
const fs = require("fs");
const path = require("path");
const os = require("os");

const LOG_FILE = path.join(os.homedir(), ".erzhi-recording", "zcode-hook.log");
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
  const line = `[${new Date().toISOString()}] [ZCODE-HOOK] ${args.join(" ")}\n`;
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

function safeExit(eventName, decision, rawBody) {
  if (eventName === "PermissionRequest") {
    const behavior = decision === "deny" ? "deny" : "allow";
    if (rawBody && typeof rawBody === "string" && rawBody.includes("hookSpecificOutput")) {
      process.stdout.write(rawBody.trim() + "\n");
    } else {
      const out = {
        hookSpecificOutput: {
          hookEventName: "PermissionRequest",
          decision: {
            behavior,
            ...(behavior === "deny" ? { message: "Operation denied by user via MUERZHI floating island" } : {}),
          },
        },
      };
      process.stdout.write(JSON.stringify(out) + "\n");
    }
    process.exit(behavior === "deny" ? 2 : 0);
  } else if (eventName === "PreToolUse") {
    if (decision === "deny") {
      process.stdout.write(JSON.stringify({
        hookSpecificOutput: {
          hookEventName: "PreToolUse",
          permissionDecision: "deny",
          permissionDecisionReason: "Denied via MUERZHI floating island",
        },
      }) + "\n");
      process.exit(2);
    } else {
      process.stdout.write(JSON.stringify({
        hookSpecificOutput: {
          hookEventName: "PreToolUse",
        },
      }) + "\n");
      process.exit(0);
    }
  } else {
    process.stdout.write(JSON.stringify({}) + "\n");
    process.exit(0);
  }
}

async function main() {
  const eventName = process.argv[2] || "";
  if (!eventName) {
    safeExit(eventName, "allow");
    return;
  }

  const raw = await readStdin();
  hookLog(`INVOKED: event=${eventName}, raw_len=${raw ? raw.length : 0}`);
  if (!raw || !raw.trim()) {
    safeExit(eventName, "allow");
    return;
  }

  let event;
  try {
    event = JSON.parse(raw);
  } catch (e) {
    hookLog(`JSON parse error: ${e.message}`);
    safeExit(eventName, "allow");
    return;
  }

  const port = readRuntimePort();
  if (!port) {
    hookLog("NO PORT: MUERZHI agent server 未运行, 放行工具");
    safeExit(eventName, "allow");
    return;
  }

  const sessionId = event.session_id || event.sessionId || "zcode-session";
  const model = event.model || event.modelId || (event.model && event.model.modelId) || "GLM";
  const toolName = event.tool_name || event.toolName || "";
  const toolInput = event.tool_input || event.toolInput || null;
  const toolUseId = event.tool_use_id || event.toolCallId || event.requestId || String(Date.now());
  const prompt = event.prompt || event.lastUserInput || null;

  hookLog(`EVENT: ${eventName}, session=${sessionId}, model=${model}, tool=${toolName}`);

  // 1. SessionStart
  if (eventName === "SessionStart") {
    await postToMuerzhi("/state", {
      session_id: sessionId,
      agent_id: "zcode",
      state: "idle",
      event: "SessionStart",
      model,
      prompt,
    }, port);
    safeExit(eventName, "allow");
    return;
  }

  // 2. UserPromptSubmit (用户发送指令 -> 开始思考)
  if (eventName === "UserPromptSubmit") {
    await postToMuerzhi("/state", {
      session_id: sessionId,
      agent_id: "zcode",
      state: "thinking",
      event: "UserPromptSubmit",
      model,
      prompt,
    }, port);
    safeExit(eventName, "allow");
    return;
  }

  // 3. PreToolUse (工具调用前状态上报与问答交互)
  if (eventName === "PreToolUse") {
    const isQuestion = toolName === "AskUserQuestion" || toolName === "ask_question" || toolName === "askQuestion";
    if (isQuestion) {
      await postToMuerzhi("/question", {
        session_id: sessionId,
        agent_id: "zcode",
        tool_name: toolName,
        tool_input: toolInput,
        tool_use_id: toolUseId,
        questions: (toolInput && toolInput.questions) || null,
        model,
      }, port);
    }

    await postToMuerzhi("/state", {
      session_id: sessionId,
      agent_id: "zcode",
      state: isQuestion ? "notification" : "working",
      event: "PreToolUse",
      tool_name: toolName,
      tool_input: toolInput,
      tool_use_id: toolUseId,
      model,
    }, port);
    safeExit(eventName, "allow");
    return;
  }

  // 4. PermissionRequest (高危操作悬浮岛挂起审批)
  if (eventName === "PermissionRequest") {
    const res = await postToMuerzhi("/permission", {
      agent_id: "zcode",
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
          safeExit(eventName, "allow", res.body);
          return;
        } else if (behavior === "deny") {
          safeExit(eventName, "deny", res.body);
          return;
        }
      } catch (err) {
        hookLog(`Permission parse err: ${err.message}`);
      }
    }

    // 默认回退：放行
    safeExit(eventName, "allow");
    return;
  }

  // 5. PostToolUse (工具执行成功)
  if (eventName === "PostToolUse") {
    await postToMuerzhi("/state", {
      session_id: sessionId,
      agent_id: "zcode",
      state: "working",
      event: "PostToolUse",
      tool_name: toolName,
      tool_input: toolInput,
      tool_use_id: toolUseId,
      model,
    }, port);
    safeExit(eventName, "allow");
    return;
  }

  // 6. PostToolUseFailure (工具执行报错)
  if (eventName === "PostToolUseFailure") {
    await postToMuerzhi("/state", {
      session_id: sessionId,
      agent_id: "zcode",
      state: "error",
      event: "PostToolUseFailure",
      tool_name: toolName,
      tool_input: toolInput,
      tool_use_id: toolUseId,
      model,
    }, port);
    safeExit(eventName, "allow");
    return;
  }

  // 7. Stop (回合结束 / 任务完成)
  if (eventName === "Stop") {
    await postToMuerzhi("/state", {
      session_id: sessionId,
      agent_id: "zcode",
      state: "idle",
      event: "Stop",
      model,
    }, port);
    safeExit(eventName, "allow");
    return;
  }

  safeExit(eventName, "allow");
}

main().catch((e) => {
  hookLog(`FATAL: ${e.message}`);
  safeExit(process.argv[2] || "", "allow");
});
