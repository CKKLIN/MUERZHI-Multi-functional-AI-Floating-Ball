import { BrowserWindow, screen, ipcMain, nativeImage } from 'electron'
import nodeFs from 'node:fs'
import { join } from 'node:path'
import log from './logger'

// === 悬浮球窗口 ===
let floatingBallWindow: BrowserWindow | null = null
let ballPos: { x: number; y: number } | null = null
/** 拖拽起点的绝对基准 */
let dragOrigin: { winX: number; winY: number; scrX: number; scrY: number } | null = null

const BALL_SIZE = 66
const RING_SIZE = 220

export function showFloatingBall() {
  if (floatingBallWindow && !floatingBallWindow.isDestroyed()) {
    floatingBallWindow.show()
    floatingBallWindow.focus()
    return
  }

  if (!ballPos) {
    const cursor = screen.getCursorScreenPoint()
    const display = screen.getDisplayNearestPoint(cursor).bounds
    ballPos = {
      x: Math.round(display.x + display.width - BALL_SIZE - 20),
      y: Math.round(display.y + display.height - BALL_SIZE - 20),
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
  })

  floatingBallWindow.on('closed', () => {
    floatingBallWindow = null
  })

  // 原生拖拽时持续保存位置
  floatingBallWindow.on('move', () => {
    if (floatingBallWindow && !floatingBallWindow.isDestroyed()) {
      const pos = floatingBallWindow.getPosition()
      ballPos = pos
    }
  })

  log.info('Floating ball shown')
}

export function hideFloatingBall() {
  if (floatingBallWindow && !floatingBallWindow.isDestroyed()) {
    ballPos = floatingBallWindow.getPosition()
    floatingBallWindow.close()
    floatingBallWindow = null
    log.info('Floating ball hidden')
  }
}

// === 展开/收起 ===
function expandBall() {
  if (!floatingBallWindow || floatingBallWindow.isDestroyed()) return
  const [x, y] = floatingBallWindow.getPosition()
  const cx = Math.round(x + BALL_SIZE / 2)
  const cy = Math.round(y + BALL_SIZE / 2)
  log.info('[Ball] expand at', [x, y], 'center', [cx, cy])
  floatingBallWindow.setBounds({
    x: cx - RING_SIZE / 2,
    y: cy - RING_SIZE / 2,
    width: RING_SIZE,
    height: RING_SIZE,
  })
  floatingBallWindow.webContents.send('ball-state', 'expanded')
}

async function collapseBall() {
  if (!floatingBallWindow || floatingBallWindow.isDestroyed()) return
  const [x, y] = floatingBallWindow.getPosition()
  const cx = Math.round(x + RING_SIZE / 2)
  const cy = Math.round(y + RING_SIZE / 2)
  log.info('[Ball] collapse at', [x, y], 'center', [cx, cy])
  // 清理菜单 DOM
  try {
    await floatingBallWindow.webContents.executeJavaScript(
      `document.body.classList.remove('expanded');
       document.querySelectorAll('.menu-item').forEach(function(el){el.remove()});
       menuCreated=false; isExpanded=false; void 0;`
    )
  } catch {}
  if (!floatingBallWindow || floatingBallWindow.isDestroyed()) return
  // resize 前后切透明，避免 DWM 边框闪现白色矩形
  floatingBallWindow.setOpacity(0)
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
  const mainWindow = BrowserWindow.getAllWindows().find(w =>
    !w.isDestroyed() && w !== floatingBallWindow
  )
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('on-floating-ball-action', action)
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
/* 彻底隐藏滚动条 */
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
  width:220px;height:220px;
}

/* 中心按钮 - 显示 logo */
#trigger{
  position:absolute;z-index:10;
  width:56px;height:56px;border-radius:50%;border:none;
  background:#e8e8e8;
  cursor:pointer;
  display:flex;align-items:center;justify-content:center;
  box-shadow:0 2px 12px rgba(0,0,0,0.15);
  transition:transform 0.3s cubic-bezier(0.34,1.56,0.64,1),box-shadow 0.3s;
}
#trigger:hover{transform:scale(1.08);box-shadow:0 4px 20px rgba(0,0,0,0.2)}
.logo-img{
  width:40px;height:40px;
  border-radius:50%;
  object-fit:cover;
  pointer-events:none;
}
#trigger:active{transform:scale(0.95)}

