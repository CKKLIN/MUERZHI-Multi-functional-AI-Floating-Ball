<script setup lang="ts">
import { computed } from 'vue'
import { useRecordingStore } from '../stores/recording'
import { formatTime } from '../utils/format-time'

const store = useRecordingStore()

const displayTime = computed(() => formatTime(store.elapsedSeconds))
const isActive = computed(() => store.isRecording || store.isPaused)
</script>

<template>
  <div v-if="isActive" class="timer">
    <div v-if="store.isRecording" class="recording-dot"></div>
    <div v-if="store.isPaused" class="paused-dot"></div>
    <span class="time">{{ displayTime }}</span>
    <span v-if="store.isPaused" class="paused-label">已暂停</span>
  </div>
</template>

<style scoped>
.timer {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 16px;
  font-size: 12px;
}

.time {
  font-family: var(--font-mono);
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
  letter-spacing: 0.5px;
}

.paused-dot {
  width: 8px;
  height: 8px;
  background: var(--warning);
  border-radius: 2px;
}

.paused-label {
  color: var(--warning);
  font-size: 11px;
  font-weight: 600;
}
</style>
