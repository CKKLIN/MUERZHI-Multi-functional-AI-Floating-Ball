// src/components/AiSettingsPanel.vue
// AI assistant settings — for the AI assistant window only
<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import type { AgentBridgeStatus } from '../env.d.ts'
import { t } from '../stores/i18n'

const claudeIntegrated = ref(false)
const bridgeStatus = ref<AgentBridgeStatus | null>(null)
const loading = ref(true)
const autoAllow = ref(false)
// 选择性自动审批：当前活跃会话（来自实时状态更新） + 已勾选会话 id 集合（来自主进程持久化）
const sessions = ref<any[]>([])
const autoAllowSessions = ref<string[]>([])
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

// 勾选/取消某会话的自动审批：乐观翻转 → 主进程落盘 → 成功用返回值刷新集合，失败回滚
async function toggleAutoAllowSession(sessionId: string) {
  const enabled = !autoAllowSessions.value.includes(sessionId)
  autoAllowSessions.value = enabled
    ? [...autoAllowSessions.value, sessionId]
    : autoAllowSessions.value.filter((id) => id !== sessionId)
  try {
    autoAllowSessions.value = await window.electronAPI.agentSetAutoAllowSession(sessionId, enabled)
  } catch (e) {
    console.error('[AiSettingsPanel] setAutoAllowSession error:', e)
    autoAllowSessions.value = enabled
      ? autoAllowSessions.value.filter((id) => id !== sessionId)
      : [...autoAllowSessions.value, sessionId]
  }
}

// 会话展示标签：优先标题（首条用户消息），无标题（如老会话/应用重启后未再发 prompt）退回 模型·工具·短id
function sessionLabel(s: any): string {
  if (typeof s.title === 'string' && s.title) return s.title
  const model = typeof s.model === 'string' && s.model ? s.model : 'Claude'
  const tool = typeof s.toolName === 'string' && s.toolName ? ` · ${s.toolName}` : ''
  const short = typeof s.sessionId === 'string' ? s.sessionId.slice(0, 8) : ''
  return `${model}${tool} · ${short}`
}

// === 审批/提问卡过期（真源在主进程 agent-settings.json，经 agent-card-expiry IPC读写） ===
const cardExpireEnabled = ref(true)
const cardExpireMinutes = ref(5)

async function loadCardExpiry() {
  try {
    const e = await window.electronAPI.agentGetCardExpiry()
    cardExpireEnabled.value = e.enabled
    // 主进程以秒存储（下限 10s），UI 以分钟编辑，秒级精度对用户无意义
    cardExpireMinutes.value = Math.max(1, Math.round(e.seconds / 60))
  } catch (e) {
    console.error('[AiSettingsPanel] loadCardExpiry error:', e)
  }
}

async function toggleCardExpire() {
  const prev = cardExpireEnabled.value
  cardExpireEnabled.value = !prev
  try {
    await window.electronAPI.agentSetCardExpiry(cardExpireEnabled.value, cardExpireMinutes.value * 60)
  } catch (e) {
    console.error('[AiSettingsPanel] toggleCardExpire error:', e)
    cardExpireEnabled.value = prev
  }
}

async function applyExpireMinutes() {
  // 输入框可能拿到空串/越界值，钳制后回写（后端还有 10..1800s 的最终钳制）
  const clamped = Math.min(30, Math.max(1, Math.round(Number(cardExpireMinutes.value) || 5)))
  cardExpireMinutes.value = clamped
  try {
    await window.electronAPI.agentSetCardExpiry(cardExpireEnabled.value, clamped * 60)
  } catch (e) {
    console.error('[AiSettingsPanel] applyExpireMinutes error:', e)
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
  sessions.value = data.sessions ?? []
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

onMounted(async () => {
  await loadAiStatus()
  // 读取自动允许设置
  try {
    autoAllow.value = await window.electronAPI.agentGetAutoAllow()
  } catch {}
  // 读取选择性自动审批的会话集合
  try {
    autoAllowSessions.value = await window.electronAPI.agentGetAutoAllowSessions()
  } catch {}
  // 读取审批/提问卡的过期设置
  loadCardExpiry()
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

      <!-- 多工具概览（已移除 Codex；仅含 Claude Code 时该块不再渲染） -->

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

          <!-- 选择性自动审批（按会话）：全局全部审批打开时逐会话无意义，隐藏 -->
          <template v-if="!autoAllow">
            <div class="session-title">{{ t('ai.autoAllowSessionTitle') }}</div>
            <div class="session-desc">{{ t('ai.autoAllowSessionDesc') }}</div>
            <div v-if="sessions.length === 0" class="session-empty">{{ t('ai.noActiveSession') }}</div>
            <div v-for="s in sessions" :key="s.sessionId" class="setting-row session-row">
              <div class="row-text">
                <div class="row-label session-label">{{ sessionLabel(s) }}</div>
              </div>
              <button
                class="toggle-btn"
                :class="{ on: autoAllowSessions.includes(s.sessionId) }"
                @click="toggleAutoAllowSession(s.sessionId)"
              >
                <span class="toggle-knob"></span>
              </button>
            </div>
          </template>

          <!-- 过期控制：常显——自动允许只作用于权限卡，提问卡仍会弹出并等待，过期对其有意义 -->
          <div class="setting-row expire-row">
            <div class="row-text">
              <div class="row-label">{{ t('ai.expireToggle') }}</div>
              <div class="row-desc">{{ t('ai.expireToggleDesc') }}</div>
            </div>
            <button class="toggle-btn" :class="{ on: cardExpireEnabled }" @click="toggleCardExpire">
              <span class="toggle-knob"></span>
            </button>
          </div>
          <div class="setting-row expire-row" v-show="cardExpireEnabled">
            <div class="row-text">
              <div class="row-label">{{ t('ai.expireTime') }}</div>
              <div class="row-desc">{{ t('ai.expireTimeDesc') }}</div>
            </div>
            <div class="expire-input">
              <input
                type="number"
                min="1"
                max="30"
                v-model.number="cardExpireMinutes"
                @change="applyExpireMinutes"
              />
              <span class="unit">{{ t('ai.minutes') }}</span>
            </div>
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

/* 选择性自动审批（按会话）块 */
.session-title {
  margin-top: 16px;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-primary);
}
.session-desc {
  font-size: 11px;
  color: var(--text-muted);
  margin-top: 2px;
  line-height: 1.4;
}
.session-empty {
  margin-top: 10px;
  padding: 10px 12px;
  border-radius: 8px;
  background: var(--surface-accent-bg);
  font-size: 12px;
  color: var(--text-muted);
  text-align: center;
}
.session-row .session-label {
  font-size: 12px;
  color: var(--text-muted);
  /* 标题可能较长：单行省略，不撑爆行 */
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 审批卡过期：开关 + 分钟输入；与上方按会话审批块留出间隔 */
.expire-row {
  margin-top: 12px;
}
.expire-input {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}
.expire-input input {
  width: 52px;
  padding: 5px 8px;
  font-size: 12px;
  font-weight: 600;
  text-align: right;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.7);
  border-top-color: rgba(255, 255, 255, 0.9);
  background: #fff;
  color: var(--text-primary);
  box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.08);
  outline: none;
}
.expire-input input:focus {
  border-color: var(--surface-accent);
}
.expire-input .unit {
  font-size: 12px;
  color: var(--text-secondary);
  white-space: nowrap;
}

</style>
