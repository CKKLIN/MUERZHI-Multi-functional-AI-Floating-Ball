<!--
  可展开式悬浮球组件
  技术实现文档: D:\浏览器下载\Vue 3 可展开式悬浮球组件技术实现文档.docx
  功能：固定在页面右下角的悬浮按钮，点击展开环形菜单，再次点击或点击外部收起
  菜单项为四等分圆弧，拼合后形成一个完整圆环
-->
<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'

// --- 类型定义 ---
export interface FloatingMenuItem {
  label: string
  icon?: string
  action: () => void
}

// --- Props & Emits ---
const props = defineProps<{
  items?: FloatingMenuItem[]
  /** 悬浮球位置：右下角偏移量 */
  position?: { bottom: number; right: number }
}>()

const emit = defineEmits<{
  (e: 'item-click', item: FloatingMenuItem): void
}>()

// --- 响应式状态 ---
const isExpanded = ref(false)
const containerRef = ref<HTMLElement | null>(null)

const menuItems = computed(() => props.items || defaultItems)

// 默认菜单项
const defaultItems: FloatingMenuItem[] = [
  { label: '全屏', icon: '⛶', action: () => console.log('全屏录制') },
  { label: '区域', icon: '▣', action: () => console.log('区域录制') },
  { label: '截图', icon: '📷', action: () => console.log('截图') },
  { label: '设置', icon: '⚙', action: () => console.log('打开设置') },
]

// --- 位置计算 ---
const pos = computed(() => ({
  bottom: props.position?.bottom ?? 30,
  right: props.position?.right ?? 30,
}))

// --- SVG 圆弧生成 ---
/** 生成一个四分之一圆环的 SVG path d 属性 */
function buildArcPath(
  cx: number, cy: number,
  r1: number, r2: number,
  startAngle: number, endAngle: number
): string {
  const sr = (startAngle * Math.PI) / 180
  const er = (endAngle * Math.PI) / 180
  const x1i = cx + r1 * Math.cos(sr), y1i = cy + r1 * Math.sin(sr)
  const x1o = cx + r2 * Math.cos(sr), y1o = cy + r2 * Math.sin(sr)
  const x2o = cx + r2 * Math.cos(er), y2o = cy + r2 * Math.sin(er)
  const x2i = cx + r1 * Math.cos(er), y2i = cy + r1 * Math.sin(er)
  const laf = endAngle - startAngle > 180 ? 1 : 0
  return (
    `M${x1i},${y1i} L${x1o},${y1o} A${r2},${r2} 0 ${laf},1 ${x2o},${y2o} ` +
    `L${x2i},${y2i} A${r1},${r1} 0 ${laf},0 ${x1i},${y1i} Z`
  )
}

// 计算 SVG 元素属性
const svgArcData = computed(() => {
  const total = menuItems.value.length
  const segArc = 90 // 每段 90°，无间隙
  const startOff = -135
  const cx = 120, cy = 120, r1 = 34, r2 = 75

  return menuItems.value.map((item, i) => {
    const sa = startOff + i * 90
    const ea = sa + segArc
    const d = buildArcPath(cx, cy, r1, r2, sa, ea)

    // 文字位置（圆弧中点）
    const ma = (sa + ea) / 2
    const mr = (r1 + r2) / 2
    const lx = cx + mr * Math.cos((ma * Math.PI) / 180)
    const ly = cy + mr * Math.sin((ma * Math.PI) / 180)

    return { item, d, lx, ly, delay: `${i * 0.15}s` }
  })
})

// --- 方法 ---
const toggleMenu = () => {
  isExpanded.value = !isExpanded.value
}

const handleItemClick = (item: FloatingMenuItem) => {
  item.action()
  emit('item-click', item)
  isExpanded.value = false
}

