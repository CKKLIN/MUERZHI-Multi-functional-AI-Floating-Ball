<script setup lang="ts">
// TodoEditor.vue —— 待办/备忘录 的富文本编辑面板
// 标题为普通文本输入；正文用 Quill 富文本（图文：图片经 FileReader 转 dataURL 存进 HTML）。
// 字段：类型 / 优先级 / 完成 / 提醒时间。保存/取消通过回调交给 TodoApp 处理。
import { onMounted, onBeforeUnmount, ref } from 'vue'
import Quill from 'quill'
import 'quill/dist/quill.snow.css'
import type { TodoDraft, TodoPriority, TodoType } from '../stores/todo'

const props = defineProps<{
  initial?: TodoDraft | null                 // 编辑已有项时的初值；null/缺省=新建
}>()
const emit = defineEmits<{
  (e: 'save', draft: TodoDraft): void
  (e: 'cancel'): void
}>()

const TOOLBAR = [
  [{ header: [1, 2, 3, false] }],
  ['bold', 'italic', 'underline', 'strike'],
  [{ list: 'ordered' }, { list: 'bullet' }],
  ['blockquote', 'link'],
  ['image'],
  ['clean'],
]

const title = ref('')
const type = ref<TodoType>(props.initial?.type ?? 'todo')
const priority = ref<TodoPriority>(props.initial?.priority ?? 'medium')
const done = ref(props.initial?.done ?? false)
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
    title.value = props.initial.title ?? ''
    type.value = props.initial.type ?? 'todo'
    priority.value = props.initial.priority ?? 'medium'
    done.value = props.initial.done ?? false
    reminderLocal.value = isoToLocal(props.initial.reminder)
  }
  quill = new Quill(editorEl.value!, { theme: 'snow', modules: { toolbar: TOOLBAR } })
  quill.root.innerHTML = props.initial?.content ?? ''
  quill.focus()

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
        const dataUrl = reader.result as string
        const range = quill!.getSelection(true) ?? { index: quill!.getLength() }
        quill!.insertEmbed(range.index, 'image', dataUrl)
        quill!.setSelection(range.index + 1)
      }
      reader.readAsDataURL(file)
    }
    input.click()
  })
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
    title: title.value.trim(),
    content: quill.root.innerHTML,
    priority: priority.value,
    reminder: localToIso(reminderLocal.value),
    done: type.value === 'todo' ? done.value : false,
  })
}
</script>

<template>
  <div class="editor">
    <header class="editor-head">
      <button class="icon-btn primary" :title="type === 'todo' ? '标记完成' : ''" :class="{ checked: done }"
        v-if="type === 'todo'" @click="done = !done">
        <span class="check">{{ done ? '✓' : '' }}</span>
      </button>
      <input class="title-input" v-model="title" placeholder="标题" @keydown.enter.prevent="save" />
    </header>

    <div ref="editorEl" class="quill-host"><!-- Quill 挂载点 --></div>

    <div class="fields">
      <label class="field">
        <span>类型</span>
        <div class="seg">
          <button :class="{ on: type === 'todo' }" @click="type = 'todo'">待办</button>
          <button :class="{ on: type === 'memo' }" @click="type = 'memo'">备忘录</button>
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
      <label class="field">
        <span>提醒</span>
        <input type="datetime-local" v-model="reminderLocal" />
        <button class="clear-sm" v-if="reminderLocal" @click="reminderLocal = ''" title="清除提醒">✕</button>
      </label>
    </div>

    <footer class="editor-foot">
      <button class="btn ghost" @click="emit('cancel')">取消</button>
      <button class="btn accent" @click="save">保存</button>
    </footer>
  </div>
</template>

<style scoped>
.editor { display: flex; flex-direction: column; height: 100%; padding: 12px 14px 10px; background: var(--bg-primary); }

.editor-head { display: flex; align-items: center; gap: 10px; padding: 10px 14px; background: var(--bg-surface); border: 1px solid var(--border); border-radius: 14px; box-shadow: var(--shadow); }
.icon-btn { width: 24px; height: 24px; border-radius: 50%; border: 1.5px solid var(--border-light); background: var(--bg-surface); display: flex; align-items: center; justify-content: center; cursor: pointer; flex-shrink: 0; color: #fff; font-size: 12px; }
.icon-btn.checked { background: var(--success); border-color: var(--success); }
.title-input { flex: 1; border: none; outline: none; background: transparent; font-size: 17px; font-weight: 700; letter-spacing: -0.2px; color: var(--text-primary); }

/* Quill 正文：独立白色卡片，柔和阴影 */
.quill-host { flex: 1; min-height: 0; margin-top: 10px; background: var(--bg-surface); border: 1px solid var(--border); border-radius: 14px; box-shadow: var(--shadow); overflow: hidden; display: flex; flex-direction: column; }
.quill-host :deep(.ql-toolbar) { border: none; border-bottom: 1px solid var(--border); background: var(--bg-secondary); border-radius: 14px 14px 0 0; }
.quill-host :deep(.ql-container) { border: none; font-size: 14px; color: var(--text-secondary); flex: 1; }
.quill-host :deep(.ql-editor) { min-height: 120px; padding: 12px 16px; }
.quill-host :deep(.ql-editor.ql-blank::before) { color: var(--text-muted); font-style: normal; }

/* 字段区 */
.fields { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 10px; }
.field { display: flex; align-items: center; gap: 8px; background: var(--bg-surface); border: 1px solid var(--border); border-radius: 10px; padding: 6px 8px 6px 10px; box-shadow: var(--shadow); }
.field > span { font-size: 11px; color: var(--text-muted); white-space: nowrap; }
.field select, .field input[type="datetime-local"] { border: none; outline: none; background: transparent; color: var(--text-primary); font-size: 13px; }
.field select { cursor: pointer; }
.seg { display: flex; border-radius: 7px; overflow: hidden; }
.seg button { padding: 4px 10px; border: none; background: transparent; color: var(--text-muted); cursor: pointer; font-size: 13px; }
.seg button.on { background: var(--accent-bg); color: var(--accent); font-weight: 600; }
.clear-sm { border: none; background: none; color: var(--text-muted); cursor: pointer; font-size: 12px; padding: 2px; }

.footer { display: flex; justify-content: space-between; align-items: center; margin-top: 12px; }
.editor-foot { display: flex; justify-content: flex-end; gap: 8px; }
.btn { padding: 7px 18px; border: none; border-radius: 10px; cursor: pointer; font-size: 13px; transition: transform 0.15s, box-shadow 0.15s; }
.btn:hover { transform: translateY(-1px); }
.btn.ghost { background: var(--bg-hover); color: var(--text-primary); box-shadow: 0 1px 2px rgba(0,0,0,0.05); }
.btn.accent { background: var(--accent); color: #fff; font-weight: 600; box-shadow: 0 2px 6px rgba(78,92,212,0.35); }
</style>
