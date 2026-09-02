// electron/main/session-title.ts
// 读取 Claude Code 自己的会话标题：~/.claude/sessions/<pid>.json 的 name 字段。
// Claude Code 的会话列表（/resume、VS Code 扩展侧栏）显示的就是这个 name——
// nameSource="derived" 是目录名派生的占位 slug，Claude 生成/用户设置真标题后会就地升级该文件。
// 本模块保持纯 Node（无 electron 依赖），与 agent-state-machine 同约定。

import * as fs from "node:fs"
import * as path from "node:path"
import * as os from "node:os"

interface ClaudeSessionTitle {
  name: string
  nameSource: string | null
  startedAt: number
}

// sessions 目录扫描缓存：hook 事件可能每秒多条，不能每次都 readdir 全目录读文件；
// 但 name 会被 Claude Code 就地升级（derived → 真实标题），缓存也不能太长。5s 折衷。
const SCAN_TTL_MS = 5_000
let scanCache: Map<string, ClaudeSessionTitle> | null = null
let scanCacheAt = 0

function sessionsDir(): string {
  return path.join(os.homedir(), ".claude", "sessions")
}

// "真实标题"（用户设置 / Claude 生成）优先于占位 slug；同级取新启动的
function betterEntry(a: ClaudeSessionTitle, b: ClaudeSessionTitle): boolean {
  const aReal = a.nameSource !== null && a.nameSource !== "derived"
  const bReal = b.nameSource !== null && b.nameSource !== "derived"
  if (aReal !== bReal) return aReal
  return a.startedAt >= b.startedAt
}

function scanSessionFiles(): Map<string, ClaudeSessionTitle> {
  const now = Date.now()
  if (scanCache && now - scanCacheAt < SCAN_TTL_MS) return scanCache
  const result = new Map<string, ClaudeSessionTitle>()
  try {
    const dir = sessionsDir()
    for (const f of fs.readdirSync(dir)) {
      if (!f.endsWith(".json")) continue
      try {
        // 单个文件可能正被 Claude Code 写一半 / 损坏：逐文件隔离，坏文件跳过不拖垮整体
        const d = JSON.parse(fs.readFileSync(path.join(dir, f), "utf-8"))
        const sessionId = typeof d.sessionId === "string" ? d.sessionId : ""
        const name = typeof d.name === "string" ? d.name.trim() : ""
        if (!sessionId || !name) continue
        const entry: ClaudeSessionTitle = {
          name,
          nameSource: typeof d.nameSource === "string" ? d.nameSource : null,
          startedAt: typeof d.startedAt === "number" ? d.startedAt : 0,
        }
        // 同一 sessionId 可能有多份 pid 文件（resume / 重开）：取更好的一份
        const prev = result.get(sessionId)
        if (!prev || betterEntry(entry, prev)) result.set(sessionId, entry)
      } catch {}
    }
  } catch {} // sessions 目录不存在（老版本 / 未装 Claude）：返回空表
  scanCache = result
  scanCacheAt = now
  return result
}

/** 取 Claude Code 列表里显示的会话标题；无记录返回 null（调用方退回自己的标题来源） */
export function getClaudeSessionTitle(sessionId: string): string | null {
  if (!sessionId) return null
  return scanSessionFiles().get(sessionId)?.name ?? null
}
