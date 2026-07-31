import { BrowserWindow, ipcMain, screen } from 'electron'
import { join } from 'node:path'
import log from './logger'

let mainWindow: BrowserWindow | null = null

function setMainWindow(win: BrowserWindow) {
  mainWindow = win
}

function updateAudioLevels(micLevel: number, sysLevel: number) {
  if (toolbarWindow && !toolbarWindow.isDestroyed()) {
    toolbarWindow.webContents.send('audio-levels', { micLevel, sysLevel })
  }
  if (floatingIsland && !floatingIsland.isDestroyed()) {
    floatingIsland.webContents.send('audio-levels', { micLevel, sysLevel })
  }
}

// === 选区覆盖窗口 ===
let regionWindow: BrowserWindow | null = null
let resolveRegion: ((region: { x: number; y: number; width: number; height: number; sourceId: string } | null) => void) | null = null

function selectRegion(): Promise<{ x: number; y: number; width: number; height: number; sourceId: string } | null> {
  return new Promise((resolve) => {
    resolveRegion = resolve

    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.minimize()

    const primaryDisplay = screen.getPrimaryDisplay()
    const { x, y, width, height } = primaryDisplay.bounds

    regionWindow = new BrowserWindow({
      x,
      y,
      width,
      height,
      frame: false,
      transparent: true,
      resizable: false,
      movable: false,
      alwaysOnTop: true,
      skipTaskbar: true,
      hasShadow: false,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false,
      },
    })

    const htmlPath = join(__dirname, 'region-selector.html')
    regionWindow.loadFile(htmlPath).catch((err: any) => {
      log.error('Failed to load region selector:', err.message)
      cleanupRegionSelector(null)
    })

    regionWindow.setFullScreen(true)
    regionWindow.setVisibleOnAllWorkspaces(true)
    regionWindow.setIgnoreMouseEvents(false)

    regionWindow.on('closed', () => {
      if (resolveRegion) {
        resolveRegion(null)
        resolveRegion = null
      }
    })
  })
}

function cleanupRegionSelector(result: { x: number; y: number; width: number; height: number; sourceId: string } | null) {
  if (regionWindow && !regionWindow.isDestroyed()) {
    regionWindow.close()
  }
  regionWindow = null
  if (resolveRegion) {
    resolveRegion(result)
    resolveRegion = null
  }
}

// === 录制区域边框窗口 + 工具栏窗口（分离） ===
let borderWindow: BrowserWindow | null = null
let toolbarWindow: BrowserWindow | null = null
let savedRegion: { x: number; y: number; width: number; height: number } | null = null
let savedToolbarPos: 'top' | 'bottom' | 'inside' | null = null

// === 摄像头预览悬浮窗 ===
let cameraPreviewWindow: BrowserWindow | null = null

const CAMERA_PREVIEW_W = 200
const CAMERA_PREVIEW_H = 150
const CAMERA_PREVIEW_PAD = 12

let currentPreviewArea: { x: number; y: number; width: number; height: number } | null = null
let previewDragOffsetX = 0
let previewDragOffsetY = 0
let previewDragInterval: ReturnType<typeof setInterval> | null = null

function startPreviewDrag() {
  if (!cameraPreviewWindow || cameraPreviewWindow.isDestroyed()) return
  const cursor = screen.getCursorScreenPoint()
  const [wx, wy] = cameraPreviewWindow.getPosition()
  previewDragOffsetX = cursor.x - wx
  previewDragOffsetY = cursor.y - wy
  const [w, h] = cameraPreviewWindow.getSize()
  previewDragInterval = setInterval(() => {
    if (!cameraPreviewWindow || cameraPreviewWindow.isDestroyed()) {
      stopPreviewDrag()
      return
    }
    const pos = screen.getCursorScreenPoint()
    let nx = pos.x - previewDragOffsetX
    let ny = pos.y - previewDragOffsetY
    if (currentPreviewArea) {
      nx = Math.max(currentPreviewArea.x, Math.min(nx, currentPreviewArea.x + currentPreviewArea.width - w))
      ny = Math.max(currentPreviewArea.y, Math.min(ny, currentPreviewArea.y + currentPreviewArea.height - h))
    }
    cameraPreviewWindow.setBounds({ x: nx, y: ny, width: w, height: h })
  }, 16)
}

function stopPreviewDrag() {
  if (previewDragInterval) {
    clearInterval(previewDragInterval)
    previewDragInterval = null
  }
}

function showCameraPreview(area: { x: number; y: number; width: number; height: number }, cameraDeviceId?: string) {
  hideCameraPreview()
  currentPreviewArea = area

  const cpX = area.x + area.width - CAMERA_PREVIEW_W - CAMERA_PREVIEW_PAD
  const cpY = area.y + CAMERA_PREVIEW_PAD

  cameraPreviewWindow = new BrowserWindow({
    x: cpX,
    y: cpY,
    width: CAMERA_PREVIEW_W,
    height: CAMERA_PREVIEW_H,
    frame: false,
    transparent: true,
    resizable: false,
    movable: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    hasShadow: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  })
  cameraPreviewWindow.setVisibleOnAllWorkspaces(true)
  cameraPreviewWindow.setAlwaysOnTop(true, 'screen-saver')

  const htmlPath = join(__dirname, 'camera-preview.html')
  const deviceIdParam = cameraDeviceId ? `?deviceId=${encodeURIComponent(cameraDeviceId)}` : ''
  cameraPreviewWindow.loadFile(htmlPath + deviceIdParam).catch((err: any) => {
    log.error('Failed to load camera preview:', err.message)
  })

  log.info('Camera preview shown at', cpX, cpY)
}

