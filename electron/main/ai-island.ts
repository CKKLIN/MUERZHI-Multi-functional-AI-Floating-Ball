// electron/main/ai-island.ts
// 迷你 AI 悬浮岛 — 不录制时显示 AI 状态和权限请求
// 复用录制悬浮岛的 AI 部分 HTML/CSS/JS

import { BrowserWindow, screen, ipcMain } from 'electron'
import log from './logger'

let aiIsland: BrowserWindow | null = null

function buildAiIslandHtml(): string {
  return `<!DOCTYPE html>
<html><head><style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{height:100%;overflow:hidden;font-family:'Segoe UI',system-ui,sans-serif}
.island{
  width:fit-content;height:fit-content;
  background:rgba(20,20,40,0.92);
  border-radius:14px;
  display:flex;flex-direction:column;
  backdrop-filter:blur(16px);
  border:1px solid rgba(255,255,255,0.1);
  box-shadow:0 8px 32px rgba(0,0,0,0.4);
  transition:opacity 0.3s,transform 0.3s;
  overflow:hidden;
}
.island.hidden{opacity:0;transform:translateY(-8px) scaleY(0.5);pointer-events:none}
.island-row{display:flex;align-items:center;gap:8px;height:40px;padding:0 14px;justify-content:center}
/* AI 状态指示器 */
.ai-indicator{display:flex;align-items:center;gap:7px;flex-shrink:0;padding:0 4px;cursor:pointer;border-radius:6px;transition:background 0.15s}
.ai-indicator:hover{background:rgba(255,255,255,0.08)}
.ai-dot{width:8px;height:8px;border-radius:50%;flex-shrink:0;transition:all 0.3s}
.ai-dot.idle{background:#6b7280}
.ai-dot.thinking{background:#fbbf24;animation:ai-breathe 1.5s ease-in-out infinite;box-shadow:0 0 6px rgba(251,191,36,0.6)}
.ai-dot.working{background:#34d399;animation:ai-pulse 0.8s ease-in-out infinite;box-shadow:0 0 6px rgba(52,211,153,0.6)}
.ai-dot.error{background:#f87171;box-shadow:0 0 6px rgba(248,113,113,0.6)}
.ai-dot.notification{background:#a78bfa;animation:ai-pulse 0.6s ease-in-out infinite;box-shadow:0 0 8px rgba(167,139,250,0.8)}
.ai-dot.done{background:#66bb6a;animation:ai-flash 0.3s ease 3}
@keyframes ai-breathe{0%,100%{opacity:0.4;transform:scale(0.8)}50%{opacity:1;transform:scale(1.1)}}
@keyframes ai-pulse{0%,100%{opacity:0.5;transform:scale(0.9)}50%{opacity:1;transform:scale(1.15)}}
@keyframes ai-flash{0%,100%{opacity:1}50%{opacity:0.2;transform:scale(1.3)}}
.ai-label{font-size:11px;color:rgba(255,255,255,0.75);white-space:nowrap;font-weight:500;letter-spacing:0.3px}
.ai-label.active{color:#fff}
/* 权限卡片 */
.perm-card{width:300px;padding:0;display:none;flex-direction:column}
.perm-card.show{display:flex;animation:perm-in 0.22s cubic-bezier(0.4,0,0.2,1)}
@keyframes perm-in{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:translateY(0)}}
.perm-banner{display:flex;align-items:center;gap:8px;padding:8px 14px;background:rgba(255,255,255,0.04);border-top:1px solid rgba(255,255,255,0.1);border-bottom:1px solid rgba(255,255,255,0.06)}
.perm-banner-dot{width:7px;height:7px;border-radius:50%;background:#e8e8f0;animation:ai-pulse 0.9s ease-in-out infinite;box-shadow:0 0 8px rgba(232,232,240,0.5);flex-shrink:0}
.perm-banner-text{font-size:11px;font-weight:600;color:#e8e8f0;letter-spacing:0.4px}
.perm-body{display:flex;flex-direction:column;gap:10px;padding:12px 14px 10px}
.perm-row{display:flex;flex-direction:column;gap:4px}
.perm-row-label{font-size:9px;color:rgba(255,255,255,0.38);text-transform:uppercase;letter-spacing:0.6px;font-weight:600}
.perm-tool{font-size:13px;color:#34d399;font-weight:600;font-family:Consolas,'Courier New',monospace}
.perm-input{font-size:10.5px;color:rgba(255,255,255,0.78);font-family:Consolas,'Courier New',monospace;background:rgba(0,0,0,0.35);border:1px solid rgba(255,255,255,0.06);border-radius:5px;padding:6px 8px;max-height:72px;overflow:auto;word-break:break-all;line-height:1.5;white-space:pre-wrap}
.perm-input::-webkit-scrollbar{width:4px}
.perm-input::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.15);border-radius:2px}
.perm-actions{display:flex;gap:6px;padding:0 14px 12px}
.perm-btn{flex:1;padding:7px 8px;border:none;border-radius:6px;font-size:11px;font-weight:600;cursor:pointer;transition:all 0.15s;letter-spacing:0.3px}
.perm-btn.allow{background:#34d399;color:#0a0a14}
.perm-btn.allow:hover{background:#10b981;box-shadow:0 2px 8px rgba(52,211,153,0.35)}
.perm-btn.deny{background:rgba(255,255,255,0.06);color:rgba(255,255,255,0.8);border:1px solid rgba(255,255,255,0.1)}
.perm-btn.deny:hover{background:rgba(248,113,113,0.18);color:#fca5a5;border-color:rgba(248,113,113,0.4)}
.perm-btn.always{background:rgba(52,211,153,0.1);color:#6ee7b7;border:1px solid rgba(52,211,153,0.28)}
.perm-btn.always:hover{background:rgba(52,211,153,0.18);border-color:rgba(52,211,153,0.5)}
</style></head><body>
<div class="island" id="island">
  <div class="island-row">
    <div class="ai-indicator" id="aiIndicator" onclick="showAiDetail()" title="点击查看详情">
      <span class="ai-dot idle" id="aiDot"></span>
      <span class="ai-label" id="aiLabel">AI 待机</span>
    </div>
  </div>
  <div class="perm-card" id="permCard">
    <div class="perm-banner">
      <span class="perm-banner-dot"></span>
      <span class="perm-banner-text">权限请求</span>
    </div>
    <div class="perm-body">
      <div class="perm-row">
        <span class="perm-row-label">工具</span>
        <span class="perm-tool" id="permTool">—</span>
      </div>
      <div class="perm-row" id="permInputRow" style="display:none">
        <span class="perm-row-label">参数</span>
        <div class="perm-input" id="permInput"></div>
      </div>
    </div>
    <div class="perm-actions">
      <button class="perm-btn allow" onclick="doAllow()">允许</button>
      <button class="perm-btn always" onclick="doAlwaysAllow()">始终允许</button>
      <button class="perm-btn deny" onclick="doDeny()">拒绝</button>
    </div>
  </div>
</div>
<script>
const {ipcRenderer}=require('electron')
function resizeIsland(){
  const island=document.getElementById('island')
  const w=island.scrollWidth
  const h=island.scrollHeight
  ipcRenderer.send('resize-ai-island',w,h)
}
const ro=new ResizeObserver(()=>resizeIsland())
ro.observe(document.getElementById('island'))
const aiLabels={idle:'AI 待机',thinking:'AI 思考中',working:'AI 工作中',error:'AI 出错了',notification:'等待审批',done:'任务完成'}
ipcRenderer.on('agent-state-update',(e,data)=>{
  const ind=document.getElementById('aiIndicator'),dot=document.getElementById('aiDot'),lb=document.getElementById('aiLabel')
  if(!data||(data.state==='idle'&&(!data.sessions||!data.sessions.length))){ind.style.display='flex';dot.className='ai-dot idle';lb.textContent='AI 待机';lb.classList.remove('active');setTimeout(resizeIsland,50);return}
  ind.style.display='flex';dot.className='ai-dot '+data.state;lb.textContent=aiLabels[data.state]||'AI '+data.state;lb.classList.toggle('active',data.state!=='idle')
  setTimeout(resizeIsland,50)
})
ipcRenderer.on('agent-permission-request',(e,data)=>{
  try{
    document.getElementById('permCard').classList.add('show')
    document.getElementById('permTool').textContent=data.toolName||'未知操作'
    // 格式化显示工具参数
    const inputRow=document.getElementById('permInputRow')
    const inputEl=document.getElementById('permInput')
    const ti=data.toolInput
    if(ti&&typeof ti==='object'&&Object.keys(ti).length>0){
      const formatted=formatToolInput(ti)
      inputEl.textContent=formatted
      inputRow.style.display='flex'
    }else if(typeof ti==='string'&&ti.length>0){
      inputEl.textContent=truncate(ti,200)
      inputRow.style.display='flex'
    }else{
      inputRow.style.display='none'
    }
  }catch(err){
    console.error('perm render error:',err)
  }
  setTimeout(resizeIsland,50)
})
function formatToolInput(input){
  try{
    // 常用字段优先展示
    const priorityKeys=['file_path','path','command','url','pattern','query']
    const lines=[]
    for(const k of priorityKeys){
      if(input[k]!==undefined){
        lines.push(k+': '+truncate(String(input[k]),100))
      }
    }
    // 其余字段
    for(const k of Object.keys(input)){
      if(priorityKeys.includes(k)) continue
      const v=input[k]
      const vs=typeof v==='object'?JSON.stringify(v):String(v)
      lines.push(k+': '+truncate(vs,80))
    }
    return lines.slice(0,6).join('\\n')
  }catch{ return JSON.stringify(input).slice(0,200) }
}
function truncate(s,n){return s.length>n?s.slice(0,n)+'…':s}
function doAllow(){resolvePerm('allow')}
function doDeny(){resolvePerm('deny')}
function doAlwaysAllow(){resolvePerm('always')}
function resolvePerm(b){ipcRenderer.invoke('agent-resolve-permission',b);document.getElementById('permCard').classList.remove('show');setTimeout(resizeIsland,50)}
function showAiDetail(){ipcRenderer.invoke('show-ai-window')}
resizeIsland()
</script>
</body></html>`
}

