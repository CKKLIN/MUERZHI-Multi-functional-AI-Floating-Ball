// 渲染层统一日志门面：console 输出 + 转发到 Rust 日志文件（tauri-plugin-log）
//
// Rust 侧初始化了两个 target：stdout / 日志文件（app_log_dir/muerzhi.log）。
// 这里经 plugin-log 的 invoke 把渲染层日志写进同一个文件，带 [WEBVIEW] 前缀区分来源；
// 采集/转码等后端操作由 Rust 侧 log::info! 直接落同一份文件，排查问题时一份时间线看全程。
//
// plugin-log 未就绪前（模块加载极早）先攒队列，初始化完成后补发，避免丢启动期日志。
// 非 Tauri 环境（纯 vite dev server 调试样式）没有 __TAURI_INTERNALS__：invoke 会抛错，
// 落 console 即可。

import { debug, error, info, warn } from '@tauri-apps/plugin-log'

type Level = 'debug' | 'info' | 'warn' | 'error'

type Sink = (msg: string) => Promise<void>
const sinks: Record<Level, Sink> = {
  debug: (m) => debug(m),
  info: (m) => info(m),
  warn: (m) => warn(m),
  error: (m) => error(m),
}

const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window

// 初始化完成前的待发队列（仅非 Tauri 环境可能走到；Tauri 下 markReady 同步执行）
const pending: { level: Level; msg: string }[] = []
let ready = false

function markReady() {
  if (ready) return
  ready = true
  for (const { level, msg } of pending.splice(0)) {
    sinks[level](msg).catch(() => {})
  }
}

// 不 await：日志转发失败只降级 console，绝不阻塞业务调用方
if (isTauri) {
  markReady()
}

function fmt(args: unknown[]): string {
  return args
    .map((a) => {
      if (typeof a === 'string') return a
      try {
        return JSON.stringify(a)
      } catch {
        return String(a)
      }
    })
    .join(' ')
}

function write(level: Level, ...args: unknown[]) {
  const msg = fmt(args)
  // console 始终保留（DevTools 即时可见，样式与原生级别一致）
  const c = level === 'error' ? console.error : level === 'warn' ? console.warn : level === 'debug' ? console.debug : console.info
  c(`[${level.toUpperCase()}]`, ...args)
  if (!isTauri) return
  const line = `[WEBVIEW] ${msg}`
  if (!ready) {
    // plugin-log 尚未初始化（理论上 markReady 已同步跑过，此分支防御性保留）
    pending.push({ level, msg: line })
    return
  }
  sinks[level](line).catch(() => {})
}

const log = {
  info: (...args: unknown[]) => write('info', ...args),
  warn: (...args: unknown[]) => write('warn', ...args),
  error: (...args: unknown[]) => write('error', ...args),
  debug: (...args: unknown[]) => write('debug', ...args),
}

export default log
