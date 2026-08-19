import { BrowserWindow, screen, ipcMain, app } from 'electron'
import nodeFs from 'node:fs'
import { join } from 'node:path'
import log from './logger'
import { getLogoDataUrl } from './logo'

// === 悬浮球窗口 ===
let floatingBallWindow: BrowserWindow | null = null
let ballPos: { x: number; y: number } | null = null
/** 拖拽起点的绝对基准 */
let dragOrigin: { winX: number; winY: number; scrX: number; scrY: number } | null = null

const BALL_SIZE = 66
const RING_SIZE = 240
const BALL_POS_FILE = 'floating-ball-pos.json'

function ballPosFilePath(): string {
  const dir = app.isPackaged ? app.getPath('userData') : join(__dirname, '..', '..')
  return join(dir, BALL_POS_FILE)
}

function loadBallPosition(): { x: number; y: number } | null {
  try {
    const data = nodeFs.readFileSync(ballPosFilePath(), 'utf-8')
    const pos = JSON.parse(data)
    if (typeof pos.x === 'number' && typeof pos.y === 'number') {
      return pos
    }
  } catch {}
  return null
}

function saveBallPosition(pos: { x: number; y: number }) {
  try {
    nodeFs.writeFileSync(ballPosFilePath(), JSON.stringify(pos), 'utf-8')
  } catch {}
}

/** 带防御的 setBounds：任一坐标/尺寸非有限数（NaN/Infinity）时丢弃本次调整，
 *  避免竞态下偶发的坏数值让 BrowserWindow.setBounds 抛 conversion failure 崩主进程。 */
function setBallBounds(b: { x: number; y: number; width: number; height: number }) {
  if (!floatingBallWindow || floatingBallWindow.isDestroyed()) return
  if (!Number.isFinite(b.x) || !Number.isFinite(b.y) || !Number.isFinite(b.width) || !Number.isFinite(b.height)) {
    log.warn('Floating ball setBounds skipped (non-finite):', b)
    return
  }
  floatingBallWindow.setBounds(b)
}

// === 悬浮球设置（主进程文件为唯一真相源，渲染层经 IPC get/set） ===
const BALL_SETTINGS_FILE = 'floating-ball-settings.json'

export interface FloatingBallSettings {
  visible: boolean
  alwaysOnTop: boolean
  openAtLogin: boolean
}

const DEFAULT_SETTINGS: FloatingBallSettings = {
  visible: true,
  alwaysOnTop: true,
  openAtLogin: false,
}

let cachedSettings: FloatingBallSettings | null = null

function ballSettingsFilePath(): string {
  const dir = app.isPackaged ? app.getPath('userData') : join(__dirname, '..', '..')
  return join(dir, BALL_SETTINGS_FILE)
}

function loadBallSettings(): FloatingBallSettings {
  try {
    const data = nodeFs.readFileSync(ballSettingsFilePath(), 'utf-8')
    const parsed = JSON.parse(data)
    // 与默认值合并，缺字段补默认（容错老版本/手改坏文件）
    return {
      visible: typeof parsed.visible === 'boolean' ? parsed.visible : DEFAULT_SETTINGS.visible,
      alwaysOnTop: typeof parsed.alwaysOnTop === 'boolean' ? parsed.alwaysOnTop : DEFAULT_SETTINGS.alwaysOnTop,
      openAtLogin: typeof parsed.openAtLogin === 'boolean' ? parsed.openAtLogin : DEFAULT_SETTINGS.openAtLogin,
    }
  } catch {}
  return { ...DEFAULT_SETTINGS }
}

function saveBallSettings(settings: FloatingBallSettings) {
  try {
    nodeFs.writeFileSync(ballSettingsFilePath(), JSON.stringify(settings), 'utf-8')
  } catch {}
}

/** 读取设置（带模块级缓存，避免每次 show 都重读磁盘） */
export function getBallSettings(): FloatingBallSettings {
  if (cachedSettings) return cachedSettings
  cachedSettings = loadBallSettings()
  return cachedSettings
}

/** 主进程内部唯一变更入口：合并→save→刷新缓存→返回新值 */
export function updateBallSettings(patch: Partial<FloatingBallSettings>): FloatingBallSettings {
  const next = { ...getBallSettings(), ...patch }
  saveBallSettings(next)
  cachedSettings = next
  return next
}

/** 清空位置缓存 + 删 pos 文件，下次 show 回屏幕中心 */
function clearBallPosition() {
  ballPos = null
  try { nodeFs.unlinkSync(ballPosFilePath()) } catch {}
}

/** 仅在设置允许时才显示悬浮球（启动时按持久化的 visible 决定） */
export function showFloatingBallIfVisible() {
  if (getBallSettings().visible) showFloatingBall()
}

/** 活动窗口即时切换置顶层级；隐藏态下次 show 自然从缓存读 */
export function setFloatingBallAlwaysOnTop(value: boolean) {
  if (floatingBallWindow && !floatingBallWindow.isDestroyed()) {
    floatingBallWindow.setAlwaysOnTop(value, 'screen-saver')
  }
}

