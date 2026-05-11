<script setup lang="ts">
import { onMounted } from 'vue'
import { useSettingsStore } from './stores/settings'
import { useRecordingStore } from './stores/recording'

const settingsStore = useSettingsStore()
const recordingStore = useRecordingStore()

onMounted(async () => {
  settingsStore.loadSettings()
  await settingsStore.initOutputDir()
  recordingStore.loadRecordings()
})
</script>

<template>
  <router-view />
</template>
