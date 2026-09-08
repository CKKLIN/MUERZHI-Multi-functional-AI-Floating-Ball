<script setup lang="ts">
// TodoEditor.vue —— 新建/编辑 待办（简约版）
// 布局：顶部标题栏 + 大号标题输入 + Quill 正文 + 底部字段与保存。
// 新建时无“完成”勾选（新项默认未完成），编辑时才有。
import { computed, onMounted, onBeforeUnmount, ref } from 'vue'
import Quill from 'quill'
import 'quill/dist/quill.snow.css'
import type { TodoDraft, TodoPriority, TodoType } from '../stores/todo'
import { t } from '../stores/i18n'

const props = defineProps<{
  initial?: TodoDraft | null                 // 编辑已有项时的初值；null/缺省=新建
  defaultType?: TodoType                     // 新建时的默认类型（跟随当前选中 Tab：待办/备忘）
}>()
const emit = defineEmits<{
  (e: 'save', draft: TodoDraft): void
  (e: 'cancel'): void
}>()

const isCreating = computed(() => !props.initial)
/** “更多选项”（类型/优先级/提醒）默认收起，避免次要信息抢占书写区主次 */
const showMore = ref(false)

const TOOLBAR = [
  [{ header: [1, 2, 3, false] }],
  ['bold', 'italic', 'underline', 'strike'],
  [{ list: 'ordered' }, { list: 'bullet' }],
  ['blockquote', 'link'],
  ['image'],
  ['clean'],
]

const type = ref<TodoType>('todo')
const title = ref('')
const priority = ref<TodoPriority>('medium')
const done = ref(false)
/** 用 datetime-local 兜住提醒时间（本地时区），存库时转 UTC ISO */
const reminderLocal = ref('')

// ===== 自绘日期时间选择弹层 =====
// 原生日历弹窗是 Chromium 内部页面，CSS 无法接管、和窗口 Apple 风格脱节——
// 所以整个弹层自绘（日历网格 + 时/分下拉，全部走主题变量），选完仍写回 reminderLocal。
const pickerOpen = ref(false)
const viewY = ref(1970)
const viewM = ref(0) // 0 起；日历网格当前浏览的年月（与已选值无关）
const popPos = ref<{ left: number; bottom: number } | null>(null)
const reminderFieldEl = ref<HTMLElement | null>(null)

function pad2(n: number): string { return String(n).padStart(2, '0') }

const weekdays = computed(() => t('todo.weekdays').split(','))
const monthNames = computed(() => t('todo.monthNames').split(','))
const monthTitle = computed(() =>
  t('todo.monthTitle', { y: viewY.value, m: viewM.value + 1, month: monthNames.value[viewM.value] ?? '' }))

/** 已选值的各段（无值时 null，弹层时间下拉按“--”占位） */
const cur = computed(() => {
  if (!reminderLocal.value) return null
  const d = new Date(reminderLocal.value)
  if (isNaN(d.getTime())) return null
  return { y: d.getFullYear(), m: d.getMonth(), d: d.getDate(), h: d.getHours(), min: d.getMinutes() }
})

const hourOpts = Array.from({ length: 24 }, (_, i) => i)
const minuteOpts = Array.from({ length: 60 }, (_, i) => i)

interface CalCell { y: number; m: number; d: number; inMonth: boolean }
const calCells = computed<CalCell[]>(() => {
  const y = viewY.value, m = viewM.value
  const lead = (new Date(y, m, 1).getDay() + 6) % 7 // 周一开头：周日 getDay()=0 → 偏移成 6
  const dim = new Date(y, m + 1, 0).getDate()
  const dimPrev = new Date(y, m, 0).getDate()
  const cells: CalCell[] = []
  const push = (yy: number, mm: number, dd: number, inMonth: boolean) => cells.push({ y: yy, m: mm, d: dd, inMonth })
  for (let i = 0; i < lead; i++) {
    const pm = (m - 1 + 12) % 12
    push(pm === 11 ? y - 1 : y, pm, dimPrev - lead + 1 + i, false)
  }
  for (let d = 1; d <= dim; d++) push(y, m, d, true)
  const nm = (m + 1) % 12
  const ny = nm === 0 ? y + 1 : y
  let nd = 1
  while (cells.length % 7 !== 0 || cells.length < 35) push(ny, nm, nd++, false) // 补满整周且至少 5 行，弹层高度稳定
  return cells
})

