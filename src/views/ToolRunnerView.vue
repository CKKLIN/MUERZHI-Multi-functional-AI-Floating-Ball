<script setup lang="ts">
// src/views/ToolRunnerView.vue
// 自定义工具多标签运行宿主窗口：所有从工具箱打开的小工具共用本窗口，统一样式与 Layout
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import Layout from '../components/Layout.vue'
import type { CustomToolItem } from '../env.d.ts'

interface ToolTab {
  id: string
  name: string
  icon?: string | null
  relativePath: string
  toolUrl: string
  refreshKey: number
}

const tabs = ref<ToolTab[]>([])
const activeTabId = ref<string>('')
let removeListener: (() => void) | null = null

const activeTab = computed(() => tabs.value.find((t) => t.id === activeTabId.value))

function computeToolUrl(tool: CustomToolItem): string {
  if (tool.toolUrl && (tool.toolUrl.startsWith('http://') || tool.toolUrl.startsWith('https://'))) {
    return tool.toolUrl
  }
  const clean = tool.relativePath.replace(/\\/g, '/')
  const encoded = clean
    .split('/')
    .map((s) => encodeURIComponent(s))
    .join('/')
  return `http://127.0.0.1:60000/custom-tool/${encoded}`
}

function addOrSwitchTab(tool: CustomToolItem) {
  if (!tool || !tool.id) return
  const existing = tabs.value.find((t) => t.id === tool.id)
  if (existing) {
    activeTabId.value = existing.id
  } else {
    const newTab: ToolTab = {
      id: tool.id,
      name: tool.name || tool.fileName,
      icon: tool.icon,
      relativePath: tool.relativePath,
      toolUrl: computeToolUrl(tool),
      refreshKey: Date.now(),
    }
    tabs.value.push(newTab)
    activeTabId.value = newTab.id
  }
  updateWindowTitle()
}

function switchTab(id: string) {
  activeTabId.value = id
  updateWindowTitle()
}

function closeTab(id: string, e?: MouseEvent) {
  if (e) e.stopPropagation()
  const idx = tabs.value.findIndex((t) => t.id === id)
  if (idx < 0) return

  const isCurrent = activeTabId.value === id
  tabs.value.splice(idx, 1)

  if (isCurrent) {
    if (tabs.value.length > 0) {
      const nextIdx = Math.min(idx, tabs.value.length - 1)
      activeTabId.value = tabs.value[nextIdx].id
    } else {
      activeTabId.value = ''
    }
  }
  updateWindowTitle()
}

function refreshCurrentTab() {
  if (!activeTab.value) return
  const iframe = document.getElementById(`iframe-${activeTab.value.id}`) as HTMLIFrameElement | null
  if (iframe) {
    const src = iframe.src
    iframe.src = ''
    nextTick(() => {
      iframe.src = src
    })
  }
}

async function openInBrowser() {
  if (!activeTab.value) return
  try {
    await window.muerzhiAPI.openCustomToolInBrowser(activeTab.value.relativePath)
  } catch (e) {
    console.error('openInBrowser error:', e)
  }
}

async function openToolsWindow() {
  try {
    await window.muerzhiAPI.showToolsWindow()
  } catch (e) {
    console.error('openToolsWindow error:', e)
  }
}

function updateWindowTitle() {
  if (activeTab.value) {
    document.title = `${activeTab.value.name} - 小工具`
  } else {
    document.title = '自定义工具箱'
  }
}

const handleWindowFocus = async () => {
  try {
    const latestTool = await window.muerzhiAPI?.getInitialToolTab?.()
    if (latestTool && latestTool.id && latestTool.id !== activeTabId.value) {
      addOrSwitchTab(latestTool)
    }
  } catch (e) {
    console.error('handleWindowFocus failed:', e)
  }
}

onMounted(async () => {
  // 1. 注册新打开标签的全局事件监听
  if (window.muerzhiAPI?.onOpenToolTab) {
    removeListener = window.muerzhiAPI.onOpenToolTab((tool: CustomToolItem) => {
      if (tool) {
        addOrSwitchTab(tool)
      }
    })
  }

  // 2. 窗口重获焦点时检测是否有新工具请求打开
  window.addEventListener('focus', handleWindowFocus)

  // 3. 检查是否有首次启动传来的待打开工具
  try {
    const initialTool = await window.muerzhiAPI?.getInitialToolTab?.()
    if (initialTool) {
      addOrSwitchTab(initialTool)
    }
  } catch (e) {
    console.error('getInitialToolTab failed:', e)
  }
})

