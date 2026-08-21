// todo-store.ts —— 待办/备忘录纯数据层
//
// 主进程 JSON 文件（todo-notes.json）为该功能的唯一真相源，扫描说明见设计文档。
// 本模块不直接依赖 electron / electron-log：文件路径在纯 node 下用 setTodoDataDir 注入
// （单测），electron 下懒 require('electron') 取 userData；日志经 setTodoLogger 注入。
// 遵循 conversion-registry.ts / hw-encoder.ts 的"可脱离 Electron 单测"范式。
import { randomUUID } from 'node:crypto'
import * as fs from 'node:fs'
import { join } from 'node:path'

export type TodoType = 'todo' | 'memo'
export type TodoPriority = 'low' | 'medium' | 'high' | 'urgent'

export interface TodoItem {
  id: string
  type: TodoType
  title: string              // 仅备忘录用；待办无标题（空串）
  content: string            // 富文本正文（HTML，含 dataURL 图片）
  priority: TodoPriority
  reminder: string | null    // ISO 时间戳；null = 无提醒
  reminderFired: boolean     // 是否已触发过提醒（避免重复通知）
  done: boolean              // 仅 todo 使用（备忘录恒 false）
  pinned: boolean            // 是否贴屏（常驻屏幕便签）
  pinX: number | null        // 便签屏幕位置（贴屏后写入）
  pinY: number | null
  createdAt: number
  updatedAt: number
}

export interface TodoStoreState {
  items: TodoItem[]
  meta: { schemaVersion: number }
}

export type TodoLogger = { info: (...a: unknown[]) => void; warn: (...a: unknown[]) => void; error: (...a: unknown[]) => void }

let logger: TodoLogger = { info: () => {}, warn: () => {}, error: () => {} }
export function setTodoLogger(l: TodoLogger): void { logger = l }

// 数据目录：单测注入覆盖；electron 下取 userData
let dataDirOverride: string | null = null
export function setTodoDataDir(dir: string): void { dataDirOverride = dir }

const TODO_STORE_FILE = 'todo-notes.json'
const TODO_SETTINGS_FILE = 'todo-settings.json'

/** 数据根目录：单测注入覆盖；否则 electron userData。 */
function dataDir(): string {
  if (dataDirOverride) return dataDirOverride
  // 懒加载 electron，避免纯 node 单测时被 import 拖累
  const { app } = require('electron') as typeof import('electron')
  return app.getPath('userData')
}
function todoFilePath(): string {
  return join(dataDir(), TODO_STORE_FILE)
}
function todoSettingsFilePath(): string {
  return join(dataDir(), TODO_SETTINGS_FILE)
}

/** 读取整份 store；文件缺失/损坏时回退空态（沿用 loadBallSettings 的容错模式）。
 *  注意：每次返回**全新数组**，绝不复用同一个共享空数组引用——否则上层（如 createTodo）
 *  unshift 直接改写共享状态，污染后续"空文件"读出的结果。 */
export function readStore(): TodoStoreState {
  try {
    const data = fs.readFileSync(todoFilePath(), 'utf-8')
    const parsed = JSON.parse(data)
    if (Array.isArray(parsed.items)) {
      const items = parsed.items.filter((it: any) => it && typeof it.id === 'string')
      return { items, meta: { schemaVersion: parsed.meta?.schemaVersion ?? 1 } }
    }
  } catch {
    /* 文件缺失 / JSON 损坏 → 回退空态 */
  }
  return { items: [], meta: { schemaVersion: 1 } }
}

/** 读取全部条目的便捷封装（渲染层 / 统计常用）。 */
export function loadItems(): TodoItem[] {
  return readStore().items
}

/** 把整份 state 写盘（原子写：先写临时文件再 rename，降低写一半损坏概率）。 */
export function saveState(state: TodoStoreState): void {
  const path = todoFilePath()
  const tmp = path + '.tmp'
  try {
    fs.writeFileSync(tmp, JSON.stringify(state, null, 2), 'utf-8')
    fs.renameSync(tmp, path)
  } catch (err: any) {
    // 原子 rename 在部分平台可能失败；兜底直接写目标
    try { fs.writeFileSync(path, JSON.stringify(state, null, 2), 'utf-8') } catch (err2: any) {
      logger.error('todo store save failed:', err2?.message ?? err2)
    }
  }
}

/** 保存条目数组（便捷封装）。 */
export function saveItems(items: TodoItem[]): void {
  saveState({ items, meta: { schemaVersion: 1 } })
}

export interface TodoInput {
  type: TodoType
  title?: string
  content: string
  priority: TodoPriority
  reminder?: string | null
  done?: boolean
}

/** 生成一条新待办并持久化，返回更新后的全量 items。 */
export function createTodo(input: TodoInput): TodoItem[] {
  const items = loadItems()
  const now = Date.now()
  const item: TodoItem = {
    id: randomUUID(),
    type: input.type,
    title: input.title ?? '',
    content: input.content ?? '',
    priority: input.priority ?? 'medium',
    reminder: input.reminder ?? null,
    reminderFired: false,
    done: input.done ?? false,
    pinned: false,
    pinX: null,
    pinY: null,
    createdAt: now,
    updatedAt: now,
  }
  items.unshift(item)
  saveItems(items)
  return items
}

function patchItem<T extends Record<string, unknown>>(id: string, patch: T): TodoItem[] {
  const items = loadItems()
  const it = items.find(x => x.id === id)
  if (!it) return items // 不存在 id：静默返回原数组
  Object.assign(it, patch, { updatedAt: Date.now() })
  saveItems(items)
  return items
}

