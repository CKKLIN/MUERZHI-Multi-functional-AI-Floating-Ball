<script setup lang="ts">
// ToolsView.vue —— 自定义工具箱视图，在独立 BrowserWindow 加载（hash 路由 /tools）
import Layout from '../components/Layout.vue'
import ToolsApp from '../components/ToolsApp.vue'
</script>

<template>
  <Layout>
    <div class="tools-view">
      <ToolsApp />
    </div>
  </Layout>
</template>

<style scoped>
.tools-view {
  flex: 1;
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--bg-surface, #ffffff);
}
</style>

<!-- 自定义工具箱整体配色：温暖莫兰迪落日暖木色调 -->
<style>
:root {
  --bg-primary: #f5f5f7;
  --bg-secondary: #efeff1;
  --bg-surface: #ffffff;
  --bg-hover: #e8e8ed;
  --bg-input: #f5f5f7;
  --text-primary: #1d1d1f;
  --text-secondary: #56565c;
  --text-muted: #8d8d93;
  --accent: #A27B5C;           /* 莫兰迪暖赭落日木 */
  --accent-hover: #8e684a;
  --accent-bg: rgba(162, 123, 92, 0.12);
  --border: #eaeaef;
  --border-light: #d4d4d9;
}
</style>
