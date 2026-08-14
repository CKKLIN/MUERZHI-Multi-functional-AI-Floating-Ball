<script setup lang="ts">
// TodoView.vue —— 待办便签视图，在独立 BrowserWindow 加载（hash 路由 /todo）
import Layout from '../components/Layout.vue'
import TodoApp from '../components/TodoApp.vue'
</script>

<template>
  <Layout>
    <div class="todo-view">
      <TodoApp />
    </div>
  </Layout>
</template>

<style scoped>
.todo-view {
  height: calc(100vh - var(--titlebar-height));
  overflow: hidden;
  background: var(--bg-surface, #eaeaec);
}
</style>

<!-- 待办窗口整体配色：Apple 风格 —— 温暖中性灰底、克制高级的靛蓝点缀，去品牌红。
     这是独立 BrowserWindow，覆盖 :root 只影响本窗口（含 Layout 标题栏），不影响其余应用窗口。 -->
<style>
:root {
  --bg-primary: #f5f5f7;       /* Apple 暖灰 */
  --bg-secondary: #efeff1;
  --bg-surface: #ffffff;
  --bg-hover: #e8e8ed;
  --bg-input: #f5f5f7;
  --text-primary: #1d1d1f;
  --text-secondary: #56565c;
  --text-muted: #8d8d93;
  --accent: #4e5cd4;           /* 高级靛蓝 */
  --accent-hover: #404db9;
  --accent-bg: rgba(78, 92, 212, 0.10);
  --success: #34c759;          /* Apple 绿 */
  --success-bg: rgba(52, 199, 89, 0.14);
  --info: #4e5cd4;
  --info-bg: rgba(78, 92, 212, 0.10);
  --warning: #c58011;
  --warning-bg: rgba(197, 128, 17, 0.12);
  --border: #eaeaef;
  --border-light: #d4d4d9;
  --shadow: 0 1px 2px rgba(0,0,0,0.05), 0 6px 16px rgba(0,0,0,0.05);
  --shadow-lg: 0 4px 8px rgba(0,0,0,0.06), 0 18px 40px rgba(0,0,0,0.12);
}
</style>
