// electron/main/ai-island.ts
// 迷你 AI 悬浮岛 — 不录制时显示 AI 状态和权限请求
// 复用录制悬浮岛的 AI 部分 HTML/CSS/JS

import { BrowserWindow, screen, ipcMain, app } from 'electron'
import * as path from 'path'
import nodeFs from 'node:fs'
import { join } from 'node:path'
import log from './logger'

let aiIsland: BrowserWindow | null = null
/** AI 岛拖动的基准（绝对增量 + setBounds，仿悬浮球）；用户拖过后锁定位置不再被 resize 拉回 */
let aiDragOrigin: { winX: number; winY: number; scrX: number; scrY: number } | null = null
let aiIslandUserMoved = false
/** 透明空白区鼠标穿透状态：true 时 setIgnoreMouseEvents，让窗口右侧多余透明区不拦截下方点击 */
let aiIslandMouseIgnored = false

// === AI 岛设置（横条态等；主进程文件为真相源，渲染层经 IPC get/set） ===
const AI_ISLAND_SETTINGS_FILE = 'ai-island-settings.json'

export interface AiIslandSettings {
  /** 横条态：把默认状态条压成更扁的细横条（更不占屏幕） */
  flat: boolean
}

const DEFAULT_AI_ISLAND_SETTINGS: AiIslandSettings = { flat: false }
let cachedAiIslandSettings: AiIslandSettings | null = null

function aiIslandSettingsFilePath(): string {
  const dir = app.isPackaged ? app.getPath('userData') : join(__dirname, '..', '..')
  return join(dir, AI_ISLAND_SETTINGS_FILE)
}

function loadAiIslandSettings(): AiIslandSettings {
  try {
    const data = nodeFs.readFileSync(aiIslandSettingsFilePath(), 'utf-8')
    const parsed = JSON.parse(data)
    return {
      flat: typeof parsed.flat === 'boolean' ? parsed.flat : DEFAULT_AI_ISLAND_SETTINGS.flat,
    }
  } catch {}
  return { ...DEFAULT_AI_ISLAND_SETTINGS }
}

function saveAiIslandSettings(settings: AiIslandSettings) {
  try { nodeFs.writeFileSync(aiIslandSettingsFilePath(), JSON.stringify(settings), 'utf-8') } catch {}
}

/** 把设置作用到活动岛（运行时切换横条态；显隐由 IPC 显式控制，不在此改） */
function applyAiIslandSettings(s: AiIslandSettings) {
  if (aiIsland && !aiIsland.isDestroyed()) {
    aiIsland.webContents.send('ai-island-set-flat', s.flat)
  }
}

export function getAiIslandSettings(): AiIslandSettings {
  if (cachedAiIslandSettings) return cachedAiIslandSettings
  cachedAiIslandSettings = loadAiIslandSettings()
  return cachedAiIslandSettings
}

/** 主进程内部唯一变更入口：白名单+类型校验→合并→save→刷新缓存→作用到活动岛→返回新值。
 *  写入端与 loadAiIslandSettings 读取端做对称校验：非布尔 flat / 多余 key 一律丢弃，
 *  避免把非法类型持久化进 JSON（否则重启后读取校验失败会静默回退默认值）。 */
export function updateAiIslandSettings(patch: Partial<AiIslandSettings>): AiIslandSettings {
  const next = { ...getAiIslandSettings() }
  if (typeof patch.flat === 'boolean') next.flat = patch.flat
  // 将来新增字段在此对称扩展（白名单式，过滤多余 key）
  saveAiIslandSettings(next)
  cachedAiIslandSettings = next
  applyAiIslandSettings(next)
  return next
}


/** 定位提问卡纯逻辑文件（question-card-utils.js）：dev 下随 vite 复制进 dist-electron/main/，打包后走 extraResources。
 *  岛窗口用 data: URL 加载内联 HTML，内联 <script> 须在运行时 require() 这个文件（同 clawd-hook.js 的发布链路）。 */
function questionCardUtilsPath(): string {
  return app.isPackaged
    ? path.join(process.resourcesPath, 'question-card-utils.js')
    : path.join(__dirname, 'question-card-utils.js')
}

