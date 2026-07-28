// src/views/SettingsView.vue
// Standalone settings view — loaded in a separate BrowserWindow
<script setup lang="ts">
import Layout from '../components/Layout.vue'
import SettingsPanel from '../components/SettingsPanel.vue'
</script>

<template>
  <Layout>
    <div class="settings-view">
      <SettingsPanel />
    </div>
  </Layout>
</template>

<style scoped>
.settings-view {
  height: calc(100vh - var(--titlebar-height));
  overflow: hidden;
  background: var(--bg-surface, #eaeaec);
}
</style>