export function showAiIsland() {
  if (aiIsland && !aiIsland.isDestroyed()) return

  const display = screen.getPrimaryDisplay()
  const bounds = display.bounds
  const w = 200
  const h = 44
  const x = Math.round(bounds.x + (bounds.width - w) / 2)
  const y = bounds.y + 4

  aiIsland = new BrowserWindow({
    x, y, width: w, height: h,
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
  aiIsland.setVisibleOnAllWorkspaces(true)
  aiIsland.setMinimumSize(100, 44)
  aiIsland.setAlwaysOnTop(true, 'screen-saver')
  aiIsland.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(buildAiIslandHtml())}`)
  log.info('AI island shown')
}

export function hideAiIsland() {
  if (aiIsland && !aiIsland.isDestroyed()) {
    aiIsland.close()
    aiIsland = null
    log.info('AI island hidden')
  }
}

export function isAiIslandVisible(): boolean {
  return !!(aiIsland && !aiIsland.isDestroyed())
}

export function registerAiIslandHandlers() {
  ipcMain.on('resize-ai-island', (_event: any, contentWidth: number, contentHeight?: number) => {
    if (aiIsland && !aiIsland.isDestroyed()) {
      const bounds = screen.getPrimaryDisplay().bounds
      const totalW = contentWidth + 20
      const newX = Math.round(bounds.x + (bounds.width - totalW) / 2)
      const h = contentHeight || 44
      aiIsland.setBounds({ x: newX, y: bounds.y + 4, width: totalW, height: h })
    }
  })
}