function isSel(c: CalCell): boolean {
  const c0 = cur.value
  return !!c0 && c.y === c0.y && c.m === c0.m && c.d === c0.d
}
function isToday(c: CalCell): boolean {
  const n = new Date()
  return c.y === n.getFullYear() && c.m === n.getMonth() && c.d === n.getDate()
}

function setValue(y: number, m: number, d: number, h: number, min: number): void {
  reminderLocal.value = `${y}-${pad2(m + 1)}-${pad2(d)}T${pad2(h)}:${pad2(min)}`
}
/** 点日：保留已选时间；首次选择落到当前时刻，避免莫名出现 00:00 */
function pickDay(c: CalCell): void {
  const c0 = cur.value, n = new Date()
  setValue(c.y, c.m, c.d, c0?.h ?? n.getHours(), c0?.min ?? n.getMinutes())
}
function pickToday(): void {
  const n = new Date(), c0 = cur.value
  setValue(n.getFullYear(), n.getMonth(), n.getDate(), c0?.h ?? n.getHours(), c0?.min ?? n.getMinutes())
}
function setTimePart(part: 'h' | 'min', e: Event): void {
  const v = Number((e.target as HTMLSelectElement).value)
  if (isNaN(v)) return
  const c0 = cur.value, n = new Date()
  setValue(
    c0?.y ?? n.getFullYear(), c0?.m ?? n.getMonth(), c0?.d ?? n.getDate(),
    part === 'h' ? v : (c0?.h ?? n.getHours()),
    part === 'min' ? v : (c0?.min ?? n.getMinutes()),
  )
}
function shiftMonth(delta: number): void {
  const nm = viewM.value + delta
  viewM.value = ((nm % 12) + 12) % 12
  viewY.value += Math.floor(nm / 12)
}

/** 打开弹层：视口坐标固定定位（meta 行贴窗口底部，向上展开），按窗口边界夹取防溢出 */
function openPicker(): void {
  if (pickerOpen.value) return // 已开着：不重置浏览月份
  const el = reminderFieldEl.value
  if (el) {
    const r = el.getBoundingClientRect()
    const POP_W = 268, POP_H = 350
    popPos.value = {
      left: Math.max(8, Math.min(r.left, window.innerWidth - POP_W - 8)),
      bottom: Math.max(8, Math.min(window.innerHeight - r.top + 6, window.innerHeight - POP_H - 8)),
    }
  }
  const d = reminderLocal.value ? new Date(reminderLocal.value) : new Date()
  const valid = !isNaN(d.getTime())
  viewY.value = valid ? d.getFullYear() : new Date().getFullYear()
  viewM.value = valid ? d.getMonth() : new Date().getMonth()
  pickerOpen.value = true
}

const editorEl = ref<HTMLDivElement | null>(null)
let quill: Quill | null = null

function isoToLocal(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}
function localToIso(local: string): string | null {
  if (!local) return null
  const d = new Date(local)
  return isNaN(d.getTime()) ? null : d.toISOString()
}

onMounted(() => {
  if (props.initial) {
    type.value = props.initial.type ?? 'todo'
    title.value = props.initial.title ?? ''
    priority.value = props.initial.priority ?? 'medium'
    done.value = props.initial.done ?? false
    reminderLocal.value = isoToLocal(props.initial.reminder)
  } else if (props.defaultType) {
    // 新建：默认类型跟随当前选中 Tab
    type.value = props.defaultType
  }
  try {
    quill = new Quill(editorEl.value!, { theme: 'snow', modules: { toolbar: TOOLBAR } })
    quill.root.innerHTML = props.initial?.content ?? ''
    quill.focus()
    console.log('[TodoEditor] Quill init OK, toolbar buttons =', editorEl.value?.querySelectorAll('.ql-toolbar button').length)

    // 图片：本地文件 → FileReader → base64 dataURL 插入（dataURL 直接随 content 存主进程 JSON）
    const toolbar = quill.getModule('toolbar')
    toolbar.addHandler('image', () => {
      const input = document.createElement('input')
      input.type = 'file'
      input.accept = 'image/*'
      input.onchange = () => {
        const file = input.files?.[0]
        if (!file || !quill) return
        const reader = new FileReader()
        reader.onload = () => {
          if (!quill) return // 编辑器可能已卸载，读取完成时避免操作已销毁实例
          const dataUrl = reader.result as string
          const range = quill.getSelection(true) ?? { index: quill.getLength() }
          quill.insertEmbed(range.index, 'image', dataUrl)
          quill.setSelection(range.index + 1)
        }
        reader.readAsDataURL(file)
      }
      input.click()
    })
  } catch (e) {
    console.error('[TodoEditor] Quill init FAILED:', e)
  }
})

