<script setup lang="ts">
// TodoApp.vue —— 待办便签主面板（Apple 高级风）
// 列表只给"一目了然"的信息：标题 + 一行轻量元信息 + 单行纯文本摘要（不含图片）；图文在点开编辑器看。
import { computed, onMounted } from 'vue'
import { useTodoStore, type TodoDraft } from '../stores/todo'
import TodoEditor from './TodoEditor.vue'
import TodoPreview from './TodoPreview.vue'

const store = useTodoStore()

const PRIO_NM = { urgent: '紧急', high: '高', medium: '中', low: '低' } as const
const PRIO_COLOR = { urgent: '#f97316', high: '#f59e0b', medium: '#60a5fa', low: '#b0b0b8' } as const
const TYPE_NM = { todo: '待办', memo: '备忘' } as const
// 每条卡片的底色随优先级走（低饱和柔色块，读列表时一眼分出轻重）
const PRIO_CLASS = { urgent: 'p-urgent', high: 'p-high', medium: 'p-medium', low: 'p-low' } as const

const tabs = [
  { key: 'all', label: '全部' },
  { key: 'todo', label: '待办' },
  { key: 'memo', label: '备忘' },
] as const

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

// 富文本 HTML → 单行纯文本摘录（用于列表；去掉一切标签与图片）
function plainText(html: string): string {
  const el = document.createElement('div')
  el.innerHTML = html || ''
  return (el.textContent || '').replace(/\s+/g, ' ').trim()
}

