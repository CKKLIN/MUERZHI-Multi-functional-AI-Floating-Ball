const require_logger = require("./logger-BeZ1PQQ0.js");
let electron = require("electron");
let node_path = require("node:path");
require("node:fs");
let fluent_ffmpeg = require("fluent-ffmpeg");
fluent_ffmpeg = require_logger.__toESM(fluent_ffmpeg);
let _ffmpeg_installer_ffmpeg = require("@ffmpeg-installer/ffmpeg");
_ffmpeg_installer_ffmpeg = require_logger.__toESM(_ffmpeg_installer_ffmpeg);
//#region electron/main/ffmpeg.ts
require_logger.init_logger();
fluent_ffmpeg.default.setFfmpegPath(_ffmpeg_installer_ffmpeg.default.path);
//#endregion
//#region electron/main/ipc-handlers.ts
var import_region_selector = (/* @__PURE__ */ require_logger.__commonJSMin(((exports, module) => {
	require_logger.init_logger();
	var mainWindow = null;
	function setMainWindow(win) {
		mainWindow = win;
	}
	var regionWindow = null;
	var resolveRegion = null;
	function selectRegion() {
		return new Promise((resolve) => {
			resolveRegion = resolve;
			const { x, y, width, height } = electron.screen.getPrimaryDisplay().workArea;
			regionWindow = new electron.BrowserWindow({
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
					contextIsolation: false
				}
			});
			const htmlPath = (0, node_path.join)(__dirname, "region-selector.html");
			regionWindow.loadFile(htmlPath).catch((err) => {
				require_logger.logger_default.error("Failed to load region selector:", err.message);
				cleanupRegionSelector(null);
			});
			regionWindow.setFullScreen(true);
			regionWindow.setVisibleOnAllWorkspaces(true);
			regionWindow.setIgnoreMouseEvents(false);
			regionWindow.on("closed", () => {
				if (resolveRegion) {
					resolveRegion(null);
					resolveRegion = null;
				}
			});
		});
	}
	function cleanupRegionSelector(result) {
		if (regionWindow && !regionWindow.isDestroyed()) regionWindow.close();
		regionWindow = null;
		if (resolveRegion) {
			resolveRegion(result);
			resolveRegion = null;
		}
	}
	var borderWindow = null;
	var TOOLBAR_HEIGHT = 44;
	var BORDER_WIDTH = 3;
	function showRegionBorder(region) {
		if (borderWindow && !borderWindow.isDestroyed()) borderWindow.close();
		const bw = BORDER_WIDTH;
		borderWindow = new electron.BrowserWindow({
			x: region.x - bw,
			y: region.y - bw - TOOLBAR_HEIGHT,
			width: region.width + bw * 2,
			height: region.height + bw * 2 + TOOLBAR_HEIGHT,
			frame: false,
			transparent: true,
			resizable: false,
			movable: false,
			alwaysOnTop: true,
			skipTaskbar: true,
			hasShadow: false,
			webPreferences: {
				nodeIntegration: true,
				contextIsolation: false
			}
		});
		borderWindow.setVisibleOnAllWorkspaces(true);
		const html = `<!DOCTYPE html>
<html><head><style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:100%;height:100%;overflow:hidden;font-family:'Segoe UI',system-ui,sans-serif}
.toolbar{
  position:absolute;top:0;left:${bw}px;right:${bw}px;
  height:${TOOLBAR_HEIGHT}px;
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
  left:0;top:${TOOLBAR_HEIGHT}px;
  width:100%;height:calc(100% - ${TOOLBAR_HEIGHT}px);
  border:${bw}px solid #e94560;
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
  <span class="size-label" id="sizeLabel">${region.width}×${region.height}</span>
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
</body></html>`;
		borderWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
		require_logger.logger_default.info("Region border+toolbar shown:", region);
	}
	function updateToolbarState(state) {
		if (borderWindow && !borderWindow.isDestroyed()) borderWindow.webContents.send("toolbar-state", state);
	}
	function hideRegionBorder() {
		if (borderWindow && !borderWindow.isDestroyed()) {
			borderWindow.close();
			borderWindow = null;
			require_logger.logger_default.info("Region border hidden");
		}
	}
	function registerRegionSelectorHandlers() {
		electron.ipcMain.on("region-selected", (_event, region) => {
			require_logger.logger_default.info("Region selected:", region);
			cleanupRegionSelector(region);
		});
		electron.ipcMain.on("region-cancelled", () => {
			require_logger.logger_default.info("Region selection cancelled");
			cleanupRegionSelector(null);
		});
		electron.ipcMain.handle("show-region-border", (_event, region) => {
			showRegionBorder(region);
		});
		electron.ipcMain.handle("hide-region-border", () => {
			hideRegionBorder();
		});
		electron.ipcMain.handle("update-toolbar-state", (_event, state) => {
			updateToolbarState(state);
		});
		electron.ipcMain.on("toolbar-action", (_event, action) => {
			require_logger.logger_default.info("Toolbar action:", action);
			if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send("on-toolbar-action", action);
		});
	}
	module.exports = {
		selectRegion,
		showRegionBorder,
		hideRegionBorder,
		updateToolbarState,
		setMainWindow,
		registerRegionSelectorHandlers
	};
})))();
require_logger.init_logger();
function registerIpcHandlers() {
	(0, import_region_selector.registerRegionSelectorHandlers)();
	return { setMainWindow: import_region_selector.setMainWindow };
}
//#endregion
exports.registerIpcHandlers = registerIpcHandlers;
