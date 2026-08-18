<script setup lang="ts">
// TodoPreview.vue —— 只读详情：点卡片进入的"预览"，可看完整图文但不能编辑。
// 只有右上角「编辑」按钮才切换到可编辑的 TodoEditor。
import { computed } from 'vue'
import { useTodoStore } from '../stores/todo'

const store = useTodoStore()
const it = computed(() => store.previewItem)

const PRIO_NM = { urgent: '紧急', high: '高', medium: '中', low: '低' } as const
const PRIO_COLOR = { urgent: '#f97316', high: '#f59e0b', medium: '#60a5fa', low: '#b0b0b8' } as const
const TYPE_NM = { todo: '待办', memo: '备忘' } as const

function fmtTime(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

// 创建时间（epoch ms）
function fmtCreated(ms: number): string {
  const d = new Date(ms)
  if (isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

// 富文本 → 纯文本（无标题，正文即内容；标题行取正文首行）
function plainText(html: string): string {
  const el = document.createElement('div')
  el.innerHTML = html || ''
  return (el.textContent || '').replace(/\s+/g, ' ').trim()
}
const headingText = computed(() => {
  const cur = it.value
  if (!cur) return ''
  if (cur.type === 'memo') return cur.title || '(无标题)'
  return plainText(cur.content).slice(0, 60) || '(无内容)'
})

</script>

<template>
  <div class="preview" v-if="it">
    <div class="pv-scroll">
      <div class="pv-card">
        <div class="pv-head">
          <button v-if="it.type === 'todo'" class="check" :class="{ on: it.done }"
            @click="store.toggleDone(it.id)"><span v-if="it.done">✓</span></button>
          <h2 class="pv-heading" :class="{ struck: it.type === 'todo' && it.done }">
            {{ headingText || '(无内容)' }}
          </h2>
        </div>

        <div class="pv-meta">
          <span class="type" :class="it.type">{{ TYPE_NM[it.type] }}</span>
          <span class="prio"><i class="dot" :style="{ background: PRIO_COLOR[it.priority] }"></i>{{ PRIO_NM[it.priority] }}</span>
          <span>{{ fmtCreated(it.createdAt) }}</span>
          <span v-if="it.reminder">提醒 {{ fmtTime(it.reminder) }}</span>
        </div>

        <div class="pv-body" v-if="it.content" v-html="it.content"></div>
        <p class="pv-empty" v-else>（无正文内容）</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.preview { display: flex; flex-direction: column; height: 100%; width: 100%; min-width: 0; }

/* 滚动区占满剩余空间；卡片自适应宽高（内容多时随卡片滚动） */
.pv-scroll { flex: 1; min-height: 0; min-width: 0; overflow: auto; padding: 6px 16px 16px; }
.pv-card {
  width: 100%;
  min-width: 0;
  min-height: 100%;
  background: linear-gradient(180deg, #ffffff 0%, #fcfcfd 100%);
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 14px 16px;
  box-shadow: 0 1px 2px rgba(0,0,0,0.04), 0 8px 20px -6px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.9);
}
.pv-head { display: flex; align-items: center; gap: 10px; }
.check { width: 22px; height: 22px; border-radius: 11px; border: 1.5px solid var(--border-light); background: var(--bg-surface); display: flex; align-items: center; justify-content: center; cursor: pointer; flex-shrink: 0; color: #fff; font-size: 13px; }
.check.on { background: var(--accent); border-color: var(--accent); }
.pv-heading { font-size: 18px; font-weight: 700; letter-spacing: -0.3px; color: var(--text-primary); }
.pv-heading.struck { text-decoration: line-through; color: var(--text-muted); }

.pv-meta { display: flex; align-items: center; gap: 10px; margin-top: 8px; font-size: 12px; color: var(--text-muted); }
.type { padding: 1px 7px; border-radius: 5px; font-size: 11px; }
.type.todo { background: var(--info-bg); color: var(--info); }
.type.memo { background: var(--warning-bg); color: var(--warning); }
.prio { display: inline-flex; align-items: center; gap: 5px; }
.prio .dot { width: 8px; height: 8px; border-radius: 50%; }

.pv-body { margin-top: 14px; font-size: 14px; line-height: 1.6; color: var(--text-secondary); }
.pv-body :deep(img) { max-width: 100%; border-radius: 10px; }
.pv-body :deep(p) { margin: 0 0 8px; }
.pv-body :deep(h1), .pv-body :deep(h2), .pv-body :deep(h3) { color: var(--text-primary); }
.pv-body :deep(blockquote) { margin: 8px 0; padding-left: 10px; border-left: 3px solid var(--border-light); color: var(--text-muted); }
.pv-empty { margin-top: 14px; color: var(--text-muted); font-size: 13px; }
</style>
