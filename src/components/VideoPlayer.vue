<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import type { Recording } from '../stores/recording'

const props = defineProps<{
  recording: Recording
}>()

const emit = defineEmits<{
  close: []
}>()

const videoRef = ref<HTMLVideoElement | null>(null)
const blobUrl = ref('')
const isLoading = ref(true)

onMounted(async () => {
  try {
    const buffer = await window.electronAPI.readFile(props.recording.filePath)
    const ext = props.recording.filePath.split('.').pop()?.toLowerCase()
    const mime = ext === 'mp4' ? 'video/mp4' : 'video/webm'
    blobUrl.value = URL.createObjectURL(new Blob([buffer], { type: mime }))
  } catch (err) {
    console.error('无法加载视频:', err)
  } finally {
    isLoading.value = false
  }
})

watch([videoRef, blobUrl], ([el, url]) => {
  if (el && url) {
    el.src = url
  }
})

function onClose() {
  if (blobUrl.value) {
    URL.revokeObjectURL(blobUrl.value)
  }
  emit('close')
}
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
        <div v-if="isLoading" class="loading">加载视频...</div>
        <video
          v-else
          ref="videoRef"
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
