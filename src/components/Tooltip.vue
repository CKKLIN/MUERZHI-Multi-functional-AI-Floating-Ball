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
        class="tip-bubble"
        :class="{ below, right: alignRight }"
        :style="bubbleStyle"
        role="tooltip"
      >
        <span class="tip-arrow" :style="{ left: bubble.arrow + 'px' }"></span>
        <span class="vtip-text">{{ text }}</span>
      </div>
    </Teleport>
  </span>
</template>

<style scoped>
/* 气泡/箭头样式走全局 .tip-bubble / .tip-arrow（style.css，与 v-tip 指令共用同一套视觉），
   这里只保留组件特有的：锚点容器与全文滚动 */
.vtip {
  position: relative;
  display: inline-block;
  max-width: 100%;
  min-width: 0;
}
.vtip-text {
  display: block;
  max-height: 40vh;
  overflow: auto;
}
</style>