const handleClickOutside = (event: MouseEvent) => {
  if (containerRef.value && !containerRef.value.contains(event.target as Node) && isExpanded.value) {
    isExpanded.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<template>
  <div
    ref="containerRef"
    class="floating-ball-container"
    :style="{
      bottom: pos.bottom + 'px',
      right: pos.right + 'px',
    }"
  >
    <!-- SVG 圆环 -->
    <svg
      class="ring-svg"
      :class="{ 'is-expanded': isExpanded }"
      viewBox="0 0 240 240"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g v-for="(arc, idx) in svgArcData" :key="idx">
        <!-- 圆弧段 -->
        <path
          class="arc-item"
          :d="arc.d"
          :style="{ transitionDelay: arc.delay }"
          @click.stop="handleItemClick(arc.item)"
        />
        <!-- 文字 -->
        <text
          class="arc-label"
          :x="arc.lx"
          :y="arc.ly"
          :style="{ transitionDelay: `${idx * 0.15 + 0.12}s` }"
        >
          <tspan class="icon" :x="arc.lx" dy="-7">{{ arc.item.icon }}</tspan>
          <tspan class="label" :x="arc.lx" dy="14">{{ arc.item.label }}</tspan>
        </text>
      </g>
    </svg>

    <!-- 中心触发按钮 -->
    <button
      class="trigger-button"
      :class="{ 'is-expanded': isExpanded }"
      @click.stop="toggleMenu"
      title="展开功能菜单"
    >
      <div class="trigger-inner">
        <svg v-if="isExpanded" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
        <svg v-else width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </div>
    </button>
  </div>
</template>

<style scoped>
.floating-ball-container {
  position: fixed;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
}

/* ===== SVG 圆环 - 仅定位，圆弧各自开花 ===== */
.ring-svg {
  position: absolute;
  width: 240px;
  height: 240px;
  pointer-events: none;
}

.ring-svg.is-expanded {
  pointer-events: none;
}

/* 圆弧段：从圆心 bloom 弹出 */
.arc-item {
  fill: rgba(255, 255, 255, 0.88);
  stroke: rgba(255, 255, 255, 0.5);
  stroke-width: 1px;
  cursor: pointer;
  pointer-events: none;
  opacity: 0;
  transform: scale(0);
  transform-origin: 120px 120px;
  transition:
    transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1),
    opacity 0.25s ease,
    fill 0.2s ease;
}

.ring-svg.is-expanded .arc-item {
  opacity: 1;
  transform: scale(1);
  pointer-events: auto;
}

.arc-item:hover {
  fill: rgba(233, 69, 96, 0.18);
  stroke: #e94560;
}

.arc-item:active {
  fill: rgba(233, 69, 96, 0.28);
}

/* 圆弧上文字：也从圆心弹出 */
.arc-label {
  pointer-events: none;
  text-anchor: middle;
  dominant-baseline: central;
  font-family: 'Segoe UI', system-ui, sans-serif;
  opacity: 0;
  transform: scale(0);
  transform-origin: 120px 120px;
  transition:
    transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1),
    opacity 0.25s ease;
}

.ring-svg.is-expanded .arc-label {
  opacity: 1;
  transform: scale(1);
}

.arc-label .icon {
  font-size: 14px;
  fill: var(--accent, #e94560);
}

.arc-label .label {
  font-size: 10px;
  font-weight: 600;
  fill: var(--text-secondary, #5a5a6e);
}

/* ===== 小太阳（圆环中心发光点） ===== */
.sun-dot {
  pointer-events: none;
  opacity: 0;
  transform: scale(0);
  transform-origin: 120px 120px;
  transition:
    opacity 0.3s ease,
    transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.sun-dot.is-expanded {
  opacity: 1;
  transform: scale(1);
  transition-delay: 0.25s;
}
.sun-dot .glow {
  fill: rgba(233, 69, 96, 0.15);
}
.sun-dot .core {
  fill: #e94560;
}

/* ===== 闪一下的小岛 ===== */
.flash-island {
  position: absolute;
  z-index: 5;
  pointer-events: none;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: #f0f0f0;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.15);
  opacity: 0;
  transform: scale(0);
}
.flash-island.is-expanded {
  animation: flash-pop 0.55s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
}
@keyframes flash-pop {
  0% { opacity: 0; transform: scale(0.3); box-shadow: 0 0 0 rgba(233, 69, 96, 0); }
  12% { opacity: 1; transform: scale(1.2); box-shadow: 0 0 40px rgba(233, 69, 96, 0.6), 0 2px 12px rgba(0, 0, 0, 0.15); }
  30% { opacity: 0.8; transform: scale(0.9); box-shadow: 0 0 15px rgba(233, 69, 96, 0.3), 0 2px 12px rgba(0, 0, 0, 0.1); }
  60% { opacity: 0.2; transform: scale(1.1); box-shadow: 0 0 25px rgba(233, 69, 96, 0.1); }
  100% { opacity: 0; transform: scale(0.5); box-shadow: 0 0 0 rgba(233, 69, 96, 0); }
}

/* ===== 触发按钮 ===== */
.trigger-button {
  position: relative;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  border: none;
  cursor: pointer;
  pointer-events: auto;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;

  background: linear-gradient(135deg, #e94560 0%, #ff6b81 100%);
  transition:
    transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.trigger-button:hover {
  transform: scale(1.08);
}

.trigger-button:active {
  transform: scale(0.95);
}

.trigger-button.is-expanded {
  background: linear-gradient(135deg, #d63c55 0%, #e94560 100%);
  transform: rotate(45deg);
}

.trigger-inner {
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.3s ease;
}
</style>