/* 菜单项 */
.menu-item{
  position:absolute;
  width:50px;height:50px;border-radius:12px;
  background:rgba(255,255,255,0.95);
  backdrop-filter:blur(16px);
  -webkit-backdrop-filter:blur(16px);
  border:1px solid rgba(255,255,255,0.7);
  box-shadow:0 4px 20px rgba(0,0,0,0.12);
  display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;
  opacity:0;transform:scale(0.3);
  transition:transform 0.35s cubic-bezier(0.34,1.56,0.64,1),opacity 0.25s;
  pointer-events:none;
  cursor:pointer;
}
.menu-item.visible{
  opacity:1;transform:scale(1);
  pointer-events:auto;
}
.menu-item:hover{
  transform:translateY(-2px) scale(1.05);
  box-shadow:0 8px 24px rgba(0,0,0,0.14);
  border-color:#e94560;
}
.menu-item:active{transform:scale(0.92)}
.menu-item .icon{font-size:16px;line-height:1;color:#e94560}
.menu-item .label{font-size:9px;font-weight:600;color:#5a5a6e;white-space:nowrap}
</style>
</head>
<body>
<div id="ball">
  <button id="trigger">
    <img id="logoImg" class="logo-img" src="${logo}" alt="logo" />
  </button>
</div>

<script>
const {ipcRenderer} = require('electron')

const ITEMS = [
  {label:'全屏',icon:'⛶',action:'fullscreen'},
  {label:'区域',icon:'▣',action:'region'},
  {label:'截图',icon:'📷',action:'screenshot'},
  {label:'设置',icon:'⚙',action:'settings'},
]

let isExpanded = false
let menuCreated = false

// === 展开时创建菜单项（避免 collapsed 状态下 DOM 残留）===
function ensureMenu(){
  if(menuCreated) return
  menuCreated = true
  const ball = document.getElementById('ball')
  const total = ITEMS.length
  const startAngle = -150, endAngle = -30
  const radius = 85
  ITEMS.forEach((item,i)=>{
    const angle = startAngle + i * (endAngle - startAngle) / (Math.max(total-1,1))
    const rad = angle * Math.PI / 180
    const x = Math.cos(rad) * radius
    const y = Math.sin(rad) * radius
    const el = document.createElement('div')
    el.className = 'menu-item'
    el.dataset.action = item.action
    el.style.setProperty('--tx', x+'px')
    el.style.setProperty('--ty', y+'px')
    el.style.transitionDelay = (i*0.05)+'s'
    el.style.webkitAppRegion = 'no-drag'
    el.innerHTML = '<span class="icon">'+item.icon+'</span><span class="label">'+item.label+'</span>'
    el.addEventListener('click',function(e){
      e.stopPropagation()
      ipcRenderer.send('floating-ball-action', this.dataset.action)
    })
    ball.appendChild(el)
    // 强制下一帧显示动画
    requestAnimationFrame(function(){
      setTimeout(function(){
        el.style.transform = 'translate(var(--tx),var(--ty))'
        el.classList.add('visible')
      }, i*50)
    })
  })
}

// === 手动拖拽：pointer 事件 + 绝对增量 + setBounds + 读回修正 DWM ===
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
    document.querySelectorAll('.menu-item').forEach(function(el){ el.remove() })
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
  ipcMain.on('floating-ball-drag-start', (_event: any, sx: number, sy: number) => {
    if (!floatingBallWindow || floatingBallWindow.isDestroyed()) return
    const [wx, wy] = floatingBallWindow.getPosition()
    dragOrigin = { winX: wx, winY: wy, scrX: sx, scrY: sy }
  })

  ipcMain.on('floating-ball-move', (_event: any, sx: number, sy: number) => {
    if (!floatingBallWindow || floatingBallWindow.isDestroyed() || !dragOrigin) return
    const dx = sx - dragOrigin.scrX
    const dy = sy - dragOrigin.scrY
    const nx = Math.round(dragOrigin.winX + dx)
    const ny = Math.round(dragOrigin.winY + dy)
    floatingBallWindow.setBounds({ x: nx, y: ny, width: BALL_SIZE, height: BALL_SIZE })
    // 读回修正 DWM 1px 偏移
    const [ax, ay] = floatingBallWindow.getPosition()
    if (ax !== nx || ay !== ny) {
      floatingBallWindow.setBounds({ x: nx + (nx - ax), y: ny + (ny - ay), width: BALL_SIZE, height: BALL_SIZE })
    }
  })

  ipcMain.on('floating-ball-drag-end', () => {
    dragOrigin = null
    if (floatingBallWindow && !floatingBallWindow.isDestroyed()) {
      ballPos = floatingBallWindow.getPosition()
    }
  })
}
