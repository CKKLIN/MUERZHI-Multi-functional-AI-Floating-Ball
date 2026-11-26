<script setup lang="ts">
// ToolsApp.vue —— 自定义工具箱主面板
// 像应用商店/桌面软件一样的展示方式，点击直接启动并聚合在多标签窗口中
import { ref, computed, onMounted, onUnmounted } from 'vue'
import type { CustomToolItem } from '../env.d.ts'
import { t } from '../stores/i18n'

const tools = ref<CustomToolItem[]>([])
const loading = ref(true)
const searchQuery = ref('')
const refreshing = ref(false)

// 选中的工具操作菜单 ID
const activeMenuId = ref<string | null>(null)

// 是否展示使用指南弹窗
const showHelpModal = ref(false)

// 格式化文件大小
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

// 格式化时间戳
function formatTime(epochSec: number): string {
  if (!epochSec) return ''
  const d = new Date(epochSec * 1000)
  const pad = (n: number) => String(n).padStart(2, '0')
  const y = d.getFullYear()
  const m = pad(d.getMonth() + 1)
  const day = pad(d.getDate())
  return `${y}-${m}-${day}`
}

// 加载工具列表
async function loadTools() {
  refreshing.value = true
  try {
    const list = await window.muerzhiAPI.listCustomTools()
    tools.value = list || []
  } catch (e) {
    console.error('[ToolsApp] loadTools failed:', e)
  } finally {
    loading.value = false
    refreshing.value = false
  }
}

// 打开工具目录
async function openToolsDir() {
  try {
    await window.muerzhiAPI.openCustomToolsDir()
  } catch (e) {
    console.error('[ToolsApp] openToolsDir failed:', e)
  }
}

// 启动工具（像软件一样点击即开，进入共用多标签窗口）
async function launchTool(item: CustomToolItem) {
  closeMenu()
  try {
    await window.muerzhiAPI.openCustomTool(item.relativePath)
  } catch (e) {
    console.error('[ToolsApp] launchTool failed:', e)
  }
}

// 在默认浏览器中打开
async function openInBrowser(item: CustomToolItem, e?: MouseEvent) {
  if (e) e.stopPropagation()
  closeMenu()
  try {
    await window.muerzhiAPI.openCustomToolInBrowser(item.relativePath)
  } catch (e) {
    console.error('[ToolsApp] openInBrowser failed:', e)
  }
}

// 打开所在文件目录并选中
async function locateFile(item: CustomToolItem, e?: MouseEvent) {
  if (e) e.stopPropagation()
  closeMenu()
  try {
    await window.muerzhiAPI.locateCustomTool(item.relativePath)
  } catch (e) {
    console.error('[ToolsApp] locateFile failed:', e)
  }
}

// 生成示例小工具
async function createDemoTool() {
  try {
    await window.muerzhiAPI.createDemoCustomTool()
    await loadTools()
  } catch (e) {
    console.error('[ToolsApp] createDemoTool failed:', e)
  }
}

// 删除工具
async function deleteTool(item: CustomToolItem, e?: MouseEvent) {
  if (e) e.stopPropagation()
  closeMenu()
  const confirmed = window.confirm(t('customTools.deleteConfirm'))
  if (!confirmed) return

  try {
    await window.muerzhiAPI.deleteCustomTool(item.relativePath)
    await loadTools()
  } catch (e) {
    console.error('[ToolsApp] deleteTool failed:', e)
  }
}

function toggleMenu(id: string, e: MouseEvent) {
  e.stopPropagation()
  activeMenuId.value = activeMenuId.value === id ? null : id
}

function closeMenu() {
  activeMenuId.value = null
}

// 搜索过滤
const filteredTools = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return tools.value
  return tools.value.filter((item) => {
    return (
      item.name.toLowerCase().includes(q) ||
      item.fileName.toLowerCase().includes(q) ||
      (item.description && item.description.toLowerCase().includes(q))
    )
  })
})

function onWindowFocus() {
  loadTools()
}

onMounted(() => {
  loadTools()
  window.addEventListener('focus', onWindowFocus)
  document.addEventListener('click', closeMenu)
})

onUnmounted(() => {
  window.removeEventListener('focus', onWindowFocus)
  document.removeEventListener('click', closeMenu)
})
</script>

