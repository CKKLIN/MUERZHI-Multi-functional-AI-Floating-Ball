// src/components/AiSettingsPanel.vue
// AI assistant settings — for the AI assistant window only
<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import type { AgentBridgeStatus } from '../env.d.ts'
import { t } from '../stores/i18n'

const claudeIntegrated = ref(false)
const antigravityIntegrated = ref(false)
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
    const status = await window.muerzhiAPI.agentGetStatus()
    if (status) {
      bridgeStatus.value = status
      claudeIntegrated.value = status.hookInstalled === true
      antigravityIntegrated.value = status.antigravityHookInstalled === true
      if (Array.isArray(status.sessions)) {
        sessions.value = status.sessions
      }
    }
  } catch (e) {
    console.error('[AiSettingsPanel] loadAiStatus error:', e)
  }
  loading.value = false
}

async function toggleClaudeIntegration() {
  if (claudeIntegrated.value) {
    await window.muerzhiAPI.agentUninstallHooks()
    claudeIntegrated.value = false
  } else {
    const status = await window.muerzhiAPI.agentInstallHooks()
    claudeIntegrated.value = status?.hookInstalled === true
  }
  await loadAiStatus()
}

async function toggleAutoAllow() {
  autoAllow.value = !autoAllow.value
  try {
    await window.muerzhiAPI.agentSetAutoAllow(autoAllow.value)
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
    autoAllowSessions.value = await window.muerzhiAPI.agentSetAutoAllowSession(sessionId, enabled)
  } catch (e) {
    console.error('[AiSettingsPanel] setAutoAllowSession error:', e)
    autoAllowSessions.value = enabled
      ? autoAllowSessions.value.filter((id) => id !== sessionId)
      : [...autoAllowSessions.value, sessionId]
  }
}

function isAntigravity(s: any): boolean {
  return (
    s.agentId === 'antigravity' ||
    (typeof s.model === 'string' && s.model.toLowerCase().includes('gemini'))
  )
}

function sessionTitle(s: any): string {
  if (typeof s.title === 'string' && s.title.trim()) return s.title
  const isAnti = isAntigravity(s)
  const name = isAnti ? 'Antigravity' : 'Claude'
  const short = typeof s.sessionId === 'string' ? s.sessionId.slice(0, 8) : ''
  return `${name} · ${short}`
}

function sessionSub(s: any): string {
  const parts: string[] = []
  if (typeof s.model === 'string' && s.model) {
    parts.push(s.model)
  }
  if (typeof s.toolName === 'string' && s.toolName) {
    parts.push(s.toolName)
  }
  if (typeof s.sessionId === 'string' && s.sessionId) {
    parts.push(s.sessionId.slice(0, 8))
  }
  return parts.join(' · ')
}

function sessionLabel(s: any): string {
  const isAnti = isAntigravity(s)
  const prefix = isAnti ? '[Antigravity] ' : '[Claude] '
  if (typeof s.title === 'string' && s.title) return `${prefix}${s.title}`
  const model = typeof s.model === 'string' && s.model ? s.model : (isAnti ? 'Antigravity' : 'Claude')
  const tool = typeof s.toolName === 'string' && s.toolName ? ` · ${s.toolName}` : ''
  const short = typeof s.sessionId === 'string' ? s.sessionId.slice(0, 8) : ''
  return `${prefix}${model}${tool} · ${short}`
}

// === 审批/提问卡过期（真源在主进程 agent-settings.json，经 agent-card-expiry IPC读写） ===
const cardExpireEnabled = ref(true)
const cardExpireMinutes = ref(5)

async function loadCardExpiry() {
  try {
    const e = await window.muerzhiAPI.agentGetCardExpiry()
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
    await window.muerzhiAPI.agentSetCardExpiry(cardExpireEnabled.value, cardExpireMinutes.value * 60)
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
    await window.muerzhiAPI.agentSetCardExpiry(cardExpireEnabled.value, clamped * 60)
  } catch (e) {
    console.error('[AiSettingsPanel] applyExpireMinutes error:', e)
  }
}

