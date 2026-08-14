// todo-scheduler.ts —— 定时提醒调度
//
// 主进程 30s 轮询，用纯函数 computeDueReminders 找"已到期且未触发"的条目，逐个：
//   1) 弹系统通知 Notification
//   2) markReminderFired 落库（防止下轮重复弹）
//   3) 置悬浮球气泡到期闪烁（在用户打开待办窗口前一直闪）
// 启动时先补扫一次，覆盖休眠/关机期间错过的提醒（错过也会补弹一次，不会永久丢失）。
import { Notification } from 'electron'
import { loadItems, markReminderFired } from './todo-store'
import { computeDueReminders } from './todo-reminders'
import { setTodoBadgeFlash } from './todo-badge'
import { isTodoWindowVisible } from './todo-window'
import { stripHtml } from './todo-text'
import log from './logger'

const CHECK_INTERVAL = 30_000
let timer: NodeJS.Timeout | null = null

function checkReminders(): void {
  const due = computeDueReminders(loadItems(), Date.now())
  if (due.length === 0) return
  for (const it of due) {
    const title = stripHtml(it.title).trim()
    const body = stripHtml(it.content).trim().slice(0, 120)
    try {
      const n = new Notification({
        title: title ? `⏰ ${title}` : '⏰ 待办提醒',
        body: body || '到时间了，记得处理一下。',
      })
      n.show()
    } catch (err: any) {
      log.warn('Todo reminder notification failed:', err?.message ?? err)
    }
    markReminderFired(it.id)
  }
  // 有到期未确认 → 悬浮球气泡进入闪烁。若待办窗口此刻正开着，用户就在看，无需闪烁
  // （直观通知已弹），避免下次打开才熄灭。
  if (!isTodoWindowVisible()) {
    setTodoBadgeFlash(true)
  }
}

export function startTodoScheduler(): void {
  if (timer) return
  checkReminders() // 启动补扫：覆盖错过/休眠期间到期的提醒
  timer = setInterval(checkReminders, CHECK_INTERVAL)
  log.info('Todo reminder scheduler started')
}

export function stopTodoScheduler(): void {
  if (timer) {
    clearInterval(timer)
    timer = null
  }
  log.info('Todo reminder scheduler stopped')
}