function hideCameraPreview() {
  if (cameraPreviewWindow && !cameraPreviewWindow.isDestroyed()) {
    cameraPreviewWindow.close()
    cameraPreviewWindow = null
  }
}

function stopCameraPreviewStream() {
  if (cameraPreviewWindow && !cameraPreviewWindow.isDestroyed()) {
    cameraPreviewWindow.webContents.send('camera-control', 'stop')
  }
}

function resumeCameraPreviewStream() {
  if (cameraPreviewWindow && !cameraPreviewWindow.isDestroyed()) {
    cameraPreviewWindow.webContents.send('camera-control', 'start')
  }
}

// === 悬浮岛窗口 ===
let floatingIsland: BrowserWindow | null = null
let islandMouseCheckInterval: ReturnType<typeof setInterval> | null = null
let hideIslandTimer: ReturnType<typeof setTimeout> | null = null
let islandState: 'idle' | 'recording' = 'idle'
let islandTargetBounds: Electron.Rectangle | null = null

function showFloatingIsland(audioState?: { micEnabled: boolean; sysEnabled: boolean; cameraEnabled?: boolean; cameraDeviceId?: string }, targetDisplayId?: number) {
  hideFloatingIsland()
  islandState = 'idle'

  let display = screen.getPrimaryDisplay()
  if (targetDisplayId != null) {
    const found = screen.getAllDisplays().find(d => d.id === targetDisplayId)
    if (found) display = found
  }
  const bounds = display.bounds
  islandTargetBounds = bounds
  const islandW = 340
  const islandH = 44
  const islandX = Math.round(bounds.x + (bounds.width - islandW) / 2)
  const islandY = bounds.y + 4

  floatingIsland = new BrowserWindow({
    x: islandX,
    y: islandY,
    width: islandW,
    height: islandH,
    frame: false,
    transparent: true,
    resizable: true,
    movable: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    hasShadow: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  })
  floatingIsland.setVisibleOnAllWorkspaces(true)
  floatingIsland.setMinimumSize(100, 44)
  floatingIsland.setAlwaysOnTop(true, 'screen-saver')

  const html = `<!DOCTYPE html>
<html><head><style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{height:100%;overflow:hidden;font-family:'Segoe UI',system-ui,sans-serif}
.island{
  width:fit-content;height:100%;
  background:rgba(20,20,40,0.96);
  border-radius:22px;
  display:flex;align-items:center;justify-content:center;gap:8px;
  border:1px solid rgba(255,255,255,0.08);
  padding:0 10px;
  transition:opacity 0.3s,transform 0.3s;
}
.island.hidden{opacity:0;transform:translateY(-8px) scaleY(0.5);pointer-events:none}
.island button{
  width:28px;height:28px;border:none;border-radius:14px;flex-shrink:0;
  background:transparent;color:#e8e8f0;cursor:pointer;
  display:flex;align-items:center;justify-content:center;
  transition:background 0.15s;
}
.island button:hover{background:rgba(255,255,255,0.12)}
.island button:disabled{opacity:0.3;cursor:not-allowed;pointer-events:none}
.island button.active{background:rgba(255,255,255,0.15);color:#4ecdc4}
.island button.active svg{stroke:#4ecdc4}
.island .action-btn{width:auto;padding:0 14px;gap:5px;font-size:12px;font-weight:600;border-radius:14px;transition:background 0.15s}
.island .start-btn{background:#e94560;color:#fff}
.island .start-btn:hover{background:#ff6b81}
.island .start-btn svg{stroke:#fff}
.island .stop-btn{background:rgba(255,255,255,0.15);color:#e8e8f0}
.island .stop-btn:hover{background:rgba(255,255,255,0.25)}
.island .close-btn{color:rgba(255,255,255,0.4);margin-left:auto}
.island .close-btn:hover{background:rgba(255,60,60,0.3);color:#fff}
.island .pause-btn{color:#ffd93d}
.island .pause-btn:hover{background:rgba(255,217,61,0.15)}
.recording-dot{width:6px;height:6px;background:#e94560;border-radius:50%;flex-shrink:0;animation:pulse 1s infinite}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.3}}
.timer{color:#e8e8f0;font-size:12px;font-family:Consolas,monospace;min-width:40px;flex-shrink:0}
.sep{width:1px;height:20px;background:rgba(255,255,255,0.1);flex-shrink:0}
.btn-group{display:flex;align-items:center;gap:2px;flex-shrink:0}
.meter-group{display:none;align-items:flex-end;gap:1px;height:20px}
.meter-bar{width:3px;background:rgba(255,255,255,0.15);border-radius:1px}
.meter-bar.on{background:#4ecdc4;box-shadow:0 0 4px #4ecdc4}
.meter-bar.on.warn{background:#ffd93d;box-shadow:0 0 4px #ffd93d}
.meter-bar.on.hot{background:#e94560;box-shadow:0 0 4px #e94560}
/* AI 状态指示器 */
.ai-indicator{display:flex;align-items:center;gap:6px;flex-shrink:0;padding:0 6px;cursor:pointer;border-radius:6px;transition:background 0.15s}
.ai-indicator:hover{background:rgba(255,255,255,0.1)}
.ai-dot{width:8px;height:8px;border-radius:50%;flex-shrink:0;transition:all 0.3s}
.ai-dot.idle{background:#9e9e9e}
.ai-dot.thinking{background:#ffd93d;animation:ai-breathe 1.5s ease-in-out infinite}
.ai-dot.working{background:#4ecdc4;animation:ai-pulse 0.8s ease-in-out infinite}
.ai-dot.error{background:#e94560}
.ai-dot.notification{background:#b388ff;animation:ai-pulse 0.6s ease-in-out infinite}
.ai-dot.done{background:#66bb6a;animation:ai-flash 0.3s ease 3}
@keyframes ai-breathe{0%,100%{opacity:0.4;transform:scale(0.8)}50%{opacity:1;transform:scale(1.1)}}
@keyframes ai-pulse{0%,100%{opacity:0.5;transform:scale(0.9)}50%{opacity:1;transform:scale(1.15)}}
@keyframes ai-flash{0%,100%{opacity:1}50%{opacity:0.2;transform:scale(1.3)}}
.ai-label{font-size:11px;color:rgba(255,255,255,0.6);white-space:nowrap;font-weight:500}
.ai-label.active{color:#e8e8f0}
/* 权限卡片 */
.perm-card{width:100%;padding:8px 12px;background:rgba(255,255,255,0.06);border-top:1px solid rgba(255,255,255,0.08);display:none;flex-direction:column;gap:6px}
.perm-card.show{display:flex}
.perm-header{font-size:11px;font-weight:600;color:#e8e8f0;display:flex;align-items:center;gap:6px}
.perm-detail{font-size:10px;color:rgba(255,255,255,0.6);word-break:break-all;line-height:1.4}
.perm-tool{color:#4ecdc4;font-weight:500}
.perm-actions{display:flex;gap:6px;margin-top:2px}
.perm-btn{flex:1;padding:5px 8px;border:none;border-radius:6px;font-size:11px;font-weight:600;cursor:pointer;transition:all 0.15s}
.perm-btn.allow{background:#4ecdc4;color:#1a1a2e}
.perm-btn.allow:hover{background:#6eddd6}
.perm-btn.deny{background:rgba(255,255,255,0.1);color:#e8e8f0}
.perm-btn.deny:hover{background:rgba(233,69,96,0.3);color:#e94560}
.perm-btn.always{background:rgba(78,205,196,0.15);color:#4ecdc4;border:1px solid rgba(78,205,196,0.3)}
.perm-btn.always:hover{background:rgba(78,205,196,0.25)}
</style></head><body>
<div class="island" id="island">
  <span class="recording-dot" id="dot" style="display:none"></span>
  <span class="timer" id="timer">00:00</span>
  <div class="btn-group">
    <button id="micBtn" title="麦克风" onclick="doToggleMic()">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
    </button>
    <div class="meter-group" id="micMeter"></div>
  </div>
  <!-- <div class="btn-group">
    <button id="sysBtn" title="系统音频" onclick="doToggleSys()">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>
    </button>
    <div class="meter-group" id="sysMeter"></div>
  </div> -->
  <div class="btn-group">
    <button id="camBtn" title="摄像头" onclick="doToggleCam()">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 7l-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>
    </button>
  </div>
  <div class="sep"></div>
  <button class="action-btn start-btn" id="startBtn" onclick="doStart()">
    <svg width="10" height="10" viewBox="0 0 12 12"><circle cx="6" cy="6" r="5" fill="currentColor"/></svg>
    <span>录制</span>
  </button>
  <button class="stop-btn" id="stopBtn" style="display:none" onclick="doStop()" title="停止">
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="1"/></svg>
  </button>
  <button class="pause-btn" id="pauseBtn" style="display:none" onclick="doPause()" title="暂停">
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
  </button>
  <button id="resumeBtn" style="display:none" onclick="doResume()" title="继续">
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg>
  </button>
  <button class="close-btn" onclick="doClose()" title="取消">
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/></svg>
  </button>
</div>
<div class="sep" id="aiSep" style="display:none"></div>
<div class="ai-indicator" id="aiIndicator" style="display:none" onclick="showAiDetail()" title="点击查看详情">
  <span class="ai-dot idle" id="aiDot"></span>
  <span class="ai-label" id="aiLabel">AI 待机</span>
</div>
<div class="perm-card" id="permCard">
  <div class="perm-header">
    <span>🤖</span>
    <span>Claude Code 请求权限</span>
  </div>
  <div class="perm-detail">
    <span class="perm-tool" id="permTool">工具名</span>
    <span id="permTarget">目标信息</span>
  </div>
  <div class="perm-actions">
    <button class="perm-btn allow" onclick="doAllow()">✅ 允许</button>
    <button class="perm-btn deny" onclick="doDeny()">❌ 拒绝</button>
    <button class="perm-btn always" onclick="doAlwaysAllow()">📌 始终允许</button>
  </div>
</div>
<script>
const {ipcRenderer}=require('electron')
let timerInterval=null,seconds=0,micOn=${audioState?.micEnabled ? 'true' : 'false'},sysOn=${audioState?.sysEnabled ? 'true' : 'false'},camOn=${audioState?.cameraEnabled ? 'true' : 'false'},isRecording=false
function updateTimer(){
  seconds++;const m=String(Math.floor(seconds/60)).padStart(2,'0')
  const s=String(seconds%60).padStart(2,'0')
  document.getElementById('timer').textContent=m+':'+s
}
const BAR_COUNT=8
function buildBars(c){if(!c)return;for(let i=0;i<BAR_COUNT;i++){const b=document.createElement('div');b.className='meter-bar';b.style.height='20px';c.appendChild(b)}}
const micEl=document.getElementById('micMeter');const sysEl=document.getElementById('sysMeter')
buildBars(micEl);buildBars(sysEl)
function updateMeter(c,lv){if(!c)return;const bs=c.children;const a=Math.round(lv*BAR_COUNT);for(let i=0;i<bs.length;i++){bs[i].className='meter-bar'+(i<a?' on'+(i>=6?' hot':i>=5?' warn':''):'')}}
function updateAudioUI(){
  const micBtn=document.getElementById('micBtn')
  const sysBtn=document.getElementById('sysBtn')
  const camBtn=document.getElementById('camBtn')
  micBtn.classList.toggle('active',micOn)
  if(sysBtn)sysBtn.classList.toggle('active',sysOn)
  camBtn.classList.toggle('active',camOn)
  micEl.style.display=micOn?'flex':'none'
  if(sysEl)sysEl.style.display=sysOn?'flex':'none'
  micBtn.disabled=isRecording;if(sysBtn)sysBtn.disabled=isRecording;camBtn.disabled=isRecording
  setTimeout(resizeIsland,50)
}
updateAudioUI()
ipcRenderer.on('island-state',(e,state,elapsed)=>{
  const island=document.getElementById('island')
  const startBtn=document.getElementById('startBtn')
  const stopBtn=document.getElementById('stopBtn')
  const pauseBtn=document.getElementById('pauseBtn')
  const resumeBtn=document.getElementById('resumeBtn')
  const dot=document.getElementById('dot')
  if(state==='recording'){
    isRecording=true
    startBtn.style.display='none';stopBtn.style.display='flex';pauseBtn.style.display='flex';resumeBtn.style.display='none';dot.style.display='inline-block'
    if(typeof elapsed==='number'&&elapsed>0){seconds=elapsed}else{seconds=0}
    if(timerInterval){clearInterval(timerInterval);timerInterval=null}
    timerInterval=setInterval(updateTimer,1000)
    updateAudioUI()
    setTimeout(resizeIsland,50)
  }else if(state==='paused'){
    pauseBtn.style.display='none';resumeBtn.style.display='flex';if(timerInterval){clearInterval(timerInterval);timerInterval=null}
    setTimeout(resizeIsland,50)
  }else if(state==='idle'){
    isRecording=false
    startBtn.style.display='flex';stopBtn.style.display='none';pauseBtn.style.display='none';resumeBtn.style.display='none';dot.style.display='none'
    island.classList.remove('hidden')
    if(timerInterval){clearInterval(timerInterval);timerInterval=null}seconds=0;document.getElementById('timer').textContent='00:00'
    updateAudioUI()
    setTimeout(resizeIsland,50)
  }else if(state==='show'){
    island.classList.remove('hidden')
  }else if(state==='hide'){
    island.classList.add('hidden')
  }
})
ipcRenderer.on('audio-levels',(e,{micLevel,sysLevel})=>{
  if(micOn)updateMeter(micEl,micLevel)
  if(sysOn)updateMeter(sysEl,sysLevel)
})
function doToggleMic(){micOn=!micOn;updateAudioUI();resizeIsland();ipcRenderer.send('island-action','toggle-mic')}
function doToggleSys(){sysOn=!sysOn;updateAudioUI();resizeIsland();ipcRenderer.send('island-action','toggle-sys')}
function doToggleCam(){camOn=!camOn;updateAudioUI();resizeIsland();ipcRenderer.send('island-action','toggle-camera')}
function doStart(){ipcRenderer.send('island-action','start')}
function doPause(){ipcRenderer.send('island-action','pause')}
function doResume(){ipcRenderer.send('island-action','resume')}
function doStop(){ipcRenderer.send('island-action','stop')}
function doClose(){ipcRenderer.send('island-action','close')}
function resizeIsland(){
  const island=document.getElementById('island')
  const w=island.scrollWidth
  const permCard=document.getElementById('permCard')
  const extraH=permCard&&permCard.classList.contains('show')?100:0
  ipcRenderer.send('resize-island',w,44+extraH)
}
const ro=new ResizeObserver(()=>resizeIsland())
ro.observe(document.getElementById('island'))
// AI 状态管理
let currentAiState='idle'
const aiLabels={idle:'AI 待机',thinking:'AI 思考中',working:'AI 工作中',error:'AI 出错了',notification:'等待审批',done:'任务完成'}
ipcRenderer.on('agent-state-update',(e,data)=>{
  const ind=document.getElementById('aiIndicator'),dot=document.getElementById('aiDot'),lb=document.getElementById('aiLabel'),sp=document.getElementById('aiSep')
  if(!data||(data.state==='idle'&&(!data.sessions||!data.sessions.length))){ind.style.display='none';sp.style.display='none';return}
  ind.style.display='flex';sp.style.display='block';currentAiState=data.state
  dot.className='ai-dot '+data.state;lb.textContent=aiLabels[data.state]||'AI '+data.state;lb.classList.toggle('active',data.state!=='idle')
  setTimeout(resizeIsland,50)
})
ipcRenderer.on('agent-permission-request',(e,data)=>{
  document.getElementById('permCard').classList.add('show')
  document.getElementById('permTool').textContent=data.toolName||'未知操作'
  const istr=data.toolInput?JSON.stringify(data.toolInput).slice(0,80):''
  document.getElementById('permTarget').textContent=istr?': '+istr:''
  setTimeout(resizeIsland,50)
})
function doAllow(){resolvePerm('allow')}
function doDeny(){resolvePerm('deny')}
function doAlwaysAllow(){resolvePerm('always')}
function resolvePerm(b){ipcRenderer.invoke('agent-resolve-permission',b);document.getElementById('permCard').classList.remove('show');setTimeout(resizeIsland,50)}
function showAiDetail(){}
</script>
</body></html>`

  floatingIsland.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`)
  log.info('Floating island shown')

  // 全屏录制时，始终记住区域以支持后续 toggle
  currentPreviewArea = bounds
  if (audioState?.cameraEnabled) {
    showCameraPreview(bounds, audioState.cameraDeviceId)
  }
}

function hideFloatingIsland() {
  if (islandMouseCheckInterval) {
    clearInterval(islandMouseCheckInterval)
    islandMouseCheckInterval = null
  }
  if (hideIslandTimer) {
    clearTimeout(hideIslandTimer)
    hideIslandTimer = null
  }
  if (floatingIsland && !floatingIsland.isDestroyed()) {
    floatingIsland.close()
    floatingIsland = null
  }
  hideCameraPreview()
  currentPreviewArea = null
  islandTargetBounds = null
}

function setFloatingIslandState(state: 'idle' | 'recording' | 'paused' | 'show' | 'hide', elapsedSeconds?: number) {
  islandState = state === 'idle' ? 'idle' : state === 'recording' ? 'recording' : state === 'paused' ? 'paused' : islandState
  if (state === 'show' || state === 'hide') {
    if (floatingIsland && !floatingIsland.isDestroyed()) {
      floatingIsland.webContents.send('island-state', state)
    }
    return
  }
  if (floatingIsland && !floatingIsland.isDestroyed()) {
    floatingIsland.webContents.send('island-state', state, elapsedSeconds)
  }

  // 录制中：追踪鼠标，靠近顶部显示悬浮岛
  if (islandMouseCheckInterval) {
    clearInterval(islandMouseCheckInterval)
    islandMouseCheckInterval = null
  }
  if (hideIslandTimer) {
    clearTimeout(hideIslandTimer)
    hideIslandTimer = null
  }
  if (state === 'recording') {
    // 录制中：追踪鼠标，鼠标离开后 0.5 秒隐藏。500ms 粒度足够检测进出
    // （配合 500ms 的 hideIslandTimer），降低同步 getCursorScreenPoint 主线程唤醒
    islandMouseCheckInterval = setInterval(() => {
      if (!floatingIsland || floatingIsland.isDestroyed()) return
      const pos = screen.getCursorScreenPoint()
      const [ix, iy] = floatingIsland.getPosition()
      const [iw, ih] = floatingIsland.getSize()
      if (pos.x >= ix && pos.x <= ix + iw && pos.y >= iy - 4 && pos.y <= iy + ih) {
        if (hideIslandTimer) { clearTimeout(hideIslandTimer); hideIslandTimer = null }
        floatingIsland.webContents.send('island-state', 'show')
      } else {
        if (!hideIslandTimer) {
          hideIslandTimer = setTimeout(() => {
            if (floatingIsland && !floatingIsland.isDestroyed()) {
              floatingIsland.webContents.send('island-state', 'hide')
            }
            hideIslandTimer = null
          }, 500)
        }
      }
    }, 500)
  }
}

const TOOLBAR_HEIGHT = 44
const BORDER_WIDTH = 3

function showRegionBorder(region: { x: number; y: number; width: number; height: number }, audioState?: { micEnabled: boolean; sysEnabled: boolean; cameraEnabled?: boolean; cameraDeviceId?: string }) {
  hideRegionBorder()

  const bw = BORDER_WIDTH

  // --- 智能工具栏定位 ---
  const pad = bw + 2
  const display = screen.getPrimaryDisplay()
  const displayBounds = display.bounds
  const topSpace = region.y - displayBounds.y
  const bottomSpace = displayBounds.y + displayBounds.height - (region.y + region.height)
  const minSpace = TOOLBAR_HEIGHT + 4
  let tbX: number, tbY: number, tbW: number, tbPos: 'top' | 'bottom' | 'inside'

  if (topSpace >= minSpace) {
    tbPos = 'top'
    tbX = region.x - pad
    tbY = region.y - TOOLBAR_HEIGHT - pad
    tbW = region.width + pad * 2
  } else if (bottomSpace >= minSpace) {
    tbPos = 'bottom'
    tbX = region.x - pad
    tbY = region.y + region.height + pad
    tbW = region.width + pad * 2
  } else {
    tbPos = 'inside'
    tbX = region.x
    tbY = region.y
    tbW = Math.min(region.width, 500)
  }
  savedRegion = { ...region }
  savedToolbarPos = tbPos

  toolbarWindow = new BrowserWindow({
    x: tbX,
    y: tbY,
    width: tbW,
    height: TOOLBAR_HEIGHT,
    frame: false,
    transparent: true,
    resizable: false,
    movable: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    hasShadow: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  })
  toolbarWindow.setVisibleOnAllWorkspaces(true)
  toolbarWindow.setAlwaysOnTop(true, 'screen-saver')

  const toolbarHtml = `<!DOCTYPE html>
<html><head><style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:100%;height:100%;overflow:hidden;font-family:'Segoe UI',system-ui,sans-serif}
.toolbar{
  width:100%;height:${TOOLBAR_HEIGHT}px;
  background:rgba(20,20,40,0.97);
  border-radius:8px 8px 0 0;
  display:flex;align-items:center;justify-content:center;gap:6px;
  padding:0 10px;
}
.toolbar button{
  width:32px;height:32px;border:none;border-radius:6px;
  background:transparent;color:#e8e8f0;cursor:pointer;
  display:flex;align-items:center;justify-content:center;
  transition:background 0.15s;
}
.toolbar button:hover{background:rgba(255,255,255,0.12)}
.toolbar button:disabled{opacity:0.3;cursor:not-allowed;pointer-events:none}
.toolbar .rec{background:#e94560;color:#fff;width:auto;padding:0 14px;gap:6px;font-size:13px;font-weight:600}
.toolbar .rec:hover{background:#ff6b81}
.toolbar .rec.active{background:rgba(255,255,255,0.15);color:#e94560}
.toolbar .stop-btn:hover{background:rgba(255,255,255,0.2)}
.toolbar .close-btn{margin-left:auto;color:rgba(255,255,255,0.5)}
.toolbar .close-btn:hover{background:rgba(255,60,60,0.3);color:#fff}
.toolbar .pause-btn{color:#ffd93d}
.toolbar .pause-btn:hover{background:rgba(255,217,61,0.15)}
.toolbar .audio-toggle{position:relative}
.toolbar .audio-toggle.active{background:rgba(255,255,255,0.15);color:#4ecdc4}
.toolbar .audio-toggle.active svg{stroke:#4ecdc4}
.size-label{color:rgba(255,255,255,0.5);font-size:11px;margin-left:8px;white-space:nowrap}
.audio-meters{display:flex;gap:6px;margin-left:6px;align-items:flex-end;height:20px}
.meter-group{display:flex;align-items:flex-end;gap:1px}
.meter-bar{width:3px;background:rgba(255,255,255,0.15);border-radius:1px}
.meter-bar.on{background:#4ecdc4;box-shadow:0 0 4px #4ecdc4}
.meter-bar.on.warn{background:#ffd93d;box-shadow:0 0 4px #ffd93d}
.meter-bar.on.hot{background:#e94560;box-shadow:0 0 4px #e94560}
.meter-label{font-size:8px;color:rgba(255,255,255,0.35);margin-left:2px;align-self:flex-end;white-space:nowrap}
.sep{width:1px;height:20px;background:rgba(255,255,255,0.1);flex-shrink:0}
.recording-dot{width:8px;height:8px;background:#e94560;border-radius:50%;display:none}
.recording-dot.active{display:inline-block;animation:pulse 1s infinite}
.timer{color:#e8e8f0;font-size:13px;font-family:Consolas,monospace;margin-left:6px;min-width:48px}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.3}}
.toolbar[data-pos="bottom"]{border-radius:0 0 8px 8px}
.toolbar[data-pos="inside"]{border-radius:8px}
.toolbar.minimal{width:fit-content;height:40px!important;border-radius:22px;background:rgba(20,20,40,0.96);border:1px solid rgba(255,255,255,0.08);padding:0 10px}
.toolbar.minimal .audio-toggle,.toolbar.minimal .meter-group,.toolbar.minimal .sep,.toolbar.minimal .size-label,.toolbar.minimal .close-btn{display:none!important}
</style></head><body>
<div class="toolbar" id="toolbar" data-pos="${tbPos}">
  <span class="recording-dot" id="dot"></span>
  <span class="timer" id="timer">00:00</span>
  <button class="audio-toggle" id="micBtn" title="麦克风" onclick="doToggleMic()">
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
  </button>
  <div class="meter-group" id="micMeter"></div>
  <!-- <button class="audio-toggle" id="sysBtn" title="系统音频" onclick="doToggleSys()">
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>
  </button>
  <div class="meter-group" id="sysMeter"></div> -->
  <button class="audio-toggle" id="camBtn" title="摄像头" onclick="doToggleCam()">
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 7l-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>
  </button>
  <div class="sep"></div>
  <button class="rec" id="startBtn" onclick="doStart()" title="开始录制">
    <svg width="12" height="12" viewBox="0 0 12 12"><circle cx="6" cy="6" r="5" fill="currentColor"/></svg>
    <span>录制</span>
  </button>
  <button class="stop-btn" id="stopBtn" style="display:none" onclick="doStop()" title="停止">
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="1"/></svg>
  </button>
  <button class="pause-btn" id="pauseBtn" style="display:none" onclick="doPause()" title="暂停">
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
  </button>
  <button id="resumeBtn" style="display:none" onclick="doResume()" title="继续">
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg>
  </button>
  <span class="size-label" id="sizeLabel">${region.width}×${region.height}</span>
  <button class="close-btn" onclick="doClose()" title="关闭并停止录制">
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/></svg>
  </button>
</div>
<script>
const {ipcRenderer}=require('electron')
let timerInterval=null,seconds=0,micOn=${audioState?.micEnabled ? 'true' : 'false'},sysOn=${audioState?.sysEnabled ? 'true' : 'false'},camOn=${audioState?.cameraEnabled ? 'true' : 'false'},isRecording=false
function updateTimer(){
  seconds++;const m=String(Math.floor(seconds/60)).padStart(2,'0')
  const s=String(seconds%60).padStart(2,'0')
  document.getElementById('timer').textContent=m+':'+s
}
function updateAudioUI(){
  const micBtn=document.getElementById('micBtn')
  const sysBtn=document.getElementById('sysBtn')
  const camBtn=document.getElementById('camBtn')
  const micEl=document.getElementById('micMeter')
  const sysEl=document.getElementById('sysMeter')
  micBtn.classList.toggle('active',micOn)
  if(sysBtn)sysBtn.classList.toggle('active',sysOn)
  camBtn.classList.toggle('active',camOn)
  micEl.style.display=micOn?'flex':'none'
  if(sysEl)sysEl.style.display=sysOn?'flex':'none'
  micBtn.disabled=isRecording;if(sysBtn)sysBtn.disabled=isRecording;camBtn.disabled=isRecording
}
ipcRenderer.on('toolbar-state',(e,state,elapsed,pos)=>{
  document.getElementById('toolbar').classList.toggle('minimal',(state==='recording'||state==='paused')&&pos==='inside')
  const startBtn=document.getElementById('startBtn')
  const pauseBtn=document.getElementById('pauseBtn')
  const resumeBtn=document.getElementById('resumeBtn')
  const stopBtn=document.getElementById('stopBtn')
  const dot=document.getElementById('dot')
  if(state==='recording'){
    isRecording=true
    startBtn.style.display='none';pauseBtn.style.display='flex';resumeBtn.style.display='none';stopBtn.style.display='flex';dot.classList.add('active')
    if(typeof elapsed==='number'&&elapsed>0){seconds=elapsed}else{seconds=0}
    if(timerInterval){clearInterval(timerInterval);timerInterval=null}
    timerInterval=setInterval(updateTimer,1000)
    updateAudioUI()
  }else if(state==='paused'){
    pauseBtn.style.display='none';resumeBtn.style.display='flex';if(timerInterval){clearInterval(timerInterval);timerInterval=null}
  }else{
    isRecording=false
    startBtn.style.display='flex';pauseBtn.style.display='none';resumeBtn.style.display='none';stopBtn.style.display='none';dot.classList.remove('active')
    if(timerInterval){clearInterval(timerInterval);timerInterval=null}seconds=0;document.getElementById('timer').textContent='00:00'
    updateAudioUI()
  }
})
function doStart(){ipcRenderer.send('toolbar-action','start')}
function doPause(){ipcRenderer.send('toolbar-action','pause')}
function doResume(){ipcRenderer.send('toolbar-action','resume')}
function doStop(){ipcRenderer.send('toolbar-action','stop')}
function doClose(){ipcRenderer.send('toolbar-action','close')}
function doToggleMic(){micOn=!micOn;updateAudioUI();ipcRenderer.send('toolbar-action','toggle-mic')}
function doToggleSys(){sysOn=!sysOn;updateAudioUI();ipcRenderer.send('toolbar-action','toggle-sys')}
function doToggleCam(){camOn=!camOn;updateAudioUI();ipcRenderer.send('toolbar-action','toggle-camera')}

// 音量指示器
const BAR_COUNT=8
function buildBars(container){
  if(!container)return
  for(let i=0;i<BAR_COUNT;i++){
    const bar=document.createElement('div')
    bar.className='meter-bar'
    bar.style.height='20px'
    container.appendChild(bar)
  }
}
const micEl=document.getElementById('micMeter')
const sysEl=document.getElementById('sysMeter')
buildBars(micEl)
buildBars(sysEl)
updateAudioUI()

function updateMeter(container,level){
  const bars=container.children
  const active=Math.round(level*BAR_COUNT)
  for(let i=0;i<bars.length;i++){
    bars[i].className='meter-bar'+(i<active?' on'+(i>=6?' hot':i>=5?' warn':''):'')
  }
}

ipcRenderer.on('audio-levels',(e,{micLevel,sysLevel})=>{
  if(micOn)updateMeter(micEl,micLevel)
  if(sysOn)updateMeter(sysEl,sysLevel)
})
</script>
</body></html>`

  toolbarWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(toolbarHtml)}`)

  // --- 边框窗口（全穿透，鼠标操作不影响下层） ---
  const bX = region.x - pad
  const bY = region.y - pad
  const bW = region.width + pad * 2
  const bH = region.height + pad * 2

  borderWindow = new BrowserWindow({
    x: bX,
    y: bY,
    width: bW,
    height: bH,
    show: false,
    frame: false,
    transparent: true,
    resizable: false,
    movable: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    hasShadow: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  })

  borderWindow.setVisibleOnAllWorkspaces(true)
  borderWindow.setAlwaysOnTop(true, 'screen-saver')
  borderWindow.setIgnoreMouseEvents(true)
  borderWindow.setBounds({ x: bX, y: bY, width: bW, height: bH })
  borderWindow.show()

  const borderHtml = `<!DOCTYPE html>
<html><head><style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:100%;height:100%;overflow:hidden}
.border{
  position:absolute;left:0;top:0;right:0;bottom:0;
  border:${bw}px solid #e94560;
  background:transparent;
}
</style></head><body>
<div class="border"></div>
</body></html>`

  borderWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(borderHtml)}`)
  log.info('Region border+toolbar shown (split windows):', region)

  // 区域录制时，始终记住区域以支持后续 toggle
  currentPreviewArea = region
  if (audioState?.cameraEnabled) {
    showCameraPreview(region, audioState.cameraDeviceId)
  }

  // 一次性提升 z 序到 screen-saver 层级（setAlwaysOnTop 是粘性的，无需轮询）
  if (borderWindow && !borderWindow.isDestroyed()) borderWindow.setAlwaysOnTop(true, 'screen-saver')
  if (toolbarWindow && !toolbarWindow.isDestroyed()) toolbarWindow.setAlwaysOnTop(true, 'screen-saver')
  if (cameraPreviewWindow && !cameraPreviewWindow.isDestroyed()) cameraPreviewWindow.setAlwaysOnTop(true, 'screen-saver')
}

function updateToolbarState(state: 'idle' | 'recording' | 'paused', elapsedSeconds?: number) {
  if (toolbarWindow && !toolbarWindow.isDestroyed()) {
    toolbarWindow.webContents.send('toolbar-state', state, elapsedSeconds, savedToolbarPos)
    if ((state === 'recording' || state === 'paused') && savedToolbarPos === 'inside' && savedRegion) {
      toolbarWindow.setBounds({
        x: savedRegion.x + 8,
        y: savedRegion.y + 8,
        width: 170,
        height: 40,
      })
    }
  }
}

function hideBorderOnly() {
  if (borderWindow && !borderWindow.isDestroyed()) {
    borderWindow.close()
    borderWindow = null
  }
}

function hideRegionBorder() {
  hideBorderOnly()
  if (toolbarWindow && !toolbarWindow.isDestroyed()) {
    toolbarWindow.close()
    toolbarWindow = null
  }
  hideCameraPreview()
  currentPreviewArea = null
  log.info('Region border hidden')
}

function registerRegionSelectorHandlers() {
  ipcMain.on('region-selected', (_event: any, region: { x: number; y: number; width: number; height: number; sourceId: string }) => {
    log.info('Region selected:', region)
    cleanupRegionSelector(region)
  })

  ipcMain.on('region-cancelled', () => {
    log.info('Region selection cancelled')
    cleanupRegionSelector(null)
  })

  ipcMain.handle('show-region-border', (_event: any, region: { x: number; y: number; width: number; height: number }, audioState?: { micEnabled: boolean; sysEnabled: boolean }) => {
    showRegionBorder(region, audioState)
  })

  ipcMain.handle('hide-region-border', () => {
    hideRegionBorder()
  })

  ipcMain.handle('hide-border-only', () => {
    hideBorderOnly()
  })

  ipcMain.handle('update-toolbar-state', (_event: any, state: 'idle' | 'recording' | 'paused', elapsedSeconds?: number) => {
    updateToolbarState(state, elapsedSeconds)
  })

  ipcMain.on('toolbar-action', (_event: any, action: string) => {
    log.info('Toolbar action:', action)
    if (action === 'close') {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('on-toolbar-action', 'close')
      }
      hideRegionBorder()
      return
    }
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('on-toolbar-action', action)
    }
  })

  ipcMain.removeHandler('set-mouse-ignore')
  ipcMain.removeAllListeners('set-mouse-ignore')

  ipcMain.handle('show-floating-island', (_event: any, audioState?: { micEnabled: boolean; sysEnabled: boolean }, targetDisplayId?: number) => {
    showFloatingIsland(audioState, targetDisplayId)
  })

  ipcMain.handle('hide-floating-island', () => {
    hideFloatingIsland()
  })

  ipcMain.handle('hide-camera-preview', () => {
    hideCameraPreview()
  })

  ipcMain.handle('toggle-camera-preview', (_event: any, show: boolean, cameraDeviceId?: string) => {
    if (show && currentPreviewArea) {
      showCameraPreview(currentPreviewArea, cameraDeviceId)
    } else {
      hideCameraPreview()
    }
  })

  ipcMain.on('camera-drag-start', () => startPreviewDrag())
  ipcMain.on('camera-drag-end', () => stopPreviewDrag())

  ipcMain.handle('set-island-state', (_event: any, state: 'idle' | 'recording' | 'paused', elapsedSeconds?: number) => {
    setFloatingIslandState(state, elapsedSeconds)
  })

  ipcMain.on('island-action', (_event: any, action: string) => {
    log.info('Island action:', action)
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('on-toolbar-action', action)
    }
  })

  ipcMain.on('resize-island', (_event: any, contentWidth: number, contentHeight?: number) => {
    if (floatingIsland && !floatingIsland.isDestroyed()) {
      const bounds = islandTargetBounds || screen.getPrimaryDisplay().bounds
      const totalW = contentWidth + 20 // padding
      const newX = Math.round(bounds.x + (bounds.width - totalW) / 2)
      const h = contentHeight || 44
      floatingIsland.setBounds({ x: newX, y: bounds.y + 4, width: totalW, height: h })
    }
  })
}

module.exports = {
  selectRegion,
  showRegionBorder,
  hideRegionBorder,
  hideBorderOnly,
  updateToolbarState,
  updateAudioLevels,
  showFloatingIsland,
  hideFloatingIsland,
  showCameraPreview,
  hideCameraPreview,
  setFloatingIslandState,
  setMainWindow,
  registerRegionSelectorHandlers,
}
