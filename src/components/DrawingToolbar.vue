<script setup lang="ts">
import { useDrawingCanvas } from '../composables/useDrawingCanvas'
import { useSettingsStore } from '../stores/settings'
import { t } from '../stores/i18n'

const settingsStore = useSettingsStore()
const drawing = useDrawingCanvas()

const colors = ['#ff0000', '#ff6600', '#ffff00', '#00ff00', '#00aaff', '#ffffff', '#000000']
const tools = [
  { key: 'pen' as const, labelKey: 'draw.pen', icon: 'M12 19l7-7 3 3-7 7-3-3zM18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5zM2 2l7.586 7.586' },
  { key: 'eraser' as const, labelKey: 'draw.eraser', icon: 'M20 20H7L3 16l9-9 8 8-4 4zM6 11l4 4' },
  { key: 'arrow' as const, labelKey: 'draw.arrow', icon: 'M5 12h14M12 5l7 7-7 7' },
  { key: 'rectangle' as const, labelKey: 'draw.rect', icon: 'M3 3h18v18H3z' },
]
</script>

<template>
  <div class="drawing-toolbar">
    <!-- 工具选择 -->
    <div class="toolbar-group">
      <button
        v-for="t in tools"
        :key="t.key"
        class="toolbar-btn"
        :class="{ active: drawing.tool.value === t.key }"
        @click="drawing.tool.value = t.key"
        :title="t(t.labelKey)"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path :d="t.icon" />
        </svg>
      </button>
    </div>

    <!-- 颜色选择 -->
    <div class="toolbar-group">
      <div
        v-for="c in colors"
        :key="c"
        class="color-dot"
        :class="{ active: drawing.color.value === c }"
        :style="{ background: c }"
        @click="drawing.color.value = c"
      />
    </div>

    <!-- 粗细 -->
    <div class="toolbar-group">
      <input
        type="range"
        min="1"
        max="12"
        v-model.number="drawing.lineWidth.value"
        class="width-slider"
        :title="t('draw.lineWidth')"
      />
      <span class="width-label">{{ drawing.lineWidth.value }}px</span>
    </div>

    <!-- 操作 -->
    <div class="toolbar-group">
      <button class="toolbar-btn" @click="drawing.undoLastStroke()" :title="t('draw.undo')">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="1 4 1 10 7 10"/>
          <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/>
        </svg>
      </button>
      <button class="toolbar-btn" @click="drawing.clearStrokes()" :title="t('draw.clear')">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="3 6 5 6 21 6"/>
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
        </svg>
      </button>
    </div>
  </div>
</template>

<style scoped>
.drawing-toolbar {
  position: absolute;
  bottom: 60px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  background: rgba(22, 33, 62, 0.95);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  z-index: 30;
  backdrop-filter: blur(8px);
}

.toolbar-group {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 0 4px;
}

.toolbar-group + .toolbar-group {
  border-left: 1px solid var(--border);
}

.toolbar-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid transparent;
  background: transparent;
  color: var(--text-secondary);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all 0.2s var(--bevel-ease);
}

.toolbar-btn:hover {
  background: rgba(255, 255, 255, 0.08);
  color: var(--text-primary);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.14);
}

.toolbar-btn:active {
  background: rgba(255, 255, 255, 0.14);
  box-shadow: inset 1px 1px 2px rgba(0, 0, 0, 0.3);
}

.toolbar-btn.active {
  background: var(--surface-accent-grad);
  border-color: rgba(255, 255, 255, 0.35);
  color: #fff;
  box-shadow:
    inset 1px 1px 2px rgba(255, 255, 255, 0.4),
    inset -1px -1px 0 rgba(0, 0, 0, 0.25);
}

.color-dot {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  cursor: pointer;
  border: 2px solid transparent;
  transition: border-color var(--transition);
}

.color-dot.active {
  border-color: white;
  box-shadow: 0 0 0 1px var(--accent);
}

.width-slider {
  width: 60px;
  accent-color: var(--accent);
}

.width-label {
  font-size: 10px;
  color: var(--text-muted);
  min-width: 24px;
}
</style>
