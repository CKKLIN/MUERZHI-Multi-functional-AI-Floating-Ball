<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { useDrawingCanvas } from '../composables/useDrawingCanvas'

const emit = defineEmits<{
  draw: [(ctx: CanvasRenderingContext2D) => void]
}>()

const canvasRef = ref<HTMLCanvasElement | null>(null)
const containerRef = ref<HTMLDivElement | null>(null)
const drawing = useDrawingCanvas()

function resizeCanvas() {
  const canvas = canvasRef.value
  const container = containerRef.value
  if (!canvas || !container) return
  canvas.width = container.clientWidth
  canvas.height = container.clientHeight
}

function getRelativePos(e: MouseEvent) {
  const canvas = canvasRef.value!
  const rect = canvas.getBoundingClientRect()
  return {
    x: e.clientX - rect.left,
    y: e.clientY - rect.top,
  }
}

function onMouseDown(e: MouseEvent) {
  const pos = getRelativePos(e)
  drawing.startStroke(pos.x, pos.y)
}

function onMouseMove(e: MouseEvent) {
  const pos = getRelativePos(e)
  drawing.addPoint(pos.x, pos.y)

  // 实时绘制预览
  if (drawing.isDrawing.value && canvasRef.value) {
    const ctx = canvasRef.value.getContext('2d')!
    ctx.clearRect(0, 0, canvasRef.value.width, canvasRef.value.height)
    drawing.redraw(ctx)
  }
}

function onMouseUp(e: MouseEvent) {
  const pos = getRelativePos(e)
  drawing.endStroke(pos.x, pos.y)

  if (canvasRef.value) {
    const ctx = canvasRef.value.getContext('2d')!
    ctx.clearRect(0, 0, canvasRef.value.width, canvasRef.value.height)
    drawing.redraw(ctx)
  }

  // 通知录制引擎绘制回调
  emitDraw()
}

function emitDraw() {
  emit('draw', drawing.redraw)
}

// 监听工具/颜色/粗细变化
watch(() => [drawing.tool.value, drawing.color.value, drawing.lineWidth.value], () => {
  emitDraw()
})

onMounted(() => {
  resizeCanvas()
  window.addEventListener('resize', resizeCanvas)
  emitDraw()
})

onUnmounted(() => {
  window.removeEventListener('resize', resizeCanvas)
})

defineExpose({
  drawing,
})
</script>

<template>
  <div ref="containerRef" class="drawing-canvas-container">
    <canvas
      ref="canvasRef"
      class="drawing-canvas"
      @mousedown="onMouseDown"
      @mousemove="onMouseMove"
      @mouseup="onMouseUp"
    />
  </div>
</template>

<style scoped>
.drawing-canvas-container {
  position: absolute;
  inset: 0;
  z-index: 20;
  cursor: crosshair;
}

.drawing-canvas {
  width: 100%;
  height: 100%;
  display: block;
}
</style>
