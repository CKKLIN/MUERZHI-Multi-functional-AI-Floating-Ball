import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import electron from 'vite-plugin-electron'
import renderer from 'vite-plugin-electron-renderer'
import { copyFileSync, mkdirSync } from 'node:fs'

// ELECTRON_RUN_AS_NODE=1 会让 Electron 以普通 Node.js 模式运行，导致所有 Electron API 不可用
if (process.env.ELECTRON_RUN_AS_NODE === '1') {
  delete process.env.ELECTRON_RUN_AS_NODE
}

// Rust 迁移（rust-migration 分支）：tauri dev/build 以 beforeCommand 调 dev:web/build:web，
// 设置 TAURI_BUILD=1 跳过 electron 插件，只产前端资产。原 npm run dev 仍走 Electron 双轨。
const IS_TAURI = process.env.TAURI_BUILD === '1'

function copyHtmlFiles() {
  mkdirSync('dist-electron/main', { recursive: true })
  try { copyFileSync('electron/region-selector.html', 'dist-electron/main/region-selector.html') } catch {}
  try { copyFileSync('electron/camera-preview.html', 'dist-electron/main/camera-preview.html') } catch {}
  try { copyFileSync('electron/screenshot-selector.html', 'dist-electron/main/screenshot-selector.html') } catch {}
  try { copyFileSync('electron/pin-window.html', 'dist-electron/main/pin-window.html') } catch {}
  try { copyFileSync('electron/main/clawd-hook.js', 'dist-electron/main/clawd-hook.js') } catch {}
  try { copyFileSync('electron/main/question-card-utils.js', 'dist-electron/main/question-card-utils.js') } catch {}
}

export default defineConfig({
  plugins: [
    vue(),
    // Electron 插件仅在原双轨模式下启用；TAURI_BUILD=1 时产出纯前端资产给 Tauri 打包
    ...(IS_TAURI
      ? []
      : [
          electron([
            {
              entry: 'electron/main/index.ts',
              vite: {
                build: {
                  outDir: 'dist-electron/main',
                  rollupOptions: {
                    output: {
                      entryFileNames: '[name].cjs',
                    },
                    external: ['fluent-ffmpeg'],
                  },
                },
              },
              onstart(args) {
                args.startup()
              },
            },
            {
              entry: 'electron/preload/index.ts',
              vite: {
                build: {
                  outDir: 'dist-electron/preload',
                  rollupOptions: {
                    output: {
                      entryFileNames: '[name].cjs',
                    },
                  },
                },
              },
            },
          ]),
          renderer(),
        ]),
    {
      name: 'copy-html-files',
      configureServer(server) {
        copyHtmlFiles()
        server.watcher.add('electron/camera-preview.html')
        server.watcher.add('electron/region-selector.html')
        server.watcher.add('electron/screenshot-selector.html')
        server.watcher.add('electron/pin-window.html')
        server.watcher.add('electron/main/clawd-hook.js')
        server.watcher.add('electron/main/question-card-utils.js')
        server.watcher.on('change', (file) => {
          if (file.includes('camera-preview.html') || file.includes('region-selector.html') || file.includes('screenshot-selector.html') || file.includes('pin-window.html') || file.includes('clawd-hook.js') || file.includes('question-card-utils.js')) {
            copyHtmlFiles()
          }
        })
      },
      buildEnd: copyHtmlFiles,
      closeBundle: function() {
        // 只复制文件一次，不触发重建
        copyHtmlFiles()
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
