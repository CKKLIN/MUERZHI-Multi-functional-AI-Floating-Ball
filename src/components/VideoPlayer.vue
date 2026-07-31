<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import type { Recording } from '../stores/recording'

const props = defineProps<{
  recording: Recording
}>()

const emit = defineEmits<{
  close: []
}>()

const videoRef = ref<HTMLVideoElement | null>(null)
// 用 local-video:// 协议流式播放本地文件，不读整文件进内存
const videoUrl = ref(window.electronAPI.toLocalVideoUrl(props.recording.filePath))

onMounted(() => {
  // 协议 URL 同步可用，无需加载等待
})

function cleanup() {
  const el = videoRef.value
  if (el) {
    el.pause()
    el.removeAttribute('src')
    el.load()
  }
}

function onClose() {
  cleanup()
  emit('close')
}

// 父组件 v-if 切换关闭时不触发 onClose，必须在此清理 video 解码器
onUnmounted(() => {
  cleanup()
})
</script>

<template>
  <div class="modal-overlay" @click.self="onClose">
    <div class="video-modal">
      <div class="modal-header">
        <h3>{{ recording.fileName }}</h3>
        <button class="btn btn-icon btn-sm" @click="onClose">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
      <div class="video-container">
        <video
          ref="videoRef"
          :src="videoUrl"
          controls
          autoplay
          class="video-player"
        />
      </div>
      <div class="modal-footer">
        <span class="meta">时长: {{ recording.duration }}秒</span>
        <button class="btn btn-sm" @click="window.electronAPI.openFileLocation(recording.filePath)">
          打开文件夹
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.video-modal {
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  width: 720px;
  max-width: 90vw;
  max-height: 90vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-shadow: var(--shadow-lg);
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border);
}

.modal-header h3 {
  font-size: 14px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 500px;
}

.video-container {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #000;
  min-height: 300px;
}

.video-player {
  width: 100%;
  max-height: 70vh;
}

.loading {
  color: var(--text-muted);
  padding: 40px;
}

.modal-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  border-top: 1px solid var(--border);
}

.meta {
  font-size: 12px;
  color: var(--text-muted);
}
</style>
