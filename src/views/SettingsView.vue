// src/views/SettingsView.vue
// Standalone settings view — loaded in a separate BrowserWindow
<script setup lang="ts">
import SettingsPanel from '../components/SettingsPanel.vue'
</script>

<template>
  <div class="settings-view">
    <SettingsPanel />
  </div>
</template>

<style scoped>
.settings-view {
  height: 100vh;
  overflow: hidden;
  background: var(--bg-surface, #eaeaec);
}
</style>
