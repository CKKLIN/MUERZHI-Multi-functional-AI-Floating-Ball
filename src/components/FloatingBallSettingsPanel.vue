// src/components/FloatingBallSettingsPanel.vue
// 悬浮球专属设置面板 —— 复用 AiSettingsPanel 的 CSS 变量与 .settings-group/.setting-row/.toggle-btn 结构
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import type { BallMenuKey, FloatingBallSettings, AppLocale } from '../env.d.ts'
import { t } from '../stores/i18n'

const visible = ref(true)
const alwaysOnTop = ref(true)
const openAtLogin = ref(false)
const locale = ref<AppLocale>('zh')
const menuItems = ref<Record<BallMenuKey, boolean>>({
  record: true, music: true, ai: true, todo: true, settings: true,
})
const loading = ref(true)

/** 悬浮球菜单开关清单（key 与主进程 MENU_CATALOG / 设置 menuItems 一致）；label 走 i18n */
const BALL_MENUS: { key: BallMenuKey; labelKey: string }[] = [
  { key: 'record', labelKey: 'ball.menu.record' },
  { key: 'music', labelKey: 'ball.menu.music' },
  { key: 'ai', labelKey: 'ball.menu.ai' },
  { key: 'todo', labelKey: 'ball.menu.todo' },
  { key: 'settings', labelKey: 'ball.menu.settings' },
]

async function loadSettings() {
  try {
    const s = await window.electronAPI.getFloatingBallSettings()
    visible.value = s.visible
    alwaysOnTop.value = s.alwaysOnTop
    openAtLogin.value = s.openAtLogin
    locale.value = s.locale ?? 'zh'
    menuItems.value = s.menuItems
  } catch (e) {
    console.error('[FloatingBallSettingsPanel] loadSettings error:', e)
  }
  loading.value = false
}

// 切换语言：经悬浮球设置落盘（locale 是全局偏好唯一真源）+ 主进程广播，各窗口 store 即时切换
async function setLocale(l: AppLocale) {
  if (l === locale.value) return
  const prev = locale.value
  locale.value = l
  try {
    const s = await window.electronAPI.setFloatingBallSettings({ locale: l })
    locale.value = s.locale
  } catch (e) {
    console.error('[FloatingBallSettingsPanel] setLocale error:', e)
    locale.value = prev
  }
}

// 切换显示/隐藏：乐观更新，失败回滚
async function toggleVisible() {
  const prev = visible.value
  visible.value = !prev
  try {
    const s = await window.electronAPI.setFloatingBallSettings({ visible: visible.value })
    visible.value = s.visible
  } catch (e) {
    console.error('[FloatingBallSettingsPanel] toggleVisible error:', e)
    visible.value = prev
  }
}

async function toggleAlwaysOnTop() {
  const prev = alwaysOnTop.value
  alwaysOnTop.value = !prev
  try {
    const s = await window.electronAPI.setFloatingBallSettings({ alwaysOnTop: alwaysOnTop.value })
    alwaysOnTop.value = s.alwaysOnTop
  } catch (e) {
    console.error('[FloatingBallSettingsPanel] toggleAlwaysOnTop error:', e)
    alwaysOnTop.value = prev
  }
}

async function toggleOpenAtLogin() {
  const prev = openAtLogin.value
  openAtLogin.value = !prev
  try {
    const s = await window.electronAPI.setFloatingBallSettings({ openAtLogin: openAtLogin.value })
    openAtLogin.value = s.openAtLogin
  } catch (e) {
    console.error('[FloatingBallSettingsPanel] toggleOpenAtLogin error:', e)
    openAtLogin.value = prev
  }
}

// 切换某个菜单项显隐：乐观更新 + 失败回滚。
// 注意：传 spread 后的纯对象副本，不能直接传 menuItems.value——它是 Vue 的 reactive Proxy，
// 走 ipcRenderer 结构化克隆会报 "An object could not be cloned"，IPC reject 导致按钮回滚（看似点了没反应）。
async function toggleMenuItem(key: BallMenuKey) {
  const prev = { ...menuItems.value }
  menuItems.value = { ...menuItems.value, [key]: !menuItems.value[key] }
  try {
    const s = await window.electronAPI.setFloatingBallSettings({ menuItems: { ...menuItems.value } })
    menuItems.value = s.menuItems
  } catch (e) {
    console.error('[FloatingBallSettingsPanel] toggleMenuItem error:', e)
    menuItems.value = prev
  }
}

