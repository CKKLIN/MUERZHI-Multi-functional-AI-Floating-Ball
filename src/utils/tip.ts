// src/utils/tip.ts —— 全局 v-tip 指令：统一的悬浮提示气泡，替代原生 title（原生样式不可控、延迟长）。
// 单例气泡直接挂到 body 顶层：滚动容器（录制列表 overflow-y:auto）内不会被裁剪——
// 与 Tooltip.vue 用 Teleport 的原因相同。视觉与 Tooltip.vue、覆盖窗口的 TOOLTIP_CSS 同一套
// （深色 rgba(29,29,31,0.94) 圆角气泡 + 同色箭头）。
// 用法：v-tip="文本"；v-tip.below / v-tip.above 强制方向；默认在锚点上方、放不下自动翻到下方。
import type { Directive } from 'vue'

const SHOW_DELAY = 350 // 悬停 350ms 后弹出：扫过工具条不频闪，又比原生 title 快
const GAP = 7          // 气泡与锚点的间距（含箭头空隙）
const EDGE = 8         // 气泡距窗口左右边缘的最小间距

let bubble: HTMLDivElement | null = null
let arrow: HTMLSpanElement | null = null
let text: HTMLSpanElement | null = null
let showTimer: ReturnType<typeof setTimeout> | null = null
let shownFor: HTMLElement | null = null

function ensureBubble(): HTMLDivElement {
  if (bubble) return bubble
  bubble = document.createElement('div')
  bubble.className = 'tip-bubble'
  bubble.setAttribute('role', 'tooltip')
  arrow = document.createElement('span')
  arrow.className = 'tip-arrow'
  text = document.createElement('span')
  text.className = 'tip-text'
  bubble.appendChild(arrow)
  bubble.appendChild(text)
  document.body.appendChild(bubble)
  return bubble
}

function hide() {
  if (showTimer) {
    clearTimeout(showTimer)
    showTimer = null
  }
  if (bubble) bubble.style.display = 'none'
  shownFor = null
  // capture:true 兜住滚动容器内部的滚动（事件不冒泡但捕获阶段先到 window）
  window.removeEventListener('scroll', onViewportChange, true)
  window.removeEventListener('resize', onViewportChange)
}

// 悬浮期间视口变化（列表滚动/窗口缩放）会让气泡位置失效——直接隐藏，下次悬停重算
function onViewportChange() {
  if (shownFor || showTimer) hide()
}

function show(el: HTMLElement, value: string, force?: 'above' | 'below') {
  const b = ensureBubble()
  if (!text || !arrow) return
  text.textContent = value
  b.style.display = 'block' // 先显示才能量尺寸；display 切换会重放入场动画
  const r = el.getBoundingClientRect()
  const bw = b.offsetWidth
  const bh = b.offsetHeight
  const vw = window.innerWidth
  const vh = window.innerHeight
  // 上方放得下放上方；放不下且下方放得下则翻到下方（modifier 强制时照办）
  const fitsAbove = r.top - GAP - bh >= 0
  const fitsBelow = r.bottom + GAP + bh <= vh
  const below = force ? force === 'below' : !fitsAbove && fitsBelow
  const top = below ? r.bottom + GAP : r.top - GAP - bh
  const center = r.left + r.width / 2
  const left = Math.max(EDGE, Math.min(vw - bw - EDGE, center - bw / 2))
  // 箭头指向锚点中心；锚点中心偏出气泡范围（贴窗口边钳制后）时收进气泡两端内 10px
  const ax = Math.max(10, Math.min(bw - 10, center - left))
  arrow.style.left = Math.round(ax) + 'px'
  b.classList.toggle('below', below)
  b.style.top = Math.round(top) + 'px'
  b.style.left = Math.round(left) + 'px'
  shownFor = el
  window.addEventListener('scroll', onViewportChange, true)
  window.addEventListener('resize', onViewportChange)
}

function scheduleShow(el: HTMLElement, value: string, force?: 'above' | 'below') {
  if (showTimer) clearTimeout(showTimer)
  showTimer = setTimeout(() => {
    showTimer = null
    show(el, value, force)
  }, SHOW_DELAY)
}

// 值变化时若正显示着（或正在等延迟）就立即按新值重算位置——语言切换/动态开关场景不闪旧文案
function refreshIfShown(el: HTMLElement, value: string, force?: 'above' | 'below') {
  if (shownFor !== el && !showTimer) return
  if (showTimer) {
    clearTimeout(showTimer)
    showTimer = null
  }
  if (value) show(el, value, force)
}

type TipInternals = {
  __tipValue?: string
  __tipForce?: 'above' | 'below'
  __tipEnter?: () => void
  __tipLeave?: () => void
}

export const vTip: Directive<HTMLElement, string> = {
  mounted(el, binding) {
    const e = el as HTMLElement & TipInternals
    // 值存到元素上而非闭包：updated 时刷新，语言切换后弹出的提示用新词条
    e.__tipValue = binding.value
    e.__tipForce = binding.modifiers.below ? 'below' : binding.modifiers.above ? 'above' : undefined
    e.__tipEnter = () => {
      if (e.__tipValue) scheduleShow(el, e.__tipValue, e.__tipForce)
    }
    e.__tipLeave = () => {
      if (shownFor === el || showTimer) hide()
    }
    // disabled 按钮在 Chromium 下仍会派发 mouseenter（只是吞 click），提示照常可弹
    el.addEventListener('mouseenter', e.__tipEnter)
    el.addEventListener('mouseleave', e.__tipLeave)
  },
  updated(el, binding) {
    const e = el as HTMLElement & TipInternals
    e.__tipValue = binding.value
    refreshIfShown(el, binding.value, e.__tipForce)
  },
  unmounted(el) {
    const e = el as HTMLElement & TipInternals
    if (e.__tipEnter) el.removeEventListener('mouseenter', e.__tipEnter)
    if (e.__tipLeave) el.removeEventListener('mouseleave', e.__tipLeave)
    if (shownFor === el || showTimer) hide()
  },
}
