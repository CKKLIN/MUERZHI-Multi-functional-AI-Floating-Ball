// todo-sticky.ts —— “贴到屏幕”的贴屏便签板（合并成单个窗口）
//
// 所有 pinned 待办合并到一个无边框 always-on-top 小窗里，用轮播方式一张张看：
// 底部圆点/左右箭头切换，拖整板移动，点便签打开待办，✕ 取消当前贴屏。
// 样式走极简高级风：左侧优先级色条 + 顶部 MUERZHI 标题栏 + 圆点指示器。
import { BrowserWindow, screen } from 'electron'
import { loadItems, loadTodoSettings, updateTodoSettings } from './todo-store'
import { getLogoDataUrl } from './logo'
import { stripHtml } from './todo-text'

const BOARD_W = 208
const BOARD_H = 120

let boardWindow: BrowserWindow | null = null
let currentIndex = 0

interface NoteData { id: string; title: string; body: string; done: boolean; priority: 'urgent' | 'high' | 'medium' | 'low' }

function pinnedNotes(): NoteData[] {
  return loadItems()
    .filter(i => i.pinned)
    .map(it => {
      const txt = stripHtml(it.content).trim()
      const memoTitle = it.type === 'memo' ? stripHtml(it.title).trim() : ''
      return {
        id: it.id,
        // 待办：标题=正文全文（单行省略）；备忘：标题=标题，正文另起
        title: memoTitle || txt,
        body: memoTitle ? txt : '',
        done: it.done,
        priority: it.priority,
      }
    })
}

function defaultBoardPos(): { x: number; y: number } {
  const area = screen.getPrimaryDisplay().workArea
  return { x: area.x + area.width - BOARD_W - 16, y: area.y + area.height - BOARD_H - 16 }
}

