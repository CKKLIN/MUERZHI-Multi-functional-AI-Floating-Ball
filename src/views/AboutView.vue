// src/views/AboutView.vue
// 关于视图 —— 独立小窗（hash 路由 /about），样式沿用 Electron 版关于页的拟态风格
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { t } from '../stores/i18n'

// 版本号从 Rust 侧取（tauri.conf.json 的 package.version）；
// 之前模板直接引用未定义的 appVersion，页面版本号一直空白。
const appVersion = ref('')

onMounted(async () => {
  try {
    appVersion.value = await window.muerzhiAPI.getAppVersion()
  } catch {
    appVersion.value = ''
  }
})

function close() { window.muerzhiAPI.closeAboutWindow() }
function openRepo() {
  window.muerzhiAPI.openExternal('https://github.com/CKKLIN/MUERZHI-Multi-functional-AI-Floating-Ball')
}
</script>

<template>
  <div class="about-view">
    <div class="titlebar" data-tauri-drag-region style="-webkit-app-region: drag">
      <div class="titlebar-brand">
        <img class="logo" src="/logo.png" alt="logo" />
        <span class="app-name">{{ t('settings.about.appName') }}</span>
      </div>
      <button class="titlebar-btn close" @click="close" v-tip.below="t('common.close')">
        <svg width="10" height="10" viewBox="0 0 10 10"><line x1="0" y1="0" x2="10" y2="10" stroke="currentColor" stroke-width="1.5"/><line x1="10" y1="0" x2="0" y2="10" stroke="currentColor" stroke-width="1.5"/></svg>
      </button>
    </div>
    <div class="about-body">
      <div class="app-icon">
        <img src="/logo.png" width="72" height="72" alt="MUERZHI" />
      </div>
      <div class="name">MUERZHI</div>
      <div class="version">v{{ appVersion }}</div>
      <div class="divider"></div>
      <div class="dev-label">{{ t('settings.about.author') }}</div>
      <div class="dev-name">muerzhi</div>
      <button class="repo-btn" @click="openRepo">{{ t('settings.about.github') }}</button>
    </div>
  </div>
</template>

<style scoped>
.about-view {
  height: 100vh;
  display: flex;
  flex-direction: column;
  user-select: none;
  overflow: hidden;
  background: var(--bg-surface, #eaeaec);
}

.titlebar {
  height: var(--titlebar-height);
  background: linear-gradient(180deg, #f2f2f4 0%, #e8e8ec 100%);
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}

.titlebar-brand {
  display: flex;
  align-items: center;
  gap: 8px;
  padding-left: 12px;
  user-select: none;
}

.logo { width: 18px; height: 18px; border-radius: 4px; }

.app-name {
  font-size: 12px;
  color: var(--text-secondary);
}

.titlebar-btn {
  width: 44px;
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

.titlebar-btn.close:hover { background: var(--accent); color: #fff; }

.about-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.app-icon img { border-radius: 16px; }

.name {
  font-size: 17px;
  font-weight: 700;
  color: var(--text-primary);
  letter-spacing: 1px;
}

.version {
  font-size: 12px;
  color: var(--text-secondary);
}

.divider {
  width: 60%;
  height: 1px;
  background: var(--border);
  margin: 8px 0;
}

.dev-label {
  font-size: 11px;
  color: var(--text-secondary);
}

.dev-name {
  font-size: 14px;
  color: var(--text-primary);
}

.repo-btn {
  margin-top: 10px;
  padding: 8px 18px;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--bg-hover);
  color: var(--text-primary);
  cursor: pointer;
  font-size: 13px;
  transition: all var(--transition);
}

.repo-btn:hover {
  background: var(--bg-active, #dedee6);
  transform: translateY(-1px);
}
</style>