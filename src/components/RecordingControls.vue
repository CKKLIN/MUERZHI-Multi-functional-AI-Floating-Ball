<script setup lang="ts">
import { computed } from 'vue'
import { useRecordingStore } from '../stores/recording'

const store = useRecordingStore()

const emit = defineEmits<{
  start: []
  pause: []
  resume: []
  stop: []
  toggleCamera: []
  toggleMic: []
  toggleSystemAudio: []
  toggleDrawing: []
}>()

const hasSource = computed(() => !!store.selectedSource)
</script>

<template>
  <div class="recording-controls">
    <div class="aux-controls">
      <button
        class="btn btn-icon"
        :class="{ active: store.isCameraEnabled }"
        :disabled="!store.canStart"
        @click="emit('toggleCamera')"
        title="开启摄像头 (Ctrl+Shift+C)"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M23 7l-7 5 7 5V7z"/>
          <rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
        </svg>
      </button>
      <button
        class="btn btn-icon"
        :class="{ active: store.isMicrophoneEnabled }"
        :disabled="!store.canStart"
        @click="emit('toggleMic')"
        title="开启麦克风"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
          <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
          <line x1="12" y1="19" x2="12" y2="23"/>
          <line x1="8" y1="23" x2="16" y2="23"/>
        </svg>
      </button>
      <!-- <button
        class="btn btn-icon"
        :class="{ active: store.isSystemAudioEnabled }"
        :disabled="!store.canStart"
        @click="emit('toggleSystemAudio')"
        title="系统音频"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
          <path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
          <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
        </svg>
      </button> -->
      <!-- <button
        class="btn btn-icon"
        :class="{ active: store.isDrawingEnabled }"
        :disabled="!store.canStart"
        @click="emit('toggleDrawing')"
        title="画笔 (Ctrl+Shift+D)"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 19l7-7 3 3-7 7-3-3z"/>
          <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/>
          <path d="M2 2l7.586 7.586"/>
          <circle cx="11" cy="11" r="2"/>
        </svg>
      </button> -->
    </div>

    <div class="control-divider"></div>

    <div class="main-controls">
      <button
        v-if="store.canStart"
        class="btn record-btn"
        :disabled="!hasSource"
        @click="emit('start')"
        title="开始录制 (Ctrl+Shift+R)"
      >
        <span class="record-icon"></span>
        <span>录制</span>
      </button>

      <button
        v-if="store.canPause"
        class="btn pause-btn"
        @click="emit('pause')"
        title="暂停 (Ctrl+Shift+P)"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
          <rect x="6" y="4" width="4" height="16"/>
          <rect x="14" y="4" width="4" height="16"/>
        </svg>
        <span>暂停</span>
      </button>

      <button
        v-if="store.canResume"
        class="btn resume-btn"
        @click="emit('resume')"
        title="继续 (Ctrl+Shift+P)"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
          <polygon points="5,3 19,12 5,21"/>
        </svg>
        <span>继续</span>
      </button>

      <button
        v-if="store.canStop"
        class="btn stop-btn"
        @click="emit('stop')"
        title="停止录制 (Ctrl+Shift+R)"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
          <rect x="6" y="6" width="12" height="12" rx="1"/>
        </svg>
        <span>停止</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.recording-controls {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px 16px;
  background: linear-gradient(180deg, #f0f0f4 0%, #e4e4ea 100%);
  border-top: 1px solid rgba(255, 255, 255, 0.5);
  flex-shrink: 0;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.6);
}

.aux-controls {
  display: flex;
  gap: 4px;
}

.main-controls {
  display: flex;
  gap: 6px;
}

/* 通用3D按钮基础 */
.main-controls .btn,
.aux-controls .btn-icon {
  border: 1px solid rgba(255, 255, 255, 0.7);
  border-top-color: rgba(255, 255, 255, 0.9);
  border-left-color: rgba(255, 255, 255, 0.85);
  border-right-color: rgba(200, 200, 210, 0.4);
  border-bottom-color: rgba(190, 190, 200, 0.5);
  box-shadow:
    3px 3px 8px rgba(0, 0, 0, 0.1),
    1px 1px 2px rgba(0, 0, 0, 0.06),
    inset 1px 1px 2px rgba(255, 255, 255, 0.9),
    inset -1px -1px 0 rgba(0, 0, 0, 0.04);
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  text-shadow: 0 1px 0 rgba(255, 255, 255, 0.3);
}

.main-controls .btn:hover:not(:disabled),
.aux-controls .btn-icon:hover:not(:disabled) {
  box-shadow:
    5px 5px 14px rgba(0, 0, 0, 0.12),
    2px 2px 4px rgba(0, 0, 0, 0.08),
    inset 1px 1px 2px rgba(255, 255, 255, 0.95),
    inset -1px -1px 0 rgba(0, 0, 0, 0.03);
  transform: translate(-1px, -1px);
}

