<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow'
import { t } from '../stores/i18n'

const isMaximized = ref(false)
let appWindow: ReturnType<typeof getCurrentWebviewWindow> | null = null

function minimize() { window.muerzhiAPI.minimizeWindow() }
async function maximize() {
  window.muerzhiAPI.maximizeWindow()
  setTimeout(updateMaximizedState, 120)
}
function close() { window.muerzhiAPI.closeWindow() }

async function updateMaximizedState() {
  try {
    if (appWindow) {
      isMaximized.value = await appWindow.isMaximized()
    }
  } catch {}
}

onMounted(async () => {
  try {
    appWindow = getCurrentWebviewWindow()
    await updateMaximizedState()
    const unlisten = await appWindow.onResized(async () => {
      await updateMaximizedState()
    })
    onUnmounted(() => {
      unlisten()
    })
  } catch {}
})
</script>

<template>
  <div class="layout" :class="{ 'is-maximized': isMaximized }">
    <div class="titlebar" style="-webkit-app-region: drag" data-tauri-drag-region>
      <div class="titlebar-brand" style="-webkit-app-region: drag" data-tauri-drag-region>
        <img class="titlebar-logo" src="/logo.png" alt="Logo" />
        <span class="titlebar-title">MUERZHI</span>
      </div>
      <div class="titlebar-controls" style="-webkit-app-region: no-drag">
        <button style="-webkit-app-region: no-drag" class="titlebar-btn" @click="minimize" v-tip.below="t('win.minimize')">
          <svg width="10" height="10" viewBox="0 0 10 10"><line x1="0" y1="5" x2="10" y2="5" stroke="currentColor" stroke-width="1.5"/></svg>
        </button>
        <button style="-webkit-app-region: no-drag" class="titlebar-btn" @click="maximize" v-tip.below="t('win.maximize')">
          <svg width="10" height="10" viewBox="0 0 10 10"><rect x="0.5" y="0.5" width="9" height="9" fill="none" stroke="currentColor" stroke-width="1.2"/></svg>
        </button>
        <button style="-webkit-app-region: no-drag" class="titlebar-btn close" @click="close" v-tip.below="t('common.close')">
          <svg width="10" height="10" viewBox="0 0 10 10"><line x1="0" y1="0" x2="10" y2="10" stroke="currentColor" stroke-width="1.5"/><line x1="10" y1="0" x2="0" y2="10" stroke="currentColor" stroke-width="1.5"/></svg>
        </button>
      </div>
    </div>
    <div class="layout-body layout-content">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.layout {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  overflow: hidden;
  border-radius: 12px;
  border: 1px solid var(--border);
  box-sizing: border-box;
  background: var(--bg-primary);
  
  transition: border-radius 0.15s ease;
}

.layout.is-maximized {
  border-radius: 0;
  border: none;
  box-shadow: none;
}

.titlebar {
  height: var(--titlebar-height);
  background: var(--bg-hover);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 0 0 12px;
  border-bottom: 1px solid var(--border);
  
  flex-shrink: 0;
}



.titlebar-brand {
  display: flex;
  align-items: center;
  user-select: none;
}

.titlebar-logo {
  width: 20px;
  height: 20px;
  border-radius: 4px;
  flex-shrink: 0;
}

.titlebar-title {
  font-size: 13px;
  color: var(--text-primary);
  letter-spacing: 2px;
}

.titlebar-controls {
  display: flex;
}

.titlebar-btn {
  width: 32px;
  height: var(--titlebar-height);
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  transition: background var(--transition);
}

.titlebar-btn:hover {
  background: var(--bg-hover);
}





.titlebar-btn.close:hover {
  background: var(--accent);
  color: white;
}

.layout-body,
.layout-content {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
</style>