onUnmounted(() => {
  if (removeListener) {
    removeListener()
    removeListener = null
  }
  window.removeEventListener('focus', handleWindowFocus)
})
</script>

<template>
  <Layout title="小工具">
    <!-- 顶栏中部：多标签切换栏 -->
    <template #center>
      <div class="tabs-scroll-area" data-tauri-drag-region style="-webkit-app-region: drag">
        <div class="tabs-container" data-tauri-drag-region style="-webkit-app-region: drag">
          <div
            v-for="tab in tabs"
            :key="tab.id"
            class="runner-tab"
            :class="{ active: tab.id === activeTabId }"
            @click="switchTab(tab.id)"
            :title="tab.name"
            style="-webkit-app-region: no-drag"
          >
            <!-- 图标 -->
            <span v-if="tab.icon" class="tab-icon-emoji">{{ tab.icon }}</span>
            <svg v-else class="tab-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="16 18 22 12 16 6"></polyline>
              <polyline points="8 6 2 12 8 18"></polyline>
            </svg>

            <!-- 标题 -->
            <span class="tab-title">{{ tab.name }}</span>

            <!-- 关闭按钮 -->
            <button
              class="tab-close-btn"
              @click.stop="closeTab(tab.id, $event)"
              title="关闭标签"
            >
              <svg width="8" height="8" viewBox="0 0 10 10">
                <line x1="1" y1="1" x2="9" y2="9" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
                <line x1="9" y1="1" x2="1" y2="9" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </template>

    <!-- 顶栏右侧辅助操作按钮 -->
    <template #actions>
      <div class="tool-controls" style="-webkit-app-region: no-drag">
        <button
          class="tool-btn"
          title="刷新当前工具"
          :disabled="!activeTab"
          @click="refreshCurrentTab"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/>
          </svg>
        </button>
        <button
          class="tool-btn"
          title="在默认浏览器中打开"
          :disabled="!activeTab"
          @click="openInBrowser"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="2" y1="12" x2="22" y2="12"></line>
            <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
          </svg>
        </button>
        <button
          class="tool-btn highlight"
          title="打开工具箱面板"
          @click="openToolsWindow"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
          </svg>
          <span class="btn-text">工具箱</span>
        </button>
      </div>
    </template>

    <!-- 窗口主体内容区 -->
    <div class="runner-content">
      <!-- 空状态 -->
      <div v-if="tabs.length === 0" class="runner-empty">
        <div class="empty-icon-circle">
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="16 18 22 12 16 6"></polyline>
            <polyline points="8 6 2 12 8 18"></polyline>
          </svg>
        </div>
        <h3 class="empty-title">当前没有打开的工具</h3>
        <p class="empty-desc">在自定义工具箱中点击任意工具卡片，即可在此多标签页中同时运行与随时切换</p>
        <button class="empty-action-btn" @click="openToolsWindow">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
          </svg>
          前往小工具箱
        </button>
      </div>

      <!-- 多工具 iframe 保活容器（v-show 保证切换时不销毁 DOM、不丢用户输入状态） -->
      <div v-else class="iframes-wrapper">
        <iframe
          v-for="tab in tabs"
          :key="tab.id"
          :id="`iframe-${tab.id}`"
          v-show="tab.id === activeTabId"
          :src="tab.toolUrl"
          class="tool-frame"
          allow="camera; microphone; display-capture; clipboard-read; clipboard-write; autoplay; fullscreen"
        />
      </div>
    </div>
  </Layout>
</template>

<style scoped>
/* 标签滑动区 */
.tabs-scroll-area {
  flex: 1;
  min-width: 0;
  height: 100%;
  overflow-x: auto;
  overflow-y: hidden;
  display: flex;
  align-items: flex-end;
}
.tabs-scroll-area::-webkit-scrollbar {
  display: none;
}

.tabs-container {
  display: flex;
  align-items: flex-end;
  gap: 3px;
  height: 100%;
  padding-bottom: 0px;
}

