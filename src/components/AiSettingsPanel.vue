// src/components/AiSettingsPanel.vue
// AI assistant settings — for the AI assistant window only
<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import type { AgentBridgeStatus } from '../env.d.ts'

const claudeIntegrated = ref(false)
const bridgeStatus = ref<AgentBridgeStatus | null>(null)
let statusInterval: ReturnType<typeof setInterval> | null = null

async function loadAiStatus() {
  try {
    const status = await window.electronAPI.agentGetStatus()
    if (status) {
      bridgeStatus.value = status
      claudeIntegrated.value = status.hookInstalled === true
    }
  } catch {}
}

async function toggleClaudeIntegration() {
  if (claudeIntegrated.value) {
    await window.electronAPI.agentUninstallHooks()
    claudeIntegrated.value = false
  } else {
    const status = await window.electronAPI.agentInstallHooks()
    claudeIntegrated.value = status?.hookInstalled === true
  }
  await loadAiStatus()
}

onMounted(() => {
  loadAiStatus()
  statusInterval = setInterval(loadAiStatus, 5000)
})

onUnmounted(() => {
  if (statusInterval) clearInterval(statusInterval)
})
</script>

<template>
  <div class="ai-settings-panel">
    <div class="settings-body">
      <div class="settings-group">
        <div class="group-header">AI 助手</div>
        <div class="settings-section">
          <div class="setting-row">
            <label>Claude Code</label>
            <div class="setting-control">
              <button class="btn btn-sm" @click="toggleClaudeIntegration" :style="{ minWidth: '70px' }">
                {{ claudeIntegrated ? '已安装' : '未安装' }}
              </button>
            </div>
          </div>
          <div class="setting-row">
            <label>服务状态</label>
            <span :class="['status-badge', bridgeStatus?.serverRunning ? 'online' : 'offline']">
              {{ bridgeStatus?.serverRunning ? '运行中' : '未启动' }}
            </span>
          </div>
          <div class="setting-row" v-if="bridgeStatus">
            <label>当前状态</label>
            <span :class="['status-badge', bridgeStatus.sessionCount > 0 ? 'online' : 'idle']">
              {{ bridgeStatus.displayState }} ({{ bridgeStatus.sessionCount }} 会话)
            </span>
          </div>
          <div class="setting-row" v-if="bridgeStatus">
            <label>端口</label>
            <kbd>{{ bridgeStatus.port || '-' }}</kbd>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.ai-settings-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.settings-body {
  overflow-y: auto;
  flex: 1;
  padding: 0 20px;
}

.settings-group {
  padding-top: 4px;
}

.settings-group + .settings-group {
  margin-top: 8px;
}

.group-header {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  padding: 8px 0;
  border-bottom: 2px solid var(--border);
  margin-bottom: 4px;
}

.settings-section {
  padding: 12px 0;
  border-bottom: 1px solid var(--border);
}

.settings-section:last-child {
  border-bottom: none;
}

.settings-section h4 {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 10px;
}

.setting-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
  gap: 12px;
}

.setting-row label {
  font-size: 13px;
  color: var(--text-secondary);
  white-space: nowrap;
  min-width: 60px;
}

.setting-control {
  display: flex;
  gap: 6px;
  flex: 1;
  justify-content: flex-end;
}

.btn {
  padding: 6px 12px;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: var(--bg-surface);
  cursor: pointer;
  font-size: 12px;
  transition: all 0.2s;
}

.btn:hover {
  background: var(--bg-hover);
}

.btn-sm {
  padding: 4px 10px;
  font-size: 11px;
}

.status-badge {
  padding: 3px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 500;
}

.status-badge.online {
  background: rgba(78, 205, 196, 0.15);
  color: #4ecdc4;
}

.status-badge.offline {
  background: rgba(158, 158, 158, 0.15);
  color: #9e9e9e;
}

.status-badge.idle {
  background: rgba(158, 158, 158, 0.15);
  color: #9e9e9e;
}

kbd {
  background: var(--bg-input);
  border: 1px solid var(--border);
  border-radius: 4px;
  padding: 2px 8px;
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--text-primary);
}
</style>