.main-controls .btn:active:not(:disabled),
.aux-controls .btn-icon:active:not(:disabled) {
  border-color: rgba(175, 175, 190, 0.5);
  border-top-color: rgba(190, 190, 205, 0.6);
  border-left-color: rgba(185, 185, 200, 0.55);
  border-right-color: rgba(160, 160, 175, 0.45);
  border-bottom-color: rgba(155, 155, 170, 0.5);
  box-shadow:
    inset 2px 2px 6px rgba(0, 0, 0, 0.15),
    inset 1px 1px 2px rgba(0, 0, 0, 0.1),
    inset -1px -1px 1px rgba(255, 255, 255, 0.2);
  transform: translate(1px, 1px);
}

/* 录制按钮 */
.record-btn {
  background: linear-gradient(135deg, #ff6b81 0%, #e94560 100%);
  border-color: rgba(255, 140, 160, 0.5);
  border-top-color: rgba(255, 180, 195, 0.6);
  border-left-color: rgba(255, 170, 185, 0.55);
  color: white;
  font-weight: 600;
  padding: 7px 18px;
  gap: 7px;
  font-size: 12px;
  border-radius: 12px;
  box-shadow:
    4px 4px 12px rgba(233, 69, 96, 0.35),
    1px 1px 3px rgba(233, 69, 96, 0.2),
    inset 1px 1px 2px rgba(255, 255, 255, 0.4),
    inset -1px -1px 0 rgba(0, 0, 0, 0.1);
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.15);
}