// 编辑器卸载（返回列表/取消）时销毁 Quill，移除其注册在 document 上的 selectionchange
// 监听与内部 DOM 引用，避免重复进出编辑器时累积监听器、旧编辑器 DOM 常驻内存
onBeforeUnmount(() => {
  if (quill) {
    try { quill.destroy() } catch { /* 已销毁 */ }
    quill = null
  }
})

function save() {
  if (!quill) return
  emit('save', {
    type: type.value,
    title: type.value === 'memo' ? title.value.trim() : '',
    content: quill.root.innerHTML,
    priority: priority.value,
    reminder: localToIso(reminderLocal.value),
    done: type.value === 'todo' ? done.value : false,
  })
}

// 让外层（TodoApp 标题行的“保存”按钮）能触发本编辑器的保存
defineExpose({ save })
</script>

<template>
  <div class="editor">

    <!-- 备忘：标题输入（待办无标题，正文即内容） -->
    <div class="ed-title" v-if="type === 'memo'">
      <input v-model="title" class="title-input" :placeholder="t('todo.titlePlaceholder')" />
    </div>

    <!-- 编辑态完成勾选行（仅待办编辑） -->
    <div class="ed-title" v-if="!isCreating && type === 'todo'">
      <button class="chk" :class="{ on: done }" @click="done = !done"><span v-if="done">✓</span></button>
      <span class="done-label">{{ done ? t('todo.completed') : t('todo.markDone') }}</span>
    </div>

    <!-- Quill 富文本正文：书写区主体 -->
    <div ref="editorEl" class="quill-host"><!-- Quill 挂载点 --></div>

    <!-- 次要信息（类型/优先级/提醒）收进“更多选项”，默认不抢占主次 -->
    <div class="meta">
      <button class="meta-toggle" :title="showMore ? t('todo.collapseOptions') : t('todo.moreTitle')"
        @click="showMore = !showMore"><span class="dot">⋯</span> {{ showMore ? t('todo.collapseOptions') : t('todo.moreOptions') }}</button>
      <div class="meta-body" v-if="showMore">
        <label class="field">
          <span>{{ t('todo.typeField') }}</span>
          <div class="seg">
            <button :class="{ on: type === 'todo' }" @click="type = 'todo'">{{ t('todo.typeTodo') }}</button>
            <button :class="{ on: type === 'memo' }" @click="type = 'memo'">{{ t('todo.typeMemo') }}</button>
          </div>
        </label>
        <label class="field">
          <span>{{ t('todo.priority') }}</span>
          <select v-model="priority">
            <option value="urgent">{{ t('todo.priorityUrgent') }}</option>
            <option value="high">{{ t('todo.priorityHigh') }}</option>
            <option value="medium">{{ t('todo.priorityMedium') }}</option>
            <option value="low">{{ t('todo.priorityLow') }}</option>
          </select>
        </label>
        <div class="reminder-wrap">
          <label ref="reminderFieldEl" class="field reminder">
            <span>{{ t('todo.reminder') }}</span>
            <input type="datetime-local" v-model="reminderLocal" @click="openPicker" />
            <button class="pick-btn" :title="t('todo.reminder')" @click="openPicker">
              <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M8 3v4"/><path d="M16 3v4"/><path d="M3 10h18"/></svg>
            </button>
            <button class="clear-sm" v-if="reminderLocal" @click.stop="reminderLocal = ''" :title="t('todo.clearReminder')">✕</button>
          </label>
          <!-- 自绘日期时间弹层：固定定位于视口（openPicker 按字段位置夹取），backdrop 点击外部关闭 -->
          <div v-if="pickerOpen" class="dt-backdrop" @click="pickerOpen = false"></div>
          <div v-if="pickerOpen" class="dt-pop"
            :style="popPos ? { left: popPos.left + 'px', bottom: popPos.bottom + 'px' } : undefined">
            <div class="dt-head">
              <button class="dt-nav" @click="shiftMonth(-1)">‹</button>
              <div class="dt-title">{{ monthTitle }}</div>
              <button class="dt-nav" @click="shiftMonth(1)">›</button>
            </div>
            <div class="dt-grid">
              <span class="dt-wd" v-for="w in weekdays" :key="w">{{ w }}</span>
              <button v-for="(c, i) in calCells" :key="i" class="dt-day"
                :class="{ out: !c.inMonth, sel: isSel(c), today: !isSel(c) && isToday(c) }"
                @click="pickDay(c)">{{ c.d }}</button>
            </div>
            <div class="dt-foot">
              <button class="dt-quick" @click="pickToday">{{ t('todo.today') }}</button>
              <div class="dt-time">
                <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>
                <select :value="cur ? cur.h : ''" @change="setTimePart('h', $event)">
                  <option value="" disabled>--</option>
                  <option v-for="h in hourOpts" :key="h" :value="h">{{ pad2(h) }}</option>
                </select>
                <span class="colon">:</span>
                <select :value="cur ? cur.min : ''" @change="setTimePart('min', $event)">
                  <option value="" disabled>--</option>
                  <option v-for="min in minuteOpts" :key="min" :value="min">{{ pad2(min) }}</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.editor { display: flex; flex-direction: column; height: 100%; width: 100%; min-width: 0; padding: 12px 18px 14px; }