<template>
  <div class="tools-container" @click="closeMenu">
    <!-- 顶栏操作区 -->
    <header class="tools-header" data-tauri-drag-region>
      <div class="header-left">
        <div class="header-title-box">
          <h2 class="tools-title">{{ t('customTools.title') }}</h2>
          <span class="tools-badge" v-if="tools.length > 0">{{ tools.length }}</span>
        </div>
      </div>

      <div class="header-actions">
        <!-- 搜索输入框 -->
        <div class="search-box">
          <svg class="search-icon" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clip-rule="evenodd" />
          </svg>
          <input
            v-model="searchQuery"
            type="text"
            class="search-input"
            :placeholder="t('customTools.search')"
          />
          <button v-if="searchQuery" class="clear-search" @click="searchQuery = ''">×</button>
        </div>

        <!-- 使用指南按钮（引导用户） -->
        <button
          class="action-btn guide-btn"
          :title="t('customTools.help')"
          @click.stop="showHelpModal = true"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
            <line x1="12" y1="17" x2="12.01" y2="17"></line>
          </svg>
          <span>{{ t('customTools.help') }}</span>
        </button>

        <!-- 刷新按钮 -->
        <button
          class="action-btn icon-btn"
          :class="{ rotating: refreshing }"
          :title="t('customTools.refresh')"
          @click="loadTools"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/>
          </svg>
        </button>

        <!-- 打开文件夹按钮 -->
        <button
          class="action-btn highlight-btn"
          :title="t('customTools.openDir')"
          @click="openToolsDir"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
          </svg>
          <span>{{ t('customTools.openDir') }}</span>
        </button>
      </div>
    </header>

    <!-- 主体工具展示区 -->
    <main class="tools-main">
      <!-- 空状态引导 -->
      <div v-if="!loading && tools.length === 0" class="empty-state">
        <div class="empty-icon-wrap">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#A27B5C" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
          </svg>
        </div>
        <h3 class="empty-title">{{ t('customTools.emptyTitle') }}</h3>
        <p class="empty-desc">{{ t('customTools.emptyDesc') }}</p>
        <div class="empty-actions">
          <button class="primary-btn" @click="openToolsDir">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
            </svg>
            {{ t('customTools.openDir') }}
          </button>
          <button class="secondary-btn" @click="createDemoTool">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            {{ t('customTools.createDemo') }}
          </button>
          <button class="text-link-btn" @click.stop="showHelpModal = true">
            查看使用指南 →
          </button>
        </div>
      </div>

      <!-- 搜索无结果 -->
      <div v-else-if="!loading && filteredTools.length === 0" class="no-result">
        <p>未找到匹配的工具应用</p>
      </div>

      <!-- 像软件一样的桌面应用卡片网格（点击卡片即启动） -->
      <div v-else class="app-grid">
        <div
          v-for="item in filteredTools"
          :key="item.id"
          class="app-card"
          @click="launchTool(item)"
          :title="`${item.name}\n${item.description || item.fileName}\n大小: ${formatFileSize(item.fileSize)}`"
        >
          <!-- 卡片右上角管理按钮 -->
          <button
            class="app-more-btn"
            title="更多管理选项"
            @click.stop="toggleMenu(item.id, $event)"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
              <circle cx="12" cy="12" r="2.2"></circle>
              <circle cx="6" cy="12" r="2.2"></circle>
              <circle cx="18" cy="12" r="2.2"></circle>
            </svg>
          </button>

          <!-- 弹出操作菜单 -->
          <div v-if="activeMenuId === item.id" class="dropdown-menu" @click.stop>
            <button class="dropdown-item" @click="locateFile(item, $event)">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
              </svg>
              <span>{{ t('customTools.locateFile') }}</span>
            </button>
            <button class="dropdown-item" @click="openInBrowser(item, $event)">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="2" y1="12" x2="22" y2="12"></line>
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
              </svg>
              <span>{{ t('customTools.openInBrowser') }}</span>
            </button>
            <div class="dropdown-divider"></div>
            <button class="dropdown-item danger" @click="deleteTool(item, $event)">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
              <span>{{ t('customTools.delete') }}</span>
            </button>
          </div>

          <!-- 软件图标容器 -->
          <div class="app-icon-wrapper">
            <div class="app-icon-bg">
              <span v-if="item.icon" class="app-emoji">{{ item.icon }}</span>
              <svg v-else class="app-default-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="16 18 22 12 16 6"></polyline>
                <polyline points="8 6 2 12 8 18"></polyline>
              </svg>
            </div>
          </div>

          <!-- 软件名称（纯净桌面软件图标式） -->
          <h4 class="app-name">{{ item.name }}</h4>
        </div>
      </div>
    </main>

    <!-- 使用指南 Modal 弹窗 -->
    <div v-if="showHelpModal" class="guide-modal-overlay" @click.self="showHelpModal = false">
      <div class="guide-modal-content">
        <div class="modal-header">
          <div class="modal-title-row">
            <div class="modal-icon-badge">💡</div>
            <h3>{{ t('customTools.helpTitle') }}</h3>
          </div>
          <button class="modal-close-btn" @click="showHelpModal = false">×</button>
        </div>

        <div class="modal-body">
          <p class="modal-intro">
            自定义工具箱允许你把任何喜欢的网页、计算器、实用组件或小游戏，无缝转变为桌面独立运行的软件小工具。
          </p>

          <div class="guide-steps">
            <div class="guide-step-card">
              <div class="step-num">1</div>
              <div class="step-content">
                <h4>{{ t('customTools.helpStep1Title') }}</h4>
                <p>{{ t('customTools.helpStep1Desc') }}</p>
              </div>
            </div>

            <div class="guide-step-card">
              <div class="step-num">2</div>
              <div class="step-content">
                <h4>{{ t('customTools.helpStep2Title') }}</h4>
                <p>{{ t('customTools.helpStep2Desc') }}</p>
              </div>
            </div>

            <div class="guide-step-card">
              <div class="step-num">3</div>
              <div class="step-content">
                <h4>{{ t('customTools.helpStep3Title') }}</h4>
                <p>{{ t('customTools.helpStep3Desc') }}</p>
                <div class="code-snippet">
                  <code>&lt;title&gt;工具名称&lt;/title&gt;<br>&lt;meta name="icon" content="🚀"&gt;<br>&lt;meta name="description" content="工具简介"&gt;</code>
                </div>
              </div>
            </div>

            <div class="guide-step-card">
              <div class="step-num">4</div>
              <div class="step-content">
                <h4>{{ t('customTools.helpStep4Title') }}</h4>
                <p>{{ t('customTools.helpStep4Desc') }}</p>
              </div>
            </div>
          </div>
        </div>

        <div class="modal-footer">
          <button class="footer-btn highlight" @click="openToolsDir">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
            </svg>
            打开工具目录
          </button>
          <button class="footer-btn secondary" @click="createDemoTool">
            生成示例工具体验
          </button>
          <button class="footer-btn close" @click="showHelpModal = false">
            我知道了
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.tools-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  background: #fafafc;
  color: #1d1d1f;
  overflow: hidden;
  position: relative;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
}

