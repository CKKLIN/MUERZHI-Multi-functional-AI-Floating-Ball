<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useRecordingStore } from '../stores/recording'
import log from '../log'
import { t } from '../stores/i18n'

const props = defineProps<{
  filePath: string
  target: 'gif'
}>()

const emit = defineEmits<{
  close: []
}>()

const store = useRecordingStore()
const progress = ref(0)
const statusText = ref(t('convert.preparingDots'))
const isDone = ref(false)
const gifPath = ref('')

function handleOpenFolder() {
  if (gifPath.value) {
    window.electronAPI.openFileLocation(gifPath.value)
  }
}

let cleanup: (() => void) | null = null

onMounted(async () => {
  cleanup = window.electronAPI.onConversionProgress((p) => {
    progress.value = p.percent
    statusText.value = t('convert.progress', { n: Math.round(p.percent) })
  })

  try {
    const outputPath = props.filePath.replace(/\.[^.]+$/, '.gif')

    statusText.value = t('convert.startDots')

    const result = await window.electronAPI.convertToGif(props.filePath, outputPath, {
      width: 480,
      fps: 10,
    })

    if (result.success) {
      isDone.value = true
      gifPath.value = outputPath
      statusText.value = t('convert.doneEx')
      progress.value = 100

      const size = await window.electronAPI.getFileSize(outputPath)
      store.addRecording({
        id: crypto.randomUUID(),
        filePath: outputPath,
        fileName: outputPath.split('\\').pop() || 'output.gif',
        duration: 0,
        fileSize: size,
        createdAt: Date.now(),
      })
      log.info('GIF conversion completed:', outputPath)
    } else {
      statusText.value = t('convert.failedColon', { e: result.error })
      log.error('GIF conversion failed:', result.error)
    }
  } catch (err: any) {
    statusText.value = t('convert.failedColon', { e: err.message })
    log.error('GIF conversion error:', err.message)
  }
})

onUnmounted(() => {
  cleanup?.()
})
</script>

<template>
  <div class="modal-overlay">
    <div class="conversion-modal modal">
      <div class="modal-header">
        <h3>{{ t('record.exportGif') }}</h3>
        <button class="btn btn-icon btn-sm" @click="emit('close')">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
      <div class="conversion-body">
        <div class="progress-bar">
          <div class="progress-bar-fill" :style="{ width: progress + '%' }" />
        </div>
        <p class="status">{{ statusText }}</p>
      </div>
      <div v-if="isDone" class="conversion-actions">
        <button class="btn btn-primary btn-sm" @click="handleOpenFolder">
          {{ t('record.openFolder') }}
        </button>
        <button class="btn btn-sm" @click="emit('close')">{{ t('common.close') }}</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.conversion-modal {
  min-width: 360px;
}

.conversion-body {
  padding: 16px 0;
}

.status {
  font-size: 13px;
  color: var(--text-secondary);
  margin-top: 10px;
  text-align: center;
}

.conversion-actions {
  display: flex;
  gap: 8px;
  justify-content: center;
}
</style>
