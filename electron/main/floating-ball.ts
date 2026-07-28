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
    alwaysOnTop: true,
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
  floatingBallWindow.setAlwaysOnTop(true, 'screen-saver')

  const html = buildFloatingBallHtml()
  floatingBallWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`)

  floatingBallWindow.once('ready-to-show', () => {
    floatingBallWindow?.show()
    // 预创建 SVG 菜单内容，让首次展开时 ensureMenu() 为空操作，避免首次 DOM 创建导致布局延迟闪烁
    if (floatingBallWindow && !floatingBallWindow.isDestroyed()) {
      floatingBallWindow.webContents.executeJavaScript('ensureMenu()').catch(() => {})
    }
  })

  floatingBallWindow.on('closed', () => {
    floatingBallWindow = null
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
    floatingBallWindow.close()
    floatingBallWindow = null
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
  if (action === 'record') {
    // 直接找到录屏主窗口并显示
    const wins = BrowserWindow.getAllWindows()
    const mainWin = wins.find(w => !w.isDestroyed() && w !== floatingBallWindow && !w.getTitle?.()?.includes?.('AI'))
    if (mainWin && !mainWin.isDestroyed()) {
      mainWin.show()
      mainWin.focus()
    }
  } else if (action === 'ai') {
    // 触发AI窗口显示
    process.emit('clawd-show-ai-window' as any)
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
.arc-label .icon{font-size:14px;fill:#e94560}
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
  {label:'录屏',icon:'⏺',action:'record'},
  {label:'AI助手',icon:'🤖',action:'ai'},
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
    if (ballPos) saveBallPosition(ballPos)
  })
}
