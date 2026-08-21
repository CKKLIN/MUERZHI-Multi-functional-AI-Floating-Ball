// test-todo-store.mjs — todo-store 纯数据层单测（脱离 Electron，注入临时目录）
import { mkdtempSync, rmSync, readFileSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { setTodoDataDir, setTodoLogger, loadItems, saveItems,
         createTodo, updateTodo, deleteTodo, toggleTodoDone, completeTodo,
         markReminderFired, incompleteTodoCount, togglePin, savePinPosition } from './electron/main/todo-store.ts'

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
  let items = createTodo({ type: 'todo', content: '买牛奶', priority: 'high', reminder: null, done: false })
  ok(items.length === 1, 'createTodo 返回含新项的全量数组')
  ok(items[0].id && items[0].id.length > 0, 'createTodo 生成 id')
  ok(items[0].createdAt > 0 && items[0].updatedAt > 0, 'createTodo 写入时间戳')

  const onDisk = JSON.parse(readFileSync(join(dir, 'todo-notes.json'), 'utf-8'))
  eq(onDisk.items.length, 1, 'JSON 文件已落盘且含 1 条')

  // 重新加载（验证持久化）
  const reloaded = loadItems()
  eq(reloaded[0].content, '买牛奶', '重载后内容一致')
  eq(reloaded[0].type, 'todo', '重载后 type 一致')
}
teardown()

// --- updateTodo ---
setup()
{
  const [a] = createTodo({ type: 'memo', content: '想法', priority: 'low', reminder: null, done: false })
  const after = updateTodo(a.id, { priority: 'urgent', reminder: '2026-08-15T10:00:00.000Z' })
  eq(after[0].priority, 'urgent', 'updateTodo 更新优先级')
  eq(after[0].reminder, '2026-08-15T10:00:00.000Z', 'updateTodo 更新提醒')
  ok(after[0].updatedAt >= a.updatedAt, 'updateTodo 更新 updatedAt')
  const missing = updateTodo('nope', { content: 'x' })
  eq(missing.length, 1, 'updateTodo 对不存在 id 静默返回原数组')
}
teardown()

// --- toggleTodoDone / markReminderFired ---
setup()
{
  const [t] = createTodo({ type: 'todo', content: '学习', priority: 'medium', reminder: null, done: false })
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
  const [a] = createTodo({ type: 'todo', content: 'a', priority: 'low', reminder: null, done: false })
  createTodo({ type: 'todo', content: 'b', priority: 'low', reminder: null, done: false })
  const after = deleteTodo(a.id)
  eq(after.length, 1, 'deleteTodo 删掉一条，剩 1 条')
  eq(after[0].content, 'b', '剩余项正确')
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
  const [t] = createTodo({ type: 'todo', content: '提醒', priority: 'medium', reminder: '2026-08-14T11:00:00.000Z', done: false })
  markReminderFired(t.id)
  ok(loadItems()[0].reminderFired === true, '首次 markReminderFired 置 true')
  // 改成新的提醒时间 → 重置 fired
  const changed = updateTodo(t.id, { reminder: '2026-08-15T11:00:00.000Z' })
  eq(changed[0].reminderFired, false, '改期后重置 reminderFired=false')
  // 未改提醒（仅改内容）→ 保持 fired
  const firedAgain = markReminderFired(t.id)
  const contentOnly = updateTodo(t.id, { content: '改内容' })
  eq(contentOnly[0].reminderFired, true, '仅改内容不改提醒 → fired 保持不变')
}
teardown()

// --- 贴屏：togglePin / savePinPosition ---
setup()
{
  const [a] = createTodo({ type: 'todo', content: '贴我', priority: 'medium', reminder: null, done: false })
  // 新贴时给初始位置
  const pinned = togglePin(a.id, { x: 100, y: 200 })
  eq(pinned[0].pinned, true, 'togglePin 置 pinned=true')
  eq(pinned[0].pinX, 100, 'togglePin 写初始 pinX')
  eq(pinned[0].pinY, 200, 'togglePin 写初始 pinY')
  // 位置移动保存
  const moved = savePinPosition(a.id, 333, 444)
  eq(moved[0].pinX, 333, 'savePinPosition 更新 pinX')
  eq(moved[0].pinY, 444, 'savePinPosition 更新 pinY')
  ok(moved[0].pinned === true, '保存位置不影响 pinned')
  // 取消贴屏
  const unpinned = togglePin(a.id)
  eq(unpinned[0].pinned, false, 'togglePin 再点取消 pinned=false')
  // 新创建默认不贴
  const [b] = createTodo({ type: 'memo', content: 'm', priority: 'low', reminder: null, done: false })
  eq(b.pinned, false, '新建默认 pinned=false')
  eq(b.pinX, null, '新建默认 pinX=null')
}
teardown()