/* 顶栏 */
.tools-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  background: #ffffff;
  border-bottom: 1px solid #eaeaea;
  gap: 8px;
  flex-shrink: 0;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
}

.header-left {
  display: flex;
  align-items: center;
}

.header-title-box {
  display: flex;
  align-items: center;
  gap: 8px;
}

.tools-title {
  font-size: 16px;
  font-weight: 700;
  color: #2b231d;
  letter-spacing: -0.2px;
}

.tools-badge {
  background: rgba(162, 123, 92, 0.14);
  color: #8b5e3c;
  font-size: 11px;
  font-weight: 700;
  padding: 2px 7px;
  border-radius: 999px;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

/* 搜索框 */
.search-box {
  position: relative;
  display: flex;
  align-items: center;
}

.search-icon {
  position: absolute;
  left: 9px;
  width: 14px;
  height: 14px;
  color: #92929a;
  pointer-events: none;
}

.search-input {
  width: 100px;
  height: 28px;
  padding: 0 22px 0 26px;
  font-size: 12px;
  background: #f2f2f5;
  border: 1px solid transparent;
  border-radius: 8px;
  color: #1d1d1f;
  outline: none;
  transition: all 0.2s ease;
}

.search-input:focus {
  width: 130px;
  background: #ffffff;
  border-color: #a27b5c;
  box-shadow: 0 0 0 2px rgba(162, 123, 92, 0.15);
}

.clear-search {
  position: absolute;
  right: 6px;
  background: none;
  border: none;
  color: #888;
  cursor: pointer;
  font-size: 14px;
}

/* 顶栏操作按钮 */
.action-btn {
  height: 30px;
  padding: 0 10px;
  border-radius: 8px;
  border: 1px solid #e2e2e6;
  background: #ffffff;
  color: #4a4a50;
  font-size: 12px;
  font-weight: 500;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  cursor: pointer;
  transition: all 0.18s ease;
}

.action-btn:hover {
  background: #f7f7fa;
  color: #1d1d1f;
  border-color: #d0d0d6;
}

.action-btn.icon-btn {
  padding: 0 8px;
}

.action-btn.guide-btn {
  background: rgba(162, 123, 92, 0.08);
  border-color: rgba(162, 123, 92, 0.25);
  color: #8b5e3c;
  font-weight: 600;
}

.action-btn.guide-btn:hover {
  background: rgba(162, 123, 92, 0.16);
  border-color: #a27b5c;
}

.action-btn.highlight-btn {
  background: #a27b5c;
  border-color: #a27b5c;
  color: #ffffff;
  font-weight: 600;
}

.action-btn.highlight-btn:hover {
  background: #8e684a;
  border-color: #8e684a;
  box-shadow: 0 2px 6px rgba(162, 123, 92, 0.25);
}

.rotating svg {
  animation: spin 0.8s linear infinite;
}
@keyframes spin {
  100% { transform: rotate(360deg); }
}

/* 主体区域 */
.tools-main {
  flex: 1;
  padding: 20px;
  overflow-y: auto;
}

/* 像桌面软件一样的应用网格（小巧紧凑、桌面图标式） */
.app-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(84px, 1fr));
  gap: 16px 10px;
  align-items: start;
  justify-items: center;
}

