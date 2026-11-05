<script setup lang="ts">
import { onMounted } from 'vue'
import { useSettingsStore } from './stores/settings'

const settingsStore = useSettingsStore()
// 录制历史与录制输出目录只由 HomeView 消费，不在此全局加载
// 避免 ai/settings/todo/about 每开一个窗就多做无谓的磁盘与 IPC 请求
onMounted(() => {
  settingsStore.loadSettings()
})
</script>

<template>
  <router-view />
</template>
