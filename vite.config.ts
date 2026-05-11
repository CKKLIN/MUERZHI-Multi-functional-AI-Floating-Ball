import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import electron from 'vite-plugin-electron'
import renderer from 'vite-plugin-electron-renderer'
import { copyFileSync, mkdirSync, existsSync, statSync } from 'node:fs'

// ELECTRON_RUN_AS_NODE=1 会让 Electron 以普通 Node.js 模式运行，导致所有 Electron API 不可用
if (process.env.ELECTRON_RUN_AS_NODE === '1') {
  delete process.env.ELECTRON_RUN_AS_NODE
}

function copyHtmlFiles() {
  mkdirSync('dist-electron/main', { recursive: true })
  try { copyFileSync('electron/region-selector.html', 'dist-electron/main/region-selector.html') } catch {}
  try { copyFileSync('electron/camera-preview.html', 'dist-electron/main/camera-preview.html') } catch {}
  try { copyFileSync('electron/screenshot-selector.html', 'dist-electron/main/screenshot-selector.html') } catch {}
  try { copyFileSync('electron/pin-window.html', 'dist-electron/main/pin-window.html') } catch {}
}

function srcHtmlNewer() {
  try {
    const distStat = statSync('dist-electron/main/camera-preview.html')
    const srcStat = statSync('electron/camera-preview.html')
    return srcStat.mtimeMs > distStat.mtimeMs
  } catch { return true }
}

export default defineConfig({
  plugins: [
    vue(),
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
              external: ['fluent-ffmpeg', '@ffmpeg-installer/ffmpeg'],
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
    {
      name: 'copy-html-files',
      configureServer(server) {
        copyHtmlFiles()
        server.watcher.add('electron/camera-preview.html')
        server.watcher.add('electron/region-selector.html')
        server.watcher.add('electron/screenshot-selector.html')
        server.watcher.add('electron/pin-window.html')
        server.watcher.on('change', (file) => {
          if (file.includes('camera-preview.html') || file.includes('region-selector.html') || file.includes('screenshot-selector.html') || file.includes('pin-window.html')) {
            copyHtmlFiles()
          }
        })
      },
      buildEnd: copyHtmlFiles,
      closeBundle: copyHtmlFiles,
    },
  ],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  server: {
    port: 3344,
    strictPort: true,
  },
})
