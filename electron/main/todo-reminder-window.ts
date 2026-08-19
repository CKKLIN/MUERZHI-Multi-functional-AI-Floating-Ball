// todo-reminder-window.ts —— 定时提醒的持久弹窗
//
// 系统 Notification 在 Windows 上头部由系统控制、且几秒后自动收起，无法满足
// “头部显示 MUERZHI / 不自动关闭”。这里改用一个自绘的 always-on-top 小窗：
// 头部写死 “MUERZHI”，显示待办标题+正文摘录，常驻直到用户点✕关闭 或 点“打开待办”。
import { BrowserWindow, screen } from 'electron'
import log from './logger'
import { getLogoDataUrl } from './logo'

let reminderWindow: BrowserWindow | null = null

function buildReminderHtml(title: string, body: string): string {
  // 按 2 倍分辨率内嵌，CSS 再缩到 16px 显示 ⇒ 高分屏/视网膜下更清晰
  const logo = getLogoDataUrl(32)
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
*{margin:0;padding:0;box-sizing:border-box;user-select:none}
html,body{width:100%;height:100%;overflow:hidden;background:transparent;font-family:'Segoe UI',system-ui,sans-serif}
.card{
  height:100%; border-radius:14px; background:#ffffff;
  border:1px solid #e3e4ea;
  display:flex; flex-direction:column; overflow:hidden;
}
/* 头部：仿待办窗口标题栏（logo + MUERZHI + 关闭按钮） */
.bar{
  height:30px; background:#f1f2f5; border-bottom:1px solid #e0e1e7;
  display:flex; align-items:center; padding:0 6px 0 10px; flex-shrink:0;
}
.brand{display:flex; align-items:center; gap:7px}
.logo{width:16px;height:16px;border-radius:4px;object-fit:cover;display:block}
.brand-txt{font-size:12px;color:#2a2a3a;letter-spacing:2px;font-weight:700}
.bar-right{margin-left:auto;display:flex;align-items:center;gap:6px}
.ring{font-size:10px;color:#f59e0b;animation:breathe 1.2s ease-in-out infinite}
@keyframes breathe{0%,100%{opacity:.5}50%{opacity:1}}
.close{width:26px;height:26px;border:none;border-radius:6px;background:transparent;color:#8a8a96;font-size:13px;cursor:pointer;display:flex;align-items:center;justify-content:center}
.close:hover{background:#4e5cd4;color:#fff}
/* 内容 */
.body{padding:10px 12px 12px;display:flex;flex-direction:column;flex:1;min-height:0}
.t{font-size:14px;font-weight:700;color:#1d1d1f;line-height:1.35;display:-webkit-box;-webkit-line-clamp:1;-webkit-box-orient:vertical;overflow:hidden}
.b{font-size:12px;color:#6e6e76;line-height:1.5;margin-top:4px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.foot{margin-top:auto;display:flex;justify-content:flex-end;padding-top:8px}
.open{border:none;border-radius:8px;background:#4e5cd4;color:#fff;font-size:11px;font-weight:600;padding:5px 12px;cursor:pointer}
.open:hover{background:#404db9}
</style></head><body><div class="card">
  <div class="bar">
    <div class="brand">${logo ? `<img class="logo" src="${logo}">` : '<div class="logo">MU</div>'}<div class="brand-txt">MUERZHI</div></div>
    <div class="bar-right">
      <div class="ring">到点了</div>
      <button class="close" title="关闭" onclick="ipc.send('todo-reminder-close')">✕</button>
    </div>
  </div>
  <div class="body">
    <div class="t">${escapeHtml(title) || '待办提醒'}</div>
    <div class="b">${escapeHtml(body) || '到时间了，记得处理一下。'}</div>
    <div class="foot"><button class="open" onclick="ipc.send('todo-reminder-open')">打开待办</button></div>
  </div>
</div>
<script>
const {ipcRenderer} = require('electron')
window.ipc = ipcRenderer
</script></body></html>`
}

function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

const reminderQueue: { title: string; body: string }[] = []

/** 入队一条提醒；同一时刻只弹一个，关闭后再弹下一条（多个同时到期不互相覆盖丢弃）。 */
export function showTodoReminder(title: string, body: string): void {
  reminderQueue.push({ title, body })
  pump()
}

function pump(): void {
  if (reminderWindow && !reminderWindow.isDestroyed()) return // 已有一个在显示
  const next = reminderQueue.shift()
  if (!next) return
  openPopup(next.title, next.body)
}

function openPopup(title: string, body: string): void {
  const W = 300
  const H = 150
  const area = screen.getPrimaryDisplay().workArea
  const x = area.x + area.width - W - 16
  const y = area.y + area.height - H - 16

  reminderWindow = new BrowserWindow({
    x, y, width: W, height: H,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    resizable: false,
    movable: false,
    alwaysOnTop: true,
    skipTaskbar: true, // 提醒小窗不进任务栏，避免抢占
    hasShadow: false,
    show: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  })
  reminderWindow.setAlwaysOnTop(true, 'screen-saver')
  reminderWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(buildReminderHtml(title, body))}`)
  reminderWindow.once('ready-to-show', () => reminderWindow?.show())
  // 关闭/销毁后弹下一条 queued 提醒
  reminderWindow.on('closed', () => { reminderWindow = null; pump() })
  log.info('Todo reminder popup shown')
}

export function hideTodoReminder(): void {
  if (reminderWindow && !reminderWindow.isDestroyed()) reminderWindow.destroy()
  // destroy 触发 'closed' → pump() 弹下一条
}

/** 用户点了「打开待办」：清空未弹队列 + 关闭当前弹窗（打开窗口即视为已查看到期项）。 */
export function clearTodoReminderQueue(): void {
  reminderQueue.length = 0
  if (reminderWindow && !reminderWindow.isDestroyed()) reminderWindow.destroy()
  reminderWindow = null
}
