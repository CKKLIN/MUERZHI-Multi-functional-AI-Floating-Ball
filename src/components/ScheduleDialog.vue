<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRecordingStore } from '../stores/recording'
import { t } from '../stores/i18n'

const emit = defineEmits<{
  close: []
  start: []
}>()

const store = useRecordingStore()

const mode = ref<'minutes' | 'datetime'>('minutes')
const delayMinutes = ref(5)
const scheduledDate = ref('')
const scheduledTime = ref('')

const isScheduled = ref(false)
const countdown = ref('')
let timer: ReturnType<typeof setInterval> | null = null

const countdownText = computed(() => {
  if (!isScheduled.value) return ''
  return countdown.value
})

function scheduleMinutes() {
  const ms = delayMinutes.value * 60 * 1000
  const target = Date.now() + ms
  startCountdown(target)
}

function scheduleDatetime() {
  if (!scheduledDate.value || !scheduledTime.value) return
  const target = new Date(`${scheduledDate.value}T${scheduledTime.value}`).getTime()
  if (target <= Date.now()) {
    alert(t('sched.future'))
    return
  }
  startCountdown(target)
}

function startCountdown(targetMs: number) {
  isScheduled.value = true

  timer = setInterval(() => {
    const remaining = targetMs - Date.now()
    if (remaining <= 0) {
      clearInterval(timer!)
      isScheduled.value = false
      countdown.value = ''
      emit('start')
      emit('close')
      return
    }
    const mins = Math.floor(remaining / 60000)
    const secs = Math.floor((remaining % 60000) / 1000)
    countdown.value = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }, 1000)
}

function cancelSchedule() {
  if (timer) clearInterval(timer)
  isScheduled.value = false
  countdown.value = ''
}

// 设置默认日期为今天
const today = new Date().toISOString().slice(0, 10)
scheduledDate.value = today
const nowTime = new Date()
nowTime.setMinutes(nowTime.getMinutes() + 5)
scheduledTime.value = nowTime.toTimeString().slice(0, 5)
</script>

<template>
  <div class="modal-overlay" @click.self="emit('close')">
    <div class="schedule-modal modal">
      <div class="modal-header">
        <h3>{{ t('sched.title') }}</h3>
        <button class="btn btn-icon btn-sm" @click="emit('close')">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>

      <div v-if="isScheduled" class="countdown-view">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2" class="pulse-icon">
          <circle cx="12" cy="12" r="10"/>
          <polyline points="12 6 12 12 16 14"/>
        </svg>
        <p class="countdown-time">{{ countdown }}</p>
        <p class="countdown-label">{{ t('sched.aboutToStart') }}...</p>
        <button class="btn btn-sm" @click="cancelSchedule">{{ t('common.cancel') }}</button>
      </div>

      <div v-else class="schedule-body">
        <!-- 模式切换 -->
        <div class="mode-tabs">
          <button
            class="tab"
            :class="{ active: mode === 'minutes' }"
            @click="mode = 'minutes'"
          >{{ t('sched.countdown') }}</button>
          <button
            class="tab"
            :class="{ active: mode === 'datetime' }"
            @click="mode = 'datetime'"
          >{{ t('sched.scheduled') }}</button>
        </div>

        <!-- 倒计时模式 -->
        <div v-if="mode === 'minutes'" class="schedule-form">
          <div class="form-group">
            <label>{{ t('sched.delay') }}（{{ t('sched.minutes') }}）</label>
            <input
              type="number"
              class="input"
              v-model.number="delayMinutes"
              min="1"
              max="1440"
            />
          </div>
          <div class="quick-options">
            <button v-for="m in [1, 5, 10, 30]" :key="m" class="btn btn-sm" @click="delayMinutes = m">
              {{ m }}{{ t('sched.minutes') }}
            </button>
          </div>
          <button class="btn btn-primary" @click="scheduleMinutes">
            {{ t('sched.startCountdown') }}
          </button>
        </div>

        <!-- 指定时间模式 -->
        <div v-if="mode === 'datetime'" class="schedule-form">
          <div class="form-group">
            <label>{{ t('sched.date') }}</label>
            <input type="date" class="input" v-model="scheduledDate" :min="today" />
          </div>
          <div class="form-group">
            <label>{{ t('sched.time') }}</label>
            <input type="time" class="input" v-model="scheduledTime" />
          </div>
          <button class="btn btn-primary" @click="scheduleDatetime">
            {{ t('sched.set') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.schedule-modal {
  min-width: 340px;
}

.countdown-view {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 24px 0;
}

.countdown-time {
  font-size: 48px;
  font-family: var(--font-mono);
  font-weight: 700;
  color: var(--text-primary);
  letter-spacing: 4px;
}

.countdown-label {
  color: var(--text-secondary);
  font-size: 13px;
}

@keyframes pulseScale {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.1); }
}

.pulse-icon {
  animation: pulseScale 2s infinite;
}

.mode-tabs {
  display: flex;
  gap: 2px;
  margin-bottom: 16px;
  padding: 3px;
  border: 1px solid rgba(255, 255, 255, 0.7);
  border-radius: var(--radius);
  background: linear-gradient(180deg, #e6e6ea 0%, #dcdce2 100%);
  box-shadow: inset 1px 1px 2px rgba(0, 0, 0, 0.12);
}

.tab {
  flex: 1;
  padding: 6px 12px;
  border: 1px solid transparent;
  border-radius: calc(var(--radius) - 4px);
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  font-size: 13px;
  transition: all 0.2s var(--bevel-ease);
}

.tab.active {
  background: var(--surface-grad);
  color: var(--text-primary);
  font-weight: 600;
  border-color: rgba(255, 255, 255, 0.7);
  border-top-color: rgba(255, 255, 255, 0.9);
  border-left-color: rgba(255, 255, 255, 0.85);
  border-right-color: rgba(200, 200, 210, 0.4);
  border-bottom-color: rgba(190, 190, 200, 0.5);
  box-shadow: var(--bevel-shadow);
}

.tab:hover:not(.active) {
  background: rgba(255, 255, 255, 0.5);
  color: var(--text-primary);
}

.schedule-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.form-group {
  display: flex;
  align-items: center;
  gap: 12px;
}

.form-group label {
  font-size: 13px;
  color: var(--text-secondary);
  min-width: 50px;
}

.form-group .input {
  flex: 1;
}

.quick-options {
  display: flex;
  gap: 6px;
}

.btn-primary {
  margin-top: 4px;
}
</style>
