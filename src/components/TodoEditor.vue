<script setup lang="ts">
// TodoEditor.vue —— 新建/编辑 待办（简约版）
// 布局：顶部标题栏 + 大号标题输入 + Quill 正文 + 底部字段与保存。
// 新建时无“完成”勾选（新项默认未完成），编辑时才有。
import { computed, onMounted, onBeforeUnmount, ref } from 'vue'
import Quill from 'quill'
import 'quill/dist/quill.snow.css'
import type { TodoDraft, TodoPriority, TodoType } from '../stores/todo'

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
      <input v-model="title" class="title-input" placeholder="标题" />
    </div>

    <!-- 编辑态完成勾选行（仅待办编辑） -->
    <div class="ed-title" v-if="!isCreating && type === 'todo'">
      <button class="chk" :class="{ on: done }" @click="done = !done"><span v-if="done">✓</span></button>
      <span class="done-label">{{ done ? '已完成' : '标记完成' }}</span>
    </div>

    <!-- Quill 富文本正文：书写区主体 -->
    <div ref="editorEl" class="quill-host"><!-- Quill 挂载点 --></div>

    <!-- 次要信息（类型/优先级/提醒）收进“更多选项”，默认不抢占主次 -->
    <div class="meta">
      <button class="meta-toggle" :title="showMore ? '收起选项' : '类型、优先级、提醒'"
        @click="showMore = !showMore"><span class="dot">⋯</span> {{ showMore ? '收起选项' : '更多选项' }}</button>
      <div class="meta-body" v-if="showMore">
        <label class="field">
          <span>类型</span>
          <div class="seg">
            <button :class="{ on: type === 'todo' }" @click="type = 'todo'">待办</button>
            <button :class="{ on: type === 'memo' }" @click="type = 'memo'">备忘</button>
          </div>
        </label>
        <label class="field">
          <span>优先级</span>
          <select v-model="priority">
            <option value="urgent">紧急</option>
            <option value="high">高</option>
            <option value="medium">中</option>
            <option value="low">低</option>
          </select>
        </label>
        <label class="field reminder">
          <span>提醒</span>
          <input type="datetime-local" v-model="reminderLocal" />
          <button class="clear-sm" v-if="reminderLocal" @click="reminderLocal = ''" title="清除提醒">✕</button>
        </label>
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

/* 次要信息：默认收起，一行轻提示；展开才露出字段 */
.meta { margin-top: 10px; }
.meta-toggle { display: inline-flex; align-items: center; gap: 6px; border: none; background: transparent; color: var(--text-muted); font-size: 12px; cursor: pointer; padding: 5px 8px; border-radius: 7px; }
.meta-toggle:hover { background: var(--bg-hover); color: var(--text-secondary); }
.meta-toggle .dot { color: var(--text-muted); font-size: 12px; letter-spacing: 1px; }
.meta-body { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 8px; animation: fade 0.15s ease; }
@keyframes fade { from { opacity: 0; transform: translateY(-2px); } to { opacity: 1; transform: none; } }
.field { display: flex; align-items: center; gap: 8px; background: var(--bg-surface); border: 1px solid var(--border); border-radius: 10px; padding: 5px 8px 5px 10px; box-shadow: var(--shadow); }
.field > span { font-size: 11px; color: var(--text-muted); white-space: nowrap; }
.field select, .field input[type="datetime-local"] { border: none; outline: none; background: transparent; color: var(--text-primary); font-size: 13px; }
.field select { cursor: pointer; }
.field.reminder input[type="datetime-local"] { min-width: 116px; }
.seg { display: flex; border-radius: 7px; overflow: hidden; background: linear-gradient(180deg, #e8e8ec 0%, #dedee4 100%); box-shadow: inset 0 1px 2px rgba(0,0,0,0.10); }
.seg button { padding: 4px 10px; border: none; background: transparent; color: var(--text-muted); cursor: pointer; font-size: 13px; }
.seg button.on { background: var(--surface-grad); color: var(--text-primary); font-weight: 600; box-shadow: inset 0 1px 0 rgba(255,255,255,0.9); }
.clear-sm { border: none; background: none; color: var(--text-muted); cursor: pointer; font-size: 12px; padding: 2px; }
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
