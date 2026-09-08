// todo-date.ts —— 待办便签窗口统一的日期时间格式化
//
// 此前列表卡片、预览页各写各的格式化：列表提醒时间丢年份、预览又带年份，
// 长长短短不统一。收敛成一个 Apple 风格的智能格式（“今天/昨天”随当前语言）：
//   今天   → 今天 15:30
//   昨天   → 昨天 15:30
//   今年   → 09-04 15:30
//   往年   → 2025-09-04 15:30
// createdAt（epoch ms）与 reminder（UTC ISO）都走这里，保证同一窗口里任何日期长一个样。
import { t } from '../stores/i18n'

function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

/** epoch ms / ISO 字符串 → 统一格式；空或非法输入返回空串（调用方按空隐藏该元素） */
export function formatTodoDate(input: number | string | null | undefined): string {
  if (input === null || input === undefined || input === '') return ''
  const d = new Date(input)
  if (isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  const hm = `${pad(d.getHours())}:${pad(d.getMinutes())}`
  const now = new Date()
  if (sameDay(d, now)) return `${t('todo.today')} ${hm}`
  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1) // setDate 按日历回退，跨月/跨年/夏令时都正确
  if (sameDay(d, yesterday)) return `${t('todo.yesterday')} ${hm}`
  if (d.getFullYear() === now.getFullYear()) return `${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${hm}`
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${hm}`
}
