<script setup lang="ts">
// TodoApp.vue —— 待办便签主面板（Apple 高级风）
// 列表只给"一目了然"的信息：标题 + 一行轻量元信息 + 单行纯文本摘要（不含图片）；图文在点开编辑器看。
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useTodoStore, type TodoDraft } from '../stores/todo'
import TodoEditor from './TodoEditor.vue'
import TodoPreview from './TodoPreview.vue'
import Tooltip from './Tooltip.vue'
import { t } from '../stores/i18n'
import { formatTodoDate } from '../utils/todo-date'
import { hideTip } from '../utils/tip'

const store = useTodoStore()

// “⋯”更多菜单（气泡显隐/置顶等设置收进去，让顶栏只剩标题+新建，保持极简）
const menuOpen = ref(false)
// 标题行动作按钮在“编辑页”时变成“保存”，通过 ref 触发 TodoEditor 的 save()
const editorRef = ref<{ save: () => void } | null>(null)

const PRIO_COLOR = { urgent: '#f97316', high: '#f59e0b', medium: '#60a5fa', low: '#b0b0b8' } as const
// 优先级/类型的显示名走 i18n（函数式读取保证语言切换后重新求值）
function prioLabel(p: string): string {
  return t(p === 'urgent' ? 'todo.priorityUrgent' : p === 'high' ? 'todo.priorityHigh' : p === 'medium' ? 'todo.priorityMedium' : 'todo.priorityLow')
}
function typeLabel(ty: string): string {
  return t(ty === 'todo' ? 'todo.typeTodo' : 'todo.typeMemo')
}
// 每条卡片的底色随优先级走（低饱和柔色块，读列表时一眼分出轻重）
const PRIO_CLASS = { urgent: 'p-urgent', high: 'p-high', medium: 'p-medium', low: 'p-low' } as const

const tabs = computed(() => [
  { key: 'all', label: t('todo.tabAll') },
  { key: 'todo', label: t('todo.typeTodo') },
  { key: 'memo', label: t('todo.typeMemo') },
] as const)

// 分段控件（全部/待办/备忘）滑条高亮过渡：一个斜切凸起的圆角胶囊，
// 随激活标签用 transform/width 平滑滑动过去（offsetParent 是 position:relative 的 .segmented）。
const segNav = ref<HTMLElement | null>(null)
const segIndicator = ref({ left: 0, width: 0 })
function moveSegIndicator() {
  const nav = segNav.value
  if (!nav) return
  const on = nav.querySelector<HTMLElement>('.segmented button.on')
  if (!on) return
  segIndicator.value = { left: on.offsetLeft, width: on.offsetWidth }
}
watch(() => store.activeType, async () => {
  await nextTick() // 等 .on 落到新按钮后再量位置，保证滑条跟对目标
  moveSegIndicator()
})

const inEditor = computed(() => store.editingId !== '')
const isNew = computed(() => store.editingId === '__new__')
const editingDraft = computed<TodoDraft | null>(() => {
  const it = store.editingItem
  if (!it) return null
  return {
    type: it.type,
    title: it.title,
    content: it.content,
    priority: it.priority,
    reminder: it.reminder,
    done: it.done,
  }
})

// 富文本 HTML → 单行纯文本摘录（用于列表；去掉一切标签与图片）。
// 用内容作 key 做 memo：模板里 v-if 与插值会各调一次、且列表重渲染会反复调，
// 若不缓存，每次都 createElement+innerHTML 解析整个富文本（含大图 dataURL）会让 UI 卡到
// “点了没反应”。缓存后同内容只解析一次；并给缓存设上限（内容常含大图 base64，避免无限增长）。
const plainCache = new Map<string, string>()
const PLAIN_CACHE_MAX = 120
function plainText(html: string): string {
  const key = html || ''
  const hit = plainCache.get(key)
  if (hit !== undefined) return hit
  const el = document.createElement('div')
  el.innerHTML = key
  const txt = (el.textContent || '').replace(/\s+/g, ' ').trim()
  plainCache.set(key, txt)
  if (plainCache.size > PLAIN_CACHE_MAX) {
    const old = plainCache.keys().next().value // Map 键按插入序，删最老的一条
    if (old !== undefined) plainCache.delete(old)
  }
  return txt
}

// 创建时间与提醒时间的格式化统一走 utils/todo-date（此前两套各写各的，列表提醒丢年份、预览又带年份）