function buildBoardHtml(): string {
  const logo = getLogoDataUrl(28)
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
*{margin:0;padding:0;box-sizing:border-box;user-select:none}
html,body{width:100%;height:100%;overflow:hidden;background:transparent;font-family:'Segoe UI',system-ui,sans-serif}
.board{height:100%;background:#ffffff;border:1px solid #e3e4ea;border-radius:16px;display:flex;flex-direction:column;overflow:hidden}
.bar{height:26px;background:#f3f4f8;border-bottom:1px solid #e6e7ec;padding:0 3px 0 10px;display:flex;align-items:center;gap:7px;-webkit-app-region:drag;flex-shrink:0}
.logo{width:13px;height:13px;border-radius:3px;object-fit:cover}
.brand{font-size:10px;font-weight:800;color:#2a2a3a;letter-spacing:1.2px}
.counter{margin-left:auto;font-size:9px;color:#b6b7c1;font-variant-numeric:tabular-nums}
.close{width:22px;height:22px;border:none;border-radius:6px;background:transparent;color:#9a9aa6;font-size:12px;cursor:pointer;display:flex;align-items:center;justify-content:center;-webkit-app-region:no-drag}
.close:hover{background:#eef0f5;color:#1d1d1f}
/* 便签内容 */
.note{flex:1;min-height:0;display:flex;position:relative;cursor:pointer;-webkit-app-region:no-drag}
.accent{position:absolute;left:0;top:0;bottom:0;width:3px;background:#60a5fa}
.in{padding:7px 10px 4px 13px;display:flex;flex-direction:column;min-width:0;width:100%}
.t{font-size:12px;font-weight:700;color:#1d1d1f;line-height:1.3;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.b{font-size:11px;color:#6e6e76;line-height:1.4;margin-top:2px;display:-webkit-box;-webkit-line-clamp:1;-webkit-box-orient:vertical;overflow:hidden}
.open-hint{margin-top:auto;align-self:flex-end;font-size:8.5px;color:#c6c7d1}
.board.done .t{text-decoration:line-through;color:#9a9aa6}
.board.done .b{color:#a8a8b0}
/* 切换区 */
.foot{height:26px;display:flex;align-items:center;justify-content:center;gap:8px;padding:0 6px;flex-shrink:0;border-top:1px solid #f0f1f5}
.arw{width:20px;height:20px;border:none;border-radius:6px;background:transparent;color:#9a9aa6;font-size:12px;cursor:pointer;display:flex;align-items:center;justify-content:center}
.arw:hover{background:#f0f1f5;color:#1d1d1f}
.dots{display:flex;gap:4px;align-items:center}
.dot{width:4px;height:4px;border-radius:999px;background:#d5d7e0;cursor:pointer;transition:width .2s ease,background .2s ease}
.dot.on{width:14px;background:#4e5cd4}
</style></head><body><div class="board" id="board">
  <div class="bar">
    <img class="logo" src="${logo}">
    <div class="brand">MUERZHI</div>
    <div class="counter" id="counter"></div>
    <button class="close" title="取消贴屏" onclick="act('unpin')">✕</button>
  </div>
  <div class="note" id="note" onclick="act('open')">
    <div class="accent" id="accent"></div>
    <div class="in">
      <div class="t" id="t"></div>
      <div class="b" id="b"></div>
      <div class="open-hint">点击打开</div>
    </div>
  </div>
  <div class="foot">
    <button class="arw" id="prev" onclick="go(-1)">‹</button>
    <div class="dots" id="dots"></div>
    <button class="arw" id="next" onclick="go(1)">›</button>
  </div>
</div>
<script>
const {ipcRenderer} = require('electron')
window.ipc = ipcRenderer
var NOTES=[], IDX=0, LAST=null
function act(a){ var n=NOTES[IDX]; if(n) ipc.send('todo-sticky-'+a, n.id) }
function go(d){ if(NOTES.length<2) return; IDX=(IDX+d+NOTES.length)%NOTES.length; draw() }
function draw(){
  var n=NOTES[IDX]
  var board=document.getElementById('board'), t=document.getElementById('t'), b=document.getElementById('b'),
      accent=document.getElementById('accent'), dots=document.getElementById('dots'), counter=document.getElementById('counter')
  if(!n){ return }
  t.textContent = n.title || '（无内容）'
  if (n.body) { b.textContent = n.body; b.style.display = '' } else { b.style.display = 'none' }
  board.className = 'board' + (n.done?' done':'')
  accent.style.background = {urgent:'#f97316',high:'#f59e0b',medium:'#60a5fa',low:'#b0b0b8'}[n.priority] || '#60a5fa'
  counter.textContent = NOTES.length>1 ? (IDX+1)+'/'+NOTES.length : ''
  // 圆点
  dots.innerHTML=''
  NOTES.forEach(function(x,i){
    var d=document.createElement('span'); d.className='dot'+(i===IDX?' on':''); d.onclick=function(){IDX=i;draw()}; dots.appendChild(d)
  })
  document.getElementById('prev').style.visibility = NOTES.length>1?'visible':'hidden'
  document.getElementById('next').style.visibility = NOTES.length>1?'visible':'hidden'
  LAST = (NOTES[IDX]||{}).id
}
function renderNotes(list, idx){
  NOTES=list||[]; IDX = 0
  // 尽量保持当前看的这条（按 id 定位），避免任意数据同步把轮播跳回第一张
  if (LAST !== null) { for (var i=0;i<NOTES.length;i++){ if(NOTES[i].id===LAST){ IDX=i; break } } }
  if (NOTES.length && (LAST===null || !NOTES.some(function(x){return x.id===LAST}))) IDX = Math.max(0, Math.min(idx||0, NOTES.length-1))
  draw()
}
</script></body></html>`
}

function createBoard(): void {
  const pos = loadTodoSettings().stickyBoardPos ?? defaultBoardPos()
  boardWindow = new BrowserWindow({
    x: pos.x, y: pos.y, width: BOARD_W, height: BOARD_H,
    frame: false, transparent: true, backgroundColor: '#00000000', resizable: false,
    alwaysOnTop: true, skipTaskbar: true, hasShadow: false, show: false,
    webPreferences: { nodeIntegration: true, contextIsolation: false },
  })
  boardWindow.setAlwaysOnTop(true, 'screen-saver')
  boardWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(buildBoardHtml())}`)
  boardWindow.once('ready-to-show', () => {
    if (boardWindow && !boardWindow.isDestroyed()) {
      boardWindow.show()
      pushNotes() // 首建时在这里补推数据，避免加载中 executeJavaScript 被吞
    }
  })
  boardWindow.on('move', () => {
    if (!boardWindow || boardWindow.isDestroyed()) return
    const [x, y] = boardWindow.getPosition()
    if (moveTimer) clearTimeout(moveTimer)
    moveTimer = setTimeout(() => {
      moveTimer = null
      updateTodoSettings({ stickyBoardPos: { x, y } })
    }, 300)
  })
  boardWindow.on('closed', () => { boardWindow = null })
}

let moveTimer: NodeJS.Timeout | null = null

/** 数据变更后调用：重建贴屏便签板（合并一个窗口，圆点/箭头切换）。 */
export function syncStickyNotes(): void {
  const notes = pinnedNotes()
  if (notes.length === 0) {
    if (boardWindow && !boardWindow.isDestroyed()) boardWindow.destroy()
    boardWindow = null
    return
  }
  currentIndex = Math.max(0, Math.min(currentIndex, notes.length - 1))
  if (!boardWindow || boardWindow.isDestroyed()) {
    createBoard() // 创建后由 ready-to-show 主动推一次数据（loadURL 异步，不能立刻 executeJavaScript）
  } else {
    pushNotes()
  }
}

/** 把当前便签列表推进板窗口（窗口尚在加载时会吞掉，由 ready-to-show 补推）。 */
function pushNotes(): void {
  const notes = pinnedNotes()
  if (!boardWindow || boardWindow.isDestroyed()) return
  boardWindow.webContents.executeJavaScript(`if(window.renderNotes) renderNotes(${JSON.stringify(notes)}, ${currentIndex})`).catch(() => {})
}

/** 退出前关闭便签板（before-quit 接线）：先清去抖定时器，避免 teardown 期间再写位置。 */
export function closeAllStickyNotes(): void {
  if (moveTimer) { clearTimeout(moveTimer); moveTimer = null }
  if (boardWindow && !boardWindow.isDestroyed()) boardWindow.destroy()
  boardWindow = null
}