// --- incompleteTodoCount ---
setup()
{
  createTodo({ type: 'todo', content: '未完成1', priority: 'low', reminder: null, done: false })
  createTodo({ type: 'todo', content: '已完成', priority: 'low', reminder: null, done: true })
  createTodo({ type: 'memo', content: '备忘录', priority: 'low', reminder: null, done: false })
  const items = loadItems()
  eq(incompleteTodoCount(items), 1, '仅统计未完成的 todo，忽略 done 与 memo')
}
teardown()

// --- 完成态自动取消贴屏：toggleTodoDone ---
setup()
{
  const [t] = createTodo({ type: 'todo', content: '贴屏待办', priority: 'medium', reminder: null, done: false })
  togglePin(t.id, { x: 10, y: 10 })
  eq(loadItems()[0].pinned, true, '造一个已贴屏待办')
  const done = toggleTodoDone(t.id)
  eq(done[0].done, true, 'toggleTodoDone 置 completed')
  eq(done[0].pinned, false, '勾选完成 → 取消贴屏')
  // 取消完成态不恢复贴屏（不自动贴回）
  const undone = toggleTodoDone(t.id)
  eq(undone[0].done, false, '再切回未完成')
  eq(undone[0].pinned, false, '取消完成不自动贴回')
}
teardown()

// --- 完成态自动取消贴屏：编辑器保存（updateTodo 带 done） ---
setup()
{
  const [t] = createTodo({ type: 'todo', content: '编辑态贴屏', priority: 'medium', reminder: null, done: false })
  togglePin(t.id, { x: 20, y: 20 })
  const saved = updateTodo(t.id, { done: true })
  eq(saved[0].done, true, 'updateTodo 改 done=true')
  eq(saved[0].pinned, false, '编辑保存完成 → 取消贴屏')
  // memo 改 done 无影响（memo 不支持完成态）
  const [m] = createTodo({ type: 'memo', content: '备忘贴屏', priority: 'low', reminder: null, done: false })
  togglePin(m.id, { x: 30, y: 30 })
  const mDone = updateTodo(m.id, { done: true })
  eq(mDone[0].pinned, true, 'memo 贴屏不受 updateTodo(done) 影响')
}
teardown()

// --- completeTodo：便签板 ✕（完成 + 摘下） ---
setup()
{
  const [t] = createTodo({ type: 'todo', content: '板 ✕', priority: 'high', reminder: null, done: false })
  togglePin(t.id, { x: 40, y: 40 })
  const finished = completeTodo(t.id)
  eq(finished[0].done, true, 'completeTodo 置 done=true')
  eq(finished[0].pinned, false, 'completeTodo 取消贴屏')
  // 备忘：completeTodo 不改（保持原样）→ 由调用方另行摘下
  const [m] = createTodo({ type: 'memo', content: '备忘 ✗', priority: 'low', reminder: null, done: false })
  togglePin(m.id, { x: 50, y: 50 })
  const mResult = completeTodo(m.id)
  eq(mResult.find(x => x.id === m.id).done, false, 'memo completeTodo 不改完成态')
  const mAfter = loadItems().find(x => x.id === m.id)
  eq(mAfter.pinned, true, 'memo completeTodo 不置 done，保持保留待调用方摘下')
  // 不存在 id 静默返回
  eq(completeTodo('nope').length, 2, 'completeTodo 对不存在 id 返回原数组')
}
teardown()

// --- 贴已完成待办：自动取消未完成 ---
setup()
{
  const [t] = createTodo({ type: 'todo', content: '已完成待办', priority: 'medium', reminder: null, done: true })
  ok(t.done === true, '造一个已完成待办')
  const pinned = togglePin(t.id, { x: 100, y: 100 })
  eq(pinned[0].pinned, true, '贴屏后 pinned=true')
  eq(pinned[0].done, false, '贴已完成待办 → 自动取消未完成')
  // 取消贴屏不恢复完成态
  const unpinned = togglePin(t.id)
  eq(unpinned[0].pinned, false, '再点取消贴屏')
  eq(unpinned[0].done, false, '取消贴屏不改完成态')
  // 备忘录不受影响（无完成态）
  const [m] = createTodo({ type: 'memo', content: '备忘', priority: 'low', reminder: null, done: false })
  const mPinned = togglePin(m.id, { x: 50, y: 50 })
  eq(mPinned[0].pinned, true, 'memo 贴屏')
  eq(mPinned[0].done, false, 'memo 贴屏不影响 done')
}
teardown()

if (fails) { console.error(`\n${fails} failure(s)`); process.exit(1) }
console.log('\nALL PASS')