function buildAiIslandHtml(): string {
  const flat = getAiIslandSettings().flat
  return `<!DOCTYPE html>
<html><head><style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{height:100%;overflow:hidden;font-family:'Segoe UI',system-ui,sans-serif}
.island{
  width:fit-content;height:fit-content;
  background:rgba(20,20,40,0.96);
  border-radius:22px;
  display:flex;flex-direction:column;
  border:1px solid rgba(255,255,255,0.1);
  /* 横条态切换过渡：圆角/背景随 body.flat 平滑变化 */
  transition:opacity 0.3s,transform 0.3s,border-radius 0.3s,background 0.3s;
  overflow:hidden;
}
.island.hidden{opacity:0;transform:translateY(-8px) scaleY(0.5);pointer-events:none}
.island-row{display:flex;align-items:center;gap:8px;height:40px;padding:0 14px;justify-content:center;cursor:grab;-webkit-user-select:none;user-select:none;touch-action:none;transition:height 0.3s ease}
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
/* 权限卡片：宽度按内容自适应，最窄 300 / 最宽 420（超出在 420 内换行） */
.perm-card{width:max-content;min-width:300px;max-width:420px;padding:0;display:none;flex-direction:column;word-break:break-word}
.perm-card.show{display:flex;animation:perm-in 0.22s cubic-bezier(0.4,0,0.2,1)}
@keyframes perm-in{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:translateY(0)}}
.perm-banner{display:flex;align-items:center;gap:8px;padding:8px 14px;background:rgba(255,255,255,0.04);border-top:1px solid rgba(255,255,255,0.1);border-bottom:1px solid rgba(255,255,255,0.06)}
.perm-banner-dot{width:7px;height:7px;border-radius:50%;background:#e8e8f0;animation:ai-pulse 0.9s ease-in-out infinite;box-shadow:0 0 8px rgba(232,232,240,0.5);flex-shrink:0}
.perm-banner-text{font-size:11px;font-weight:600;color:#e8e8f0;letter-spacing:0.4px}
.perm-body{display:flex;flex-direction:column;gap:10px;padding:12px 14px 10px}
.perm-row{display:flex;flex-direction:column;gap:4px}
.perm-row-label{font-size:9px;color:rgba(255,255,255,0.38);text-transform:uppercase;letter-spacing:0.6px;font-weight:600}
.perm-tool{font-size:13px;color:#34d399;font-weight:600;font-family:Consolas,'Courier New',monospace}
.perm-input{font-size:10.5px;color:rgba(255,255,255,0.78);font-family:Consolas,'Courier New',monospace;background:rgba(0,0,0,0.35);border:1px solid rgba(255,255,255,0.06);border-radius:5px;padding:6px 8px;word-break:normal;overflow-wrap:anywhere;line-height:1.5;white-space:pre-wrap}
.perm-actions{display:flex;gap:6px;padding:0 14px 12px}
.perm-btn{flex:1;padding:7px 8px;border:none;border-radius:6px;font-size:11px;font-weight:600;cursor:pointer;transition:all 0.15s;letter-spacing:0.3px}
.perm-btn.allow{background:#34d399;color:#0a0a14}
.perm-btn.allow:hover{background:#10b981;box-shadow:0 2px 8px rgba(52,211,153,0.35)}
.perm-btn.deny{background:rgba(255,255,255,0.06);color:rgba(255,255,255,0.8);border:1px solid rgba(255,255,255,0.1)}
.perm-btn.deny:hover{background:rgba(248,113,113,0.18);color:#fca5a5;border-color:rgba(248,113,113,0.4)}
.perm-btn.always{background:rgba(52,211,153,0.1);color:#6ee7b7;border:1px solid rgba(52,211,153,0.28)}
.perm-btn.always:hover{background:rgba(52,211,153,0.18);border-color:rgba(52,211,153,0.5)}
/* 提问卡片（AskUserQuestion 只读通知——Claude 的 hook 无法注入答案，答案须回主界面作答）：宽度按内容自适应，最窄 300 / 最宽 420；word-break 继承让长选项在卡宽内换行而非溢出裁剪 */
.question-card{width:max-content;min-width:300px;max-width:420px;padding:0;display:none;flex-direction:column;word-break:break-word}
.question-card.show{display:flex;animation:perm-in 0.22s cubic-bezier(0.4,0,0.2,1)}
.question-banner{display:flex;align-items:center;gap:8px;padding:8px 14px;background:rgba(255,255,255,0.04);border-top:1px solid rgba(255,255,255,0.1);border-bottom:1px solid rgba(255,255,255,0.06)}
.question-banner-dot{width:7px;height:7px;border-radius:50%;background:#fbbf24;animation:ai-breathe 1.2s ease-in-out infinite;box-shadow:0 0 8px rgba(251,191,36,0.6);flex-shrink:0}
.question-banner-text{font-size:11px;font-weight:600;color:#fde68a;letter-spacing:0.4px}
/* 逐题推进的进度：右对齐，单题时隐藏 */
.question-progress{margin-left:auto;font-size:10px;font-weight:600;color:rgba(253,230,138,0.9);letter-spacing:0.3px}
.question-body{display:flex;flex-direction:column;gap:8px;padding:12px 14px 10px}
.question-text{font-size:12px;color:#fff;font-weight:600;line-height:1.5;white-space:pre-wrap;word-break:break-word}
.question-opt{display:flex;flex-direction:column;gap:3px;padding:6px 8px;background:rgba(0,0,0,0.35);border:1px solid rgba(255,255,255,0.06);border-radius:6px}
/* 可作答卡：选项可点选，单选/多选用一个前置小标记；选中项高亮描边 */
.question-opt.selectable{cursor:pointer;border:1px solid rgba(255,255,255,0.08);transition:all 0.12s}
.question-opt.selectable:hover{border-color:rgba(251,191,36,0.4);background:rgba(251,191,36,0.07)}
.question-opt.selectable.selected{border-color:rgba(52,211,153,0.65);background:rgba(52,211,153,0.12)}
.qmark{display:inline-flex;align-items:center;justify-content:center;width:11px;height:11px;border-radius:50%;margin-right:6px;font-size:8px;color:rgba(255,255,255,0.55);border:1px solid rgba(255,255,255,0.35);flex-shrink:0}
.qmark.multi{border-radius:3px}
.question-opt.selectable.selected .qmark{background:#34d399;border-color:#34d399;color:#0a0a14}
.question-other{width:100%;margin-top:6px;padding:6px 8px;border:none;border-radius:6px;background:rgba(0,0,0,0.4);color:#fff;font-size:11px;outline:none;border:1px solid rgba(251,191,36,0.35)}
/* 提问卡右上角「关闭」（可作答卡的放弃/关闭 → 回 deny） */
.question-close{margin-left:auto;cursor:pointer;font-size:13px;color:rgba(255,255,255,0.55);padding:0 4px;line-height:1;display:none}
.question-close:hover{color:#fca5a5}
.question-opt-label{font-size:11.5px;color:#6ee7b7;font-weight:600}
.question-opt-desc{font-size:10.5px;color:rgba(255,255,255,0.72);line-height:1.4;white-space:pre-wrap;word-break:break-word}
.question-hint{font-size:9.5px;color:rgba(255,255,255,0.4);line-height:1.4}
.question-actions{display:flex;padding:0 14px 12px}
.question-btn{flex:1;padding:7px 8px;border:none;border-radius:6px;font-size:11px;font-weight:600;cursor:pointer;transition:all 0.15s;letter-spacing:0.3px;background:rgba(255,255,255,0.06);color:rgba(255,255,255,0.8);border:1px solid rgba(255,255,255,0.1)}
.question-btn:hover{background:rgba(251,191,36,0.14);color:#fde68a;border-color:rgba(251,191,36,0.4)}
/* 上一题在首题时禁用（无题可回） */
.question-btn:disabled{opacity:0.35;cursor:default}
.question-btn:disabled:hover{background:rgba(255,255,255,0.06);color:rgba(255,255,255,0.8);border-color:rgba(255,255,255,0.1)}
/* 横条态：贴边的极简细胶囊条——更细、更素（半透明实色 + 细描边 + 柔影，无渐变/内高光）；
   仅在 body.flat 时生效，权限/提问卡出现时底部卡片保持原有展示 */
body.flat .island{
  min-width:200px;
  justify-content:center;
  background:#14141e; /* 不透明，无阴影 */
  border:1px solid rgba(255,255,255,0.08);
  border-top:none; /* 顶边贴齐屏幕边缘，看起来从屏幕边沿伸出 */
  border-radius:0 0 8px 8px; /* 上方两角直角贴边，只圆下方两角——挂边标签样式 */
}
body.flat .island-row{height:12px;padding:0 16px;gap:5px}
body.flat .ai-dot{width:5px;height:5px}
body.flat .ai-label{font-size:8.5px;letter-spacing:0.5px;color:rgba(255,255,255,0.55)}
body.flat .ai-label.active{color:#fff}
</style></head><body${flat ? ' class="flat"' : ''}>
<div class="island" id="island">
  <div class="island-row" id="islandRow">
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
  <div class="question-card" id="questionCard">
    <div class="question-banner">
      <span class="question-banner-dot"></span>
      <span class="question-banner-text">AI 正在提问</span>
      <span class="question-progress" id="questionProgress"></span>
      <span class="question-close" id="questionClose" onclick="closeQuestion()" title="关闭">✕</span>
    </div>
    <div class="question-body" id="questionBody"></div>
    <div class="question-actions">
      <button class="question-btn" id="questionPrevBtn" onclick="prevQuestion()">上一题</button>
      <button class="question-btn" id="questionBtn" onclick="stepQuestion()">知道了</button>
    </div>
  </div>
</div>
<script>
const __QCU_UTILS_PATH__=${JSON.stringify(questionCardUtilsPath())}
const quiz=require(__QCU_UTILS_PATH__)
const {resolveQuestionList,toQuestionItem,buttonLabel,progressText,questionKey,multiSelectOf,withOther,toggleOption,buildAnswers}=quiz
const {ipcRenderer}=require('electron')
function resizeIsland(){
  const island=document.getElementById('island')
  const w=island.scrollWidth
  // 用 offsetHeight 而非 scrollHeight：scrollHeight 不含边框，会把 .island 的 1px 上下边框
  // 算漏，导致窗口高度比胶囊实际渲染高度矮 2px、底部边框在窗口底缘被硬裁（贴边细条上尤其明显）
  const h=island.offsetHeight
  ipcRenderer.send('resize-ai-island',w,h)
}
// 卡片宽度自适应：按当前展示卡的内容理想宽度钳制到 [300,420]，并把岛宽设为该值，
// 让窗口贴合卡片（避免 .island 的 fit-content 取卡片未钳制理想宽度导致窗口过宽、透明区挡点击）。
function fitIslandWidth(){
  const island=document.getElementById('island')
  const q=document.getElementById('questionCard'), p=document.getElementById('permCard')
  const card=q.classList.contains('show')?q:(p.classList.contains('show')?p:null)
  if(!card){ island.style.width=''; return }
  let w=card.scrollWidth
  if(w<300) w=300
  if(w>420) w=420
  island.style.width=w+'px'
}
const ro=new ResizeObserver(()=>resizeIsland())
ro.observe(document.getElementById('island'))
const aiLabels={idle:'AI 待机',thinking:'AI 思考中',working:'AI 工作中',error:'AI 出错了',notification:'等待审批',done:'任务完成'}
function applyState(data){
  const ind=document.getElementById('aiIndicator'),dot=document.getElementById('aiDot'),lb=document.getElementById('aiLabel')
  if(!data||(data.state==='idle'&&(!data.sessions||!data.sessions.length))){ind.style.display='flex';dot.className='ai-dot idle';lb.textContent='AI 待机';lb.classList.remove('active');setTimeout(resizeIsland,50);return}
  ind.style.display='flex';dot.className='ai-dot '+data.state;lb.textContent=aiLabels[data.state]||'AI '+data.state;lb.classList.toggle('active',data.state!=='idle')
  setTimeout(resizeIsland,50)
}
function applyPermission(data){
  // 权限卡与提问卡互斥：展示权限时收起提问卡，同一时刻只显示一张卡
  document.getElementById('questionCard').classList.remove('show')
  try{
    document.getElementById('permCard').classList.add('show')
    document.getElementById('permTool').textContent=data.toolName||'未知操作'
    const inputRow=document.getElementById('permInputRow')
    const inputEl=document.getElementById('permInput')
    const ti=data.toolInput
    if(ti&&typeof ti==='object'&&Object.keys(ti).length>0){
      const formatted=formatToolInput(ti)
      inputEl.textContent=formatted
      inputRow.style.display='flex'
    }else if(typeof ti==='string'&&ti.length>0){
      inputEl.textContent=String(ti)
      inputRow.style.display='flex'
    }else{
      inputRow.style.display='none'
    }
  }catch(err){
    console.error('perm render error:',err)
  }
  fitIslandWidth()
  setTimeout(resizeIsland,50)
}
// 提问卡「逐题推进」：qList 持整卡题目数组，qIndex 持当前题下标（只存岛上；卡片重新应用/清空即重置回第 1 题）。
// 可作答卡（answerable）：qSessionId 标记由 /permission 背书，qDrafts 持每题选中态（Set + 其他自由文本）
let qList=[], qIndex=0, qAnswerable=false, qSessionId='', qDrafts=[]
function currentDraft(){ return qDrafts[qIndex] || (qDrafts[qIndex]={selected:new Set(),otherText:''}) }
function renderCurrentQuestion(){
  const answerable=qAnswerable
  const body=document.getElementById('questionBody'); body.innerHTML=''
  const total=qList.length
  const view=toQuestionItem(qList[qIndex]||qList[0], qIndex)
  // 进度：单题隐藏，多题显示「第 X/N 题」
  const prog=document.getElementById('questionProgress')
  const pt=progressText(qIndex,total)
  prog.style.display=pt?'inline':'none'; prog.textContent=pt||''
  const closeEl=document.getElementById('questionClose')
  // 当前题标题
  const t=document.createElement('div');t.className='question-text';t.textContent=view.text
  body.appendChild(t)
  if(answerable){
    // 可作答：选项可点选，末尾按需追加「其他」自由输入；单选/多选依据 multiSelect
    const item=qList[qIndex]
    const multi=multiSelectOf(item)
    const opts=withOther(view.options)
    const draft=currentDraft()
    opts.forEach(function(opt){
      const row=document.createElement('div');row.className='question-opt selectable'+(draft.selected.has(opt.label)?' selected':'')
      const lab=document.createElement('div');lab.className='question-opt-label'
      const mark=document.createElement('span');mark.className='qmark'+(multi?' multi':'')
      mark.textContent=multi?'✓':''
      lab.appendChild(mark)
      lab.appendChild(document.createTextNode(opt.label))
      row.appendChild(lab)
      if(opt.desc){
        const d=document.createElement('div');d.className='question-opt-desc';d.textContent=opt.desc
        row.appendChild(d)
      }
      row.addEventListener('click',function(){
        const r=toggleOption(draft.selected,opt.label,multi)
        draft.selected=r.selected
        renderCurrentQuestion()
      })
      body.appendChild(row)
      if(opt.isOther&&draft.selected.has('其他')){
        const inp=document.createElement('input');inp.className='question-other';inp.placeholder='输入其他内容…';inp.value=draft.otherText||''
        inp.addEventListener('click',function(e){e.stopPropagation()})
        inp.addEventListener('input',function(){draft.otherText=inp.value})
        body.appendChild(inp)
        if(multi){
          const h=document.createElement('div');h.className='question-hint';h.textContent='可与其他选项同时选择。'
          body.appendChild(h)
        }
      }
    })
    if(closeEl) closeEl.style.display='inline-block'
    // 末题「提交答案」（回 allow+answers）；非末题「下一题」仅本地推进
    document.getElementById('questionBtn').textContent=(qIndex<total-1)?'下一题':'提交答案'
  }else{
    // 只读（现状）：仅展示选项，提示去 Claude 界面作答
    view.options.forEach(function(opt){
      const row=document.createElement('div');row.className='question-opt'
      const lab=document.createElement('div');lab.className='question-opt-label';lab.textContent=opt.label
      row.appendChild(lab)
      if(opt.desc){
        const d=document.createElement('div');d.className='question-opt-desc';d.textContent=opt.desc
        row.appendChild(d)
      }
      body.appendChild(row)
    })
    const hint=document.createElement('div');hint.className='question-hint'
    hint.textContent='请到 Claude Code 界面作答，这里仅作提醒。'
    body.appendChild(hint)
    if(closeEl) closeEl.style.display='none'
    document.getElementById('questionBtn').textContent=buttonLabel(qIndex,total)
  }
  document.getElementById('questionPrevBtn').disabled=qIndex<=0
  fitIslandWidth()
  resizeIsland()
}
function resetQuestion(){
  qList=[];qIndex=0;qAnswerable=false;qSessionId='';qDrafts=[]
  const closeEl=document.getElementById('questionClose'); if(closeEl) closeEl.style.display='none'
}
function applyQuestion(q){
  const card=document.getElementById('questionCard')
  if(!q){ resetQuestion(); card.classList.remove('show');setTimeout(resizeIsland,50);return }
  // 提问卡与权限卡互斥：展示提问时收起权限卡，避免残留的"允许/拒绝"按钮与提问叠在一起
  document.getElementById('permCard').classList.remove('show')
  // 重新应用卡片 → 一律从第 1 题开始；记录是否可作答（由 /permission 背书）
  qList=resolveQuestionList(q); qIndex=0
  qAnswerable=!!q.answerable; qSessionId=q.sessionId||''
  qDrafts=qList.map(function(){return {selected:new Set(),otherText:''}})
  renderCurrentQuestion()
  card.classList.add('show')
  fitIslandWidth()
  setTimeout(resizeIsland,50)
}
// 非末题：「下一题」仅本地推进（不触发 IPC、不动队列）；末题：
//   只读 → 关闭（知道了）；可作答 → 提交答案（回 allow+updatedInput.answers）
function stepQuestion(){
  if(qIndex<qList.length-1){ qIndex++; renderCurrentQuestion(); return }
  if(qAnswerable){
    const payload=buildAnswers(qList,qDrafts)
    ipcRenderer.invoke('agent-submit-question', qSessionId, payload)
    document.getElementById('questionCard').classList.remove('show')
    resetQuestion()
    setTimeout(resizeIsland,50)
  }else{
    dismissQuestion()
  }
}
// 「上一题」：纯本地回退一题，永不关卡（首题时按钮 disabled）
function prevQuestion(){
  if(qIndex>0){ qIndex--; renderCurrentQuestion() }
}
// 「关闭」（右上角 ✕）：只读卡直接收起；可作答卡回 deny 结束提问（服务端区分处理）
function closeQuestion(){dismissQuestion()}
function applyCard(card){
  // 权限卡与提问卡互斥：只渲染队首卡（applyPermission/applyQuestion 内部也会收起另一张）
  if(!card){
    document.getElementById('permCard').classList.remove('show')
    document.getElementById('questionCard').classList.remove('show')
    resetQuestion()
    fitIslandWidth()
    setTimeout(resizeIsland,50)
    return
  }
  if(card.kind==='permission'){ applyPermission(card); return }
  applyQuestion(card)
}
ipcRenderer.on('agent-state-update',(e,data)=>applyState(data))
ipcRenderer.on('agent-card-update',(e,data)=>applyCard(data))
// 懒创建的岛加载后主动拉取一次当前状态/队首卡，避免错过创建前的广播
function initStatus(){
  ipcRenderer.invoke('agent-get-status').then(s=>{
    if(!s) return
    applyState({state:s.displayState,sessions:[]})
    if(s.currentCard) applyCard(s.currentCard)
  }).catch(()=>{})
}
function formatToolInput(input){
  try{
    // 常用字段优先展示
    const priorityKeys=['file_path','path','command','url','pattern','query']
    const lines=[]
    for(const k of priorityKeys){
      if(input[k]!==undefined){
        lines.push(k+': '+String(input[k]))
      }
    }
    // 其余字段：全部展示，不做行数/长度截断（岛按内容自动长大）
    for(const k of Object.keys(input)){
      if(priorityKeys.includes(k)) continue
      const v=input[k]
      const vs=typeof v==='object'?JSON.stringify(v):String(v)
      lines.push(k+': '+vs)
    }
    return lines.join('\\n')
  }catch{ return JSON.stringify(input) }
}
function doAllow(){resolvePerm('allow')}
function doDeny(){resolvePerm('deny')}
function doAlwaysAllow(){resolvePerm('always')}
function resolvePerm(b){ipcRenderer.invoke('agent-resolve-permission',b);document.getElementById('permCard').classList.remove('show');setTimeout(resizeIsland,50)}
function dismissQuestion(){ipcRenderer.invoke('agent-dismiss-question');document.getElementById('questionCard').classList.remove('show');setTimeout(resizeIsland,50)}
function showAiDetail(){ipcRenderer.invoke('show-ai-window')}
// === 横条态：切换 body.flat 触发 CSS 过渡（行高 40↔12 + 圆角/背景），窗口尺寸由
//     ResizeObserver 在过渡的每一帧跟随（resize-ai-island），实现平滑过渡而非硬跳 ===
function setFlat(flat){
  document.body.classList.toggle('flat', !!flat)
  fitIslandWidth()
  // 这里不做即时 resize：尺寸变化会逐帧经 RO 发送，避免与过渡抢跑造成上下抖动；
  // 只在过渡结束后兜底一次，确保窗口与最终尺寸精确一致
  setTimeout(resizeIsland, 320)
}
ipcRenderer.on('ai-island-set-flat',(_e,flat)=>setFlat(flat))
// === AI 岛拖动（整条状态条含 padding，4px 阈值区分点击 vs 拖动） ===
// 复用悬浮球的 pointer 拖动模式：pointerdown 记录起点，超过 4px 才算拖动，
// 这样 .ai-indicator 的"点击查看详情"不受影响（真拖动不触发 click）
const row=document.getElementById('islandRow')
let dsX=0, dsY=0, dragging=false
row.addEventListener('pointerdown',function(e){
  dsX=e.screenX; dsY=e.screenY; dragging=false
  row.setPointerCapture(e.pointerId)
  ipcRenderer.send('ai-island-drag-start', e.screenX, e.screenY)
})
row.addEventListener('pointermove',function(e){
  if(e.buttons!==1) return
  if(!dragging){
    if(Math.abs(e.screenX-dsX)<=4 && Math.abs(e.screenY-dsY)<=4) return
    dragging=true
  }
  ipcRenderer.send('ai-island-drag-move', e.screenX, e.screenY)
})
row.addEventListener('pointerup',function(e){
  if(row.hasPointerCapture&&row.hasPointerCapture(e.pointerId)) row.releasePointerCapture(e.pointerId)
  if(dragging){ dragging=false; ipcRenderer.send('ai-island-drag-end') }
})
row.addEventListener('pointercancel',function(e){
  if(dragging){ dragging=false; ipcRenderer.send('ai-island-drag-end') }
})
// === 透明空白区鼠标穿透 ===
// 窗口比可见胶囊宽（width = 内容宽 + 20），右侧多余透明区若不处理会拦截下方应用的点击。
// 鼠标不在 .island 内容上时就通知主进程 setIgnoreMouseEvents(true, {forward:true}) 穿透；
// forward 保证忽略时仍能收到 mousemove，移回内容时恢复可交互。
function updateMouseMode(e){
  const onIsland = e.target && e.target.closest && !!e.target.closest('.island')
  ipcRenderer.send('set-ai-island-mouse-mode', onIsland)
}
document.addEventListener('mousemove', updateMouseMode)
// 穿透态（ignore=true）下 Windows 的 setIgnoreMouseEvents(ignore,{forward:true}) 只转发 mousemove，
// click/pointerdown 收不到——所以穿透态恢复可交互只能靠悬停产生的 mousemove，pointerdown 兜底
// 仅在「已可交互」时兜住被吞的 move，无法跨越穿透态直接恢复（见 set-ai-island-mouse-mode 的 forward 说明）。
document.addEventListener('pointerdown', updateMouseMode)
// 默认点击穿透（忽略鼠标）：无边框透明窗口的不可见缩放热区 / +20px 透明缓冲若不穿透会
// 拦截下方应用点击（横条态贴边细条时尤甚）。仅当指针悬停在 .island 可见内容上时，由
// 上面的 mousemove/pointerdown 检测切换回可交互（点击横条打开 AI 窗口仍然有效）。
ipcRenderer.send('set-ai-island-mouse-mode', false)
resizeIsland()
initStatus()
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
    // 必须非可缩放：Windows 上「透明 + resizable」窗口会在外边沿外扩一圈不可见的缩放命中区，
    // 且 setIgnoreMouseEvents(点击穿透) 在该组合下不可靠——都会让横条下方被透明窗挡住点不到。
    // 岛尺寸由 resize-ai-island 自动定，无需用户手动缩放，故禁掉。
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
  aiIsland.setVisibleOnAllWorkspaces(true)
  // 最小高放低到 12，兼容横条态（贴边细横条 ~16px）；普通态空闲横条 ~40px / 卡片更高，均不会被最小高卡住
  aiIsland.setMinimumSize(100, 12)
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
  // === AI 岛设置（渲染层 get/set，主进程文件为真相源） ===
  ipcMain.handle('get-ai-island-settings', () => getAiIslandSettings())

  ipcMain.handle('set-ai-island-settings', (_event, patch: Partial<AiIslandSettings>) => {
    return updateAiIslandSettings(patch)
  })

  ipcMain.on('resize-ai-island', (_event: any, contentWidth: number, contentHeight?: number) => {
    if (!aiIsland || aiIsland.isDestroyed()) return
    // 防御：渲染层在窗口被销毁/隐藏瞬间的 ResizeObserver 或迟到的 setTimeout 回调可能
    // 传来 NaN/undefined 宽高，直接参与 totalW 会让 setBounds 抛 "conversion failure"
    if (!Number.isFinite(contentWidth)) return
    const totalW = contentWidth + 20
    const h = Number.isFinite(contentHeight) ? contentHeight : 44
    // 兜底：传播后的 totalW/h 若异常（理论上不会，但防御不到位仍会抛 conversion failure），直接丢弃
    if (!Number.isFinite(totalW) || !Number.isFinite(h)) return
    if (getAiIslandSettings().flat) {
      // 横条态先于用户拖动判定：「贴边」紧贴屏幕顶缘（无间隙）并水平居中——边缘坞样式。
      // 忽略用户拖离位置，这样切到横条态时总会稳稳吸在屏幕边缘；用当前所在显示器而非固定
      // 主屏，避免多屏下被拉回主屏。窗口宽度 = 横条宽度（不加 +20 缓冲），窗口与横条完全同大，
      // 下方即应用可点击区域，无透明窗遮挡。
      const b = screen.getDisplayMatching(aiIsland.getBounds()).bounds
      const newX = Math.round(b.x + (b.width - contentWidth) / 2)
      if (!Number.isFinite(newX)) return
      aiIsland.setBounds({ x: newX, y: b.y, width: contentWidth, height: h })
    } else if (aiIslandUserMoved) {
      // 用户拖过（非横条态）：保留当前位置，只按内容调整宽高，避免被拉回居中/顶部
      const [x, y] = aiIsland.getPosition()
      if (!Number.isFinite(x) || !Number.isFinite(y)) return
      aiIsland.setBounds({ x, y, width: totalW, height: h })
    } else {
      // 未拖过：水平居中 + 顶部（初始定位行为），留 4px 间隙
      const bounds = screen.getPrimaryDisplay().bounds
      const newX = Math.round(bounds.x + (bounds.width - totalW) / 2)
      const newY = bounds.y + 4
      if (!Number.isFinite(newX) || !Number.isFinite(newY)) return
      aiIsland.setBounds({ x: newX, y: newY, width: totalW, height: h })
    }
  })

  // AI 岛拖动：垂直固定顶部，只水平移动
  ipcMain.on('ai-island-drag-start', (_event: any, sx: number, sy: number) => {
    if (!aiIsland || aiIsland.isDestroyed()) return
    // 防御：pointerdown 可能给出无有效屏幕坐标的 NaN，先丢弃，避免污染基准后被 drag-move 算出 NaN 抛 conversion failure
    if (!Number.isFinite(sx) || !Number.isFinite(sy)) return
    const [wx, wy] = aiIsland.getPosition()
    aiDragOrigin = { winX: wx, winY: wy, scrX: sx, scrY: sy }
  })

  ipcMain.on('ai-island-drag-move', (_event: any, sx: number, _sy: number) => {
    if (!aiIsland || aiIsland.isDestroyed() || !aiDragOrigin) return
    // 防御 NaN（无有效屏幕坐标的 pointer 事件，或 drag-start 曾存了坏基准），避免 setBounds 抛 conversion failure
    if (!Number.isFinite(sx) || !Number.isFinite(aiDragOrigin.scrX) || !Number.isFinite(aiDragOrigin.winX) || !Number.isFinite(aiDragOrigin.winY)) return
    const dx = sx - aiDragOrigin.scrX
    const nx = Math.round(aiDragOrigin.winX + dx)
    if (!Number.isFinite(nx)) return
    const [w, h] = aiIsland.getSize()
    aiIsland.setBounds({ x: nx, y: aiDragOrigin.winY, width: w, height: h })
  })

  ipcMain.on('ai-island-drag-end', () => {
    aiDragOrigin = null
    // 横条态贴边定位固定不动、拖动无效，若仍置"已移动"标记，切回普通态后会按一个其实没移过的
    // 位置锁定——只有非横条态（普通态）才记录用户拖动状态
    if (!getAiIslandSettings().flat) aiIslandUserMoved = true
  })

  // 透明空白区鼠标穿透：鼠标不在内容上时忽略鼠标事件，让窗口右侧多余透明区不拦截下方点击
  ipcMain.on('set-ai-island-mouse-mode', (_event: any, interactive: boolean) => {
    if (!aiIsland || aiIsland.isDestroyed()) return
    const ignore = !interactive
    if (ignore !== aiIslandMouseIgnored) {
      aiIslandMouseIgnored = ignore
      // forward:true 让忽略时仍能收到 mousemove，鼠标移回内容时恢复可交互
      aiIsland.setIgnoreMouseEvents(ignore, { forward: true })
    }
  })
}
