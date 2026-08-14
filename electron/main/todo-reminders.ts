// todo-reminders.ts —— 定时提醒的到期判定（纯函数）
//
// 不依赖 Electron / electron-log，可直接在纯 Node 下 import 单测。
// 只做"哪些条目到了该提醒的时刻"这一纯计算；触发动作（Notification、角标闪烁、
// 置 reminderFired 落库）由调用方 todo-scheduler 负责，保持本模块可测。
import type { TodoItem } from './todo-store'

/**
 * 返回「已到提醒时刻」的条目。
 * 判定口径：`reminder` 非空 && `reminder <= now`(ISO 字符串可直接字典序比较，皆 UTC) && `!reminderFired`。
 * 已被触发的（reminderFired=true）不再重复返回。
 * 纯函数：不改动入参，返回新数组。
 */
export function computeDueReminders(items: TodoItem[], now: number): TodoItem[] {
  const nowIso = new Date(now).toISOString()
  return items.filter(it =>
    !!it.reminder &&
    !it.reminderFired &&
    !(it.type === 'todo' && it.done) && // 已完成的待办不再提醒（与气泡"完成即下线"口径一致）
    it.reminder <= nowIso // 字典序等价时间序（ISO 8601 UTC）
  )
}
