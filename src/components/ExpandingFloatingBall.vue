<!--
  可展开式悬浮球组件
  技术实现文档: D:\浏览器下载\Vue 3 可展开式悬浮球组件技术实现文档.docx
  功能：固定在页面右下角的悬浮按钮，点击展开扇形菜单，再次点击或点击外部收起
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
  {
    label: '全屏',
    icon: '⛶',
    action: () => console.log('全屏录制'),
  },
  {
    label: '区域',
    icon: '▣',
    action: () => console.log('区域录制'),
  },
  {
    label: '截图',
    icon: '📷',
    action: () => console.log('截图'),
  },
  {
    label: '设置',
    icon: '⚙',
    action: () => console.log('打开设置'),
  },
]

// --- 位置计算 ---
const pos = computed(() => ({
  bottom: props.position?.bottom ?? 30,
  right: props.position?.right ?? 30,
}))

// --- 方法 ---

// 切换菜单展开/收起
const toggleMenu = () => {
  isExpanded.value = !isExpanded.value
}

// 计算每个菜单项的旋转角度和位移，使它们均匀分布在扇形中
const getItemStyle = (index: number) => {
  const total = menuItems.value.length
  // 扇形范围：-150deg ~ -30deg（左下到右下，共120度扇形）
  const startAngle = -150
  const endAngle = -30
  const angleStep = total > 1 ? (endAngle - startAngle) / (total - 1) : 0
  const angle = startAngle + index * angleStep
  // 扇形半径（距离中心按钮的偏移量）
  const radius = 90

  // 计算偏移量
  const rad = (angle * Math.PI) / 180
  const x = Math.cos(rad) * radius
  const y = Math.sin(rad) * radius

  return {
    '--tx': `${x}px`,
    '--ty': `${y}px`,
    '--delay': `${index * 0.05}s`,
  }
}

// 处理菜单项点击
const handleItemClick = (item: FloatingMenuItem) => {
  item.action()
  emit('item-click', item)
  // 点击后自动收起
  isExpanded.value = false
}

// 全局点击外部时收起菜单
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
    <!-- 扇形菜单项 -->
    <div
      v-for="(item, index) in menuItems"
      :key="index"
      class="menu-item"
      :class="{ 'is-expanded': isExpanded }"
      :style="getItemStyle(index)"
      @click.stop="handleItemClick(item)"
    >
      <div class="menu-item-inner">
        <span class="menu-icon">{{ item.icon }}</span>
        <span class="menu-label">{{ item.label }}</span>
      </div>
    </div>

    <!-- 中心触发按钮 -->
    <button class="trigger-button" :class="{ 'is-expanded': isExpanded }" @click.stop="toggleMenu" title="展开功能菜单">
      <div class="trigger-inner">
        <!-- 展开时显示 X，收起时显示 + -->
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

/* --- 触发按钮 --- */
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

  /* 新拟态风格 */
  background: linear-gradient(135deg, #e94560 0%, #ff6b81 100%);
  box-shadow:
    0 4px 16px rgba(233, 69, 96, 0.35),
    0 2px 4px rgba(0, 0, 0, 0.1),
    inset 0 1px 1px rgba(255, 255, 255, 0.3);
  transition:
    transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1),
    box-shadow 0.3s ease;
}

.trigger-button:hover {
  transform: scale(1.08);
  box-shadow:
    0 6px 24px rgba(233, 69, 96, 0.45),
    0 3px 6px rgba(0, 0, 0, 0.12),
    inset 0 1px 1px rgba(255, 255, 255, 0.35);
}

.trigger-button:active {
  transform: scale(0.95);
}

.trigger-button.is-expanded {
  background: linear-gradient(135deg, #d63c55 0%, #e94560 100%);
  box-shadow:
    0 2px 8px rgba(233, 69, 96, 0.3),
    inset 0 2px 4px rgba(0, 0, 0, 0.15);
  transform: rotate(45deg);
}

.trigger-inner {
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.3s ease;
}

/* --- 菜单项 --- */
.menu-item {
  position: absolute;
  pointer-events: auto;
  cursor: pointer;
  z-index: 1;
  /* 初始：在中心 */
  transform: translate(0, 0) scale(0.5);
  opacity: 0;
  transition:
    transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1),
    opacity 0.25s ease;
  transition-delay: 0s;
}

.menu-item.is-expanded {
  /* 展开：移到计算出的位置 */
  transform: translate(var(--tx), var(--ty)) scale(1);
  opacity: 1;
  transition-delay: var(--delay);
}

.menu-item-inner {
  width: 52px;
  height: 52px;
  border-radius: 14px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.7);
  box-shadow:
    0 4px 16px rgba(0, 0, 0, 0.1),
    0 2px 4px rgba(0, 0, 0, 0.06),
    inset 0 1px 0 rgba(255, 255, 255, 0.8);
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease;
}

.menu-item-inner:hover {
  transform: translateY(-2px) scale(1.05);
  box-shadow:
    0 8px 24px rgba(0, 0, 0, 0.14),
    0 4px 8px rgba(0, 0, 0, 0.08),
    inset 0 1px 0 rgba(255, 255, 255, 0.9);
  border-color: var(--accent);
}

.menu-item-inner:active {
  transform: scale(0.92);
}

.menu-icon {
  font-size: 16px;
  line-height: 1;
  color: var(--accent);
}

.menu-label {
  font-size: 10px;
  font-weight: 600;
  color: var(--text-secondary);
  white-space: nowrap;
}
</style>
