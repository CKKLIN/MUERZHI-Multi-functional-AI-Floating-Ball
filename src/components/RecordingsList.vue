<script setup lang="ts">
import { useRecordingStore, type Recording } from '../stores/recording'
import { formatTime, formatFileSize, formatDate } from '../utils/format-time'

const store = useRecordingStore()

const emit = defineEmits<{
  play: [recording: Recording]
  exportGif: [recording: Recording]
  delete: [id: string]
}>()

function handleOpenFolder(filePath: string) {
  window.electronAPI.openFileLocation(filePath)
}
</script>

<template>
  <div class="recordings-list">
    <div class="section-header">录制历史</div>
    <div class="recordings-rows">
      <div v-if="store.recordings.length === 0" class="empty-state">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" opacity="0.25">
          <polygon points="5,3 19,12 5,21" fill="currentColor"/>
        </svg>
        <span>暂无录制记录</span>
      </div>
      <div
        v-for="rec in store.recordings"
        :key="rec.id"
        class="recording-row"
      >
        <div class="row-thumb" @click="emit('play', rec)">
          <img v-if="rec.thumbnail" :src="rec.thumbnail" alt="" />
          <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" opacity="0.4">
            <polygon points="5,3 19,12 5,21" fill="currentColor"/>
          </svg>
        </div>
        <div class="row-info" @click="emit('play', rec)">
          <span class="row-name">{{ rec.fileName }}</span>
          <span class="row-meta">{{ formatTime(rec.duration) }} · {{ formatFileSize(rec.fileSize) }} · {{ formatDate(rec.createdAt) }}</span>
        </div>
        <div class="row-actions">
          <button class="row-btn" @click="handleOpenFolder(rec.filePath)" title="打开文件夹">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
            </svg>
          </button>
          <button v-if="!rec.filePath.endsWith('.gif')" class="row-btn" @click="emit('exportGif', rec)" title="导出 GIF">GIF</button>
          <button class="row-btn danger" @click="emit('delete', rec.id)" title="删除">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.recordings-list {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  border-top: 1px solid var(--border);
}

.section-header {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-muted);
  padding: 6px 16px;
  flex-shrink: 0;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.recordings-rows {
  flex: 1;
  overflow-y: auto;
  padding: 0 8px 8px;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 40px 0;
  color: var(--text-muted);
  font-size: 12px;
}

.recording-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 5px 8px;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: background var(--transition);
}

.recording-row:hover {
  background: var(--bg-hover);
}

.recording-row:hover .row-actions {
  opacity: 1;
}

.row-thumb {
  width: 48px;
  height: 32px;
  border-radius: var(--radius-sm);
  background: #000;
  overflow: hidden;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.row-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.row-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.row-name {
  font-size: 12px;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.row-meta {
  font-size: 10px;
  color: var(--text-muted);
}

.row-actions {
  display: flex;
  gap: 2px;
  opacity: 0;
  transition: opacity var(--transition);
  flex-shrink: 0;
}

.row-btn {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  font-size: 10px;
  font-weight: 600;
  transition: all var(--transition);
}

.row-btn:hover {
  background: var(--bg-secondary);
  color: var(--text-primary);
}

.row-btn.danger:hover {
  background: var(--accent-bg);
  color: var(--accent);
}
</style>