// ===== 拖动排序：抓卡片左侧手柄拖动，卡片 1:1 跟手；压过邻卡中线时对方即时让位 =====
// pointer 事件实现（Tauri Windows dragDropEnabled 会拦截 HTML5 DnD）。
// 流畅的关键：抓取时一次性量好所有卡槽位，move 期间只做缓存几何判断 + 一次 transform
// 写入 —— 零 elementFromPoint、零布局读取、拖动中零 Vue 重渲染；让位 = 各卡按自己的
// 槽距做 transform 滑动（GPU 合成，不触发布局）。
const dragId = ref('')
let dragCard: HTMLElement | null = null
let dragStart: { x: number; y: number } | null = null   // transform = 指针 - 锚点
let grabOffset: { x: number; y: number } | null = null  // 按下点相对卡片左上（重锚用）
let dragTfX = 0                                         // 当前已写入的 transform（重锚换算用）
let dragTfY = 0
let dragMoved = false                                   // 越过 4px 阈值，进入拖动态
let listEl: HTMLElement | null = null
let slots: { id: string; el: HTMLElement; top: number; mid: number }[] = []
let origin = -1                                         // 被拖卡在展示序中的下标
let lastTarget = -1                                     // 上次目标插入位（0..n，变化才改让位）
const shiftMap = new Map<HTMLElement, number>()         // 各卡当前让位位移（重量槽位时扣除）

function cacheSlots() {
  if (!dragCard) return
  const cards = Array.from(listEl?.querySelectorAll<HTMLElement>('.card') ?? [])
  const dr = dragCard.getBoundingClientRect()
  const dragHomeTop = dr.top - dragTfY                  // 扣掉跟随位移 = 卡槽真实位置
  slots = cards.map(el => {
    const r = el.getBoundingClientRect()
    const top = el === dragCard ? dragHomeTop : r.top - (shiftMap.get(el) ?? 0)
    return { id: el.dataset.id ?? '', el, top, mid: top + r.height / 2 }
  })
  origin = slots.findIndex(s => s.id === dragId.value)
}

// 让位：拖到插入位 t（0..n）时，中间的卡片各自滑向相邻槽位（按自己的槽距，可变高度也对齐）
function applyDisplacement(t: number) {
  lastTarget = t
  for (let i = 0; i < slots.length; i++) {
    const el = slots[i].el
    if (i === origin) continue
    let ty = 0
    if (t > origin && i > origin && i < t) ty = -(slots[i].top - slots[i - 1].top)
    else if (t < origin && i >= t && i < origin) ty = slots[i + 1].top - slots[i].top
    shiftMap.set(el, ty)
    if (ty === 0) {
      if (el.style.transform) el.style.transform = ''
    } else {
      el.style.transform = `translateY(${ty}px)`
    }
  }
}

function onListScroll() {
  if (dragMoved) cacheSlots() // 滚动改变卡片在屏位置：重算槽位（扣除让位/跟随位移）
}

function liftCard() {
  if (!dragCard) return
  dragCard.style.transition = 'none'
  dragCard.style.willChange = 'transform'
  dragCard.style.pointerEvents = 'none'
  dragCard.style.zIndex = '50'
}

// manualSort 切换会让列表重排：重锚被拖卡（保持抓取偏移不变）+ 重量槽位
function reanchor(e: PointerEvent) {
  if (!dragCard || !dragStart || !grabOffset) return
  const r = dragCard.getBoundingClientRect()
  dragStart = {
    x: dragStart.x + r.left - dragTfX - e.clientX + grabOffset.x,
    y: dragStart.y + r.top - dragTfY - e.clientY + grabOffset.y,
  }
  dragTfX = e.clientX - dragStart.x
  dragTfY = e.clientY - dragStart.y
  dragCard.style.transform = `translate(${dragTfX}px, ${dragTfY}px) scale(1.04) rotate(0.6deg)`
}

function onGripDown(e: PointerEvent) {
  if (e.button !== 0) return
  const grip = e.currentTarget as HTMLElement
  const card = grip.closest('.card') as HTMLElement | null
  if (!card?.dataset.id) return
  dragId.value = card.dataset.id
  dragCard = card
  listEl = card.closest('.list')
  listEl?.addEventListener('scroll', onListScroll, { passive: true })
  const r = card.getBoundingClientRect()
  grabOffset = { x: e.clientX - r.left, y: e.clientY - r.top }
  dragStart = { x: e.clientX, y: e.clientY } // 锚点=按下点：初始 transform=0，卡片原地
  dragTfX = 0
  dragTfY = 0
  dragMoved = false
  lastTarget = -1
  shiftMap.clear()
  hideTip() // 指针捕获会吞掉 mouseleave：手柄悬停弹出的气泡会挂在旧位置，按下即收
  grip.setPointerCapture(e.pointerId)
  e.preventDefault() // 不启文字选择
}