async function resetPosition() {
  try {
    await window.electronAPI.resetFloatingBallPosition()
  } catch (e) {
    console.error('[FloatingBallSettingsPanel] resetPosition error:', e)
  }
}

onMounted(loadSettings)
</script>

<template>
  <div class="fb-settings-panel">
    <div class="settings-body">
      <div class="settings-group">
        <div class="group-header">{{ t('settings.group.ball') }}</div>
        <div class="settings-section">
          <div class="setting-row">
            <div class="row-text">
              <div class="row-label">{{ t('settings.ball.show') }}</div>
              <div class="row-desc">{{ t('settings.ball.showDesc') }}</div>
            </div>
            <button class="toggle-btn" :class="{ on: visible }" @click="toggleVisible">
              <span class="toggle-knob"></span>
            </button>
          </div>
          <div class="setting-row">
            <div class="row-text">
              <div class="row-label">{{ t('settings.ball.alwaysOnTop') }}</div>
              <div class="row-desc">{{ t('settings.ball.alwaysOnTopDesc') }}</div>
            </div>
            <button class="toggle-btn" :class="{ on: alwaysOnTop }" @click="toggleAlwaysOnTop">
              <span class="toggle-knob"></span>
            </button>
          </div>
          <div class="setting-row">
            <div class="row-text">
              <div class="row-label">{{ t('settings.ball.resetPos') }}</div>
              <div class="row-desc">{{ t('settings.ball.resetPosDesc') }}</div>
            </div>
            <button class="reset-btn" @click="resetPosition">{{ t('common.reset') }}</button>
          </div>
        </div>
      </div>

      <div class="settings-group">
        <div class="group-header">{{ t('settings.group.menu') }}</div>
        <div class="settings-section">
          <div class="menu-chips">
            <button
              v-for="m in BALL_MENUS"
              :key="m.key"
              class="menu-chip"
              :class="{ on: menuItems[m.key] }"
              @click="toggleMenuItem(m.key)"
            >
              {{ t(m.labelKey) }}
            </button>
          </div>
        </div>
      </div>

      <div class="settings-group">
        <div class="group-header">{{ t('settings.group.language') }}</div>
        <div class="settings-section">
          <div class="setting-row">
            <div class="row-text">
              <div class="row-label">{{ t('settings.language.label') }}</div>
              <div class="row-desc">{{ t('settings.language.desc') }}</div>
            </div>
            <div class="lang-switcher">
              <button
                class="lang-btn"
                :class="{ on: locale === 'zh' }"
                @click="setLocale('zh')"
              >中</button>
              <button
                class="lang-btn"
                :class="{ on: locale === 'en' }"
                @click="setLocale('en')"
              >EN</button>
            </div>
          </div>
        </div>
      </div>

      <div class="settings-group">
        <div class="group-header">{{ t('settings.group.system') }}</div>
        <div class="settings-section">
          <div class="setting-row">
            <div class="row-text">
              <div class="row-label">{{ t('settings.system.openAtLogin') }}</div>
              <div class="row-desc">{{ t('settings.system.openAtLoginDesc') }}</div>
            </div>
            <button class="toggle-btn" :class="{ on: openAtLogin }" @click="toggleOpenAtLogin">
              <span class="toggle-knob"></span>
            </button>
          </div>
        </div>
      </div>

      <div class="settings-group" v-if="loading">
        <div class="loading-row">
          <span class="loading-dot"></span>
          <span>{{ t('common.loading') }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 悬浮球专属设置面板
   主题色取悬浮球自身的品牌靛蓝（floating-ball.ts 的 #4a6cf7 / #4e5cd4）。
   3D 立体感参考「录屏窗口」的 RecordingControls.vue，统一手法：
   135deg 斜切渐变（左上受光）+ 方向性描边（上/左亮、下/右暗）+
   左上内高光 + 右下内阴影 + 外投影；
   hover 向左上浮起 translate(-1px,-1px)，按下向右下凹陷 translate(1px,1px)+inset。 */
.fb-settings-panel {
  /* 悬浮球主题色 = 靛蓝，映射到全局 --surface-accent*；
     壳层(.settings-section/.group-header/.toggle-btn/.menu-chip)已在全局 style.css 定义 */
  --surface-accent: #4a6cf7;
  --surface-accent-grad: linear-gradient(135deg, #6a8cff 0%, #4a6cf7 100%);
  --surface-accent-glow: rgba(74, 108, 247, 0.35);
  --surface-accent-bg: rgba(74, 108, 247, 0.15);

  display: flex;
  flex-direction: column;
  height: 100%;
  /* 页面底与录屏工具条同款灰渐变，衬托白色卡片/按钮浮起 */
  background: linear-gradient(180deg, #f0f0f4 0%, #e4e4ea 100%);
  animation: fbFadeIn 0.18s ease;
}

.settings-body {
  overflow-y: auto;
  flex: 1;
  padding: 16px 20px 24px;
}

/* 壳层(.settings-group/.group-header/.settings-section/.setting-row/.row-text/.row-desc/.menu-chip/.toggle-btn/.toggle-knob/.loading-*)已在全局 style.css 定义，本组件不再重复。 */

/* 重置位置按钮：白色斜切按钮（同录屏「停止」按钮），按下凹陷 */
.reset-btn {
  flex-shrink: 0;
  padding: 5px 14px;
  font-size: 12px;
  font-weight: 500;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.7);
  border-top-color: rgba(255, 255, 255, 0.9);
  border-left-color: rgba(255, 255, 255, 0.85);
  border-right-color: rgba(200, 200, 210, 0.4);
  border-bottom-color: rgba(190, 190, 200, 0.5);
  background: var(--surface-grad);
  color: var(--text-secondary);
  cursor: pointer;
  text-shadow: 0 1px 0 rgba(255, 255, 255, 0.5);
  transition: all 0.2s var(--bevel-ease);
  box-shadow: var(--bevel-shadow);
}
.reset-btn:hover {
  border-top-color: rgba(255, 255, 255, 0.95);
  background: var(--surface-grad-hover);
  color: var(--text-primary);
  transform: translate(-1px, -1px);
  box-shadow: var(--bevel-shadow-hover);
}
.reset-btn:active {
  background: var(--surface-grad-active);
  border-color: rgba(175, 175, 190, 0.5);
  border-top-color: rgba(190, 190, 205, 0.6);
  transform: translate(1px, 1px);
  box-shadow: var(--bevel-shadow-active);
}

/* 页面加载动画（loading-row/dot 已在全局） */
@keyframes fbFadeIn {
  from { opacity: 0; transform: translateY(4px); }
  to { opacity: 1; transform: translateY(0); }
}

/* 语言切换：两个胶囊按钮，选中态用品牌靛蓝实底 */
.lang-switcher {
  display: flex;
  gap: 6px;
  flex-shrink: 0;
}
.lang-btn {
  min-width: 40px;
  padding: 5px 10px;
  font-size: 12px;
  font-weight: 600;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.7);
  border-top-color: rgba(255, 255, 255, 0.9);
  border-left-color: rgba(255, 255, 255, 0.85);
  border-right-color: rgba(200, 200, 210, 0.4);
  border-bottom-color: rgba(190, 190, 200, 0.5);
  background: var(--surface-grad);
  color: var(--text-secondary);
  cursor: pointer;
  text-shadow: 0 1px 0 rgba(255, 255, 255, 0.5);
  box-shadow: var(--bevel-shadow);
  transition: all 0.2s var(--bevel-ease);
}
.lang-btn:hover {
  background: var(--surface-grad-hover);
  color: var(--text-primary);
  transform: translate(-1px, -1px);
}
.lang-btn.on {
  background: var(--surface-accent-grad);
  color: #fff;
  border-color: rgba(255, 255, 255, 0.4);
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.25);
  box-shadow: var(--surface-accent-glow);
}
</style>
