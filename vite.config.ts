import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// Rust 迁移（Tauri 2 后端）：tauri dev/build 以 beforeCommand 调 dev:web/build:web。
// 原生 HTML 窗口（悬浮球/工具条/选区页等）在 public/windows/ 下，由 vite 直接产出到 dist/windows/。
export default defineConfig({
  plugins: [vue()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  server: {
    port: 21047,
    // 必须严格绑定 21047：tauri.conf.json 的 devUrl 固定指向该端口，
    // 静默跳端口会让窗口加载到别的服务上（宁可启动失败也不错位）
    strictPort: true,
    headers: {
      'Cache-Control': 'no-store',
    },
    hmr: true,
  },
})