/** 完成态默认不再贴屏：任意让 done 变 true 的改动都顺带取消贴屏（勾选完成/编辑改完成）。
 *  备忘（type==='memo'）不支持完成态，不处理。 */
function ensureDoneUnpins(it: TodoItem): void {
  if (it.type === 'todo' && it.done) it.pinned = false
}

/** 更新一条，返回更新后的全量 items。若提醒时间被改动，重置已触发标志，让新提醒能再次到期触发。 */
export function updateTodo(id: string, patch: Partial<Omit<TodoItem, 'id' | 'createdAt'>>): TodoItem[] {
  const items = loadItems()
  const it = items.find(x => x.id === id)
  if (!it) return items
  if (patch.reminder !== undefined && patch.reminder !== it.reminder) {
    // 提醒被改到新时间（改期/取消/从无到有）：清掉提醒Fired，别让"已触发"拦掉新一轮提醒
    it.reminderFired = false
  }
  Object.assign(it, patch, { updatedAt: Date.now() })
  ensureDoneUnpins(it)
  saveItems(items)
  return items
}

/** 删除一条，返回剩余全量 items。 */
export function deleteTodo(id: string): TodoItem[] {
  const items = loadItems().filter(x => x.id !== id)
  saveItems(items)
  return items
}

/** 切换完成态（仅 todo 语义：to-do 才可以勾选；memo 忽略置回 false）。 */
export function toggleTodoDone(id: string): TodoItem[] {
  const items = loadItems()
  const it = items.find(x => x.id === id)
  if (!it) return items
  if (it.type === 'todo') {
    it.done = !it.done
    it.updatedAt = Date.now()
    // 勾选完成 → 取消贴屏：已完成的待办无须再常驻屏幕
    ensureDoneUnpins(it)
    saveItems(items)
  }
  return items
}

/** 完成一条待办并取消贴屏（便签板 ✕ = 完成 + 摘下）。备忘不支持完成态；todo 才处理。 */
export function completeTodo(id: string): TodoItem[] {
  const items = loadItems()
  const it = items.find(x => x.id === id)
  if (!it || it.type !== 'todo') return items
  it.done = true
  it.pinned = false
  it.updatedAt = Date.now()
  saveItems(items)
  return items
}

/** 标记某条的提醒已触发（调度器调用），落库。 */
export function markReminderFired(id: string): TodoItem[] {
  return patchItem(id, { reminderFired: true })
}

/** 切换“贴屏”。新贴时可给初始位置（主进程按屏幕算好传入）；取消贴屏保留位置（再贴可复用）。 */
export function togglePin(id: string, initial?: { x: number; y: number }): TodoItem[] {
  const items = loadItems()
  const it = items.find(x => x.id === id)
  if (!it) return items
  const nowPinned = !it.pinned
  it.pinned = nowPinned
  if (nowPinned && initial) {
    it.pinX = Math.round(initial.x)
    it.pinY = Math.round(initial.y)
  }
  // 贴已有的完成待办 → 自动取消完成态（便签常驻屏幕时需回到"进行中"）
  if (nowPinned && it.type === 'todo' && it.done) it.done = false
  it.updatedAt = Date.now()
  saveItems(items)
  return items
}

/** 便签被拖动后保存新位置（不触发整段重渲染语义，仅落库）。 */
export function savePinPosition(id: string, x: number, y: number): TodoItem[] {
  return patchItem(id, { pinX: Math.round(x), pinY: Math.round(y) })
}

/** 待办数量气泡的计数口径：未完成的 type==='todo' 条数（done===false），memo 不计。 */
export function incompleteTodoCount(items: TodoItem[]): number {
  return items.filter(it => it.type === 'todo' && !it.done).length
}

// === 待办功能设置（主进程文件为真相源，渲染层经 IPC 读写） ===
export interface TodoSettings {
  /** 悬浮球右上角数字气泡是否显示 */
  badgeVisible: boolean
  /** 待办窗口默认置顶 */
  windowAlwaysOnTop: boolean
  /** 贴屏便签板窗口位置（合并成一个窗口后，整板一个位置） */
  stickyBoardPos: { x: number; y: number } | null
}

const DEFAULT_TODO_SETTINGS: TodoSettings = { badgeVisible: true, windowAlwaysOnTop: true, stickyBoardPos: null }

export function loadTodoSettings(): TodoSettings {
  try {
    const parsed = JSON.parse(fs.readFileSync(todoSettingsFilePath(), 'utf-8'))
    return {
      badgeVisible: typeof parsed.badgeVisible === 'boolean' ? parsed.badgeVisible : DEFAULT_TODO_SETTINGS.badgeVisible,
      windowAlwaysOnTop: typeof parsed.windowAlwaysOnTop === 'boolean' ? parsed.windowAlwaysOnTop : DEFAULT_TODO_SETTINGS.windowAlwaysOnTop,
      stickyBoardPos: (parsed.stickyBoardPos && typeof parsed.stickyBoardPos.x === 'number' && typeof parsed.stickyBoardPos.y === 'number')
        ? { x: parsed.stickyBoardPos.x, y: parsed.stickyBoardPos.y }
        : null,
    }
  } catch {
    return { ...DEFAULT_TODO_SETTINGS }
  }
}

/** 合并更新设置并落盘，返回新值。 */
export function updateTodoSettings(patch: Partial<TodoSettings>): TodoSettings {
  const next = { ...loadTodoSettings(), ...patch }
  try {
    fs.writeFileSync(todoSettingsFilePath(), JSON.stringify(next, null, 2), 'utf-8')
  } catch (err: any) {
    logger.error('todo settings save failed:', err?.message ?? err)
  }
  return next
}