function onGripMove(e: PointerEvent) {
  if (!dragId.value || !dragCard || !dragStart) return
  if (!dragMoved) {
    if (Math.abs(e.clientX - dragStart.x) + Math.abs(e.clientY - dragStart.y) < 4) return
    dragMoved = true
    liftCard()
    // 首次拖动切手动排序：视图从自动排序切到数据顺序（列表重排），等 DOM 更新后重量槽位 + 重锚
    if (!store.settings.manualSort) {
      store.settings = { ...store.settings, manualSort: true }
      nextTick(() => {
        cacheSlots()
        reanchor(e)
      })
    } else {
      cacheSlots()
    }
  }
  dragTfX = e.clientX - dragStart.x
  dragTfY = e.clientY - dragStart.y
  dragCard.style.transform = `translate(${dragTfX}px, ${dragTfY}px) scale(1.04) rotate(0.6deg)`
  // 目标插入位：纯缓存几何（中点比较），0..n
  let t = 0
  for (const s of slots) if (e.clientY > s.mid) t++
  if (t !== lastTarget) applyDisplacement(t)
}

function onGripUp(e: PointerEvent) {
  const grip = e.currentTarget as HTMLElement
  if (grip.hasPointerCapture?.(e.pointerId)) grip.releasePointerCapture(e.pointerId)
  const target = lastTarget
  const org = origin
  const wasDrag = dragMoved
  // 复位让位与跟随样式。必须瞬时复位（transition:none）：带着 0.2s 过渡清 transform
  // 会让被让开的卡片先滑回旧槽、紧跟着重排又跳到新槽 —— 两段叠加就是「整屏抖一下」
  const flattened: HTMLElement[] = []
  for (const [el, ty] of shiftMap) {
    if (ty !== 0) {
      el.style.transition = 'none'
      el.style.transform = ''
      flattened.push(el)
    }
  }
  shiftMap.clear()
  if (dragCard) {
    dragCard.style.transition = 'none'
    dragCard.style.willChange = ''
    dragCard.style.pointerEvents = ''
    dragCard.style.zIndex = ''
    dragCard.style.transform = ''
    flattened.push(dragCard)
  }
  const id = dragId.value
  dragCard = null
  dragStart = null
  dragId.value = ''
  dragMoved = false
  const t = target
  lastTarget = -1
  origin = -1
  listEl?.removeEventListener('scroll', onListScroll)
  hideTip() // 松手时 hover 链重算，落点附近的悬停提示会立即弹出 —— 拖完不该带提示
  if (!wasDrag || !listEl) {
    requestAnimationFrame(() => {
      for (const el of flattened) el.style.transition = ''
    })
    return
  }
  // 落位：t>org → 最终位 t−1；t<org → t；t∈{org, org+1} → 原位（不落盘）
  const finalIdx = t > org ? t - 1 : t
  if (finalIdx === org || finalIdx < 0 || finalIdx >= slots.length) {
    requestAnimationFrame(() => {
      for (const el of flattened) el.style.transition = ''
    })
    return
  }
  const ids = slots.map(s => s.id)
  ids.splice(org, 1)
  ids.splice(finalIdx, 0, id)
  store.commitOrder(ids)
  // 重排落位（一帧内完成）后再恢复卡片过渡动画（hover 上浮等）
  requestAnimationFrame(() => {
    for (const el of flattened) el.style.transition = ''
  })
}

async function onSave(draft: TodoDraft) {
  try {
    if (isNew.value) {
      await store.create(draft)
      store.toastMsg(t('todo.added'))
    } else {
      await store.update(store.editingId, draft)
      store.toastMsg(t('todo.saved'))
    }
  } catch (e) {
    store.toastMsg(t('todo.saveFailed'))
    console.error(e)
  }
}

function togglePin() {
  window.muerzhiAPI.todoToggleAlwaysOnTop().then(next => {
    store.settings.windowAlwaysOnTop = next
  }).catch(() => {})
}

async function onPreviewDelete() {
  await store.remove(store.previewId)
  store.closePreview()
  store.toastMsg(t('todo.deleted'))
}

let unsubDataChanged: (() => void) | null = null
let unsubFocusItem: (() => void) | null = null

