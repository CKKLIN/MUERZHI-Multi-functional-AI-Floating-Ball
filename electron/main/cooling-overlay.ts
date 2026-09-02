// cooling-overlay.ts —— 散热模式临时面板（球旁小卡片：倒计时 / 温度 / 占用率 / 已生效杠杆）
//
// 参照 region-selector.ts 的覆盖窗参数 + floating-ball.ts 的 data: URL 内联 HTML：
// 面板很小、纯展示无交互，内联免去 vite copyHtmlFiles 接线。
// focusable:false 是关键——不抢焦点，悬浮球不失焦（失焦会触发球的 blur 自动收起）。
// 位置默认球心正上方 8px；球贴屏幕上缘（上方放不下）翻到球下方；水平方向夹回屏幕内。
// 散热期间悬浮球可被拖动 → repositionCoolingOverlay 让面板跟着走。
import { BrowserWindow, screen } from 'electron'
import { t } from './i18n'
import type { CoolingStatus, UsageSample } from './cooling'

const PANEL_W = 224
const PANEL_H = 100
const GAP = 8
const BALL_HALF = 33 // 悬浮球 66px 的一半
const RESULT_SHOW_MS = 3000 // 散热完成后前后温度对比的停留时长

let panelWindow: BrowserWindow | null = null
let lastPayload: Record<string, unknown> | null = null
let closeTimer: NodeJS.Timeout | null = null

/** 由球心推面板左上角（上方优先，放不下翻下方，水平夹回屏幕内）。 */
function panelOrigin(center: { x: number; y: number }): { x: number; y: number } {
  const display = screen.getDisplayMatching({
    x: center.x - 20, y: center.y - 20, width: 40, height: 40,
  }).workArea
  let x = Math.round(center.x - PANEL_W / 2)
  let y = Math.round(center.y - BALL_HALF - GAP - PANEL_H)
  if (y < display.y) y = Math.round(center.y + BALL_HALF + GAP)
  x = Math.min(Math.max(x, display.x), display.x + display.width - PANEL_W)
  return { x, y }
}