// === 待办数量气泡 ===
/** 向悬浮球右上角推送待办气泡（count 数量 / flash 到期闪烁 / visible 显隐开关）。
 *  窗口不存在或已销毁时静默。由 todo-badge.ts 在数据变更后调用。 */
export function applyFloatingBallBadge(count: number, flash: boolean, visible: boolean) {
  if (!floatingBallWindow || floatingBallWindow.isDestroyed()) return
  floatingBallWindow.webContents.executeJavaScript(
    `if(window.updateBadge) updateBadge(${Number(count) || 0}, ${!!flash}, ${!!visible})`
  ).catch(() => {})
}

/** 把设置作用到活动悬浮球（visible 切换显隐，alwaysOnTop 切层级） */
function applyFloatingBallSettings(s: FloatingBallSettings) {
  if (s.visible) {
    showFloatingBall()
  } else {
    hideFloatingBall()
  }
  setFloatingBallAlwaysOnTop(s.alwaysOnTop)
}

export function showFloatingBall() {
  if (floatingBallWindow && !floatingBallWindow.isDestroyed()) {
    floatingBallWindow.show()
    floatingBallWindow.focus()
    return
  }

  if (!ballPos) {
    // 优先从缓存读取，否则默认屏幕中心
    const cached = loadBallPosition()
    if (cached) {
      ballPos = cached
    } else {
      const display = screen.getPrimaryDisplay().bounds
      ballPos = {
        x: Math.round(display.x + (display.width - BALL_SIZE) / 2),
        y: Math.round(display.y + (display.height - BALL_SIZE) / 2),
      }
    }
  }

  floatingBallWindow = new BrowserWindow({
    x: ballPos.x,
    y: ballPos.y,
    width: BALL_SIZE,
    height: BALL_SIZE,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    resizable: false,
    alwaysOnTop: getBallSettings().alwaysOnTop,
    skipTaskbar: true,
    hasShadow: false,
    show: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  })

  // DWM 边框剥离（Electron 28 不支持 setWindowStyle，跳过）

  floatingBallWindow.setVisibleOnAllWorkspaces(true)
  floatingBallWindow.setAlwaysOnTop(getBallSettings().alwaysOnTop, 'screen-saver')

  const html = buildFloatingBallHtml()
  floatingBallWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`)

  floatingBallWindow.once('ready-to-show', () => {
    floatingBallWindow?.show()
    // 预创建 SVG 菜单内容，让首次展开时 ensureMenu() 为空操作，避免首次 DOM 创建导致布局延迟闪烁
    if (floatingBallWindow && !floatingBallWindow.isDestroyed()) {
      floatingBallWindow.webContents.executeJavaScript('ensureMenu()').catch(() => {})
    }
  })

  // 仅当 closed 时引用仍指向自己（未被 hideFloatingBall 提前置空、也未被
  // showFloatingBall 重新赋值为新窗口）才置 null，防止异步 closed 事件清掉新窗口
  const self = floatingBallWindow
  floatingBallWindow.on('closed', () => {
    if (floatingBallWindow === self) floatingBallWindow = null
  })

  // 移动/拖拽时持续记录位置。
  // 用窗口中心反推 66px 球左上角：展开(240)/收起(66)都围绕同一球心，中心在 resize 与拖拽下都不变，
  // 因此展开态拖拽也不会污染 ballPos，收起后不会跳回旧位置。
  floatingBallWindow.on('move', () => {
    if (!floatingBallWindow || floatingBallWindow.isDestroyed()) return
    const [wx, wy] = floatingBallWindow.getPosition()
    const [ww, wh] = floatingBallWindow.getSize()
    ballPos = {
      x: Math.round(wx + ww / 2 - BALL_SIZE / 2),
      y: Math.round(wy + wh / 2 - BALL_SIZE / 2),
    }
  })

  floatingBallWindow.on('close', () => {
    if (ballPos) saveBallPosition(ballPos)
  })

  // 失焦自动收起：展开态下点击/切走任意其他窗口时，悬浮球失去焦点即收回菜单，
  // 避免菜单常驻遮挡屏幕。blur 也可能由本窗口内部弹窗触发，但 Cart 中无弹窗，安全。
  floatingBallWindow.on('blur', () => {
    if (isBallExpanded) collapseBall()
  })

  log.info('Floating ball shown')
}

export function hideFloatingBall() {
  if (floatingBallWindow && !floatingBallWindow.isDestroyed()) {
    // 同样由窗口中心反推 66px 球左上角：即便展开态(240)下隐藏也不会存错角落
    const [wx, wy] = floatingBallWindow.getPosition()
    const [ww, wh] = floatingBallWindow.getSize()
    ballPos = {
      x: Math.round(wx + ww / 2 - BALL_SIZE / 2),
      y: Math.round(wy + wh / 2 - BALL_SIZE / 2),
    }
    saveBallPosition(ballPos!)
    // 用 destroy() 同步销毁并立即置 null，避免 close() 异步触发 'closed' 事件时
    // floatingBallWindow 已被 showFloatingBall 重新赋值为新窗口，导致新窗口引用被清成 null
    const win = floatingBallWindow
    floatingBallWindow = null
    win.destroy()
    log.info('Floating ball hidden')
  }
}

// === 展开/收起 ===
/** 主进程侧跟踪展开态，供失焦等场景判断是否需要收起 */
let isBallExpanded = false
/** 待定的收起收尾定时器：快速连点时，新的 expand 应取消它，避免中途缩窗/清 DOM 造成抖动 */
let collapseTimer: NodeJS.Timeout | null = null

async function expandBall() {
  if (!floatingBallWindow || floatingBallWindow.isDestroyed()) return
  // 取消未完成的收起收尾（快速连点场景：展开要覆盖尚在合拢的动画，避免中途缩窗/清 DOM 抖动）
  if (collapseTimer) {
    clearTimeout(collapseTimer)
    collapseTimer = null
  }
  const [x, y] = floatingBallWindow.getPosition() // 兜底；ballPos 通常已由 66px 态的 move 维护
  const bx = ballPos ? ballPos.x : x
  const by = ballPos ? ballPos.y : y
  const cx = Math.round(bx + BALL_SIZE / 2)
  const cy = Math.round(by + BALL_SIZE / 2)
  log.info('[Ball] expand at', [x, y], 'center', [cx, cy])
  // 只有当窗口当前不是 240（即真从收起态展开）才需要先隐藏+resize；
  // 若已在 240（正在合拢动画中被再次点击）则只切 class 走纯 CSS 开花，避免连点时反复闪现
  const [w] = floatingBallWindow.getSize()
  const needResize = w !== RING_SIZE
  // 窗口不可见时完成 resize 和内容状态更新，避免 trigger 按钮在 240×240 窗口中
  // 因 #ball 尚未收到 expanded class（仍为 66×66）而偏移到左上角造成闪烁
  if (needResize) {
    floatingBallWindow.setOpacity(0)
    setBallBounds({
      x: cx - RING_SIZE / 2,
      y: cy - RING_SIZE / 2,
      width: RING_SIZE,
      height: RING_SIZE,
    })
  }
  try {
    await floatingBallWindow.webContents.executeJavaScript(
      `restartBloom(); void 0;`
    )
  } catch {}
  // 用 capturePage 强制 GPU 完成一帧完整的合成渲染后再恢复可见
  if (!floatingBallWindow || floatingBallWindow.isDestroyed()) return
  if (needResize) {
    try { await floatingBallWindow.capturePage() } catch {}
    if (!floatingBallWindow || floatingBallWindow.isDestroyed()) return
    floatingBallWindow.setOpacity(1)
  }
  isBallExpanded = true
  floatingBallWindow.webContents.send('ball-state', 'expanded')
}

async function collapseBall() {
  isBallExpanded = false
  if (!floatingBallWindow || floatingBallWindow.isDestroyed()) return
  // 锚定 ballPos（66px 球左上角，权威锚点），而非临时 getPosition/尺寸——快速展开收起时不累计偏移。
  // 若尚未有锚点，从当前 240px 窗口中心反推球体左上角。
  if (!ballPos) {
    const [x, y] = floatingBallWindow.getPosition()
    ballPos = { x: Math.round(x + RING_SIZE / 2 - BALL_SIZE / 2), y: Math.round(y + RING_SIZE / 2 - BALL_SIZE / 2) }
  }
  const bx = ballPos.x
  const by = ballPos.y
  log.info('[Ball] collapse at', [bx, by])
  // 收起要像"合拢"：保持窗口可见，先移除 expanded class 让花瓣按 CSS 动画收到 scale(0)，
  // 动画收尾（清 DOM + 缩回 66px）经 collapseTimer 延迟执行，可被下一次 expand 取消——
  // 快速连点时窗口保持在 240，只有每次切换的 CSS 开花/合拢在动，不闪烁不抖动。
  // 指针事件会随 class 移除自动关闭，动画期间不会误点。
  try {
    await floatingBallWindow.webContents.executeJavaScript(
      `document.body.classList.remove('expanded'); isExpanded=false; void 0;`
    )
  } catch {}
  if (!floatingBallWindow || floatingBallWindow.isDestroyed()) return
  if (collapseTimer) clearTimeout(collapseTimer)
  collapseTimer = setTimeout(() => {
    collapseTimer = null
    if (!floatingBallWindow || floatingBallWindow.isDestroyed()) return
    if (isBallExpanded) return // 动画期间被重新展开，跳过清理以免误删刚重建的菜单
    try {
      floatingBallWindow.webContents.executeJavaScript(
        `var s=document.getElementById('ringSvg');while(s.firstChild){s.removeChild(s.firstChild)} menuCreated=false; void 0;`
      )
    } catch {}
    if (!floatingBallWindow || floatingBallWindow.isDestroyed()) return
    // resize 前后切透明，避免 DWM 边框闪现白色矩形
    floatingBallWindow.setOpacity(0)
    setBallBounds({ x: bx, y: by, width: BALL_SIZE, height: BALL_SIZE })
    // 不再做二次 setBounds 修正（那是快速切换下偏移累计的根源）。
    // 66px 态的 move 事件会读到实际落点并刷新 ballPos，作为下次展开/收起的准确锚点。
    floatingBallWindow.setOpacity(1)
  }, 920) // 大于"动画时长(0.5s)+最大错落延迟(0.4s)"，确保最后一片也合拢完再清 DOM
}

// 转发操作到主窗口
function forwardAction(action: string) {
  // 录屏和AI助手都通过主进程事件处理
  if (action === 'record') {
    process.emit('clawd-show-record-window' as any)
  } else if (action === 'ai') {
    process.emit('clawd-show-ai-window' as any)
  } else if (action === 'todo') {
    process.emit('clawd-show-todo-window' as any)
  } else if (action === 'settings') {
    process.emit('clawd-show-settings-window' as any)
  } else {
    const mainWindow = BrowserWindow.getAllWindows().find(w =>
      !w.isDestroyed() && w !== floatingBallWindow
    )
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('on-floating-ball-action', action)
    }
  }
  collapseBall()
}

// === 构建 HTML ===

function buildFloatingBallHtml() {
  const logo = getLogoDataUrl(48)
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
*{margin:0;padding:0;box-sizing:border-box;user-select:none}
html,body{
  width:100%;height:100%;overflow:clip;
  font-family:'Segoe UI',system-ui,sans-serif;
  background:transparent;
}
html::-webkit-scrollbar, body::-webkit-scrollbar{display:none}
body{
  display:flex;align-items:center;justify-content:center;
}

/* 容器 */
#ball{
  position:relative;
  width:66px;height:66px;
  display:flex;align-items:center;justify-content:center;
}
body.expanded #ball{
  width:240px;height:240px;
}

/* SVG ring - positioning only, visibility on individual arcs */
.ring-svg{
  position:absolute;
  width:240px;height:240px;
  pointer-events:none;
}
body.expanded .ring-svg{
  pointer-events:none;
}

/* arc segments - bloom from center like flower petals */
/* 不透明实色卡片，偏蓝点缀（无红），花瓣无缝铺满（无缝隙），无描边无阴影（阴影由 .arc-shadow 叠出） */
/* 展开像开花：每片从花心放大 + 一个由 --swing 决定的小角度摆动，配合错落时序逐片绽放，
   弹性 eased 轻微过冲；收起时反向缩回 */
.arc-item{
  fill:url(#cardGrad);
  stroke:none;
  cursor:pointer;
  pointer-events:none;
  opacity:0;
  transform:scale(0) rotate(var(--swing,0deg));
  transform-origin:120px 120px;
  transition:
    transform 0.5s cubic-bezier(0.34,1.56,0.64,1),
    opacity 0.3s ease,
    fill 0.2s ease;
}
body.expanded .arc-item{
  opacity:1;
  transform:scale(1) rotate(0deg);
  pointer-events:auto;
}
.arc-item:hover{
  fill:url(#cardGradHover);
}

/* 连点时的干净重置：仅在 no-anim 时禁用过渡，让花瓣瞬间回到闭合态以便下次完整重开。
   用类而非改 inline transition，保住每片各自的 inline transition-delay（逐片开花的错落感） */
body.no-anim .arc-item,
body.no-anim .arc-shadow,
body.no-anim .arc-label{
  transition:none !important;
}

/* 每片花瓣的阴影：画在最上层（花瓣→阴影→文字），阴影沿圆周顺时针旋转并配合遮罩
   只露出"压在顺时针相邻花瓣上" 的一侧 ⇒ 每片仅一侧有影，一片压一片均匀堆叠 */
.arc-shadow{
  fill:rgba(40,50,80,0.32);
  stroke:none;
  filter:blur(2px);
  pointer-events:none;
  opacity:0;
  transform:scale(0) rotate(var(--swing,0deg));
  transform-origin:120px 120px;
  transition:
    transform 0.5s cubic-bezier(0.34,1.56,0.64,1),
    opacity 0.3s ease;
}
body.expanded .arc-shadow{
  opacity:1;
  transform:scale(1) rotate(0deg);
}

/* arc labels - also pop from center */
.arc-label{
  pointer-events:none;
  text-anchor:middle;
  dominant-baseline:central;
  font-family:'Segoe UI',system-ui,sans-serif;
  opacity:0;
  transform:scale(0);
  transform-origin:120px 120px;
  transition:
    transform 0.35s cubic-bezier(0.34,1.56,0.64,1),
    opacity 0.25s ease;
}
body.expanded .arc-label{
  opacity:1;
  transform:scale(1);
}
.arc-label .icon{font-size:15px;fill:#4a6cf7;font-weight:700;filter:drop-shadow(0 1px 0 rgba(255,255,255,0.55))}
.arc-label .label{font-size:9px;font-weight:600;fill:#3a4156;stroke:rgba(255,255,255,0.75);stroke-width:2px;paint-order:stroke}

/* 中心按钮 */
#trigger{
  position:absolute;z-index:10;
  width:56px;height:56px;border-radius:50%;border:none;
  background:#eceef3;
  cursor:pointer;
  display:flex;align-items:center;justify-content:center;
}
#trigger:hover{transform:scale(1.08)}
.logo-img{
  width:40px;height:40px;
  border-radius:50%;
  object-fit:cover;
  pointer-events:none;
}
#trigger:active{transform:scale(0.95)}

/* 恒 66px 的球心容器：trigger 与气泡都锚在这，展开（#ball 变 240）时仍贴球心不动 */
.core{
  position:relative;width:66px;height:66px;flex:0 0 auto;
  display:flex;align-items:center;justify-content:center;
  pointer-events:none; /* 只让真正的 trigger 接收点击 */
}
.core #trigger{pointer-events:auto}

/* 待办数量气泡：悬浮球右上角红色数字胶囊；flash 时呼吸闪烁提醒到期 */
#ballBadge{
  position:absolute;top:0;right:0;z-index:20;
  min-width:15px;height:15px;padding:0 3px;
  border-radius:999px;
  background:#4e5cd4;color:#fff;
  font-size:9px;font-weight:700;line-height:15px;text-align:center;
  display:none;align-items:center;justify-content:center;
  box-shadow:0 1px 3px rgba(0,0,0,0.35);
}
#ballBadge.flash{animation:badgeFlash 1s ease-in-out infinite}
@keyframes badgeFlash{
  0%,100%{opacity:1;transform:scale(1)}
  50%{opacity:0.35;transform:scale(0.8)}
}
body.expanded #ballBadge{display:none} /* 展开态让出花瓣，避免遮挡菜单 */

</style>
</head>
<body>
<div id="ball">
  <svg class="ring-svg" id="ringSvg" viewBox="0 0 240 240" xmlns="http://www.w3.org/2000/svg">
    <!-- 圆弧段用 JS 动态创建 -->
  </svg>
  <div class="core">
    <button id="trigger">
      <img id="logoImg" class="logo-img" src="${logo}" alt="logo" />
    </button>
    <!-- 待办数量气泡：悬浮球右上角红色数字胶囊。放在恒 66px 的 .core 内（始终贴球心居中），
         锚点是球而非随展开放大的容器 ⇒ 展开菜单时不偏移；top/right=0 落在窗口内，不会被裁切 -->
    <span id="ballBadge"></span>
  </div>
</div>

<script>
const {ipcRenderer} = require('electron')

const ITEMS = [
  {label:'录屏',icon:'●',action:'record'},
  {label:'音乐',icon:'♪',action:'music'},
  {label:'AI助手',icon:'✦',action:'ai'},
  {label:'待办便签',icon:'☑',action:'todo'},
  {label:'设置',icon:'⚙',action:'settings'},
]

let isExpanded = false
let menuCreated = false

// === 待办数量气泡 ===
// 主进程通过 applyFloatingBallBadge 用 executeJavaScript 调用；页面加载完成时主动
// 上报 'floating-ball-badge-ready'，让主进程立刻补推一次（保证每次重建 DOM 后计数正确）。
function updateBadge(count, flash, visible){
  var el = document.getElementById('ballBadge')
  if(!el) return
  el.textContent = count > 99 ? '99+' : String(count)
  el.style.display = (visible && count > 0) ? 'flex' : 'none'
  el.classList.toggle('flash', !!flash)
}
ipcRenderer.send('floating-ball-badge-ready')

// 生成圆弧路径（四分之一圆环）
function arcPath(cx, cy, r1, r2, sa, ea){
  const sr = sa*Math.PI/180, er = ea*Math.PI/180
  const x1i=cx+r1*Math.cos(sr), y1i=cy+r1*Math.sin(sr)
  const x1o=cx+r2*Math.cos(sr), y1o=cy+r2*Math.sin(sr)
  const x2o=cx+r2*Math.cos(er), y2o=cy+r2*Math.sin(er)
  const x2i=cx+r1*Math.cos(er), y2i=cy+r1*Math.sin(er)
  const laf=(ea-sa)>180?1:0
  return 'M'+x1i+','+y1i+' L'+x1o+','+y1o+' A'+r2+','+r2+' 0 '+laf+',1 '+x2o+','+y2o+' L'+x2i+','+y2i+' A'+r1+','+r1+' 0 '+laf+',0 '+x1i+','+y1i+' Z'
}

// 构造线性渐变（卡片高光/悬停色）
function makeGradient(id, c1, c2){
  const g = document.createElementNS('http://www.w3.org/2000/svg','linearGradient')
  g.setAttribute('id',id)
  g.setAttribute('x1','20%'); g.setAttribute('y1','0%')
  g.setAttribute('x2','80%'); g.setAttribute('y2','100%')
  ;[['0%',c1],['100%',c2]].forEach(function(p){
    const s = document.createElementNS('http://www.w3.org/2000/svg','stop')
    s.setAttribute('offset',p[0]); s.setAttribute('stop-color',p[1])
    g.appendChild(s)
  })
  return g
}

function ensureMenu(){
  if(menuCreated) return
  menuCreated = true
  const svg = document.getElementById('ringSvg')
  const cx=120, cy=120, r1=34, r2=75
  const total = ITEMS.length
  const segArc = 360 / total
  const startOff = -90 - segArc / 2
  // 无缝铺满：每个花瓣占满自己的 120° 槽位，相邻共用径向边，无缝隙
  // 阴影沿顺时针旋转的角度：用圆周方向而非屏幕 X 方向，保证每片影都一致落在自己顺时针的相邻片上
  const SHADOW_ROT = 4

  // 实色卡片渐变（每次重建，避免 collapse 清空 SVG 后残留空引用）
  const defs = document.createElementNS('http://www.w3.org/2000/svg','defs')
  defs.appendChild(makeGradient('cardGrad', '#ffffff', '#f2f4f9'))
  defs.appendChild(makeGradient('cardGradHover', '#eef1ff', '#dbe2ff'))
  svg.appendChild(defs)

  // 第一遍：无缝花瓣本体
  ITEMS.forEach(function(item, i){
    const sa = startOff + i * segArc
    const ea = sa + segArc
    const d = arcPath(cx, cy, r1, r2, sa, ea)
    const path = document.createElementNS('http://www.w3.org/2000/svg','path')
    path.setAttribute('class','arc-item')
    path.setAttribute('d',d)
    path.setAttribute('data-action',item.action)
    path.style.transitionDelay = (i*0.10)+'s'
    path.style.setProperty('--swing', ((i%2?-1:1) * (6 + i)) + 'deg') // 错落的角度摆动，模拟花瓣散开
    path.addEventListener('click',function(){
      ipcRenderer.send('floating-ball-action', this.getAttribute('data-action'))
    })
    svg.appendChild(path)
  })

  // 第二遍：每片阴影，画在全部花瓣之上。
  // 每片用自己的遮罩裁掉"本瓣自身"区域；阴影沿顺时针旋转 SHADOW_ROT，只露出落在
  // 相邻顺时针花瓣左沿的一侧影 ⇒ 每片仅一侧有影，且一片压一片均匀堆叠（方位一致）。
  ITEMS.forEach(function(item, i){
    const NS = 'http://www.w3.org/2000/svg'
    const sa = startOff + i * segArc
    const ea = sa + segArc
    const dOwn = arcPath(cx, cy, r1, r2, sa, ea)

    const maskId = 'shadowMask' + i
    const mask = document.createElementNS(NS,'mask')
    mask.setAttribute('id', maskId)
    const mRect = document.createElementNS(NS,'rect')
    mRect.setAttribute('x','0'); mRect.setAttribute('y','0')
    mRect.setAttribute('width','240'); mRect.setAttribute('height','240')
    mRect.setAttribute('fill','#fff')
    const mCut = document.createElementNS(NS,'path')
    mCut.setAttribute('d', dOwn)
    mCut.setAttribute('fill','#000')
    mask.appendChild(mRect)
    mask.appendChild(mCut)
    defs.appendChild(mask)

    const sh = document.createElementNS(NS,'path')
    sh.setAttribute('class','arc-shadow')
    sh.setAttribute('d', arcPath(cx, cy, r1, r2, sa + SHADOW_ROT, ea + SHADOW_ROT)) // 整片顺时针转 4°
    sh.setAttribute('mask','url(#'+maskId+')')
    sh.style.transitionDelay = (i*0.10)+'s'
    sh.style.setProperty('--swing', ((i%2?-1:1) * (6 + i)) + 'deg') // 与所属花瓣保持一致的开花摆动
    svg.appendChild(sh)
  })

  // 第三遍：文字，置于最上层保证清晰
  ITEMS.forEach(function(item, i){
    const sa = startOff + i * segArc
    const ea = sa + segArc
    const ma = (sa+ea)/2
    const mr = (r1+r2)/2
    const lx = cx + mr*Math.cos(ma*Math.PI/180)
    const ly = cy + mr*Math.sin(ma*Math.PI/180)
    const txt = document.createElementNS('http://www.w3.org/2000/svg','text')
    txt.setAttribute('class','arc-label')
    txt.setAttribute('x',lx)
    txt.setAttribute('y',ly)
    txt.style.transitionDelay = (i*0.10+0.08)+'s'
    const iconSpan = document.createElementNS('http://www.w3.org/2000/svg','tspan')
    iconSpan.setAttribute('class','icon')
    iconSpan.setAttribute('x',lx)
    iconSpan.setAttribute('dy','-7')
    iconSpan.textContent = item.icon
    const labelSpan = document.createElementNS('http://www.w3.org/2000/svg','tspan')
    labelSpan.setAttribute('class','label')
    labelSpan.setAttribute('x',lx)
    labelSpan.setAttribute('dy','14')
    labelSpan.textContent = item.label
    txt.appendChild(iconSpan)
    txt.appendChild(labelSpan)
    svg.appendChild(txt)
  })
}

// 干净地重新开花：先（no-anim 下瞬时）回到闭合态 scale(0)，再启用过渡并切到 expanded。
// 快速连点时旧过渡会在中间态被打断，若不重置花瓣会"卡在中间"；每次都从闭合态完整重开。
// 用 no-anim 类而非改 inline transition，因此每片各自的 transition-delay（逐片开花的错落感）不受影响。
function restartBloom(){
  var svg = document.getElementById('ringSvg')
  document.body.classList.remove('expanded')
  document.body.classList.add('no-anim')
  ensureMenu() // 在闭合态下创建/补齐花瓣（若此前 DOM 已被清空），使其一律从 scale(0) 开始绽放；
               // 若在 expanded 之后才创建，新花瓣会直接从 scale(1) 出现、看不到开花效果
  void svg.getBoundingClientRect() // ① 重排：no-anim 下闭合态 scale(0) 立即生效
  document.body.classList.remove('no-anim')
  void svg.getBoundingClientRect() // ② 再重排：让浏览器"看到"已启用过渡、但仍处于闭合态——保证下一步一定触发过渡
  document.body.classList.add('expanded')
  isExpanded = true
}

// === 手动拖拽 ===
let dsX = 0, dsY = 0, dragging = false

trigger.addEventListener('pointerdown', function(e){
  dsX = e.screenX; dsY = e.screenY
  dragging = false
  trigger.setPointerCapture(e.pointerId)
  ipcRenderer.send('floating-ball-drag-start', e.screenX, e.screenY)
})

trigger.addEventListener('pointermove', function(e){
  if(e.buttons !== 1) return
  if(!dragging){
    if(Math.abs(e.screenX - dsX) <= 4 && Math.abs(e.screenY - dsY) <= 4) return
    dragging = true
  }
  ipcRenderer.send('floating-ball-move', e.screenX, e.screenY)
})

trigger.addEventListener('pointerup', function(e){
  trigger.releasePointerCapture(e.pointerId)
  if(dragging){
    ipcRenderer.send('floating-ball-drag-end')
    dragging = false
    return
  }
  if(isExpanded){
    isExpanded = false
    ipcRenderer.send('floating-ball-collapse')
  } else {
    isExpanded = true
    ipcRenderer.send('floating-ball-expand')
  }
})

ipcRenderer.on('ball-state',function(_event,state){
  if(state==='expanded'){
    // expandBall 已通过 executeJavaScript 触发 restartBloom；这里仅兜底同步，避免重复重开导致二次闪烁
    if(!document.body.classList.contains('expanded')) restartBloom()
  } else {
    document.body.classList.remove('expanded')
    var svg = document.getElementById('ringSvg')
    while(svg.firstChild){ svg.removeChild(svg.firstChild) }
    menuCreated = false
    isExpanded=false
  }
})

// === 点击外部收起 ===
// 展开态下，只有点到中心按钮(#trigger)或菜单花瓣(.arc-item)才算"点在悬浮球/菜单上"；
// 点到窗口内任何透明区域（圆内空隙、四角、环外）都被视为"点到外部"，即收起菜单。
document.addEventListener('click',function(e){
  if(!isExpanded) return
  if(e.target.closest('#trigger') || e.target.closest('.arc-item')) return
  ipcRenderer.send('floating-ball-collapse')
})
</script>
</body>
</html>`
}