.record-btn:hover:not(:disabled) {
  background: linear-gradient(135deg, #ff8599 0%, #ff6b81 100%);
  border-top-color: rgba(255, 200, 210, 0.7);
  box-shadow:
    6px 6px 18px rgba(233, 69, 96, 0.4),
    2px 2px 5px rgba(233, 69, 96, 0.25),
    inset 1px 1px 2px rgba(255, 255, 255, 0.5),
    inset -1px -1px 0 rgba(0, 0, 0, 0.08);
}

.record-btn:active:not(:disabled) {
  background: linear-gradient(135deg, #d93d56 0%, #c23050 100%);
  border-color: rgba(180, 50, 70, 0.5);
  border-top-color: rgba(200, 60, 80, 0.6);
  box-shadow:
    inset 3px 3px 8px rgba(0, 0, 0, 0.2),
    inset 1px 1px 3px rgba(0, 0, 0, 0.15),
    inset -1px -1px 1px rgba(255, 255, 255, 0.15);
}

.record-icon {
  width: 10px;
  height: 10px;
  background: white;
  border-radius: 50%;
  display: inline-block;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.15);
}

/* 暂停按钮 */
.pause-btn {
  background: linear-gradient(135deg, #fff8e1 0%, #ffe082 100%);
  border-color: rgba(255, 220, 130, 0.5);
  border-top-color: rgba(255, 235, 170, 0.6);
  border-left-color: rgba(255, 230, 160, 0.55);
  color: #b8860b;
  gap: 5px;
  font-size: 12px;
  font-weight: 600;
  padding: 7px 16px;
  border-radius: 12px;
  box-shadow:
    4px 4px 12px rgba(212, 160, 23, 0.3),
    1px 1px 3px rgba(212, 160, 23, 0.15),
    inset 1px 1px 2px rgba(255, 255, 255, 0.7),
    inset -1px -1px 0 rgba(0, 0, 0, 0.05);
  text-shadow: 0 1px 0 rgba(255, 255, 255, 0.6);
}

.pause-btn:hover:not(:disabled) {
  background: linear-gradient(135deg, #fffde7 0%, #ffecb3 100%);
  border-top-color: rgba(255, 240, 180, 0.7);
  box-shadow:
    6px 6px 18px rgba(212, 160, 23, 0.35),
    2px 2px 5px rgba(212, 160, 23, 0.2),
    inset 1px 1px 2px rgba(255, 255, 255, 0.8),
    inset -1px -1px 0 rgba(0, 0, 0, 0.03);
}

.pause-btn:active:not(:disabled) {
  background: linear-gradient(135deg, #ffe082 0%, #ffd54f 100%);
  border-color: rgba(200, 150, 20, 0.5);
  border-top-color: rgba(210, 160, 30, 0.6);
  box-shadow:
    inset 2px 2px 6px rgba(0, 0, 0, 0.15),
    inset 1px 1px 2px rgba(0, 0, 0, 0.1),
    inset -1px -1px 1px rgba(255, 255, 255, 0.3);
}

/* 继续按钮 */
.resume-btn {
  background: linear-gradient(135deg, #e8f5e9 0%, #a5d6a7 100%);
  border-color: rgba(165, 214, 167, 0.5);
  border-top-color: rgba(200, 230, 200, 0.6);
  border-left-color: rgba(190, 225, 192, 0.55);
  color: #2e7d32;
  gap: 5px;
  font-size: 12px;
  font-weight: 600;
  padding: 7px 16px;
  border-radius: 12px;
  box-shadow:
    4px 4px 12px rgba(46, 168, 122, 0.3),
    1px 1px 3px rgba(46, 168, 122, 0.15),
    inset 1px 1px 2px rgba(255, 255, 255, 0.7),
    inset -1px -1px 0 rgba(0, 0, 0, 0.05);
  text-shadow: 0 1px 0 rgba(255, 255, 255, 0.6);
}

.resume-btn:hover:not(:disabled) {
  background: linear-gradient(135deg, #f1f8e9 0%, #c8e6c9 100%);
  border-top-color: rgba(210, 240, 210, 0.7);
  box-shadow:
    6px 6px 18px rgba(46, 168, 122, 0.35),
    2px 2px 5px rgba(46, 168, 122, 0.2),
    inset 1px 1px 2px rgba(255, 255, 255, 0.8),
    inset -1px -1px 0 rgba(0, 0, 0, 0.03);
}

.resume-btn:active:not(:disabled) {
  background: linear-gradient(135deg, #a5d6a7 0%, #81c784 100%);
  border-color: rgba(60, 140, 80, 0.5);
  border-top-color: rgba(70, 150, 90, 0.6);
  box-shadow:
    inset 2px 2px 6px rgba(0, 0, 0, 0.15),
    inset 1px 1px 2px rgba(0, 0, 0, 0.1),
    inset -1px -1px 1px rgba(255, 255, 255, 0.3);
}

/* 停止按钮 */
.stop-btn {
  background: linear-gradient(135deg, #ffffff 0%, #e8e8f0 100%);
  border-color: rgba(255, 255, 255, 0.7);
  border-top-color: rgba(255, 255, 255, 0.9);
  border-left-color: rgba(255, 255, 255, 0.85);
  border-right-color: rgba(200, 200, 210, 0.4);
  border-bottom-color: rgba(190, 190, 200, 0.5);
  color: var(--text-primary);
  gap: 5px;
  font-size: 12px;
  font-weight: 600;
  padding: 7px 16px;
  border-radius: 12px;
  box-shadow:
    4px 4px 12px rgba(0, 0, 0, 0.1),
    1px 1px 3px rgba(0, 0, 0, 0.06),
    inset 1px 1px 2px rgba(255, 255, 255, 0.9),
    inset -1px -1px 0 rgba(0, 0, 0, 0.04);
  text-shadow: 0 1px 0 rgba(255, 255, 255, 0.5);
}

.stop-btn:hover:not(:disabled) {
  background: linear-gradient(135deg, #ffffff 0%, #ededf4 100%);
  border-top-color: rgba(255, 255, 255, 0.95);
  box-shadow:
    6px 6px 18px rgba(0, 0, 0, 0.12),
    2px 2px 5px rgba(0, 0, 0, 0.08),
    inset 1px 1px 2px rgba(255, 255, 255, 0.95),
    inset -1px -1px 0 rgba(0, 0, 0, 0.03);
}

.stop-btn:active:not(:disabled) {
  background: linear-gradient(135deg, #ebebf0 0%, #dedee6 100%);
  border-color: rgba(175, 175, 190, 0.5);
  border-top-color: rgba(190, 190, 205, 0.6);
  box-shadow:
    inset 2px 2px 6px rgba(0, 0, 0, 0.15),
    inset 1px 1px 2px rgba(0, 0, 0, 0.1),
    inset -1px -1px 1px rgba(255, 255, 255, 0.2);
}

/* 辅助按钮(摄像头/麦克风) */
.aux-controls .btn-icon {
  background: linear-gradient(135deg, #ffffff 0%, #e8e8f0 100%);
  border-radius: 10px;
}

.aux-controls .btn-icon.active {
  background: linear-gradient(135deg, #fce4ec 0%, #f8bbd0 100%);
  border-color: rgba(255, 150, 170, 0.4);
  border-top-color: rgba(255, 180, 195, 0.5);
  color: var(--accent);
  box-shadow:
    3px 3px 8px rgba(233, 69, 96, 0.2),
    1px 1px 2px rgba(233, 69, 96, 0.1),
    inset 1px 1px 2px rgba(255, 255, 255, 0.7),
    inset -1px -1px 0 rgba(233, 69, 96, 0.05);
}

.aux-controls .btn-icon.active:hover:not(:disabled) {
  background: linear-gradient(135deg, #fde0e8 0%, #f8c0d0 100%);
}

.aux-controls .btn-icon:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  box-shadow: none;
  transform: none !important;
}

.aux-controls .btn-icon svg {
  filter: drop-shadow(0 1px 1px rgba(0, 0, 0, 0.08));
}
</style>
