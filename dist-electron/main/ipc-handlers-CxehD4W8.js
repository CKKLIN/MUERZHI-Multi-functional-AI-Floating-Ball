const e=require(`./logger-IUS_YkgA.js`);let t=require(`electron`),n=require(`node:path`);require(`node:fs`);let r=require(`fluent-ffmpeg`);r=e.i(r);let i=require(`@ffmpeg-installer/ffmpeg`);i=e.i(i),e.t(),r.default.setFfmpegPath(i.default.path);var a=e.r(((r,i)=>{e.t();var a=null;function o(e){a=e}var s=null,c=null;function l(){return new Promise(r=>{c=r;let{x:i,y:a,width:o,height:l}=t.screen.getPrimaryDisplay().workArea;s=new t.BrowserWindow({x:i,y:a,width:o,height:l,frame:!1,transparent:!0,resizable:!1,movable:!1,alwaysOnTop:!0,skipTaskbar:!0,hasShadow:!1,webPreferences:{nodeIntegration:!0,contextIsolation:!1}});let d=(0,n.join)(__dirname,`region-selector.html`);s.loadFile(d).catch(t=>{e.n.error(`Failed to load region selector:`,t.message),u(null)}),s.setFullScreen(!0),s.setVisibleOnAllWorkspaces(!0),s.setIgnoreMouseEvents(!1),s.on(`closed`,()=>{c&&=(c(null),null)})})}function u(e){s&&!s.isDestroyed()&&s.close(),s=null,c&&=(c(e),null)}var d=null,f=44,p=3;function m(n){d&&!d.isDestroyed()&&d.close();let r=p;d=new t.BrowserWindow({x:n.x-r,y:n.y-r-f,width:n.width+r*2,height:n.height+r*2+f,frame:!1,transparent:!0,resizable:!1,movable:!1,alwaysOnTop:!0,skipTaskbar:!0,hasShadow:!1,webPreferences:{nodeIntegration:!0,contextIsolation:!1}}),d.setVisibleOnAllWorkspaces(!0);let i=`<!DOCTYPE html>
<html><head><style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:100%;height:100%;overflow:hidden;font-family:'Segoe UI',system-ui,sans-serif}
.toolbar{
  position:absolute;top:0;left:${r}px;right:${r}px;
  height:${f}px;
  background:rgba(20,20,40,0.92);
  border-radius:8px 8px 0 0;
  display:flex;align-items:center;justify-content:center;gap:6px;
  padding:0 10px;
  backdrop-filter:blur(8px);
}
.toolbar button{
  width:32px;height:32px;border:none;border-radius:6px;
  background:transparent;color:#e8e8f0;cursor:pointer;
  display:flex;align-items:center;justify-content:center;
  transition:background 0.15s;
}
.toolbar button:hover{background:rgba(255,255,255,0.12)}
.toolbar .rec{background:#e94560;color:#fff;width:auto;padding:0 14px;gap:6px;font-size:13px;font-weight:600}
.toolbar .rec:hover{background:#ff6b81}
.toolbar .rec.active{background:rgba(255,255,255,0.15);color:#e94560}
.toolbar .stop-btn:hover{background:rgba(255,255,255,0.2)}
.toolbar .pause-btn{color:#ffd93d}
.toolbar .pause-btn:hover{background:rgba(255,217,61,0.15)}
.border{
  position:absolute;
  left:0;top:${f}px;
  width:100%;height:calc(100% - ${f}px);
  border:${r}px solid #e94560;
  background:transparent;
  pointer-events:none;
}
.size-label{color:rgba(255,255,255,0.5);font-size:11px;margin-left:8px;white-space:nowrap}
.recording-dot{width:8px;height:8px;background:#e94560;border-radius:50%;display:none}
.recording-dot.active{display:inline-block;animation:pulse 1s infinite}
.timer{color:#e8e8f0;font-size:13px;font-family:Consolas,monospace;margin-left:6px;min-width:48px}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.3}}
</style></head><body>
<div class="toolbar">
  <span class="recording-dot" id="dot"></span>
  <span class="timer" id="timer"></span>
  <button class="rec" id="startBtn" onclick="doStart()" title="开始录制">
    <svg width="12" height="12" viewBox="0 0 12 12"><circle cx="6" cy="6" r="5" fill="currentColor"/></svg>
    <span>录制</span>
  </button>
  <button class="pause-btn" id="pauseBtn" style="display:none" onclick="doPause()" title="暂停">
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
  </button>
  <button id="resumeBtn" style="display:none" onclick="doResume()" title="继续">
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg>
  </button>
  <button class="stop-btn" id="stopBtn" style="display:none" onclick="doStop()" title="停止">
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="1"/></svg>
  </button>
  <span class="size-label" id="sizeLabel">${n.width}×${n.height}</span>
</div>
<div class="border"></div>
<script>
const {ipcRenderer}=require('electron')
let timerInterval=null,seconds=0
function updateTimer(){
  seconds++;const m=String(Math.floor(seconds/60)).padStart(2,'0')
  const s=String(seconds%60).padStart(2,'0')
  document.getElementById('timer').textContent=m+':'+s
}
ipcRenderer.on('toolbar-state',(e,state)=>{
  const startBtn=document.getElementById('startBtn')
  const pauseBtn=document.getElementById('pauseBtn')
  const resumeBtn=document.getElementById('resumeBtn')
  const stopBtn=document.getElementById('stopBtn')
  const dot=document.getElementById('dot')
  if(state==='recording'){
    startBtn.style.display='none';pauseBtn.style.display='flex';resumeBtn.style.display='none';stopBtn.style.display='flex';dot.classList.add('active')
    seconds=0;timerInterval=setInterval(updateTimer,1000)
  }else if(state==='paused'){
    pauseBtn.style.display='none';resumeBtn.style.display='flex';if(timerInterval){clearInterval(timerInterval);timerInterval=null}
  }else{
    startBtn.style.display='flex';pauseBtn.style.display='none';resumeBtn.style.display='none';stopBtn.style.display='none';dot.classList.remove('active')
    if(timerInterval){clearInterval(timerInterval);timerInterval=null}seconds=0;document.getElementById('timer').textContent=''
  }
})
function doStart(){ipcRenderer.send('toolbar-action','start')}
function doPause(){ipcRenderer.send('toolbar-action','pause')}
function doResume(){ipcRenderer.send('toolbar-action','resume')}
function doStop(){ipcRenderer.send('toolbar-action','stop')}
<\/script>
</body></html>`;d.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(i)}`),e.n.info(`Region border+toolbar shown:`,n)}function h(e){d&&!d.isDestroyed()&&d.webContents.send(`toolbar-state`,e)}function g(){d&&!d.isDestroyed()&&(d.close(),d=null,e.n.info(`Region border hidden`))}function _(){t.ipcMain.on(`region-selected`,(t,n)=>{e.n.info(`Region selected:`,n),u(n)}),t.ipcMain.on(`region-cancelled`,()=>{e.n.info(`Region selection cancelled`),u(null)}),t.ipcMain.handle(`show-region-border`,(e,t)=>{m(t)}),t.ipcMain.handle(`hide-region-border`,()=>{g()}),t.ipcMain.handle(`update-toolbar-state`,(e,t)=>{h(t)}),t.ipcMain.on(`toolbar-action`,(t,n)=>{e.n.info(`Toolbar action:`,n),a&&!a.isDestroyed()&&a.webContents.send(`on-toolbar-action`,n)})}i.exports={selectRegion:l,showRegionBorder:m,hideRegionBorder:g,updateToolbarState:h,setMainWindow:o,registerRegionSelectorHandlers:_}}))();e.t();function o(){return(0,a.registerRegionSelectorHandlers)(),{setMainWindow:a.setMainWindow}}exports.registerIpcHandlers=o;