/** 创建并显示散热面板。center 传 null（球不存在）时放弃——面板只是辅助 UI。 */
export function showCoolingOverlay(center: { x: number; y: number } | null): void {
  // 上一轮结果展示未结束又开始新一轮：复用现有窗口直接刷状态，取消遗留的自毁定时器
  if (panelWindow && !panelWindow.isDestroyed()) {
    if (closeTimer) {
      clearTimeout(closeTimer)
      closeTimer = null
    }
    if (lastPayload) sendToPanel(lastPayload)
    return
  }
  if (!center) return
  const origin = panelOrigin(center)

  panelWindow = new BrowserWindow({
    x: origin.x,
    y: origin.y,
    width: PANEL_W,
    height: PANEL_H,
    frame: false,
    transparent: true,
    resizable: false,
    movable: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    hasShadow: false,
    // 不抢焦点：悬浮球不失焦（球 blur 会自动收起菜单/水滴）
    focusable: false,
    show: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  })
  panelWindow.setAlwaysOnTop(true, 'screen-saver')
  panelWindow.setVisibleOnAllWorkspaces(true)
  panelWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(buildPanelHtml())}`)
  panelWindow.once('ready-to-show', () => {
    panelWindow?.show()
    // 建窗期间的 emit 不丢：就绪后立即补发最新状态
    if (lastPayload) sendToPanel(lastPayload)
  })
  panelWindow.on('closed', () => {
    panelWindow = null
  })
}

/** 散热中拖动悬浮球时跟随：按新球心重算面板位置（窗口存在才有意义）。 */
export function repositionCoolingOverlay(center: { x: number; y: number } | null): void {
  if (!panelWindow || panelWindow.isDestroyed() || !center) return
  const origin = panelOrigin(center)
  try {
    panelWindow.setBounds({ x: origin.x, y: origin.y, width: PANEL_W, height: PANEL_H })
  } catch {
    /* 拖动高频路径上的 setBounds 失败可忽略（下个 move 事件会再试） */
  }
}

/** 推送状态到面板。文案与数值格式化在主进程/面板 JS 各自完成，面板只做 dumb 渲染。 */
export function updateCoolingOverlay(s: CoolingStatus): void {
  const leversText = s.levers.fan
    ? t('ball.cooling.fanOn')
    : s.levers.power
      ? t('ball.cooling.powerOnly')
      : t('ball.cooling.monitoring')
  const doneText =
    s.tempBefore !== null && s.tempAfter !== null
      ? t('ball.cooling.done', { before: s.tempBefore, after: s.tempAfter })
      : t('ball.cooling.doneNoTemp')
  const u: UsageSample = s.usage
  lastPayload = {
    phase: s.phase,
    remainSec: s.remainSec,
    tempC: s.tempC,
    usage: { cpu: u.cpu, gpu: u.gpu, disk: u.disk, mem: u.mem },
    leversText,
    doneText,
    tempUnknownText: t('ball.cooling.tempUnknown'),
  }
  if (!panelWindow || panelWindow.isDestroyed()) return
  if (s.phase === 'done') {
    sendToPanel(lastPayload)
    // 结果展示完成后自毁；新一轮散热开始会清掉这个定时器（showCoolingOverlay 复用分支）
    if (closeTimer) clearTimeout(closeTimer)
    closeTimer = setTimeout(() => {
      closeTimer = null
      hideCoolingOverlay()
    }, RESULT_SHOW_MS)
  } else {
    // 新一轮开始：取消上一轮遗留的自毁定时器
    if (closeTimer) {
      clearTimeout(closeTimer)
      closeTimer = null
    }
    sendToPanel(lastPayload)
  }
}

/** 散热中再次右键的轻提示：面板抖一下（面板不存在时静默——如球刚被隐藏的场景）。 */
export function shakeCoolingOverlay(): void {
  if (!panelWindow || panelWindow.isDestroyed()) return
  try {
    panelWindow.webContents.executeJavaScript(`if(window.shake) shake()`).catch(() => {})
  } catch {}
}

/** 销毁面板（before-quit / 结果展示到期时调用）。 */
export function hideCoolingOverlay(): void {
  if (closeTimer) {
    clearTimeout(closeTimer)
    closeTimer = null
  }
  lastPayload = null
  if (panelWindow && !panelWindow.isDestroyed()) {
    // destroy() 同步销毁并置 null，避免 'closed' 异步事件与新建窗口的引用竞态
    const win = panelWindow
    panelWindow = null
    win.destroy()
  }
}

function sendToPanel(payload: Record<string, unknown>): void {
  if (!panelWindow || panelWindow.isDestroyed()) return
  // 窗口可能在发送中途销毁（结果展示 3s 自毁竞态），吞错
  try {
    panelWindow.webContents.send('cooling-update', payload)
  } catch {}
}

function buildPanelHtml(): string {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
*{margin:0;padding:0;box-sizing:border-box;user-select:none}
html,body{width:100%;height:100%;background:transparent;overflow:clip;
  font-family:'Segoe UI',system-ui,sans-serif}
/* 浅色卡片与悬浮球花瓣同系（白底蓝调），冷色光呼应"散热"；紧凑三行布局 */
#card{width:100%;height:100%;border-radius:12px;
  background:linear-gradient(160deg,#ffffff,#eaf3ff);
  border:1px solid rgba(150,190,255,0.45);
  box-shadow:0 3px 14px rgba(40,80,160,0.16);
  display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;
  padding:7px 12px}
#top{display:flex;align-items:baseline;gap:10px}
#big{font-size:21px;font-weight:700;color:#3d6fd6;line-height:1;
  font-variant-numeric:tabular-nums}
#temp{font-size:12px;font-weight:600;color:#4a5568}
/* 占用率四列横排：标签上、数值下，一行放下 CPU/GPU/磁盘/内存 */
#stats{display:flex;justify-content:space-between;width:100%}
.st{display:flex;flex-direction:column;align-items:center;flex:1;gap:0}
.st .lb{font-size:9px;font-weight:600;color:#8b97ad;line-height:1.25}
.st .vl{font-size:12px;font-weight:700;color:#3a4156;line-height:1.25;
  font-variant-numeric:tabular-nums}
#lever{font-size:9.5px;font-weight:600;color:#6b7a99;line-height:1.2}
body.done #big{color:#2fa36b}
body.done #stats{visibility:hidden}
body.shake #card{animation:shake .45s ease}
@keyframes shake{
  0%,100%{transform:translateX(0)}
  20%{transform:translateX(-5px)}
  40%{transform:translateX(5px)}
  60%{transform:translateX(-3px)}
  80%{transform:translateX(3px)}
}
</style>
</head>
<body>
<div id="card">
  <div id="top"><span id="big">--</span><span id="temp"></span></div>
  <div id="stats">
    <div class="st"><span class="lb">CPU</span><span class="vl" id="cpu">--</span></div>
    <div class="st"><span class="lb">GPU</span><span class="vl" id="gpu">--</span></div>
    <div class="st"><span class="lb">${t('ball.cooling.disk')}</span><span class="vl" id="disk">--</span></div>
    <div class="st"><span class="lb">${t('ball.cooling.mem')}</span><span class="vl" id="mem">--</span></div>
  </div>
  <div id="lever"></div>
</div>
<script>
const {ipcRenderer} = require('electron')

function fmtTemp(c){ return (c === null || c === undefined) ? null : (Math.round(c*10)/10) + '\\u00b0C' }
function fmtPct(v){ return (v === null || v === undefined) ? '--' : v + '%' }

ipcRenderer.on('cooling-update', function(_e, p){
  var big = document.getElementById('big')
  var temp = document.getElementById('temp')
  var lever = document.getElementById('lever')
  if(p.phase === 'done'){
    document.body.classList.add('done')
    big.textContent = '\\u2713'
    temp.textContent = p.doneText
    lever.textContent = ''
  } else {
    document.body.classList.remove('done')
    big.textContent = p.remainSec + 's'
    var c = fmtTemp(p.tempC)
    temp.textContent = (c === null) ? p.tempUnknownText : c
    lever.textContent = p.leversText
  }
  var u = p.usage || {}
  document.getElementById('cpu').textContent = fmtPct(u.cpu)
  document.getElementById('gpu').textContent = fmtPct(u.gpu)
  document.getElementById('disk').textContent = fmtPct(u.disk)
  document.getElementById('mem').textContent = fmtPct(u.mem)
})

// 散热中再次右键：轻提示抖动（主进程经 executeJavaScript 调用）
function shake(){
  document.body.classList.add('shake')
  setTimeout(function(){ document.body.classList.remove('shake') }, 500)
}
</script>
</body>
</html>`
}