/* 软件图标单项（点开即用） */
.app-card {
  position: relative;
  width: 84px;
  padding: 8px 4px 6px;
  border-radius: 12px;
  border: 1px solid transparent;
  background: transparent;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  cursor: pointer;
  transition: all 0.18s cubic-bezier(0.4, 0, 0.2, 1);
  user-select: none;
}

.app-card:hover {
  background: rgba(0, 0, 0, 0.045);
  transform: translateY(-2px);
}

.app-card:active {
  transform: scale(0.96);
}

/* 右上角更多操作按钮（悬浮出现） */
.app-more-btn {
  position: absolute;
  top: 0px;
  right: 0px;
  width: 18px;
  height: 18px;
  border-radius: 5px;
  border: none;
  background: transparent;
  color: #7c7c86;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  opacity: 0;
  transition: all 0.15s ease;
  z-index: 2;
}

.app-card:hover .app-more-btn {
  opacity: 1;
}

.app-more-btn:hover {
  background: rgba(0, 0, 0, 0.08);
  color: #1d1d1f;
}

/* 软件图标包装 */
.app-icon-wrapper {
  position: relative;
  margin-bottom: 6px;
}

.app-icon-bg {
  width: 50px;
  height: 50px;
  border-radius: 13px;
  background: linear-gradient(135deg, #ffffff 0%, #f6f0eb 100%);
  border: 1px solid rgba(162, 123, 92, 0.22);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 3px 8px rgba(162, 123, 92, 0.12), 0 1px 2px rgba(0, 0, 0, 0.04);
  transition: all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.app-card:hover .app-icon-bg {
  transform: scale(1.08);
  border-color: #a27b5c;
  box-shadow: 0 6px 16px rgba(162, 123, 92, 0.24);
}

.app-emoji {
  font-size: 26px;
  line-height: 1;
}

.app-default-svg {
  width: 22px;
  height: 22px;
  color: #a27b5c;
}

/* 软件名称（最多两行、居中） */
.app-name {
  font-size: 11.5px;
  font-weight: 500;
  color: #2b2b32;
  line-height: 1.3;
  width: 100%;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  word-break: break-all;
  padding: 0 2px;
  margin: 0;
  transition: color 0.15s ease;
}

.app-card:hover .app-name {
  color: #8b5e3c;
  font-weight: 600;
}

/* 下拉菜单 */
.dropdown-menu {
  position: absolute;
  top: 32px;
  right: 6px;
  background: #ffffff;
  border-radius: 10px;
  border: 1px solid #e8e8ed;
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.12);
  padding: 4px;
  min-width: 130px;
  z-index: 100;
  text-align: left;
}

.dropdown-item {
  width: 100%;
  padding: 6px 8px;
  font-size: 12px;
  border: none;
  background: transparent;
  color: #333338;
  display: flex;
  align-items: center;
  gap: 7px;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.15s ease;
}

.dropdown-item:hover {
  background: #f4f4f7;
  color: #1d1d1f;
}

.dropdown-item.danger {
  color: #e53e3e;
}

.dropdown-item.danger:hover {
  background: #fff5f5;
}

.dropdown-divider {
  height: 1px;
  background: #ebebee;
  margin: 4px 0;
}

/* 空状态 */
.empty-state {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  text-align: center;
}

.empty-icon-wrap {
  width: 72px;
  height: 72px;
  border-radius: 20px;
  background: rgba(162, 123, 92, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 16px;
}

.empty-title {
  font-size: 16px;
  font-weight: 600;
  color: #1d1d1f;
  margin-bottom: 8px;
}

.empty-desc {
  font-size: 13px;
  color: #7b7b84;
  max-width: 360px;
  line-height: 1.5;
  margin-bottom: 20px;
}

.empty-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  justify-content: center;
}

.primary-btn {
  height: 36px;
  padding: 0 16px;
  border-radius: 8px;
  background: #a27b5c;
  color: #fff;
  border: none;
  font-size: 13px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  transition: all 0.18s ease;
}
.primary-btn:hover {
  background: #8e684a;
}

.secondary-btn {
  height: 36px;
  padding: 0 16px;
  border-radius: 8px;
  background: #f0f0f4;
  color: #333338;
  border: 1px solid #dcdce2;
  font-size: 13px;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
}
.secondary-btn:hover {
  background: #e6e6ec;
}

.text-link-btn {
  background: none;
  border: none;
  color: #a27b5c;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  padding: 6px 12px;
}
.text-link-btn:hover {
  text-decoration: underline;
}

.no-result {
  text-align: center;
  padding: 40px;
  color: #8c8c94;
  font-size: 13px;
}

/* 使用指南 Modal 弹窗 */
.guide-modal-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(3px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  z-index: 500;
  animation: fadeIn 0.2s ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.guide-modal-content {
  background: #ffffff;
  border-radius: 16px;
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.18);
  width: 100%;
  max-width: 520px;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  animation: slideUp 0.22s cubic-bezier(0.34, 1.56, 0.64, 1);
}

@keyframes slideUp {
  from { transform: translateY(16px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid #eeeeef;
}

.modal-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.modal-icon-badge {
  font-size: 20px;
}

.modal-title-row h3 {
  font-size: 16px;
  font-weight: 700;
  color: #1d1d1f;
}

.modal-close-btn {
  background: none;
  border: none;
  font-size: 20px;
  color: #92929a;
  cursor: pointer;
  line-height: 1;
}

.modal-close-btn:hover {
  color: #1d1d1f;
}

.modal-body {
  padding: 18px 20px;
  overflow-y: auto;
}

.modal-intro {
  font-size: 13px;
  color: #555865;
  line-height: 1.5;
  margin-bottom: 16px;
  background: #f9f9fb;
  padding: 10px 14px;
  border-radius: 10px;
  border-left: 3px solid #a27b5c;
}

.guide-steps {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.guide-step-card {
  display: flex;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 10px;
  background: #fbfbfd;
  border: 1px solid #f0f0f4;
}

.step-num {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: #a27b5c;
  color: #ffffff;
  font-size: 12px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-top: 2px;
}

.step-content {
  flex: 1;
}

.step-content h4 {
  font-size: 13px;
  font-weight: 600;
  color: #1d1d1f;
  margin-bottom: 4px;
}

.step-content p {
  font-size: 12px;
  color: #6a6a72;
  line-height: 1.45;
}

.code-snippet {
  margin-top: 6px;
  background: #282c34;
  color: #abb2bf;
  padding: 8px 10px;
  border-radius: 6px;
  font-size: 11px;
  font-family: Consolas, monospace;
  line-height: 1.4;
}

.modal-footer {
  padding: 14px 20px;
  border-top: 1px solid #eeeeef;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  background: #fafafc;
}

.footer-btn {
  height: 32px;
  padding: 0 12px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 600;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 5px;
  transition: all 0.15s ease;
}

.footer-btn.highlight {
  background: #a27b5c;
  color: #ffffff;
}
.footer-btn.highlight:hover {
  background: #8e684a;
}

.footer-btn.secondary {
  background: #f0f0f4;
  color: #333338;
}
.footer-btn.secondary:hover {
  background: #e4e4ea;
}

.footer-btn.close {
  background: transparent;
  color: #787880;
}
.footer-btn.close:hover {
  color: #1d1d1f;
}
</style>