/* 标题行（备忘用）+ 完成勾选行 */
.ed-title { display: flex; align-items: center; gap: 10px; padding: 0 0 10px; }
.title-input { flex: 1; border: none; outline: none; background: transparent; font-size: 22px; font-weight: 700; letter-spacing: -0.3px; color: var(--text-primary); }
.title-input::placeholder { color: var(--text-muted); }
.chk { width: 24px; height: 24px; border-radius: 50%; border: 1.5px solid var(--border-light); background: var(--bg-surface); display: flex; align-items: center; justify-content: center; cursor: pointer; flex-shrink: 0; color: #fff; font-size: 13px; }
.chk.on { background: var(--accent); border-color: var(--accent); }
.done-label { font-size: 12px; color: var(--text-muted); }

/* Quill 正文 —— 主信息第二优先级，占满书写区；聚焦时给一圈轻靛蓝光（Apple 式 focus ring） */
.quill-host {
  flex: 1; min-height: 0; margin-top: 0;
  background: var(--bg-surface); border: 1px solid var(--border); border-radius: 13px;
  box-shadow: var(--shadow); overflow: hidden; display: flex; flex-direction: column;
  transition: border-color 0.18s ease, box-shadow 0.18s ease;
}
.quill-host:focus-within { border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-bg), var(--shadow); }

/* 次要信息：默认收起，一行轻提示；展开才露出字段。三个胶囊按紧凑档排（单行放下，不折行） */
.meta { margin-top: 10px; }
.meta-toggle { display: inline-flex; align-items: center; gap: 5px; border: none; background: transparent; color: var(--text-muted); font-size: 11.5px; cursor: pointer; padding: 4px 8px; border-radius: 7px; }
.meta-toggle:hover { background: var(--bg-hover); color: var(--text-secondary); }
.meta-toggle .dot { color: var(--text-muted); font-size: 12px; letter-spacing: 1px; }
.meta-body { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 6px; animation: fade 0.15s ease; }
@keyframes fade { from { opacity: 0; transform: translateY(-2px); } to { opacity: 1; transform: none; } }
.field { display: flex; align-items: center; gap: 6px; background: var(--bg-surface); border: 1px solid var(--border); border-radius: 9px; padding: 3px 7px 3px 9px; box-shadow: var(--shadow); }
.field > span { font-size: 10.5px; color: var(--text-muted); white-space: nowrap; }
/* 原生表单控件不继承字体，必须显式接管才能和窗口字体/数字风格一致 */
.field select, .field input[type="datetime-local"] { border: none; outline: none; background: transparent; color: var(--text-primary); font-size: 12.5px; font-family: inherit; height: 20px; font-variant-numeric: tabular-nums; }
.field select { cursor: pointer; }
/* ===== 日期时间选择弹层（自绘）=====
   原生日历弹窗是 Chromium 内部页面，CSS 无法接管——所以整体自绘：
   日历网格 + 时/分下拉全部走本窗口主题变量，与卡片/分段控件同一套视觉语言；
   点击字段或日历按钮弹出，向上展开（meta 行贴窗口底部），backdrop 点外关闭。 */