function fmtTime(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

async function onSave(draft: TodoDraft) {
  try {
    if (isNew.value) {
      await store.create(draft)
      store.toastMsg('已新增')
    } else {
      await store.update(store.editingId, draft)
      store.toastMsg('已保存')
    }
  } catch (e) {
    store.toastMsg('保存失败')
    console.error(e)
  }
}

function togglePin() {
  window.electronAPI.todoToggleAlwaysOnTop().then(next => {
    store.settings.windowAlwaysOnTop = next
  }).catch(() => {})
}

onMounted(() => { store.load() })
</script>

<template>
  <div class="todo-app">
    <header class="topbar">
      <h1 class="app-title">待办便签</h1>
      <div class="top-actions">
        <button class="ghost-btn" :class="{ on: store.settings.badgeVisible }" title="悬浮球数字气泡开关"
          @click="store.setBadgeVisible(!store.settings.badgeVisible)">
          <span class="mini-bubble" :class="{ on: store.settings.badgeVisible }">3</span>
        </button>
        <button class="ghost-btn" :class="{ on: store.settings.windowAlwaysOnTop }" title="窗口置顶"
          @click="togglePin">⤴</button>
        <button class="accent-btn" @click="store.startCreate()">＋ 新建</button>
      </div>
    </header>

    <div class="editor-wrap" v-if="inEditor">
      <TodoEditor :initial="editingDraft" @save="onSave" @cancel="store.closeEditor()" />
    </div>

    <!-- 只读预览：点卡片进入；编辑需点「编辑」按钮 -->
    <div class="editor-wrap" v-else-if="store.previewId">
      <TodoPreview />
    </div>

    <template v-else>
      <nav class="segmented">
        <button v-for="t in tabs" :key="t.key" :class="{ on: store.activeType === t.key }"
          @click="store.activeType = t.key">
          {{ t.label }}<span v-if="t.key === 'todo'" class="cnt">{{ store.incompleteCount }}</span>
        </button>
      </nav>

      <div class="list">
        <p v-if="!store.loaded" class="hint">加载中…</p>
        <p v-else-if="store.filtered.length === 0" class="hint">暂无{{ store.activeType === 'all' ? '' : TYPE_NM[store.activeType] }}，点右上角「新建」。</p>

        <div v-for="it in store.filtered" :key="it.id" class="card" :class="[PRIO_CLASS[it.priority], { done: it.type === 'todo' && it.done }]">
          <button class="check" v-if="it.type === 'todo'" :class="{ on: it.done }"
            @click="store.toggleDone(it.id)"><span v-if="it.done">✓</span></button>
          <button class="check check-memo" v-else></button>
          <div class="body" @click="store.startPreview(it.id)">
            <div class="title">{{ it.title || '(无标题)' }}</div>
            <div class="meta">
              <span class="type" :class="it.type">{{ TYPE_NM[it.type] }}</span>
              <span class="prio"><i class="dot" :style="{ background: PRIO_COLOR[it.priority] }"></i>{{ PRIO_NM[it.priority] }}</span>
              <span v-if="it.reminder" class="time">⏰ {{ fmtTime(it.reminder) }}</span>
              <span class="excerpt" v-if="plainText(it.content)">{{ plainText(it.content) }}</span>
            </div>
          </div>
          <div class="actions">
            <button class="act" title="编辑" @click="store.startEdit(it.id)">✎</button>
            <button class="act del" title="删除" @click="store.remove(it.id)">🗑</button>
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
.todo-app { display: flex; flex-direction: column; height: 100%; position: relative; background: var(--bg-primary); }

/* 顶部 */
.topbar { display: flex; align-items: center; justify-content: space-between; padding: 14px 16px 10px; }
.app-title { font-size: 17px; font-weight: 700; letter-spacing: -0.2px; color: var(--text-primary); }
.top-actions { display: flex; align-items: center; gap: 8px; }
.ghost-btn {
  width: 30px; height: 30px; border: none; border-radius: 9px;
  background: var(--bg-surface); color: var(--text-secondary);
  box-shadow: 0 1px 2px rgba(0,0,0,0.05), inset 0 1px 0 rgba(255,255,255,0.8);
  font-size: 13px; cursor: pointer; display: flex; align-items: center; justify-content: center;
  transition: transform 0.15s, box-shadow 0.15s;
}
.ghost-btn:hover { transform: translateY(-1px); box-shadow: 0 2px 6px rgba(0,0,0,0.08); }
.ghost-btn.on { color: var(--accent); background: var(--accent-bg); }
.mini-bubble { min-width: 14px; height: 14px; border-radius: 999px; font-size: 9px; line-height: 14px; text-align: center; background: var(--text-muted); color: #fff; }
.mini-bubble.on { background: var(--accent); }
.accent-btn { padding: 5px 13px; border: none; border-radius: 9px; background: var(--accent); color: #fff; font-size: 13px; font-weight: 600; cursor: pointer; box-shadow: 0 1px 3px rgba(78,92,212,0.35); transition: transform 0.15s, box-shadow 0.15s; }
.accent-btn:hover { transform: translateY(-1px); box-shadow: 0 4px 10px rgba(78,92,212,0.4); }

/* 分段控件（Apple 式） */
.segmented { display: flex; margin: 2px 16px 10px; background: var(--bg-secondary); border-radius: 10px; padding: 3px; }
.segmented button { flex: 1; padding: 5px 0; border: none; border-radius: 8px; background: transparent; color: var(--text-secondary); font-size: 13px; cursor: pointer; transition: background 0.15s, color 0.15s; }
.segmented button.on { background: var(--bg-surface); color: var(--text-primary); font-weight: 600; box-shadow: 0 1px 3px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.8); }
.cnt { margin-left: 4px; font-size: 11px; color: var(--accent); font-weight: 700; }

/* 列表 */
.list { flex: 1; overflow: auto; padding: 2px 16px 18px; }
.hint { text-align: center; color: var(--text-muted); font-size: 13px; padding: 56px 12px; }

/* Apple 式 3D 卡片：柔和多层阴影 + 顶部高光 + 悬停上浮；参考录屏窗口的"环境辉光"做发光立体 */
.card {
  display: flex; align-items: center; gap: 10px;
  background: linear-gradient(180deg, #ffffff 0%, #fcfcfd 100%);
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 12px 14px; margin-bottom: 9px;
  box-shadow: 0 1px 2px rgba(0,0,0,0.04), 0 6px 14px -4px rgba(0,0,0,0.05), inset 0 1px 0 rgba(255,255,255,0.9);
  transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.2s ease, border-color 0.2s ease, background 0.2s ease;
}
.card:hover { transform: translateY(-3px); }
.card:active { transform: translateY(0) scale(0.995); }

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
.time { color: var(--text-muted); }
.excerpt { color: var(--text-muted); max-width: 45%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.actions { display: flex; gap: 2px; opacity: 0; transition: opacity 0.15s; }
.card:hover .actions { opacity: 1; }
.act { border: none; background: transparent; color: var(--text-muted); cursor: pointer; font-size: 13px; padding: 3px 5px; border-radius: 6px; }
.act:hover { background: var(--bg-hover); color: var(--text-primary); }
.act.del:hover { color: var(--accent); background: var(--accent-bg); }

.editor-wrap { flex: 1; min-height: 0; display: flex; }

.toast { position: absolute; bottom: 18px; left: 50%; transform: translateX(-50%); background: rgba(29,29,31,0.92); color: #fff; padding: 6px 16px; border-radius: 999px; font-size: 12px; box-shadow: var(--shadow-lg); backdrop-filter: blur(8px); }
.fade-enter-active, .fade-leave-active { transition: opacity 0.2s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
