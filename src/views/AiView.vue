// src/views/AiView.vue
// AI assistant view — loaded in a separate BrowserWindow
<script setup lang="ts">
import Layout from '../components/Layout.vue'
import SettingsPanel from '../components/SettingsPanel.vue'
</script>

<template>
  <Layout>
    <div class="ai-view">
      <SettingsPanel />
    </div>
  </Layout>
</template>

<style scoped>
.ai-view {
  height: calc(100vh - var(--titlebar-height));
  overflow: hidden;
  background: var(--bg-surface, #eaeaec);
}
</style>
