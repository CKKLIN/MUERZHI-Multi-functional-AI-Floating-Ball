// test-todo-store.mjs — todo-store 纯数据层单测（脱离 Electron，注入临时目录）
import { mkdtempSync, rmSync, readFileSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { setTodoDataDir, setTodoLogger, loadItems, saveItems,
         createTodo, updateTodo, deleteTodo, toggleTodoDone,
         markReminderFired, incompleteTodoCount } from './electron/main/todo-store.ts'

let fails = 0
function eq(actual, expected, msg) {
  const a = JSON.stringify(actual)
  const e = JSON.stringify(expected)
  if (a !== e) {
    fails++
    console.error(`✗ ${msg}\n  actual:   ${a}\n  expected: ${e}`)
  } else {
    console.log(`✓ ${msg}`)
  }
}
function ok(cond, msg) {
  if (!cond) { fails++; console.error(`✗ ${msg}`) } else { console.log(`✓ ${msg}`) }
}

let dir
let logMsgs = []
setTodoLogger({ info: (m) => logMsgs.push(m), warn: (m) => logMsgs.push(m), error: (m) => logMsgs.push(m) })

function setup() {
  dir = mkdtempSync(join(tmpdir(), 'todo-store-test-'))
  setTodoDataDir(dir)
}
function teardown() { rmSync(dir, { recursive: true, force: true }) }

// --- 空启动 ---
setup()
{
  const items = loadItems()
  eq(items, [], '空目录/不存在文件 -> 返回空数组')
}
teardown()

// --- 创建 + 持久化 ---
setup()
{
  let items = createTodo({ type: 'todo', title: '买牛奶', content: '<p>备注</p>', priority: 'high', reminder: null, done: false })
  ok(items.length === 1, 'createTodo 返回含新项的全量数组')
  ok(items[0].id && items[0].id.length > 0, 'createTodo 生成 id')
  ok(items[0].createdAt > 0 && items[0].updatedAt > 0, 'createTodo 写入时间戳')

  const onDisk = JSON.parse(readFileSync(join(dir, 'todo-notes.json'), 'utf-8'))
  eq(onDisk.items.length, 1, 'JSON 文件已落盘且含 1 条')

  // 重新加载（验证持久化）
  const reloaded = loadItems()
  eq(reloaded[0].title, '买牛奶', '重载后标题一致')
  eq(reloaded[0].type, 'todo', '重载后 type 一致')
}
teardown()

// --- updateTodo ---
setup()
{
  const [a] = createTodo({ type: 'memo', title: '想法', content: '', priority: 'low', reminder: null, done: false })
  const after = updateTodo(a.id, { priority: 'urgent', reminder: '2026-08-15T10:00:00.000Z' })
  eq(after[0].priority, 'urgent', 'updateTodo 更新优先级')
  eq(after[0].reminder, '2026-08-15T10:00:00.000Z', 'updateTodo 更新提醒')
  ok(after[0].updatedAt >= a.updatedAt, 'updateTodo 更新 updatedAt')
  const missing = updateTodo('nope', { title: 'x' })
  eq(missing.length, 1, 'updateTodo 对不存在 id 静默返回原数组')
}
teardown()

// --- toggleTodoDone / markReminderFired ---
setup()
{
  const [t] = createTodo({ type: 'todo', title: '学习', content: '', priority: 'medium', reminder: null, done: false })
  const done = toggleTodoDone(t.id)
  eq(done[0].done, true, 'toggleTodoDone 置为 true')
  const undone = toggleTodoDone(t.id)
  eq(undone[0].done, false, 'toggleTodoDone 再切回 false')

  const fired = markReminderFired(t.id)
  eq(fired[0].reminderFired, true, 'markReminderFired 置 true')
}
teardown()

// --- deleteTodo ---
setup()
{
  const [a] = createTodo({ type: 'todo', title: 'a', content: '', priority: 'low', reminder: null, done: false })
  createTodo({ type: 'todo', title: 'b', content: '', priority: 'low', reminder: null, done: false })
  const after = deleteTodo(a.id)
  eq(after.length, 1, 'deleteTodo 删掉一条，剩 1 条')
  eq(after[0].title, 'b', '剩余项正确')
}
teardown()

// --- saveItems(空) 也落盘 ---
setup()
{
  saveItems([])
  ok(existsSync(join(dir, 'todo-notes.json')), 'saveItems([]) 也写入文件')
}
teardown()

// --- 损坏文件容错 ---
setup()
{
  const { writeFileSync } = await import('node:fs')
  writeFileSync(join(dir, 'todo-notes.json'), '{bad json', 'utf-8')
  eq(loadItems(), [], '损坏 JSON 容错返回空数组')
}
teardown()

// --- 改期会重置 reminderFired ---
setup()
{
  const [t] = createTodo({ type: 'todo', title: '提醒', content: '', priority: 'medium', reminder: '2026-08-14T11:00:00.000Z', done: false })
  markReminderFired(t.id)
  ok(loadItems()[0].reminderFired === true, '首次 markReminderFired 置 true')
  // 改成新的提醒时间 → 重置 fired
  const changed = updateTodo(t.id, { reminder: '2026-08-15T11:00:00.000Z' })
  eq(changed[0].reminderFired, false, '改期后重置 reminderFired=false')
  // 未改提醒（仅改标题）→ 保持 fired
  const firedAgain = markReminderFired(t.id)
  const titleOnly = updateTodo(t.id, { title: '改标题' })
  eq(titleOnly[0].reminderFired, true, '仅改标题不改提醒 → fired 保持不变')
}
teardown()

// --- incompleteTodoCount ---
setup()
{
  createTodo({ type: 'todo', title: '未完成1', content: '', priority: 'low', reminder: null, done: false })
  createTodo({ type: 'todo', title: '已完成', content: '', priority: 'low', reminder: null, done: true })
  createTodo({ type: 'memo', title: '备忘录', content: '', priority: 'low', reminder: null, done: false })
  const items = loadItems()
  eq(incompleteTodoCount(items), 1, '仅统计未完成的 todo，忽略 done 与 memo')
}
teardown()

if (fails) { console.error(`\n${fails} failure(s)`); process.exit(1) }
console.log('\nALL PASS')
