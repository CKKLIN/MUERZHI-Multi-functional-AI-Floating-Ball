<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { useDrawingCanvas } from '../composables/useDrawingCanvas'

const emit = defineEmits<{
  draw: [(ctx: CanvasRenderingContext2D) => void]
}>()

const canvasRef = ref<HTMLCanvasElement | null>(null)
const containerRef = ref<HTMLDivElement | null>(null)
const drawing = useDrawingCanvas()

// 离屏画布缓存"已提交笔迹"快照，mousemove 时只 blit 缓存 + 画当前活跃笔触，
// 避免每次 mousemove 都 clear+redraw 全部历史（O(N) × mousemove/秒）。
let offscreen: HTMLCanvasElement | null = null
let offCtx: CanvasRenderingContext2D | null = null

function ensureOffscreen() {
  const canvas = canvasRef.value
  if (!canvas) return
  if (!offscreen) {
    offscreen = document.createElement('canvas')
    offscreen.width = canvas.width
    offscreen.height = canvas.height
    offCtx = offscreen.getContext('2d')!
  } else if (offscreen.width !== canvas.width || offscreen.height !== canvas.height) {
    offscreen.width = canvas.width
    offscreen.height = canvas.height
  }
}

// 把主画布同步为：离屏缓存 + 当前活跃笔触。用于 mousemove 增量预览。
function paintMainFromCache() {
  const canvas = canvasRef.value
  if (!canvas || !offscreen || !offCtx) return
  const ctx = canvas.getContext('2d')!
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  ctx.drawImage(offscreen, 0, 0)
  // 画当前正在画的笔触（pen/eraser 的增量段，或 arrow/rectangle 的预览形状）
  drawing.drawCurrent(ctx)
}

// 重建离屏缓存（resize / undo / clear / mouseup 提交后）
function rebuildOffscreen() {
  const canvas = canvasRef.value
  if (!canvas) return
  ensureOffscreen()
  if (!offscreen || !offCtx) return
  offCtx.clearRect(0, 0, offscreen.width, offscreen.height)
  drawing.redraw(offCtx)
}

function resizeCanvas() {
  const canvas = canvasRef.value
  const container = containerRef.value
  if (!canvas || !container) return
  canvas.width = container.clientWidth
  canvas.height = container.clientHeight
  // resize 后画布被清空，重建离屏缓存并同步主画布
  rebuildOffscreen()
  paintMainFromCache()
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

  // 增量预览：从离屏缓存 blit + 画当前活跃笔触，不再全量 redraw
  if (drawing.isDrawing.value && canvasRef.value) {
    paintMainFromCache()
  }
}

function onMouseUp(e: MouseEvent) {
  const pos = getRelativePos(e)
  drawing.endStroke(pos.x, pos.y)

  // 笔触已提交，并入离屏缓存
  if (canvasRef.value) {
    rebuildOffscreen()
    paintMainFromCache()
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
  offscreen = null
  offCtx = null
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
