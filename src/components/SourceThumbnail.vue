<script setup lang="ts">
defineProps<{
  name: string
  thumbnail: string
  appIcon: string | null
}>()
</script>

<template>
  <div class="thumbnail">
    <img :src="thumbnail" :alt="name" class="thumbnail-img" />
    <div class="thumbnail-info">
      <img v-if="appIcon" :src="appIcon" class="app-icon" />
      <span class="name">{{ name }}</span>
    </div>
  </div>
</template>

<style scoped>
.thumbnail {
  background: var(--bg-secondary);
  overflow: hidden;
}

.thumbnail-img {
  width: 100%;
  height: 120px;
  object-fit: cover;
  display: block;
}

.thumbnail-info {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 8px;
}

.app-icon {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
}

.name {
  font-size: 12px;
  color: var(--text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
