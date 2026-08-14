// todo-badge.ts —— 待办数量气泡的聚合与推送
//
// 职责：读 todo-store 算出「未完成待办数」，经悬浮球的 applyFloatingBallBadge 推送到
// 悬浮球右上角气泡；维护「到期闪烁」状态（有已到期未确认的提醒时气泡呼吸闪烁，打开
// 待办窗口 / 到期待确认后熄灭）。
// 本模块耦合 Electron（要推送到 BrowserWindow 的渲染层 + 注册 IPC），不参与纯函数单测。
import { ipcMain } from 'electron'
import { loadItems, incompleteTodoCount, loadTodoSettings } from './todo-store'
// 注意搭配：floating-ball 不反向 import 本模块，避免循环依赖；badge-ready 的监听也放在这里。
import { applyFloatingBallBadge } from './floating-ball'

/** 是否有「已到期但用户尚未打开待办窗口查看」的提醒 → 气泡进入闪烁。 */
let flashPending = false

/** 重算计数并推送到悬浮球（数据/设置/闪烁态变化后调用）。窗口不在则静默。 */
export function refreshTodoBadge(): void {
  const count = incompleteTodoCount(loadItems())
  const visible = loadTodoSettings().badgeVisible
  applyFloatingBallBadge(count, flashPending, visible)
}

/** 置到期闪烁态（true=有到期未确认；false=已确认/熄灭），并立刻重推。 */
export function setTodoBadgeFlash(on: boolean): void {
  flashPending = on
  refreshTodoBadge()
}

/** 待办窗口被打开 / 到期项被查看后调用：熄灭闪烁。 */
export function acknowledgeTodoBadgeFlash(): void {
  setTodoBadgeFlash(false)
}

/** 注册「悬浮球渲染层 DOM 就绪后请求补推计数」的 IPC 监听（挂在主进程 ipcMain 上）。 */
export function registerTodoBadgeHandlers(): void {
  ipcMain.on('floating-ball-badge-ready', () => {
    refreshTodoBadge()
  })
}
