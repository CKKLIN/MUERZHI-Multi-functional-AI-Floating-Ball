// src/components/AiSettingsPanel.vue
// AI assistant settings — for the AI assistant window only
<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import type { AgentBridgeStatus } from '../env.d.ts'

const claudeIntegrated = ref(false)
const bridgeStatus = ref<AgentBridgeStatus | null>(null)
const loading = ref(true)
const autoAllow = ref(false)
const islandFlat = ref(false)
let statusInterval: ReturnType<typeof setInterval> | null = null

async function loadAiStatus() {
  try {
    const status = await window.electronAPI.agentGetStatus()
    if (status) {
      bridgeStatus.value = status
      claudeIntegrated.value = status.hookInstalled === true
    }
  } catch (e) {
    console.error('[AiSettingsPanel] loadAiStatus error:', e)
  }
  loading.value = false
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

async function toggleAutoAllow() {
  autoAllow.value = !autoAllow.value
  try {
    await window.electronAPI.agentSetAutoAllow(autoAllow.value)
  } catch (e) {
    console.error('[AiSettingsPanel] setAutoAllow error:', e)
    autoAllow.value = !autoAllow.value
  }
}

async function toggleIslandFlat() {
  islandFlat.value = !islandFlat.value
  try {
    await window.electronAPI.setAiIslandSettings({ flat: islandFlat.value })
  } catch (e) {
    console.error('[AiSettingsPanel] setAiIslandSettings error:', e)
    islandFlat.value = !islandFlat.value
  }
}

// 实时状态更新
function onAgentStateUpdate(data: { state: string; sessions: any[] }) {
  if (bridgeStatus.value) {
    bridgeStatus.value = {
      ...bridgeStatus.value,
      displayState: data.state,
      sessionCount: data.sessions?.length ?? 0,
    }
  }
}

const displayStateLabel = computed(() => {
  const map: Record<string, string> = {
    idle: '空闲',
    thinking: '思考中',
    working: '工作中',
    error: '错误',
    notification: '待审批',
    done: '完成',
  }
  return map[bridgeStatus.value?.displayState ?? 'idle'] ?? bridgeStatus.value?.displayState ?? '-'
})

const stateDotClass = computed(() => {
  const s = bridgeStatus.value?.displayState ?? 'idle'
  return ['idle', 'thinking', 'working', 'error', 'notification', 'done'].includes(s) ? s : 'idle'
})

onMounted(async () => {
  await loadAiStatus()
  // 读取自动允许设置
  try {
    autoAllow.value = await window.electronAPI.agentGetAutoAllow()
  } catch {}
  // 读取 AI 岛外观设置（横条态）
  try {
    const s = await window.electronAPI.getAiIslandSettings()
    islandFlat.value = s.flat === true
  } catch {}
  // 保留轮询作为兜底，但主要依赖实时更新
  statusInterval = setInterval(loadAiStatus, 5000)

  // 监听实时状态更新
  const cleanupState = window.electronAPI.onAgentStateUpdate(onAgentStateUpdate)

  onUnmounted(() => {
    cleanupState()
  })
})

onUnmounted(() => {
  if (statusInterval) clearInterval(statusInterval)
})
</script>

<template>
  <div class="ai-settings-panel">
    <div class="settings-body">
      <!-- 状态概览卡片 -->
      <div class="status-card" :class="{ active: bridgeStatus?.sessionCount && bridgeStatus.sessionCount > 0 }">
        <div class="status-card-top">
          <div class="status-dot" :class="stateDotClass"></div>
          <div class="status-info">
            <div class="status-title">{{ displayStateLabel }}</div>
            <div class="status-sub">
              <template v-if="bridgeStatus?.sessionCount && bridgeStatus.sessionCount > 0">
                {{ bridgeStatus.sessionCount }} 个会话
              </template>
              <template v-else-if="bridgeStatus?.claudeRunning">Claude 运行中，等待交互</template>
              <template v-else>无活跃会话</template>
            </div>
          </div>
          <div class="status-server" :class="bridgeStatus?.serverRunning ? 'on' : 'off'">
            <span class="server-dot"></span>
            {{ bridgeStatus?.serverRunning ? '在线' : '离线' }}
          </div>
        </div>
      </div>

      <div class="settings-group">
        <div class="group-header">集成</div>
        <div class="settings-section">
          <div class="setting-row">
            <div class="row-text">
              <div class="row-label">Claude Code Hooks</div>
              <div class="row-desc">钩子脚本状态</div>
            </div>
            <button class="toggle-btn" :class="{ on: claudeIntegrated }" @click="toggleClaudeIntegration">
              <span class="toggle-knob"></span>
            </button>
          </div>
        </div>
      </div>

      <div class="settings-group">
        <div class="group-header">权限</div>
        <div class="settings-section">
          <div class="setting-row">
            <div class="row-text">
              <div class="row-label">自动允许所有权限</div>
              <div class="row-desc">开启后 Claude Code 的权限请求将自动通过，不再弹出悬浮岛审批</div>
            </div>
            <button class="toggle-btn" :class="{ on: autoAllow }" @click="toggleAutoAllow">
              <span class="toggle-knob"></span>
            </button>
          </div>
        </div>
      </div>

      <div class="settings-group">
        <div class="group-header">悬浮岛外观</div>
        <div class="settings-section">
          <div class="setting-row">
            <div class="row-text">
              <div class="row-label">横条态（更扁的细横条）</div>
              <div class="row-desc">把悬浮岛默认状态条压成更扁的细横条，省屏幕空间</div>
            </div>
            <button class="toggle-btn" :class="{ on: islandFlat }" @click="toggleIslandFlat">
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
.ai-settings-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.settings-body {
  overflow-y: auto;
  flex: 1;
  padding: 16px 20px;
}

/* 状态概览卡片 */
.status-card {
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 14px 16px;
  margin-bottom: 16px;
  transition: all 0.2s;
}
.status-card.active {
  border-color: rgba(78, 205, 196, 0.4);
  box-shadow: 0 0 0 1px rgba(78, 205, 196, 0.15);
}
.status-card-top {
  display: flex;
  align-items: center;
  gap: 12px;
}
.status-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
  transition: all 0.3s;
}
.status-dot.idle { background: #9e9e9e; }
.status-dot.thinking { background: #fbbf24; animation: dot-pulse 1.5s ease-in-out infinite; }
.status-dot.working { background: #34d399; animation: dot-pulse 0.8s ease-in-out infinite; }
.status-dot.error { background: #f87171; }
.status-dot.notification { background: #a78bfa; animation: dot-pulse 0.6s ease-in-out infinite; }
.status-dot.done { background: #66bb6a; }
@keyframes dot-pulse {
  0%, 100% { opacity: 0.5; transform: scale(0.9); }
  50% { opacity: 1; transform: scale(1.2); box-shadow: 0 0 8px currentColor; }
}
.status-info {
  flex: 1;
  min-width: 0;
}
.status-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
  line-height: 1.3;
}
.status-sub {
  font-size: 11px;
  color: var(--text-muted);
  margin-top: 2px;
}
.status-server {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  font-weight: 500;
  padding: 3px 8px;
  border-radius: 10px;
  flex-shrink: 0;
}
.status-server.on { color: #34d399; background: rgba(52, 211, 153, 0.1); }
.status-server.off { color: #9e9e9e; background: rgba(158, 158, 158, 0.1); }
.server-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
}
.status-server.on .server-dot { box-shadow: 0 0 6px #34d399; }

/* 设置分组 */
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

/* 开关按钮 */
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