onMounted(() => {
  store.load()
  // 贴屏便签点击“打开待办”→ 主进程广播定位到该条预览
  // （返回的退订函数必须保存：丢弃的话组件卸载即泄漏监听器，重复挂载后一次事件触发多次）
  unsubFocusItem = window.muerzhiAPI.onTodoFocusItem(async (id) => {
    if (!store.loaded) await store.load()
    store.startPreview(id)
  })
  // 便签板等主进程侧改数据（如 ✕ 取消贴屏）时，推送全量 items 刷新列表镜像，
  // 保证贴屏按钮等状态及时同步
  unsubDataChanged = window.muerzhiAPI.onTodoDataChanged((items) => {
    store.items = items
  })
  moveSegIndicator()
  window.addEventListener('resize', moveSegIndicator)
})

onUnmounted(() => {
  unsubDataChanged?.()
  unsubFocusItem?.()
  window.removeEventListener('resize', moveSegIndicator)
})
</script>

<template>
  <div class="todo-app">
    <header class="topbar">
      <div class="title-wrap">
        <h1 class="app-title">{{ t('todo.title') }}</h1>
        <span class="count" v-if="store.incompleteCount > 0">{{ t('todo.incomplete', { n: store.incompleteCount }) }}</span>
      </div>
      <div class="top-actions">
        <!-- 编辑态：取消 + 保存 -->
        <template v-if="inEditor">
          <button class="more-btn cancel-btn" v-tip="t('todo.cancel')" @click="store.closeEditor()">{{ t('todo.cancel') }}</button>
          <button class="add-btn" v-tip="t('todo.save')" @click="editorRef?.save()">{{ t('todo.save') }}</button>
        </template>
        <!-- 预览态：编辑 + 删除（原“返回列表”行内容并入本行） -->
        <template v-else-if="store.previewId">
                  <!-- 预览态：← 返回列表 也进顶栏行 -->
        <button v-if="!inEditor && store.previewId" class="back-btn" v-tip="t('todo.back')" @click="store.closePreview()">{{ t('todo.back') }}</button>
          <button class="add-btn" v-tip="t('todo.edit')" @click="store.startEdit(store.previewId)">{{ t('todo.edit') }}</button>
          <button class="del-btn" v-tip="t('todo.delete')" @click="onPreviewDelete()">{{ t('todo.delete') }}</button>
        </template>
        <!-- 列表态：⋯ 更多设置 + 新建 -->
        <template v-else>
          <div class="more">
            <button class="more-btn" v-tip="t('todo.more')" @click="menuOpen = !menuOpen">⋯</button>
            <template v-if="menuOpen">
              <div class="more-backdrop" @click="menuOpen = false"></div>
              <div class="more-menu">
                <label class="mi">
                  <span>{{ t('todo.badge') }}</span>
                  <input type="checkbox" :checked="store.settings.badgeVisible"
                    @change="store.setBadgeVisible(!store.settings.badgeVisible)" />
                </label>
                <label class="mi">
                  <span>{{ t('todo.pin') }}</span>
                  <input type="checkbox" :checked="store.settings.windowAlwaysOnTop"
                    @change="togglePin()" />
                </label>
                <label class="mi">
                  <span>{{ t('todo.manualSort') }}</span>
                  <input type="checkbox" :checked="store.settings.manualSort"
                    @change="store.setManualSort(!store.settings.manualSort)" />
                </label>
              </div>
            </template>
          </div>
          <button class="add-btn" v-tip="t('todo.add')" @click="store.startCreate()">＋</button>
        </template>
      </div>
    </header>

    <div class="editor-wrap" v-if="inEditor">
      <TodoEditor ref="editorRef" :initial="editingDraft"
        :default-type="store.activeType === 'memo' ? 'memo' : 'todo'"
        @save="onSave" @cancel="store.closeEditor()" />
    </div>

    <!-- 只读预览：点卡片进入；编辑需点「编辑」按钮 -->
    <div class="editor-wrap" v-else-if="store.previewId">
      <TodoPreview />
    </div>

    <template v-else>
      <nav class="segmented" ref="segNav">
        <span class="seg-indicator"
          :style="{ transform: `translateX(${segIndicator.left}px)`, width: `${segIndicator.width}px` }"></span>
        <button v-for="t in tabs" :key="t.key" :class="{ on: store.activeType === t.key }"
          @click="store.activeType = t.key">
          {{ t.label }}<span v-if="t.key === 'todo'" class="cnt">{{ store.incompleteCount }}</span>
        </button>
      </nav>

      <div class="list">
        <p v-if="!store.loaded" class="hint">{{ t('common.loading') }}</p>
        <div v-else-if="store.filtered.length === 0" class="empty">
          <p class="hint">{{ t('todo.noItems', { n: store.activeType === 'all' ? '' : typeLabel(store.activeType) }) }}</p>
          <button class="empty-add" @click="store.startCreate()">＋ {{ t('todo.add') }}</button>
        </div>

        <div v-for="it in store.filtered" :key="it.id" class="card" :data-id="it.id"
          :class="[PRIO_CLASS[it.priority], { done: it.type === 'todo' && it.done, dragging: dragId === it.id }]">
          <div class="grip" v-tip="t('todo.dragSort')" @pointerdown="onGripDown" @pointermove="onGripMove" @pointerup="onGripUp" @pointercancel="onGripUp">
            <svg viewBox="0 0 10 14" width="9" height="13" fill="currentColor"><circle cx="3" cy="2" r="1.4"/><circle cx="7" cy="2" r="1.4"/><circle cx="3" cy="7" r="1.4"/><circle cx="7" cy="7" r="1.4"/><circle cx="3" cy="12" r="1.4"/><circle cx="7" cy="12" r="1.4"/></svg>
          </div>
          <button class="check" v-if="it.type === 'todo'" :class="{ on: it.done }"
            @click="store.toggleDone(it.id)"><span v-if="it.done">✓</span></button>
          <button class="check check-memo" v-else></button>
          <div class="body" @click="store.startPreview(it.id)">
            <Tooltip :text="it.type === 'memo' ? (it.title || '') : (plainText(it.content) || '')">
              <div class="title">{{ it.type === 'memo' ? (it.title || t('todo.noTitle')) : (plainText(it.content) || t('todo.noContent')) }}</div>
            </Tooltip>
            <div class="meta">
              <span class="type" :class="it.type">{{ typeLabel(it.type) }}</span>
              <span class="prio"><i class="dot" :style="{ background: PRIO_COLOR[it.priority] }"></i>{{ prioLabel(it.priority) }}</span>
              <span class="time">{{ formatTodoDate(it.updatedAt) }}</span>
              <span v-if="it.reminder" class="time reminder" v-tip="t('todo.reminder')">
                <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>
                {{ formatTodoDate(it.reminder) }}
              </span>
              <Tooltip v-if="it.type === 'memo' && plainText(it.content)" :text="plainText(it.content)" class="vtip-excerpt">
                <span class="excerpt">{{ plainText(it.content) }}</span>
              </Tooltip>
            </div>
          </div>
          <div class="actions">
            <!-- 贴屏：两种状态（未贴=灰 / 已贴=靛蓝高亮） -->
            <button class="act pin" :class="{ on: it.pinned }" v-tip="it.pinned ? t('todo.unpin') : t('todo.pin')"
              @click="store.togglePin(it.id)">
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 17v5"/><path d="M6 3h12v2a4 4 0 0 1-4 4h-4a4 4 0 0 1-4-4V3z"/><path d="M10 9l-1 12"/><path d="M14 9l1 12"/></svg>
            </button>
            <button class="act" v-tip="t('todo.edit')" @click="store.startEdit(it.id)">
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 3a2.8 2.8 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5z"/></svg>
            </button>
            <button class="act del" v-tip="t('todo.delete')" @click="store.remove(it.id)">
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/></svg>
            </button>
          </div>
        </div>
      </div>
    </template>

    <transition name="fade">
      <div v-if="store.toast" class="toast">{{ store.toast }}</div>
    </transition>
  </div>
