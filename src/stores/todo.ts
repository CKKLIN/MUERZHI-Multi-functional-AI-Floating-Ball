// src/stores/todo.ts
// 待办便签 Pinia store —— 渲染层内存镜像 + 乐观更新；数据真相源在主进程 todo-store.json，
// 所有写操作都经 IPC todo-*，以返回的全量 items 为准刷新本地镜像。
import { defineStore } from 'pinia'
// TodoItem / TodoSettings / TodoType / TodoPriority 声明在 src/env.d.ts（具名导出，非 global）
import type { TodoItem, TodoSettings, TodoType, TodoPriority } from '../env'

export type { TodoItem, TodoSettings, TodoType, TodoPriority }

// 编辑/新建时用的草稿（不含 id/时间戳，由主进程生成）
export interface TodoDraft {
  type: TodoType
  title: string
  content: string
  priority: TodoPriority
  reminder: string | null
  done: boolean
}

interface TodoState {
  items: TodoItem[]
  loaded: boolean
  settings: TodoSettings
  /** 当前正在编辑的 id；'' = 不编辑（列表/预览态） */
  editingId: string
  /** 当前正在预览（只读详情）的 id；'' = 无预览。点击卡片进入，编辑/新建用 editingId */
  previewId: string
  /** 空=全部，'todo'='待办', 'memo'='备忘录' */
  activeType: 'all' | TodoType
  toast: string
}

export const useTodoStore = defineStore('todo', {
  state: (): TodoState => ({
    items: [],
    loaded: false,
    settings: { badgeVisible: true, windowAlwaysOnTop: true },
    editingId: '',
    previewId: '',
    activeType: 'all',
    toast: '',
  }),

  getters: {
    filtered(state): TodoItem[] {
      const list = state.activeType === 'all'
        ? state.items
        : state.items.filter(i => i.type === state.activeType)
      // 排序：未完成置前 → 优先级(urgent>high>medium>low) → 更新时间倒序；备忘录统一排在后面
      const prioRank = { urgent: 0, high: 1, medium: 2, low: 3 }
      return [...list].sort((a, b) => {
        if (a.type !== b.type) return a.type === 'todo' ? -1 : 1
        const aOpen = a.type === 'todo' ? !a.done : true
        const bOpen = b.type === 'todo' ? !b.done : true
        if (aOpen !== bOpen) return aOpen ? -1 : 1
        if (prioRank[a.priority] !== prioRank[b.priority]) return prioRank[a.priority] - prioRank[b.priority]
        return b.updatedAt - a.updatedAt
      })
    },
    incompleteCount(state): number {
      return state.items.filter(i => i.type === 'todo' && !i.done).length
    },
    editingItem(state): TodoItem | null {
      return state.items.find(i => i.id === state.editingId) ?? null
    },
    previewItem(state): TodoItem | null {
      return state.items.find(i => i.id === state.previewId) ?? null
    },
  },

  actions: {
    async load() {
      try {
        this.items = (await window.electronAPI.todoGet()) ?? []
      } finally {
        this.loaded = true
      }
      this.settings = await window.electronAPI.todoGetSettings()
    },

    toastMsg(msg: string) {
      this.toast = msg
      setTimeout(() => { if (this.toast === msg) this.toast = '' }, 2000)
    },

    async create(draft: TodoDraft) {
      const items = await window.electronAPI.todoCreate(draft)
      this.items = items
      this.editingId = ''
    },

    async update(id: string, draft: TodoDraft) {
      const items = await window.electronAPI.todoUpdate(id, draft)
      this.items = items
      this.editingId = ''
    },

    async remove(id: string) {
      this.items = await window.electronAPI.todoDelete(id)
    },

    async toggleDone(id: string) {
      this.items = await window.electronAPI.todoToggleDone(id)
    },

    startEdit(id: string) { this.editingId = id },
    startCreate() { this.editingId = '__new__'; this.previewId = '' },
    closeEditor() { this.editingId = '' },
    isNew() { return this.editingId === '__new__' },

    startPreview(id: string) { this.previewId = id; this.editingId = '' },
    closePreview() { this.previewId = '' },

    async setBadgeVisible(v: boolean) {
      this.settings = await window.electronAPI.todoSetSettings({ badgeVisible: v })
    },
    async setWindowAlwaysOnTop(v: boolean) {
      this.settings = await window.electronAPI.todoSetSettings({ windowAlwaysOnTop: v })
    },
  },
})
