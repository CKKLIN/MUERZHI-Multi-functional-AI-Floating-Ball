import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { copyFileSync, mkdirSync } from 'node:fs'

// Rust 迁移（Tauri 2 后端）：tauri dev/build 以 beforeCommand 调 dev:web/build:web，
// 设置 TAURI_BUILD=1 时跳过 HTML 复制（tauri.conf.json 的 resources 已接管）。
// 原生 HTML 窗口（悬浮球/工具条等）在 public/windows/ 下，由 vite 直接产出到 dist/windows/。
const IS_TAURI = process.env.TAURI_BUILD === '1'

export default defineConfig({
  plugins: [
    vue(),
    {
      name: 'copy-html-files',
      configureServer(server) {
        if (IS_TAURI) return
        copyHtmlFiles()
        server.watcher.add('electron/camera-preview.html')
        server.watcher.add('electron/region-selector.html')
        server.watcher.on('change', (file) => {
          if (file.includes('camera-preview.html') || file.includes('region-selector.html')) {
            copyHtmlFiles()
          }
        })
      },
    },
  ],
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

function copyHtmlFiles() {
  mkdirSync('dist-electron/main', { recursive: true })
  try { copyFileSync('electron/region-selector.html', 'dist-electron/main/region-selector.html') } catch {}
  try { copyFileSync('electron/camera-preview.html', 'dist-electron/main/camera-preview.html') } catch {}
  try { copyFileSync('electron/main/clawd-hook.js', 'dist-electron/main/clawd-hook.js') } catch {}
  try { copyFileSync('electron/main/question-card-utils.js', 'dist-electron/main/question-card-utils.js') } catch {}
}