</template>

<style scoped>
.todo-app { display: flex; flex-direction: column; height: 100%; position: relative; background: var(--bg-primary); min-width: 0; }

/* 顶部：极简 —— 标题 + 数量 + 紧凑“⋯”与“＋” */
.topbar { display: flex; align-items: center; justify-content: space-between; padding: 12px 16px 8px; }
.title-wrap { display: flex; align-items: baseline; gap: 8px; min-width: 0; }
.app-title { font-size: 16px; font-weight: 700; letter-spacing: -0.2px; color: var(--text-primary); white-space: nowrap; }
.count { font-size: 11px; color: var(--text-muted); white-space: nowrap; }
.top-actions { display: flex; align-items: center; gap: 6px; }

.add-btn { padding: 4px 11px; border: 1px solid rgba(255,255,255,0.35); border-radius: 9px; background: var(--surface-accent-grad); color: #fff; font-size: 13px; font-weight: 600; cursor: pointer; text-shadow: 0 1px 2px rgba(0,0,0,0.15); box-shadow: 3px 3px 8px var(--surface-accent-glow), inset 1px 1px 2px rgba(255,255,255,0.4), inset -1px -1px 0 rgba(0,0,0,0.1); transition: all 0.2s var(--bevel-ease); }
.add-btn:hover { transform: translate(-1px,-1px); filter: brightness(1.06); box-shadow: 5px 5px 12px var(--surface-accent-glow), inset 1px 1px 2px rgba(255,255,255,0.45); }
.add-btn:active { transform: translate(1px,1px); filter: brightness(0.92); box-shadow: inset 2px 2px 5px rgba(0,0,0,0.2); }
.back-btn { padding: 4px 11px; border: 1px solid rgba(255,255,255,0.7); border-top-color: rgba(255,255,255,0.9); border-left-color: rgba(255,255,255,0.85); border-right-color: rgba(200,200,210,0.4); border-bottom-color: rgba(190,190,200,0.5); border-radius: 8px; background: var(--surface-grad); color: var(--text-secondary); box-shadow: var(--bevel-shadow); cursor: pointer; font-size: 14px; flex-shrink: 0; transition: all 0.2s var(--bevel-ease); }
.back-btn:hover { color: var(--text-primary); transform: translate(-1px,-1px); box-shadow: var(--bevel-shadow-hover); }
.del-btn { padding: 4px 11px; border: 1px solid rgba(255,255,255,0.7); border-top-color: rgba(255,255,255,0.9); border-left-color: rgba(255,255,255,0.85); border-right-color: rgba(200,200,210,0.4); border-bottom-color: rgba(190,190,200,0.5); border-radius: 9px; background: var(--surface-grad); color: var(--text-secondary); font-size: 13px; font-weight: 600; cursor: pointer; box-shadow: var(--bevel-shadow); transition: all 0.2s var(--bevel-ease); }
.del-btn:hover { color: #fff; background: var(--surface-accent-grad); border-color: var(--surface-accent); box-shadow: 3px 3px 8px var(--surface-accent-glow), inset 1px 1px 2px rgba(255,255,255,0.4); }

/* “⋯”更多菜单 */
.more { position: relative; }
.more-btn { width: 30px; height: 30px; border: none; border-radius: 9px; background: transparent; color: var(--text-secondary); font-size: 17px; line-height: 1; cursor: pointer; }
.more-btn:hover { background: var(--bg-hover); }
/* 编辑页的「取消」：次级文本胶囊 */
.more-btn.cancel-btn { width: auto; padding: 0 11px; font-size: 13px; background: var(--bg-hover); color: var(--text-secondary); }
.more-btn.cancel-btn:hover { background: var(--text-muted); color: #fff; }
.more-backdrop { position: fixed; inset: 0; z-index: 30; }
.more-menu {
  position: absolute; top: 34px; right: 0; z-index: 40; width: 140px;
  background: var(--surface-grad); border: 1px solid rgba(255,255,255,0.7); border-top-color: rgba(255,255,255,0.9); border-left-color: rgba(255,255,255,0.85); border-right-color: rgba(200,200,210,0.4); border-bottom-color: rgba(190,190,200,0.5); border-radius: 11px;
  padding: 5px; box-shadow: 4px 4px 12px rgba(0,0,0,0.1), inset 1px 1px 2px rgba(255,255,255,0.9);
}
.mi { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 7px 9px; border-radius: 8px; font-size: 12.5px; color: var(--text-secondary); cursor: pointer; }
.mi:hover { background: var(--bg-hover); }
.mi input[type="checkbox"] { accent-color: var(--accent); cursor: pointer; }

/* 分段控件（Apple 式）：凹陷轨道 + 凸起选中（滑条 .seg-indicator 平滑滑动过渡） */
.segmented { position: relative; display: flex; margin: 2px 16px 10px; background: linear-gradient(180deg, #e6e6ea 0%, #dcdce2 100%); border: 1px solid rgba(255,255,255,0.7); border-radius: 10px; padding: 3px; box-shadow: inset 1px 1px 2px rgba(0,0,0,0.10); }
.seg-indicator { position: absolute; left: 0; top: 3px; height: calc(100% - 6px); border-radius: 8px; background: var(--surface-grad); border: 1px solid rgba(255,255,255,0.7); border-top-color: rgba(255,255,255,0.9); border-left-color: rgba(255,255,255,0.85); border-right-color: rgba(200,200,210,0.4); border-bottom-color: rgba(190,190,200,0.5); box-shadow: var(--bevel-shadow); transition: transform 0.28s cubic-bezier(0.4, 0, 0.2, 1), width 0.28s cubic-bezier(0.4, 0, 0.2, 1); pointer-events: none; z-index: 0; }
.segmented button { position: relative; z-index: 1; flex: 1; padding: 5px 0; border: 1px solid transparent; border-radius: 8px; background: transparent; color: var(--text-secondary); font-size: 13px; cursor: pointer; transition: color 0.2s ease; }
.segmented button.on { color: var(--text-primary); font-weight: 600; }
.cnt { margin-left: 4px; font-size: 11px; color: var(--accent); font-weight: 700; }

/* 列表 */
.list { flex: 1; overflow: auto; padding: 7px 16px 18px; }
.hint { text-align: center; color: var(--text-muted); font-size: 13px; }
.empty { padding: 64px 12px; text-align: center; }
.empty-add { margin-top: 14px; padding: 6px 18px; border: 1px solid rgba(255,255,255,0.7); border-top-color: rgba(255,255,255,0.9); border-left-color: rgba(255,255,255,0.85); border-right-color: rgba(200,200,210,0.4); border-bottom-color: rgba(190,190,200,0.5); border-radius: 9px; background: var(--surface-grad); color: var(--text-secondary); font-size: 13px; cursor: pointer; box-shadow: var(--bevel-shadow); transition: all 0.2s var(--bevel-ease); }
.empty-add:hover { color: var(--accent); transform: translate(-1px,-1px); box-shadow: var(--bevel-shadow-hover); }

/* Apple 式 3D 卡片：柔和多层阴影 + 顶部高光 + 悬停上浮；参考录屏窗口的"环境辉光"做发光立体 */
.card {
  position: relative;
  display: flex; align-items: center; gap: 10px;
  background: linear-gradient(180deg, #ffffff 0%, #fcfcfd 100%);
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 12px 14px; margin-bottom: 9px;
  box-shadow: 0 1px 2px rgba(0,0,0,0.04), 0 6px 14px -4px rgba(0,0,0,0.05), inset 0 1px 0 rgba(255,255,255,0.9);
  transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.2s ease, border-color 0.2s ease, background 0.2s ease, opacity 0.15s ease;
}
.card:hover { transform: translateY(-3px); }
.card:active { transform: translateY(0) scale(0.995); }

/* 拖动排序：左侧手柄（低透明度常驻，悬停加深）；拖动中被拖卡抬起跟手 */
.grip { width: 12px; align-self: stretch; display: flex; align-items: center; justify-content: center; cursor: grab; color: var(--text-muted); opacity: 0.3; flex-shrink: 0; touch-action: none; }
.card:hover .grip { opacity: 0.85; }
.grip:active { cursor: grabbing; }
.grip svg { flex-shrink: 0; }
.card.dragging { opacity: 0.95; cursor: grabbing; box-shadow: 0 18px 36px -8px rgba(0,0,0,0.28), 0 32px 56px -16px rgba(0,0,0,0.20), inset 0 1px 0 rgba(255,255,255,0.9); }

/* 卡片底色 + 环境辉光随优先级：越重要光越亮、越"浮"（录屏记录点式发光立体） */
.card.p-urgent {
  background: linear-gradient(180deg, #fff5ea 0%, #fdeed9 100%); border-color: #fbd9b5;
  box-shadow: 0 1px 2px rgba(249,115,22,0.10), 0 6px 16px -6px rgba(249,115,22,0.30), inset 0 1px 0 rgba(255,255,255,0.85);
}
.card.p-urgent:hover { box-shadow: 0 6px 24px -6px rgba(249,115,22,0.42), 0 24px 40px -14px rgba(249,115,22,0.35), inset 0 1px 0 rgba(255,255,255,0.9); }
.card.p-high {
  background: linear-gradient(180deg, #fffbe9 0%, #fdf2cb 100%); border-color: #f4e2a5;
  box-shadow: 0 1px 2px rgba(245,158,11,0.10), 0 6px 16px -6px rgba(245,158,11,0.26), inset 0 1px 0 rgba(255,255,255,0.85);
}
.card.p-high:hover { box-shadow: 0 6px 22px -6px rgba(245,158,11,0.36), 0 22px 38px -14px rgba(245,158,11,0.30), inset 0 1px 0 rgba(255,255,255,0.9); }
.card.p-medium {
  background: linear-gradient(180deg, #eef4ff 0%, #e3eeff 100%); border-color: #cbdaff;
  box-shadow: 0 1px 2px rgba(96,165,250,0.10), 0 6px 16px -6px rgba(96,165,250,0.24), inset 0 1px 0 rgba(255,255,255,0.85);
}
.card.p-medium:hover { box-shadow: 0 6px 22px -6px rgba(96,165,250,0.34), 0 22px 38px -14px rgba(96,165,250,0.28), inset 0 1px 0 rgba(255,255,255,0.9); }
.card.p-low {
  background: linear-gradient(180deg, #ffffff 0%, #f6f6f8 100%); border-color: var(--border);
  box-shadow: 0 1px 2px rgba(0,0,0,0.04), 0 6px 14px -6px rgba(0,0,0,0.05), inset 0 1px 0 rgba(255,255,255,0.9);
}
.card.p-low:hover { box-shadow: 0 4px 12px -4px rgba(0,0,0,0.06), 0 16px 28px -12px rgba(0,0,0,0.10), inset 0 1px 0 rgba(255,255,255,0.9); }

/* Apple 式圆形勾选 */
.check { width: 22px; height: 22px; border-radius: 11px; border: 1.5px solid var(--border-light); background: var(--bg-surface); display: flex; align-items: center; justify-content: center; cursor: pointer; flex-shrink: 0; color: #fff; font-size: 13px; box-shadow: inset 0 1px 0 rgba(255,255,255,0.7); transition: background 0.15s, border-color 0.15s, transform 0.15s; }
.check:hover { border-color: var(--accent); }
.check.on { background: var(--accent); border-color: var(--accent); transform: scale(1.03); }
.check-memo { border-style: dashed; cursor: default; opacity: 0.5; }
.card.done .title, .card.done .meta { text-decoration: line-through; color: var(--text-muted); }

.body { flex: 1; min-width: 0; cursor: pointer; }
.title { font-size: 14.5px; font-weight: 600; letter-spacing: -0.1px; color: var(--text-primary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.meta { display: flex; align-items: center; gap: 9px; margin-top: 3px; font-size: 11.5px; color: var(--text-muted); }
.type { padding: 1px 7px; border-radius: 5px; font-size: 11px; }
.type.todo { background: var(--info-bg); color: var(--info); }
.type.memo { background: var(--warning-bg); color: var(--warning); }
.prio { display: inline-flex; align-items: center; gap: 5px; }
.prio .dot { width: 7px; height: 7px; border-radius: 50%; box-shadow: 0 0 0 2px rgba(0,0,0,0.02); }
.time { color: var(--text-muted); font-variant-numeric: tabular-nums; }
/* 提醒时间：时钟图标标识“未来要做的事”，与纯记录性质的创建时间区分；悬浮 title 补语义 */
.time.reminder { display: inline-flex; align-items: center; gap: 3px; }
.time.reminder svg { flex-shrink: 0; }
.excerpt { color: var(--text-muted); max-width: 45%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
/* 悬浮提示包裹器（备忘摘要用）：外层保持 45% 上限；内层 excerpt 填满锚点以触发省略号 */
.vtip-excerpt { max-width: 45%; flex-shrink: 1; min-width: 0; }
.vtip-excerpt :deep(.excerpt) { display: block; max-width: 100%; }

.actions { display: flex; gap: 2px; opacity: 0; transition: opacity 0.15s; }
.card:hover .actions { opacity: 1; }
.act { border: none; background: transparent; color: var(--text-muted); cursor: pointer; padding: 3px 5px; border-radius: 6px; display: inline-flex; align-items: center; justify-content: center; }
.act:hover { background: var(--bg-hover); color: var(--text-primary); }
.act.pin { color: var(--text-muted); }              /* 未贴 */
.act.pin.on { color: var(--accent); background: var(--accent-bg); }  /* 已贴 */
.act.del:hover { color: var(--accent); background: var(--accent-bg); }

.editor-wrap { flex: 1; min-height: 0; min-width: 0; display: flex; }

.toast { position: absolute; bottom: 18px; left: 50%; transform: translateX(-50%); background: rgba(29,29,31,0.92); color: #fff; padding: 6px 16px; border-radius: 999px; font-size: 12px; box-shadow: var(--shadow-lg); backdrop-filter: blur(8px); }
.fade-enter-active, .fade-leave-active { transition: opacity 0.2s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
