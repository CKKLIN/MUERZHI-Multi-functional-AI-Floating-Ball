#!/usr/bin/env node
// electron/main/clawd-hook.js
// Zero-dependency Node.js hook script — invoked by Claude Code
// Reads event JSON from stdin → HTTP POST to local /state or /permission

const http = require("http");

function readStdin() {
  return new Promise((resolve) => {
    let body = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk) => { body += chunk; });
    process.stdin.on("end", () => resolve(body));
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

  const port = parseInt(process.argv[2], 10) || 23338;

  const eventName = event.event || event.event_name || "";
  const sessionId = event.session_id || event.sessionId || "";
  const state = event.state || "";
  const toolName = event.tool_name || event.toolName || "";
  const toolInput = event.tool_input || event.toolInput || null;

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
