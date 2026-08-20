<script setup lang="ts">
import { ref, watch, onUnmounted, type ShallowRef } from 'vue'
import { t } from '../stores/i18n'

const props = defineProps<{
  stream: ShallowRef<MediaStream | null>
}>()

const emit = defineEmits<{
  positionUpdate: [pos: { x: number; y: number; width: number; height: number }]
}>()

const videoRef = ref<HTMLVideoElement | null>(null)
const position = ref({ x: 20, y: 20, width: 240, height: 180 })
const isDragging = ref(false)
const dragStart = ref({ x: 0, y: 0 })

watch(() => props.stream, (newStream) => {
  if (videoRef.value) {
    videoRef.value.srcObject = newStream || null
    if (newStream) videoRef.value.play()
  }
}, { immediate: true })

function startDrag(e: MouseEvent) {
  isDragging.value = true
  dragStart.value = { x: e.clientX - position.value.x, y: e.clientY - position.value.y }
  e.preventDefault()
}

function onMouseMove(e: MouseEvent) {
  if (!isDragging.value) return
  position.value.x = e.clientX - dragStart.value.x
  position.value.y = e.clientY - dragStart.value.y
  emit('positionUpdate', { ...position.value })
}

function onMouseUp() {
  if (isDragging.value) {
    isDragging.value = false
  }
}

onMounted(() => {
  window.addEventListener('mousemove', onMouseMove)
  window.addEventListener('mouseup', onMouseUp)
})

onUnmounted(() => {
  window.removeEventListener('mousemove', onMouseMove)
  window.removeEventListener('mouseup', onMouseUp)
})
</script>

<template>
  <div
    class="camera-overlay"
    :style="{
      left: position.x + 'px',
      top: position.y + 'px',
      width: position.width + 'px',
      height: position.height + 'px',
    }"
  >
    <div class="camera-header" @mousedown="startDrag">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M5 9l7-7 7 7"/>
        <path d="M12 2v20"/>
      </svg>
      <span>{{ t('camera.title') }}</span>
    </div>
    <video ref="videoRef" autoplay muted playsinline class="camera-video" />
  </div>
</template>

<style scoped>
.camera-overlay {
  position: absolute;
  border-radius: 8px;
  overflow: hidden;
  border: 2px solid rgba(255, 255, 255, 0.3);
  z-index: 10;
  box-shadow: var(--shadow);
  cursor: move;
}

.camera-header {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 3px 8px;
  background: rgba(0, 0, 0, 0.5);
  font-size: 10px;
  color: rgba(255, 255, 255, 0.7);
  cursor: move;
}

.camera-video {
  width: 100%;
  height: calc(100% - 24px);
  object-fit: cover;
  display: block;
}
</style>
