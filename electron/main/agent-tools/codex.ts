// electron/main/agent-tools/codex.ts
// Codex CLI 适配器（G4 参考模板）。以"真实进程 + 会话文件活动"做深度状态观测，
// 审批降级（'none'——Codex CLI 无注入式权限 hook）。
//
// Codex CLI 约定（版本相关，适配器做尽力而为 + 隔离）：
//   - 会话存 ~/.codex/sessions/<id>.jsonl（每行一条 JSON 消息）；config 在 ~/.codex/config.toml。
//   - 运行进程镜像名 codex.exe。
// 任何探测异常都返回空/失败而不抛出，绝不拖垮注册表或主进程。

import { execSync } from 'child_process'
import nodeFs from 'node:fs'
import os from 'node:os'
import { join } from 'node:path'
import type { ToolAdapter, AdapterSession } from './registry'

const POLL_LIVENESS_MS = 30_000          // tasklist 探测缓存
const ACTIVE_WINDOW_MS = 5 * 60 * 1000   // 5min 内的会话文件视为"仍活跃"
const MAX_SESSIONS = 5

// tasklist 结果缓存：避免每 10s 同步 spawn 阻塞主线程（同 agent-bridge checkClaudeRunning 手法）
let runningCache: boolean | null = null
let runningCacheAt = 0

function sessionDir(): string {
  // 尊重 CODEX_HOME（Codex 支持），缺省 ~/.codex
  return process.env.CODEX_HOME ?? join(os.homedir(), '.codex', 'sessions')
}

function codexRunning(): boolean {
  const now = Date.now()
  if (runningCache !== null && now - runningCacheAt < POLL_LIVENESS_MS) return runningCache
  try {
    const result = execSync('tasklist /NH /FI "IMAGENAME eq codex.exe"', { encoding: 'utf8', timeout: 2000 })
    runningCache = result.includes('codex.exe')
  } catch {
    runningCache = false
  }
  runningCacheAt = now
  return runningCache!
}

/** 从会话 jsonl 首条 user 消息里提取简短标签（尽力而为，失败回落 session id） */
function sessionLabel(file: string): string {
  try {
    const first = nodeFs.readFileSync(file, 'utf8').split('\n').find(l => l.trim())
    if (!first) return ''
    const msg = JSON.parse(first)
    const content = msg?.content
    const text = Array.isArray(content)
      ? content.map((c: any) => (typeof c === 'string' ? c : c?.text || '')).filter(Boolean).join(' ')
      : typeof content === 'string' ? content : ''
    return text.trim().slice(0, 40) || ''
  } catch {
    return ''
  }
}

export function createCodexAdapter(): ToolAdapter {
  return {
    id: 'codex',
    nameKey: 'tools.codex',
    approval: 'none',
    probeRunning: codexRunning,
    fetchSessions(): AdapterSession[] {
      const dir = sessionDir()
      let files: string[]
      try {
        files = nodeFs.readdirSync(dir).filter(f => f.endsWith('.jsonl'))
      } catch {
        return [] // 目录不存在 → 未安装/未使用
      }
      const now = Date.now()
      // 按 mtime 取最近 MAX_SESSIONS 条活跃会话
      const recent = files
        .map(f => ({ file: join(dir, f), mtime: nodeFs.statSync(join(dir, f), { throwIfNoEntry: false })?.mtimeMs ?? 0 }))
        .filter(e => e.mtime > 0)
        .sort((a, b) => b.mtime - a.mtime)
        .slice(0, MAX_SESSIONS)
      if (recent.length === 0) return []
      const running = codexRunning()
      return recent.map(e => {
        const id = e.file.split(/[\\/]/).pop()!.replace(/\.jsonl$/, '')
        const active = running && now - e.mtime < ACTIVE_WINDOW_MS
        return {
          sessionId: `codex:${id}`,
          agentId: 'codex',
          // 进程在跑 + 文件 5min 内有改动 ⇒ working；否则视为 idle（不显示"待机错误"）
          state: active ? 'working' : 'idle',
          updatedAt: Math.round(e.mtime),
          label: sessionLabel(e.file),
        }
      })
    },
  }
}