// === IPC 处理器注册 ===
export function registerFloatingBallHandlers() {
  ipcMain.handle('show-floating-ball', () => {
    showFloatingBall()
  })

  ipcMain.handle('hide-floating-ball', () => {
    hideFloatingBall()
  })

  ipcMain.handle('toggle-floating-ball', () => {
    hideFloatingBall() // hide only: once hidden, main window can reshow
  })

  ipcMain.on('floating-ball-expand', () => {
    expandBall()
  })

  ipcMain.on('floating-ball-collapse', () => {
    collapseBall()
  })

  ipcMain.on('floating-ball-action', (_event: any, action: string) => {
    log.info('Floating ball action:', action)
    forwardAction(action)
  })

  // === 手动拖拽：绝对增量 + setBounds + 读回修正 DWM 偏移 ===
  let dragSize: { w: number; h: number } | null = null

  ipcMain.on('floating-ball-drag-start', (_event: any, sx: number, sy: number) => {
    if (!floatingBallWindow || floatingBallWindow.isDestroyed()) return
    const [wx, wy] = floatingBallWindow.getPosition()
    const [ww, wh] = floatingBallWindow.getSize()
    dragOrigin = { winX: wx, winY: wy, scrX: sx, scrY: sy }
    dragSize = { w: ww, h: wh }
  })

  ipcMain.on('floating-ball-move', (_event: any, sx: number, sy: number) => {
    if (!floatingBallWindow || floatingBallWindow.isDestroyed() || !dragOrigin || !dragSize) return
    // 防御 NaN（无有效屏幕坐标的 pointer/mouse 事件），避免 setBounds 抛 conversion failure
    if (!Number.isFinite(sx) || !Number.isFinite(sy)) return
    const dx = sx - dragOrigin.scrX
    const dy = sy - dragOrigin.scrY
    const nx = Math.round(dragOrigin.winX + dx)
    const ny = Math.round(dragOrigin.winY + dy)
    setBallBounds({ x: nx, y: ny, width: dragSize.w, height: dragSize.h })
    // 读回修正 DWM 1px 偏移
    const [ax, ay] = floatingBallWindow.getPosition()
    if (ax !== nx || ay !== ny) {
      setBallBounds({ x: nx + (nx - ax), y: ny + (ny - ay), width: dragSize.w, height: dragSize.h })
    }
  })

  ipcMain.on('floating-ball-drag-end', () => {
    dragOrigin = null
    dragSize = null
    // 屏幕边缘磁吸：松手时若球靠近屏幕某边缘（阈值内）则吸附贴边。
    // 吸附放在 drag-end 而不是 move，保证拖动全程纯跟手（不触发反向漂移）。
    if (floatingBallWindow && !floatingBallWindow.isDestroyed()) {
      const [x, y] = floatingBallWindow.getPosition()
      const [w, h] = floatingBallWindow.getSize()
      // 用球当前所在显示器（而非固定主屏）做磁吸，否则多屏下拖到副屏会被
      // 误判为"距主屏右缘很负"而拉回主屏——即"拖不到分屏"。
      const b = screen.getDisplayMatching(floatingBallWindow.getBounds()).bounds
      const SNAP = 40 // 吸附阈值（px）
      let nx = x, ny = y
      if (x - b.x < SNAP) nx = b.x
      else if ((b.x + b.width) - (x + w) < SNAP) nx = b.x + b.width - w
      if (y - b.y < SNAP) ny = b.y
      else if ((b.y + b.height) - (y + h) < SNAP) ny = b.y + b.height - h
      if (nx !== x || ny !== y) {
        setBallBounds({ x: nx, y: ny, width: w, height: h })
        // 读回修正 DWM 1px 偏移（与 drag-move 一致）
        const [ax, ay] = floatingBallWindow.getPosition()
        setBallBounds({ x: nx + (nx - ax), y: ny + (ny - ay), width: w, height: h })
        if (ballPos) {
          ballPos = { x: nx, y: ny }
          saveBallPosition(ballPos)
        }
        log.info('Floating ball snapped to edge:', [nx, ny])
      }
    }
    if (ballPos) saveBallPosition(ballPos)
  })

  // === 悬浮球设置 IPC（渲染层 get/set，主进程文件为真相源） ===
  ipcMain.handle('get-floating-ball-settings', () => getBallSettings())

  ipcMain.handle('set-floating-ball-settings', (_event, patch: Partial<FloatingBallSettings>) => {
    const next = updateBallSettings(patch)
    // 把变更实时作用到悬浮球（显隐 / 置顶层级）
    applyFloatingBallSettings(next)
    // 开机自启由主进程直接调系统 API（渲染层无权限）
    if (patch.openAtLogin !== undefined) {
      try { app.setLoginItemSettings({ openAtLogin: patch.openAtLogin }) } catch (e) {
        log.error('setLoginItemSettings failed:', e)
      }
    }
    return next
  })

  ipcMain.handle('reset-floating-ball-position', () => {
    // 重置到屏幕中心：直接对活动窗口 setBounds，不销毁/重建窗口
    // （hide→close→立即 show 会让旧窗口的 'closed' 事件把新窗口引用清成 null，
    //  导致悬浮球"消失"——见 closed handler 的异步陷阱）
    clearBallPosition()
    if (floatingBallWindow && !floatingBallWindow.isDestroyed()) {
      const display = screen.getPrimaryDisplay().bounds
      const nx = Math.round(display.x + (display.width - BALL_SIZE) / 2)
      const ny = Math.round(display.y + (display.height - BALL_SIZE) / 2)
      // 若当前是展开态（240×240），先收起 DOM 再 setBounds，避免大窗口跳到中心
      isBallExpanded = false
      try {
        floatingBallWindow.webContents.executeJavaScript(
          `document.body.classList.remove('expanded'); var s=document.getElementById('ringSvg');if(s){while(s.firstChild){s.removeChild(s.firstChild)}} menuCreated=false; isExpanded=false; void 0;`
        ).catch(() => {})
      } catch {}
      setBallBounds({ x: nx, y: ny, width: BALL_SIZE, height: BALL_SIZE })
      ballPos = { x: nx, y: ny }
      // 读回修正 DWM 1px 偏移
      const [ax, ay] = floatingBallWindow.getPosition()
      if (ax !== nx || ay !== ny) {
        setBallBounds({ x: nx + (nx - ax), y: ny + (ny - ay), width: BALL_SIZE, height: BALL_SIZE })
      }
    }
  })
}
