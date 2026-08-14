// test-todo-reminders.mjs — 到期提醒纯函数单测
import { computeDueReminders } from './electron/main/todo-reminders.ts'

let fails = 0
function eq(actual, expected, msg) {
  const a = JSON.stringify(actual.map(i => i.id))
  const e = JSON.stringify(expected)
  if (a !== e) { fails++; console.error(`✗ ${msg}\n  actual:   ${a}\n  expected: ${e}`) } else { console.log(`✓ ${msg}`) }
}
function ok(cond, msg) { if (!cond) { fails++; console.error(`✗ ${msg}`) } else { console.log(`✓ ${msg}`) } }

const NOW = Date.parse('2026-08-14T12:00:00Z')
function item(id, reminder, reminderFired = false) {
  return { id, type: 'todo', title: id, content: '', priority: 'low',
           reminder, reminderFired, done: false, createdAt: 1, updatedAt: 1 }
}

// 基础：到期未触发 → 返回
{
  const due = item('due', '2026-08-14T11:00:00.000Z')          // 已过
  const future = item('future', '2026-08-14T13:00:00.000Z')    // 未来
  const fired = item('fired', '2026-08-14T11:00:00.000Z', true) // 已触发过
  const none = item('none', null)                               // 无提醒
  const res = computeDueReminders([none, future, fired, due], NOW)
  eq(res, ['due'], '只返回到期且未触发的项')
}

// 刚好等于 now 极性边界：<= now 视为到期
{
  const at = item('at', NOW === new Date(2026,7,14,12,0,0).getTime() ? new Date(2026,7,14,12,0,0).toISOString() : '2026-08-14T12:00:00.000Z')
  const res = computeDueReminders([at], NOW)
  eq(res, ['at'], 'reminder === now 视为到期')
}

// 空数组
{
  eq(computeDueReminders([], NOW), [], '空列表返回空')
}

// 不修改入参（纯函数）
{
  const due = item('due', '2026-08-14T11:00:00.000Z')
  const fired = item('fired', '2026-08-14T11:00:00.000Z', true)
  computeDueReminders([due, fired], NOW)
  ok(due.reminderFired === false && fired.reminderFired === true, '不修改 reminderFired 标志（由调用方落库）')
}

if (fails) { console.error(`\n${fails} failure(s)`); process.exit(1) }
console.log('\nALL PASS')
