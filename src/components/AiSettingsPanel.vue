// src/components/AiSettingsPanel.vue
// AI assistant settings — for the AI assistant window only
<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import type { AgentBridgeStatus, AgentToolStatus } from '../env.d.ts'
import { t } from '../stores/i18n'

const claudeIntegrated = ref(false)
const bridgeStatus = ref<AgentBridgeStatus | null>(null)
const loading = ref(true)
const autoAllow = ref(false)
const islandFlat = ref(false)
// 初始岛flat值是否已从主进程读回：读回前禁用 toggle，避免 onMounted 迟到的 get 覆盖乐观 set 的竞态
const islandFlatLoaded = ref(false)
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
  if (!islandFlatLoaded.value) return // 初始值尚未读回，先不响应，避免与初始 get 竞态
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
    idle: t('ai.state.idle'),
    thinking: t('ai.state.thinking'),
    working: t('ai.state.working'),
    error: t('ai.state.error'),
    notification: t('ai.state.notification'),
    done: t('ai.state.done'),
  }
  return map[bridgeStatus.value?.displayState ?? 'idle'] ?? bridgeStatus.value?.displayState ?? '-'
})

const stateDotClass = computed(() => {
  const s = bridgeStatus.value?.displayState ?? 'idle'
  return ['idle', 'thinking', 'working', 'error', 'notification', 'done'].includes(s) ? s : 'idle'
})

