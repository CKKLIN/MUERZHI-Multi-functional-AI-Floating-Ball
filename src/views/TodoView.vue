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
  flex: 1;
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--bg-surface, #eaeaec);
}
</style>

<!-- 待办窗口整体配色：温暖中性灰底、莫兰迪烟波蓝点缀。
     这是独立 BrowserWindow，覆盖 :root 只影响本窗口（含 Layout 标题栏），不影响其余应用窗口。 -->
<style>
:root {
  --bg-primary: #f5f5f7;       /* 暖灰 */
  --bg-secondary: #efeff1;
  --bg-surface: #ffffff;
  --bg-hover: #e8e8ed;
  --bg-input: #f5f5f7;
  --text-primary: #1d1d1f;
  --text-secondary: #56565c;
  --text-muted: #8d8d93;
  --accent: #6876A4;           /* 莫兰迪烟波蓝 */
  --accent-hover: #818FB9;
  --accent-bg: rgba(104, 118, 164, 0.12);
  --success: #5E9387;          /* 莫兰迪青 */
  --success-bg: rgba(94, 147, 135, 0.12);
  --info: #6876A4;
  --info-bg: rgba(104, 118, 164, 0.12);
  --warning: #B09272;
  --warning-bg: rgba(176, 146, 114, 0.12);
  --border: #eaeaef;
  --border-light: #d4d4d9;
  --shadow: 0 1px 2px rgba(0,0,0,0.05), 0 6px 16px rgba(0,0,0,0.05);
  --shadow-lg: 0 4px 8px rgba(0,0,0,0.06), 0 18px 40px rgba(0,0,0,0.12);
  /* 3D 斜切立体：将强调色与渐变映射到莫兰迪烟波蓝 */
  --surface-accent: #6876A4;
  --surface-accent-grad: linear-gradient(135deg, #818FB9 0%, #6876A4 100%);
  --surface-accent-glow: rgba(104, 118, 164, 0.35);
  --surface-accent-bg: rgba(104, 118, 164, 0.12);
}
</style>
