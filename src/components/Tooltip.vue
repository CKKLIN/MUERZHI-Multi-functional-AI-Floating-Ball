// src/components/Tooltip.vue —— 悬浮提示气泡，替代原生 title 悬浮提示（原生不可控样式）。
// 气泡用 Teleport 到 body + position:fixed 挂到 body 顶层：
//   1) 避开滚动容器（.list overflow-y:auto）的裁剪；
//   2) 避开卡片 hover 的 transform 造成的层叠上下文遮挡。
// 仅当触发元素确实被截断（省略号/被 clamp）时才显示，避免内容能完全显示时也弹提示。
<script setup lang="ts">
import { ref, computed, nextTick, onMounted, onBeforeUnmount, watch } from 'vue'

const props = defineProps<{ text: string }>()

const anchor = ref<HTMLElement | null>(null)
const show = ref(false)
const truncated = ref(false)
const bubble = ref({ top: 0, left: 0, right: 0, arrow: 16, below: false, alignRight: false })

const MAX_W = 280

// 气泡固定定位样式：贴右边缘时用 right 对齐，否则用 left
const bubbleStyle = computed(() => ({
  top: bubble.value.top + 'px',
  ...(bubble.value.alignRight
    ? { right: bubble.value.right + 'px' }
    : { left: bubble.value.left + 'px' }),
}))

// 量 slot 根元素是否被截断：横向 nowrap 省略看 scrollWidth，纵向 line-clamp 看 scrollHeight
function checkTruncated() {
  const el = anchor.value?.firstElementChild as HTMLElement | null
  truncated.value = !!(el && (el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1))
}

// 依据锚点视口位置摆气泡：贴右边缘时右对齐；上方空间不足时放下方
function updatePos() {
  const a = anchor.value
  if (!a) return
  const r = a.getBoundingClientRect()
  const vw = window.innerWidth
  const vh = window.innerHeight
  const alignRight = r.left + 4 + MAX_W > vw && r.right > 40
  const left = Math.max(8, r.left + 4)
  const right = vw - r.right + 8
  const below = r.top < 96 && r.bottom < vh - 120
  const top = below ? r.bottom + 7 : r.top - 7
  // 箭头大致指向锚点横向中点（右对齐时气泡向左展开，同样按中点估算）
  const bLeft = alignRight ? r.right - 8 - MAX_W : left
  const anchorMid = (r.left + r.right) / 2
  const arrow = Math.max(16, Math.min(MAX_W - 16, anchorMid - bLeft))
  bubble.value = { top, left, right, arrow, below, alignRight }
}

function enter() {
  show.value = true
  updatePos()
  // 悬浮期间列表滚动/窗口缩放时跟随锚点
  window.addEventListener('scroll', updatePos, true)
  window.addEventListener('resize', updatePos)
}
function leave() {
  show.value = false
  window.removeEventListener('scroll', updatePos, true)
  window.removeEventListener('resize', updatePos)
}

onMounted(async () => {
  await nextTick()
  checkTruncated()
  window.addEventListener('resize', checkTruncated)
})
onBeforeUnmount(() => {
  window.removeEventListener('scroll', updatePos, true)
  window.removeEventListener('resize', updatePos)
  window.removeEventListener('resize', checkTruncated)
})
// 内容变化（编辑保存后）重测是否截断
watch(() => props.text, async () => { await nextTick(); checkTruncated() })
</script>

<template>
  <span
    ref="anchor"
    class="vtip"
    @mouseenter="enter"
    @mouseleave="leave"
    @focusin="enter"
    @focusout="leave"
  >
    <slot />
    <Teleport to="body">
      <div
        v-if="show && text && truncated"
        class="vtip-bubble"
        :class="{ below, right: alignRight }"
        :style="bubbleStyle"
        role="tooltip"
      >
        <span class="vtip-arrow" :style="{ left: bubble.arrow + 'px' }"></span>
        <span class="vtip-text">{{ text }}</span>
      </div>
    </Teleport>
  </span>
</template>

<style scoped>
.vtip {
  position: relative;
  display: inline-block;
  max-width: 100%;
  min-width: 0;
}
.vtip-bubble {
  position: fixed;
  z-index: 99999;
  max-width: 280px;
  padding: 8px 11px;
  border-radius: 9px;
  background: rgba(29, 29, 31, 0.94);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  color: #fff;
  font-size: 12px;
  line-height: 1.5;
  white-space: normal;
  word-break: break-word;
  box-shadow:
    0 6px 18px rgba(0, 0, 0, 0.24),
    inset 0 1px 0 rgba(255, 255, 255, 0.08);
  pointer-events: none;
  animation: vtip-in 0.15s ease;
}
.vtip-text {
  display: block;
  max-height: 40vh;
  overflow: auto;
}
.vtip-arrow {
  position: absolute;
  bottom: -5px;
  width: 0;
  height: 0;
  border: 5px solid transparent;
  border-top-color: rgba(29, 29, 31, 0.94);
}
.vtip-bubble.below .vtip-arrow {
  top: -5px;
  bottom: auto;
  border-top-color: transparent;
  border-bottom-color: rgba(29, 29, 31, 0.94);
}
@keyframes vtip-in {
  from { opacity: 0; transform: translateY(-4px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
