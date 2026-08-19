<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRecordingStore } from '../stores/recording'
import type { CaptureSource } from '../env'
import SourceThumbnail from './SourceThumbnail.vue'

const emit = defineEmits<{
  select: [source: CaptureSource]
  selectRegion: []
}>()

const store = useRecordingStore()
const sources = ref<CaptureSource[]>([])
const loading = ref(true)

onMounted(async () => {
  try {
    sources.value = await window.electronAPI.getSources()
  } catch (err) {
    console.error('获取屏幕源失败:', err)
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="screen-selector">
    <h2 class="section-title">选择录制源</h2>
    <div class="sources-grid">
      <div
        v-for="source in sources"
        :key="source.id"
        :class="['source-item', { selected: store.selectedSource?.id === source.id }]"
        @click="emit('select', source)"
      >
        <SourceThumbnail
          :name="source.name"
          :thumbnail="source.thumbnail"
          :app-icon="source.appIcon"
        />
      </div>
      <div class="source-item region-item" @click="emit('selectRegion')">
        <div class="region-icon">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <rect x="3" y="3" width="18" height="18" rx="2" stroke-dasharray="4 2"/>
            <line x1="3" y1="9" x2="3" y2="3" stroke-width="3"/>
            <line x1="3" y1="3" x2="9" y2="3" stroke-width="3"/>
            <line x1="15" y1="21" x2="21" y2="21" stroke-width="3"/>
            <line x1="21" y1="15" x2="21" y2="21" stroke-width="3"/>
          </svg>
        </div>
        <span class="source-name">自定义区域</span>
      </div>
    </div>
    <div v-if="loading" class="loading">加载中...</div>
    <div v-if="!loading && sources.length === 0" class="empty">未找到可用的屏幕源</div>
  </div>
</template>

<style scoped>
.screen-selector {
  padding: 20px;
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 16px;
}

.sources-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 12px;
}

.source-item {
  cursor: pointer;
  border-radius: var(--radius);
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.7);
  border-top-color: rgba(255, 255, 255, 0.9);
  border-left-color: rgba(255, 255, 255, 0.85);
  border-right-color: rgba(200, 200, 210, 0.4);
  border-bottom-color: rgba(190, 190, 200, 0.5);
  background: var(--surface-grad);
  box-shadow:
    3px 3px 8px rgba(0, 0, 0, 0.1),
    1px 1px 2px rgba(0, 0, 0, 0.06),
    inset 1px 1px 2px rgba(255, 255, 255, 0.9);
  transition: all 0.2s var(--bevel-ease);
}

.source-item:hover {
  transform: translate(-1px, -1px);
  box-shadow: var(--bevel-shadow-hover);
}

.source-item.selected {
  border-color: var(--surface-accent);
  box-shadow:
    4px 4px 12px var(--surface-accent-glow),
    1px 1px 3px rgba(0, 0, 0, 0.1),
    inset 1px 1px 2px rgba(255, 255, 255, 0.9);
}

.region-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 140px;
  gap: 8px;
}

.region-item:hover {
  border-color: var(--surface-accent);
}

.region-icon {
  color: var(--text-muted);
}

.source-name {
  font-size: 12px;
  color: var(--text-secondary);
  text-align: center;
  padding: 4px 8px;
}

.loading, .empty {
  text-align: center;
  padding: 40px;
  color: var(--text-muted);
}
</style>
