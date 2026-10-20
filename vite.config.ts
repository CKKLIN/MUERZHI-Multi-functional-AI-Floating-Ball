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
    // 显式绑 IPv4 回环。默认不写 host 时 Vite 只听 [::1]，而 WebView2 访问
    // devUrl「localhost」在 Windows 上先试 127.0.0.1 —— 那边没人监听，每次请求
    // 都要等满 IPv4 连接超时才回退 IPv6。主窗口是 visible:false 预定义的、
    // 启动即在后台加载这个地址，于是点菜单时它常还卡在超时里，窗口一片空白、
    // 「要特别久内容才出现」。绑 127.0.0.1 让 IPv4 直通，不走超时回退。
    host: '127.0.0.1',
    headers: {
      'Cache-Control': 'no-store',
    },
    hmr: true,
  },
})
