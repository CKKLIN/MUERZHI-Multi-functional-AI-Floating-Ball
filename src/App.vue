<script setup lang="ts">
import { onMounted } from 'vue'
import { useSettingsStore } from './stores/settings'

const settingsStore = useSettingsStore()
// 录制历史（recordings 内嵌 base64 缩略图，上限 100 条 × 几十 KB）只由 HomeView 消费，
// 不在此全局加载 —— 否则 ai/settings/todo/about 每开一个窗就把整份历史拷进各自 JS 堆。
onMounted(async () => {
  settingsStore.loadSettings()
  await settingsStore.initOutputDir()
})
</script>

<template>
  <router-view />
</template>