async function toggleIslandFlat() {
  if (!islandFlatLoaded.value) return // 初始值尚未读回，先不响应，避免与初始 get 竞态
  islandFlat.value = !islandFlat.value
  try {
    await window.muerzhiAPI.setAiIslandSettings({ flat: islandFlat.value })
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
    autoAllow.value = await window.muerzhiAPI.agentGetAutoAllow()
  } catch {}
  // 读取选择性自动审批的会话集合
  try {
    autoAllowSessions.value = await window.muerzhiAPI.agentGetAutoAllowSessions()
  } catch {}
  // 读取审批/提问卡的过期设置
  loadCardExpiry()
  // 读取 AI 岛外观设置（横条态）
  try {
    const s = await window.muerzhiAPI.getAiIslandSettings()
    islandFlat.value = s.flat === true
  } catch {}
  // 初始值已读回，之后允许 toggle
  islandFlatLoaded.value = true
  // 保留轮询作为兜底，但主要依赖实时更新；窗口隐藏（AI 窗是 hide 不是 destroy）
  // 时暂停轮询——不可见时的 5s IPC 往返纯属浪费
  statusInterval = window.setInterval(() => {
    if (document.hidden) return
    loadAiStatus()
  }, 5000)

  // 监听实时状态更新
  const cleanupState = window.muerzhiAPI.onAgentStateUpdate(onAgentStateUpdate)

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
            <div class="model-badge badge-claude">
              <svg class="model-logo-svg" viewBox="0 0 24 24" width="16" height="16" fill="none">
                <path d="M4.714 15.956l4.718-2.648.079-.23-.079-.128h-.23l-.79-.049-2.695-.073-2.338-.097-2.264-.122-.571-.121-.534-.704.054-.353.48-.321.686.06 1.518.104 2.277.158 1.651.097 2.447.255h.388l.055-.158-.134-.097-.103-.097L6.973 9.836 4.423 8.148l-1.336-.971-.722-.492-.365-.461-.158-1.008.656-.723.88.06.225.061.892.686 1.907 1.476 2.489 1.833.364.304.146-.103.018-.073-.164-.273-1.354-2.447-1.445-2.49-.643-1.031-.17-.62a2.02 2.02 0 0 1-.104-.728L6.287.133 6.7 0l.996.134.419.364.619 1.415 1.002 2.228 1.554 3.03.455.898.243.832.091.255h.158v-.146l.128-1.706.236-2.095.231-2.695.079-.76.376-.91.747-.492.583.28.48.685-.067.444-.285 1.851-.559 2.902-.364 1.943h.212l.243-.243.984-1.305 1.651-2.065.729-.82.85-.904.546-.431h1.032l.759 1.13-.34 1.165-1.062 1.348-.881 1.141-1.263 1.7-.789 1.36.073.11.188-.019 2.854-.607 1.542-.28 1.84-.315.831.388.092.395-.328.807-1.967.486-2.307.461-3.437.814-.042.03.048.061 1.549.146.661.036h1.622l3.017.225.79.522.473.638-.079.485-1.214.62-1.639-.389-3.825-.91-1.312-.328h-.182v.109l1.093 1.069 2.003 1.809 2.508 2.331.127.577-.321.455-.34-.048-2.204-1.658-.85-.747-1.925-1.621h-.128v.17l.444.65 2.343 3.52.122 1.082-.17.352-.608.212-.667-.121-1.373-1.925L14.38 17.96l-1.141-1.943-.14.079-.674 7.255-.316.37-.728.28-.607-.462-.322-.747.322-1.475.388-1.925.316-1.53.285-1.9.17-.632-.012-.042-.14.018-1.433 1.967-2.18 2.945-1.724 1.846-.413.164-.716-.37.066-.662.401-.589 2.386-3.036 1.439-1.882.929-1.087-.006-.158h-.055L4.714 15.956z" fill="#D97757"/>
              </svg>
            </div>
            <div class="row-text">
              <div class="row-label">Claude Code</div>
              <div class="row-desc">{{ t('ai.claudeHooksDesc') }}</div>
            </div>
            <button class="toggle-btn" :class="{ on: claudeIntegrated }" @click="toggleClaudeIntegration">
              <span class="toggle-knob"></span>
            </button>
          </div>
          <div class="setting-row">
            <div class="model-badge badge-antigravity">
              <svg class="model-logo-svg" viewBox="0 0 24 24" width="16" height="16" fill="none">
                <path d="M12 2C12 7.523 16.477 12 22 12C16.477 12 12 16.477 12 22C12 16.477 7.523 12 2 12C7.523 12 12 7.523 12 2Z" fill="url(#gemini-sparkle-grad)"/>
                <defs>
                  <linearGradient id="gemini-sparkle-grad" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stop-color="#4285F4"/>
                    <stop offset="50%" stop-color="#9B72CB"/>
                    <stop offset="100%" stop-color="#D96570"/>
                  </linearGradient>
                </defs>
              </svg>
            </div>
            <div class="row-text">
              <div class="row-label">Google Antigravity</div>
              <div class="row-desc">{{ t('ai.antigravityHooksDesc') }}</div>
            </div>
            <button class="toggle-btn" :class="{ on: antigravityIntegrated }" @click="toggleAntigravityIntegration">
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
              <div class="model-badge" :class="isAntigravity(s) ? 'badge-antigravity' : 'badge-claude'" :title="isAntigravity(s) ? 'Google Antigravity' : 'Claude Code'">
                <svg v-if="!isAntigravity(s)" class="model-logo-svg" viewBox="0 0 24 24" width="15" height="15" fill="none">
                  <path d="M4.714 15.956l4.718-2.648.079-.23-.079-.128h-.23l-.79-.049-2.695-.073-2.338-.097-2.264-.122-.571-.121-.534-.704.054-.353.48-.321.686.06 1.518.104 2.277.158 1.651.097 2.447.255h.388l.055-.158-.134-.097-.103-.097L6.973 9.836 4.423 8.148l-1.336-.971-.722-.492-.365-.461-.158-1.008.656-.723.88.06.225.061.892.686 1.907 1.476 2.489 1.833.364.304.146-.103.018-.073-.164-.273-1.354-2.447-1.445-2.49-.643-1.031-.17-.62a2.02 2.02 0 0 1-.104-.728L6.287.133 6.7 0l.996.134.419.364.619 1.415 1.002 2.228 1.554 3.03.455.898.243.832.091.255h.158v-.146l.128-1.706.236-2.095.231-2.695.079-.76.376-.91.747-.492.583.28.48.685-.067.444-.285 1.851-.559 2.902-.364 1.943h.212l.243-.243.984-1.305 1.651-2.065.729-.82.85-.904.546-.431h1.032l.759 1.13-.34 1.165-1.062 1.348-.881 1.141-1.263 1.7-.789 1.36.073.11.188-.019 2.854-.607 1.542-.28 1.84-.315.831.388.092.395-.328.807-1.967.486-2.307.461-3.437.814-.042.03.048.061 1.549.146.661.036h1.622l3.017.225.79.522.473.638-.079.485-1.214.62-1.639-.389-3.825-.91-1.312-.328h-.182v.109l1.093 1.069 2.003 1.809 2.508 2.331.127.577-.321.455-.34-.048-2.204-1.658-.85-.747-1.925-1.621h-.128v.17l.444.65 2.343 3.52.122 1.082-.17.352-.608.212-.667-.121-1.373-1.925L14.38 17.96l-1.141-1.943-.14.079-.674 7.255-.316.37-.728.28-.607-.462-.322-.747.322-1.475.388-1.925.316-1.53.285-1.9.17-.632-.012-.042-.14.018-1.433 1.967-2.18 2.945-1.724 1.846-.413.164-.716-.37.066-.662.401-.589 2.386-3.036 1.439-1.882.929-1.087-.006-.158h-.055L4.714 15.956z" fill="#D97757"/>
                </svg>
                <svg v-else class="model-logo-svg" viewBox="0 0 24 24" width="15" height="15" fill="none">
                  <path d="M12 2C12 7.523 16.477 12 22 12C16.477 12 12 16.477 12 22C12 16.477 7.523 12 2 12C7.523 12 12 7.523 12 2Z" fill="url(#gemini-sparkle-grad)"/>
                </svg>
              </div>
              <div class="row-text">
                <div class="row-label session-label">{{ sessionTitle(s) }}</div>
                <div class="session-sub" v-if="sessionSub(s)">{{ sessionSub(s) }}</div>
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
  flex: 1;
  min-height: 0;
}

.settings-body {
  overflow-y: auto;
  flex: 1;
  min-height: 0;
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
/* 模型专属 Logo 徽标 */
.model-badge {
  width: 28px;
  height: 28px;
  border-radius: 7px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.45);
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}
.model-badge:hover {
  transform: scale(1.05);
}
.model-badge.badge-claude {
  background: linear-gradient(135deg, rgba(217, 119, 87, 0.18) 0%, rgba(204, 107, 73, 0.08) 100%);
  border: 1px solid rgba(217, 119, 87, 0.28);
}
.model-badge.badge-antigravity {
  background: linear-gradient(135deg, rgba(66, 133, 244, 0.18) 0%, rgba(155, 114, 203, 0.1) 100%);
  border: 1px solid rgba(66, 133, 244, 0.28);
}
.model-logo-svg {
  display: block;
}

.session-row {
  display: flex;
  align-items: center;
  gap: 10px;
}
.session-row .session-label {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-primary);
  /* 标题可能较长：单行省略，不撑爆行 */
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.session-sub {
  font-size: 11px;
  color: var(--text-muted);
  margin-top: 2px;
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
