import { BrowserWindow, screen, ipcMain, nativeImage, app } from 'electron'
import nodeFs from 'node:fs'
import { join } from 'node:path'
import log from './logger'

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

  // 原生拖拽时持续保存位置
  floatingBallWindow.on('move', () => {
    if (floatingBallWindow && !floatingBallWindow.isDestroyed()) {
      const [bx, by] = floatingBallWindow.getPosition()
      ballPos = { x: bx, y: by }
    }
  })

  floatingBallWindow.on('close', () => {
    if (ballPos) saveBallPosition(ballPos)
  })

  log.info('Floating ball shown')
}

export function hideFloatingBall() {
  if (floatingBallWindow && !floatingBallWindow.isDestroyed()) {
    const [bx, by] = floatingBallWindow.getPosition()
    ballPos = { x: bx, y: by }
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
async function expandBall() {
  if (!floatingBallWindow || floatingBallWindow.isDestroyed()) return
  const [x, y] = floatingBallWindow.getPosition()
  const cx = Math.round(x + BALL_SIZE / 2)
  const cy = Math.round(y + BALL_SIZE / 2)
  log.info('[Ball] expand at', [x, y], 'center', [cx, cy])
  // 窗口不可见时完成 resize 和内容状态更新，避免 trigger 按钮在 240×240 窗口中
  // 因 #ball 尚未收到 expanded class（仍为 66×66）而偏移到左上角造成闪烁
  floatingBallWindow.setOpacity(0)
  floatingBallWindow.setBounds({
    x: cx - RING_SIZE / 2,
    y: cy - RING_SIZE / 2,
    width: RING_SIZE,
    height: RING_SIZE,
  })
  try {
    await floatingBallWindow.webContents.executeJavaScript(
      `ensureMenu(); document.body.offsetHeight; document.body.classList.add('expanded'); isExpanded=true; void 0;`
    )
  } catch {}
  // 用 capturePage 强制 GPU 完成一帧完整的合成渲染后再恢复可见
  if (!floatingBallWindow || floatingBallWindow.isDestroyed()) return
  try { await floatingBallWindow.capturePage() } catch {}
  if (!floatingBallWindow || floatingBallWindow.isDestroyed()) return
  floatingBallWindow.setOpacity(1)
  floatingBallWindow.webContents.send('ball-state', 'expanded')
}

async function collapseBall() {
  if (!floatingBallWindow || floatingBallWindow.isDestroyed()) return
  const [x, y] = floatingBallWindow.getPosition()
  const cx = Math.round(x + RING_SIZE / 2)
  const cy = Math.round(y + RING_SIZE / 2)
  log.info('[Ball] collapse at', [x, y], 'center', [cx, cy])
  // 先隐藏窗口再清理内容，避免 class 移除/子节点删除过程中 trigger 按钮偏移或圆环闪烁
  floatingBallWindow.setOpacity(0)
  try {
    await floatingBallWindow.webContents.executeJavaScript(
      `document.body.classList.remove('expanded');
       var s=document.getElementById('ringSvg');while(s.firstChild){s.removeChild(s.firstChild)}
       menuCreated=false; isExpanded=false; void 0;`
    )
  } catch {}
  if (!floatingBallWindow || floatingBallWindow.isDestroyed()) return
  // resize 前后切透明，避免 DWM 边框闪现白色矩形
  const nx = cx - BALL_SIZE / 2
  const ny = cy - BALL_SIZE / 2
  floatingBallWindow.setBounds({ x: nx, y: ny, width: BALL_SIZE, height: BALL_SIZE })
  const [ax, ay] = floatingBallWindow.getPosition()
  if (ax !== nx || ay !== ny) {
    floatingBallWindow.setBounds({ x: nx + (nx - ax), y: ny + (ny - ay), width: BALL_SIZE, height: BALL_SIZE })
  }
  floatingBallWindow.setOpacity(1)
}

// 转发操作到主窗口
function forwardAction(action: string) {
  // 录屏和AI助手都通过主进程事件处理
  if (action === 'record') {
    process.emit('clawd-show-record-window' as any)
  } else if (action === 'ai') {
    process.emit('clawd-show-ai-window' as any)
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
// Logo base64 缓存
let logoBase64: string | null = null

function getLogoDataUrl(size: number = 48): string {
  if (logoBase64) return logoBase64
  try {
    // 查找 logo.png 的几个可能位置
    const paths = [
      join(__dirname, '..', '..', 'public', 'logo.png'),
      join(__dirname, '..', 'public', 'logo.png'),
      join(__dirname, '..', '..', 'resources', 'logo.png'),
    ]
    for (const p of paths) {
      if (nodeFs.existsSync(p)) {
        const img = nativeImage.createFromPath(p)
        const resized = img.resize({ width: size, height: size, quality: 'good' })
        logoBase64 = resized.toDataURL()
        return logoBase64
      }
    }
  } catch {}
  return '' // 找不到就空着
}

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
.arc-item{
  fill:rgba(255,255,255,0.88);
  stroke:rgba(255,255,255,0.5);
  stroke-width:1px;
  cursor:pointer;
  pointer-events:none;
  opacity:0;
  transform:scale(0);
  transform-origin:120px 120px;
  transition:
    transform 0.35s cubic-bezier(0.34,1.56,0.64,1),
    opacity 0.25s ease,
    fill 0.2s ease;
}
body.expanded .arc-item{
  opacity:1;
  transform:scale(1);
  pointer-events:auto;
}
.arc-item:hover{
  fill:rgba(233,69,96,0.18);
  stroke:#e94560;
}
.arc-item:active{
  fill:rgba(233,69,96,0.28);
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
.arc-label .icon{font-size:18px;fill:#e94560;font-weight:700}
.arc-label .label{font-size:10px;font-weight:600;fill:#5a5a6e}

/* 中心按钮 */
#trigger{
  position:absolute;z-index:10;
  width:56px;height:56px;border-radius:50%;border:none;
  background:#e8e8e8;
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
</style>
</head>
<body>
<div id="ball">
  <svg class="ring-svg" id="ringSvg" viewBox="0 0 240 240" xmlns="http://www.w3.org/2000/svg">
    <!-- 圆弧段用 JS 动态创建 -->
  </svg>
  <button id="trigger">
    <img id="logoImg" class="logo-img" src="${logo}" alt="logo" />
  </button>
</div>

<script>
const {ipcRenderer} = require('electron')

const ITEMS = [
  {label:'录屏',icon:'●',action:'record'},
  {label:'AI助手',icon:'✦',action:'ai'},
  {label:'设置',icon:'⚙',action:'settings'},
]

let isExpanded = false
let menuCreated = false

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

function ensureMenu(){
  if(menuCreated) return
  menuCreated = true
  const svg = document.getElementById('ringSvg')
  const cx=120, cy=120, r1=34, r2=75
  const total = ITEMS.length
  const segArc = 360 / total
  const startOff = -90 - segArc / 2

  ITEMS.forEach(function(item, i){
    const sa = startOff + i * segArc
    const ea = sa + segArc
    const d = arcPath(cx, cy, r1, r2, sa, ea)

    // 圆弧路径
    const path = document.createElementNS('http://www.w3.org/2000/svg','path')
    path.setAttribute('class','arc-item')
    path.setAttribute('d',d)
    path.setAttribute('data-action',item.action)
    path.style.transitionDelay = (i*0.15)+'s'
    path.addEventListener('click',function(){
      ipcRenderer.send('floating-ball-action', this.getAttribute('data-action'))
    })
    svg.appendChild(path)

    // 文字
    const ma = (sa+ea)/2
    const mr = (r1+r2)/2
    const lx = cx + mr*Math.cos(ma*Math.PI/180)
    const ly = cy + mr*Math.sin(ma*Math.PI/180)
    const txt = document.createElementNS('http://www.w3.org/2000/svg','text')
    txt.setAttribute('class','arc-label')
    txt.setAttribute('x',lx)
    txt.setAttribute('y',ly)
    txt.style.transitionDelay = (i*0.15+0.12)+'s'
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
    document.body.classList.add('expanded')
    ensureMenu()
    isExpanded=true
  } else {
    document.body.classList.remove('expanded')
    var svg = document.getElementById('ringSvg')
    while(svg.firstChild){ svg.removeChild(svg.firstChild) }
    menuCreated = false
    isExpanded=false
  }
})

// === 点击外部收起 ===
document.addEventListener('click',function(e){
  if(isExpanded && !e.target.closest('#ball')){
    ipcRenderer.send('floating-ball-collapse')
  }
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
    floatingBallWindow.setBounds({ x: nx, y: ny, width: dragSize.w, height: dragSize.h })
    // 读回修正 DWM 1px 偏移
    const [ax, ay] = floatingBallWindow.getPosition()
    if (ax !== nx || ay !== ny) {
      floatingBallWindow.setBounds({ x: nx + (nx - ax), y: ny + (ny - ay), width: dragSize.w, height: dragSize.h })
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
        floatingBallWindow.setBounds({ x: nx, y: ny, width: w, height: h })
        // 读回修正 DWM 1px 偏移（与 drag-move 一致）
        const [ax, ay] = floatingBallWindow.getPosition()
        floatingBallWindow.setBounds({ x: nx + (nx - ax), y: ny + (ny - ay), width: w, height: h })
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
      try {
        floatingBallWindow.webContents.executeJavaScript(
          `document.body.classList.remove('expanded'); var s=document.getElementById('ringSvg');if(s){while(s.firstChild){s.removeChild(s.firstChild)}} menuCreated=false; isExpanded=false; void 0;`
        ).catch(() => {})
      } catch {}
      floatingBallWindow.setBounds({ x: nx, y: ny, width: BALL_SIZE, height: BALL_SIZE })
      ballPos = { x: nx, y: ny }
      // 读回修正 DWM 1px 偏移
      const [ax, ay] = floatingBallWindow.getPosition()
      if (ax !== nx || ay !== ny) {
        floatingBallWindow.setBounds({ x: nx + (nx - ax), y: ny + (ny - ay), width: BALL_SIZE, height: BALL_SIZE })
      }
    }
  })
}