.reminder-wrap { display: contents; } /* 仅作弹层的 DOM 宿主，布局上透明（label 仍是 .meta-body 的直接子项） */
.dt-backdrop { position: fixed; inset: 0; z-index: 60; }
.dt-pop { position: fixed; z-index: 61; width: 268px; padding: 12px 12px 10px; left: 16px; bottom: 52px;
  background: linear-gradient(180deg, #ffffff 0%, #fcfcfd 100%); border: 1px solid var(--border); border-radius: 14px;
  box-shadow: 0 2px 6px rgba(0,0,0,0.06), 0 20px 44px rgba(0,0,0,0.16), inset 0 1px 0 rgba(255,255,255,0.9);
  animation: dtpop 0.16s ease; }
@keyframes dtpop { from { opacity: 0; transform: translateY(6px) scale(0.97); } to { opacity: 1; transform: none; } }
.dt-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; }
.dt-title { font-size: 13px; font-weight: 700; color: var(--text-primary); font-variant-numeric: tabular-nums; }
.dt-nav { width: 24px; height: 24px; border: none; border-radius: 7px; background: transparent; color: var(--text-muted); font-size: 13px; line-height: 1; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: background 0.12s ease, color 0.12s ease; }
.dt-nav:hover { background: var(--bg-hover); color: var(--text-primary); }
.dt-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 2px; }
.dt-wd { font-size: 10.5px; color: var(--text-muted); text-align: center; padding: 2px 0 4px; }
.dt-day { height: 30px; border: none; border-radius: 8px; background: transparent; color: var(--text-secondary); font-size: 12.5px; font-family: inherit; font-variant-numeric: tabular-nums; cursor: pointer; transition: background 0.12s ease, color 0.12s ease; }
.dt-day:hover { background: var(--bg-hover); color: var(--text-primary); }
.dt-day.out { color: #c6c6cc; }
.dt-day.today { color: var(--accent); font-weight: 700; }
.dt-day.sel { background: var(--accent); color: #fff; font-weight: 700; box-shadow: 0 2px 8px var(--surface-accent-glow); }
.dt-day.sel:hover { background: var(--accent-hover); color: #fff; }
.dt-foot { display: flex; align-items: center; margin-top: 10px; padding-top: 8px; border-top: 1px solid var(--border); }
.dt-quick { border: none; background: var(--accent-bg); color: var(--accent); font-size: 12px; font-weight: 600; padding: 4px 10px; border-radius: 8px; cursor: pointer; transition: background 0.15s ease; }
.dt-quick:hover { background: var(--surface-accent-bg); }
.dt-time { margin-left: auto; display: flex; align-items: center; gap: 4px; color: var(--text-muted); }
.dt-time select { border: none; outline: none; background: var(--bg-input); color: var(--text-primary); font-size: 13px; font-family: inherit; font-variant-numeric: tabular-nums; border-radius: 7px; padding: 3px 2px 3px 6px; cursor: pointer; }
.dt-time .colon { color: var(--text-muted); font-weight: 700; font-size: 12px; }
.field.reminder input[type="datetime-local"] { min-width: 130px; padding: 0; cursor: text; }
.field.reminder input[type="datetime-local"]::-webkit-date-and-time-value { text-align: left; }
.field.reminder input[type="datetime-local"]::-webkit-calendar-picker-indicator { display: none; }
.field.reminder input::-webkit-datetime-edit { padding: 0; }
.field.reminder input::-webkit-datetime-edit-text { color: var(--text-muted); padding: 0 1px; }
.field.reminder input::-webkit-datetime-edit-year-field,
.field.reminder input::-webkit-datetime-edit-month-field,
.field.reminder input::-webkit-datetime-edit-day-field,
.field.reminder input::-webkit-datetime-edit-hour-field,
.field.reminder input::-webkit-datetime-edit-minute-field,
.field.reminder input::-webkit-datetime-edit-ampm-field { border-radius: 4px; padding: 1px 2px; }
.field.reminder input::-webkit-datetime-edit-year-field:hover,
.field.reminder input::-webkit-datetime-edit-month-field:hover,
.field.reminder input::-webkit-datetime-edit-day-field:hover,
.field.reminder input::-webkit-datetime-edit-hour-field:hover,
.field.reminder input::-webkit-datetime-edit-minute-field:hover,
.field.reminder input::-webkit-datetime-edit-ampm-field:hover { background: var(--bg-hover); }
.field.reminder input::-webkit-datetime-edit-year-field:focus,
.field.reminder input::-webkit-datetime-edit-month-field:focus,
.field.reminder input::-webkit-datetime-edit-day-field:focus,
.field.reminder input::-webkit-datetime-edit-hour-field:focus,
.field.reminder input::-webkit-datetime-edit-minute-field:focus,
.field.reminder input::-webkit-datetime-edit-ampm-field:focus { background: var(--accent); color: #fff; outline: none; }
.field.reminder:hover { border-color: var(--border-light); }
.field.reminder:focus-within { border-color: var(--accent); box-shadow: 0 0 0 2px var(--accent-bg), var(--shadow); }
/* 自绘日历按钮：默认隐入灰，悬浮亮起靛蓝 */
.pick-btn { border: none; background: none; color: var(--text-muted); cursor: pointer; padding: 1px 2px; border-radius: 5px; display: inline-flex; align-items: center; transition: background 0.15s ease, color 0.15s ease; }
.pick-btn:hover { color: var(--accent); background: var(--accent-bg); }
.seg { display: flex; border-radius: 7px; overflow: hidden; background: linear-gradient(180deg, #e8e8ec 0%, #dedee4 100%); box-shadow: inset 0 1px 2px rgba(0,0,0,0.10); }
.seg button { padding: 2px 8px; border: none; background: transparent; color: var(--text-muted); cursor: pointer; font-size: 12.5px; }
.seg button.on { background: var(--surface-grad); color: var(--text-primary); font-weight: 600; box-shadow: inset 0 1px 0 rgba(255,255,255,0.9); }
.clear-sm { border: none; background: none; color: var(--text-muted); cursor: pointer; font-size: 11.5px; padding: 1px 3px; border-radius: 5px; transition: background 0.15s ease, color 0.15s ease; }
.clear-sm:hover { background: var(--bg-hover); color: var(--text-primary); }
</style>

<!-- Quill 覆盖样式=全局非 scoped。关键：局部 toolbar 是 editor 的直接子级（.quill-host 的同级兄弟，
     不是其后代——Quill 把 host 变成 .ql-container、在它前面插入 .ql-toolbar）。所以必须用
     .editor .ql-toolbar（经过 editor 根），不能用 .quill-host .ql-toolbar。 -->
<style>
.editor .ql-toolbar { background: #ececf1 !important; border: none !important; border-bottom: 1px solid #d8d8de !important; padding: 1px 6px !important; width: 100% !important; max-width: 100% !important; box-sizing: border-box !important; }
.editor .ql-toolbar .ql-formats { margin-right: 0 !important; margin-left: 1px !important; }
.editor .ql-toolbar button { padding: 0 !important; width: 20px !important; height: 20px !important; display: inline-flex !important; align-items: center !important; justify-content: center !important; color: #6e6e76 !important; }
.editor .ql-toolbar button svg { width: 12px !important; height: 12px !important; }
.editor .ql-toolbar .ql-stroke { stroke: currentColor !important; }
.editor .ql-toolbar .ql-fill { fill: currentColor !important; }
.editor .ql-toolbar button:hover { color: #1d1d1f !important; }
.editor .ql-toolbar button.ql-active { color: #4e5cd4 !important; }
.editor .ql-toolbar .ql-picker { height: 20px !important; }
.editor .ql-toolbar .ql-picker-label { display: flex !important; align-items: center !important; height: 20px !important; padding: 0 2px !important; font-size: 10px !important; color: #6e6e76 !important; }
.quill-host .ql-editor { min-height: 150px !important; padding: 14px 18px !important; font-size: 14px !important; line-height: 1.7 !important; color: #56565c !important; user-select: text !important; -webkit-user-select: text !important; cursor: text !important; }
.quill-host .ql-editor p { margin: 0 0 6px !important; }
.quill-host .ql-editor h1 { font-size: 1.5em !important; margin: 10px 0 6px !important; color: #1d1d1f !important; }
.quill-host .ql-editor h2 { font-size: 1.25em !important; margin: 10px 0 6px !important; color: #1d1d1f !important; }
.quill-host .ql-editor h3 { font-size: 1.1em !important; margin: 8px 0 6px !important; color: #1d1d1f !important; }
.quill-host .ql-editor blockquote { border-left: 3px solid #d4d4d9 !important; margin: 8px 0 !important; padding-left: 12px !important; color: #8d8d93 !important; }
.quill-host .ql-editor ul, .quill-host .ql-editor ol { margin: 6px 0 !important; padding-left: 1.3em !important; }
.quill-host .ql-editor li { margin-bottom: 2px !important; }
.quill-host .ql-editor img { max-width: 100% !important; border-radius: 8px !important; }
.quill-host .ql-editor a { color: #4e5cd4 !important; }
.quill-host .ql-editor.ql-blank::before { color: #8d8d93 !important; font-style: normal !important; user-select: none !important; }
</style>