/* 单个 Tab 标签：与顶栏无缝契合的高级现代标签 */
.runner-tab {
  height: 27px;
  max-width: 160px;
  min-width: 90px;
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 0 8px 0 10px;
  background: rgba(255, 255, 255, 0.45);
  border-radius: 6px 6px 0 0;
  border: 1px solid transparent;
  border-bottom: none;
  cursor: pointer;
  color: var(--text-secondary);
  font-size: 11px;
  font-weight: 500;
  transition: all 0.15s ease;
  position: relative;
  user-select: none;
}

.runner-tab:hover {
  background: rgba(255, 255, 255, 0.8);
  color: var(--text-primary);
}

.runner-tab.active {
  background: var(--bg-surface, #ffffff);
  color: var(--accent);
  font-weight: 600;
  border-color: var(--border);
  border-bottom: 1px solid var(--bg-surface, #ffffff);
  margin-bottom: -1px;
  box-shadow: 0 -1px 3px rgba(0, 0, 0, 0.03);
}

.runner-tab.active::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: var(--accent);
  border-radius: 6px 6px 0 0;
}

.tab-icon-emoji {
  font-size: 13px;
  line-height: 1;
}

.tab-icon-svg {
  width: 12px;
  height: 12px;
  color: var(--accent);
  flex-shrink: 0;
}

.tab-title {
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.tab-close-btn {
  width: 15px;
  height: 15px;
  border-radius: 3px;
  border: none;
  background: transparent;
  color: var(--text-muted);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  opacity: 0.6;
  transition: all 0.15s ease;
  flex-shrink: 0;
}

.tab-close-btn:hover {
  background: rgba(0, 0, 0, 0.08);
  color: #d33;
  opacity: 1;
}

/* 顶栏右侧辅助操作按钮组 */
.tool-controls {
  display: flex;
  align-items: center;
  gap: 4px;
}

.tool-btn {
  height: 22px;
  padding: 0 6px;
  border-radius: 5px;
  border: 1px solid var(--border);
  background: var(--bg-surface);
  color: var(--text-secondary);
  display: inline-flex;
  align-items: center;
  gap: 3px;
  cursor: pointer;
  font-size: 11px;
  font-weight: 500;
  transition: all 0.15s ease;
}

.tool-btn:hover:not(:disabled) {
  background: #ffffff;
  color: var(--text-primary);
  border-color: var(--border-light);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.tool-btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.tool-btn.highlight {
  background: var(--accent-bg);
  border-color: rgba(162, 123, 92, 0.25);
  color: var(--accent);
  font-weight: 600;
}

.tool-btn.highlight:hover {
  background: rgba(162, 123, 92, 0.2);
  border-color: var(--accent);
}

.btn-text {
  font-size: 11px;
}

/* 主体容器 */
.runner-content {
  flex: 1;
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--bg-surface, #ffffff);
  position: relative;
}

.iframes-wrapper {
  width: 100%;
  height: 100%;
  position: relative;
}

.tool-frame {
  width: 100%;
  height: 100%;
  border: none;
  background: #ffffff;
  position: absolute;
  top: 0;
  left: 0;
}

/* 空状态 */
.runner-empty {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  text-align: center;
  background: var(--bg-surface, #ffffff);
}

.empty-icon-circle {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: var(--accent-bg);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 14px;
}

.empty-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 6px;
}

.empty-desc {
  font-size: 12px;
  color: var(--text-secondary);
  max-width: 280px;
  line-height: 1.6;
  margin-bottom: 20px;
}

.empty-action-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 16px;
  background: var(--accent);
  color: #ffffff;
  border: none;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.18s ease;
  box-shadow: 0 2px 6px rgba(162, 123, 92, 0.25);
}

.empty-action-btn:hover {
  background: var(--accent-hover);
  transform: translateY(-1px);
  box-shadow: 0 4px 10px rgba(162, 123, 92, 0.35);
}
</style>

<!-- 自定义工具箱整体配色：温暖莫兰迪落日暖木色调，保持与工具箱完全统一 -->
<style>
:root {
  --bg-primary: #f5f5f7;
  --bg-secondary: #efeff1;
  --bg-surface: #ffffff;
  --bg-hover: #e8e8ed;
  --bg-input: #f5f5f7;
  --text-primary: #1d1d1f;
  --text-secondary: #56565c;
  --text-muted: #8d8d93;
  --accent: #A27B5C;           /* 莫兰迪暖赭落日木 */
  --accent-hover: #8e684a;
  --accent-bg: rgba(162, 123, 92, 0.12);
  --border: #eaeaef;
  --border-light: #d4d4d9;
}
</style>
