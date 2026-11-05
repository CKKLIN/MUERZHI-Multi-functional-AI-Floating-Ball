// src/views/AiView.vue
// AI assistant view — loaded in a separate BrowserWindow
<script setup lang="ts">
import Layout from '../components/Layout.vue'
import AiSettingsPanel from '../components/AiSettingsPanel.vue'
</script>

<template>
  <Layout>
    <div class="ai-view">
      <AiSettingsPanel />
    </div>
  </Layout>
</template>

<style scoped>
.ai-view {
  flex: 1;
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--bg-surface, #eaeaec);
}
</style>
