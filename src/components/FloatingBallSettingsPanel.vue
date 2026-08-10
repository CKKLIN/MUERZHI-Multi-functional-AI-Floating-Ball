// src/components/FloatingBallSettingsPanel.vue
// 悬浮球专属设置面板 —— 复用 AiSettingsPanel 的 CSS 变量与 .settings-group/.setting-row/.toggle-btn 结构
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import type { FloatingBallSettings } from '../env.d.ts'

const visible = ref(true)
const alwaysOnTop = ref(true)
const openAtLogin = ref(false)
const loading = ref(true)

async function loadSettings() {
  try {
    const s = await window.electronAPI.getFloatingBallSettings()
    visible.value = s.visible
    alwaysOnTop.value = s.alwaysOnTop
    openAtLogin.value = s.openAtLogin
  } catch (e) {
    console.error('[FloatingBallSettingsPanel] loadSettings error:', e)
  }
  loading.value = false
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
        <div class="group-header">悬浮球</div>
        <div class="settings-section">
          <div class="setting-row">
            <div class="row-text">
              <div class="row-label">显示悬浮球</div>
              <div class="row-desc">关闭后悬浮球隐藏，可从托盘「显示设置窗口」重新打开</div>
            </div>
            <button class="toggle-btn" :class="{ on: visible }" @click="toggleVisible">
              <span class="toggle-knob"></span>
            </button>
          </div>
          <div class="setting-row">
            <div class="row-text">
              <div class="row-label">始终置顶</div>
              <div class="row-desc">关闭后悬浮球可被其他窗口遮挡</div>
            </div>
            <button class="toggle-btn" :class="{ on: alwaysOnTop }" @click="toggleAlwaysOnTop">
              <span class="toggle-knob"></span>
            </button>
          </div>
          <div class="setting-row">
            <div class="row-text">
              <div class="row-label">重置位置</div>
              <div class="row-desc">把悬浮球移回屏幕中心</div>
            </div>
            <button class="btn btn-sm reset-btn" @click="resetPosition">重置</button>
          </div>
        </div>
      </div>

      <div class="settings-group">
        <div class="group-header">系统</div>
        <div class="settings-section">
          <div class="setting-row">
            <div class="row-text">
              <div class="row-label">开机自启</div>
              <div class="row-desc">登录系统时自动启动本应用</div>
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
          <span>加载中...</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.fb-settings-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.settings-body {
  overflow-y: auto;
  flex: 1;
  padding: 16px 20px;
}

/* 设置分组（与 AiSettingsPanel 一致） */
.settings-group + .settings-group {
  margin-top: 12px;
}
.group-header {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.6px;
  margin-bottom: 6px;
  padding: 0 2px;
}
.settings-section {
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 12px 14px;
}
.setting-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.setting-row + .setting-row {
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid var(--border);
}
.row-text {
  flex: 1;
  min-width: 0;
}
.row-label {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-primary);
}
.row-desc {
  font-size: 11px;
  color: var(--text-muted);
  margin-top: 2px;
  line-height: 1.4;
}

/* 开关按钮（与 AiSettingsPanel 一致） */
.toggle-btn {
  width: 40px;
  height: 22px;
  border-radius: 11px;
  background: rgba(158, 158, 158, 0.25);
  border: none;
  cursor: pointer;
  position: relative;
  transition: background 0.2s;
  flex-shrink: 0;
  padding: 0;
}
.toggle-btn.on {
  background: #34d399;
}
.toggle-knob {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #fff;
  transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
}
.toggle-btn.on .toggle-knob {
  transform: translateX(18px);
}

/* 重置按钮：复用全局 .btn，微调尺寸 */
.reset-btn {
  flex-shrink: 0;
}

/* 加载 */
.loading-row {
  display: flex;
  align-items: center;
  gap: 8px;
  justify-content: center;
  color: var(--text-muted);
  font-size: 12px;
  padding: 16px 0;
}
.loading-dot {
  width: 6px;
  height: 6px;
  background: var(--text-muted);
  border-radius: 50%;
  animation: pulse 1s ease-in-out infinite;
}
@keyframes pulse {
  0%, 100% { opacity: 0.3; transform: scale(0.8); }
  50% { opacity: 1; transform: scale(1.2); }
}
</style>