// === 多工具列表（G4）：图标 + 各自状态；无 hook 审批能力的工具降级展示 ===
function toolIcon(id: string): string {
  return { 'claude-code': '✦', codex: '✠' }[id] || '⚙'
}
function toolState(tl: AgentToolStatus): 'working' | 'idle' | 'off' {
  return tl.working ? 'working' : tl.running ? 'idle' : 'off'
}
function toolStateLabel(tl: AgentToolStatus): string {
  if (tl.working) return t('tools.working')
  if (tl.running) return t('tools.idle')
  return t('tools.notRunning')
}

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
  // 初始值已读回，之后允许 toggle
  islandFlatLoaded.value = true
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
                {{ t('ai.sessionsCount', { n: bridgeStatus.sessionCount }) }}
              </template>
              <template v-else-if="bridgeStatus?.claudeRunning">{{ t('ai.waiting') }}</template>
              <template v-else>{{ t('ai.noActive') }}</template>
            </div>
          </div>
          <div class="status-server" :class="bridgeStatus?.serverRunning ? 'on' : 'off'">
            <span class="server-dot"></span>
            {{ bridgeStatus?.serverRunning ? t('ai.online') : t('ai.offline') }}
          </div>
        </div>
      </div>

      <!-- 多工具概览（G4）：Claude Code + 各适配器，图标 + 各自状态；无审批能力的降级展示 -->
      <div class="settings-group" v-if="bridgeStatus?.tools?.length">
        <div class="group-header">{{ t('tools.title') }}</div>
        <div class="settings-section">
          <div v-for="tl in bridgeStatus.tools" :key="tl.id" class="tool-row">
            <span class="tool-icon">{{ toolIcon(tl.id) }}</span>
            <span class="tool-name">{{ t(tl.nameKey) }}</span>
            <span class="tool-state dot-group" :class="toolState(tl)">
              <i class="tool-dot"></i>{{ toolStateLabel(tl) }}
            </span>
            <span v-if="tl.sessions?.length" class="tool-sessions">{{ t('tools.toolSessions', { n: tl.sessions.length }) }}</span>
            <span v-if="tl.approval === 'none'" class="tool-degrade">{{ t('tools.approvalNone') }}</span>
          </div>
        </div>
      </div>

      <div class="settings-group">
        <div class="group-header">{{ t('ai.groupIntegration') }}</div>
        <div class="settings-section">
          <div class="setting-row">
            <div class="row-text">
              <div class="row-label">Claude Code Hooks</div>
              <div class="row-desc">{{ t('ai.hooksDesc') }}</div>
            </div>
            <button class="toggle-btn" :class="{ on: claudeIntegrated }" @click="toggleClaudeIntegration">
              <span class="toggle-knob"></span>
            </button>
          </div>
        </div>
      </div>

      <div class="settings-group">
        <div class="group-header">{{ t('ai.groupPermission') }}</div>
        <div class="settings-section">
          <div class="setting-row">
            <div class="row-text">
              <div class="row-label">{{ t('ai.autoAllowTitle') }}</div>
              <div class="row-desc">{{ t('ai.autoAllowDesc') }}</div>
            </div>
            <button class="toggle-btn" :class="{ on: autoAllow }" @click="toggleAutoAllow">
              <span class="toggle-knob"></span>
            </button>
          </div>
        </div>
      </div>

      <div class="settings-group">
        <div class="group-header">{{ t('ai.groupIsland') }}</div>
        <div class="settings-section">
          <div class="setting-row">
            <div class="row-text">
              <div class="row-label">{{ t('ai.flat') }}</div>
              <div class="row-desc">{{ t('ai.flatDesc') }}</div>
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
          <span>{{ t('common.loading') }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.ai-settings-panel {
  /* AI 窗口主题色 = 绿（AI 岛 working 态），覆盖全局默认红 */
  --surface-accent: #34d399;
  --surface-accent-grad: linear-gradient(135deg, #5ed9ab 0%, #34d399 100%);
  --surface-accent-glow: rgba(52, 211, 153, 0.35);
  --surface-accent-bg: rgba(52, 211, 153, 0.15);

  display: flex;
  flex-direction: column;
  height: 100%;
}

.settings-body {
  overflow-y: auto;
  flex: 1;
  padding: 16px 20px;
}

/* 状态概览卡片：白色斜切立体 */
.status-card {
  background: var(--surface-grad);
  border: 1px solid rgba(255, 255, 255, 0.7);
  border-top-color: rgba(255, 255, 255, 0.9);
  border-left-color: rgba(255, 255, 255, 0.85);
  border-right-color: rgba(200, 200, 210, 0.4);
  border-bottom-color: rgba(190, 190, 200, 0.5);
  border-radius: 12px;
  padding: 14px 16px;
  margin-bottom: 16px;
  box-shadow:
    4px 4px 12px rgba(0, 0, 0, 0.1),
    1px 1px 3px rgba(0, 0, 0, 0.06),
    inset 1px 1px 2px rgba(255, 255, 255, 0.9);
  transition: all 0.2s;
}
.status-card.active {
  border-color: rgba(78, 205, 196, 0.4);
  box-shadow:
    4px 4px 12px rgba(0, 0, 0, 0.1),
    1px 1px 3px rgba(0, 0, 0, 0.06),
    0 0 0 1px rgba(78, 205, 196, 0.15),
    inset 1px 1px 2px rgba(255, 255, 255, 0.9);
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

/* 多工具概览行（G4） */
.tool-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 2px;
  font-size: 12.5px;
}
.tool-icon { width: 18px; text-align: center; color: var(--surface-accent); font-size: 14px; }
.tool-name { font-weight: 600; color: var(--text-primary); white-space: nowrap; }
.dot-group { display: inline-flex; align-items: center; gap: 5px; }
.tool-dot { width: 7px; height: 7px; border-radius: 50%; background: currentColor; }
.tool-state { font-size: 11.5px; }
.tool-state.working { color: #34d399; }
.tool-state.working .tool-dot { box-shadow: 0 0 6px #34d399; }
.tool-state.idle { color: #9e9e9e; }
.tool-state.off { color: #b0b0b8; }
.tool-sessions { margin-left: auto; font-size: 11px; color: var(--text-muted); white-space: nowrap; }
.tool-degrade { font-size: 10px; color: var(--text-muted); background: var(--bg-hover); padding: 1px 6px; border-radius: 8px; white-space: nowrap; }
</style>
