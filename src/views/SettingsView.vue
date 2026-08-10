// src/views/SettingsView.vue
// 悬浮球设置视图 —— 在独立 BrowserWindow 中加载（hash 路由 /settings）
<script setup lang="ts">
import Layout from '../components/Layout.vue'
import FloatingBallSettingsPanel from '../components/FloatingBallSettingsPanel.vue'
</script>

<template>
  <Layout>
    <div class="settings-view">
      <FloatingBallSettingsPanel />
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
