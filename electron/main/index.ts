import { join } from 'node:path'
import { app, BrowserWindow, nativeImage, ipcMain } from 'electron'
import log, { ensureLogPath } from './logger'
import { registerIpcHandlers } from './ipc-handlers'
import { setMainWindow, hideRegionBorder, hideFloatingIsland, hideCameraPreview } from './region-selector'
import { registerGlobalShortcuts, unregisterGlobalShortcuts } from './global-shortcuts'
import { createTray, destroyTray } from './tray'
import { reportIP, retryPending } from './ip-reporter'
import { hideFloatingBall, showFloatingBallIfVisible, getBallSettings } from './floating-ball'
import { createAgentBridge, type AgentBridge } from './agent-bridge'
import { hideAiIsland } from './ai-island'
import { setRegistryLogger, killAllConversions } from './conversion-registry'
import { setHwEncoderLogger } from './hw-encoder'
import { registerLocalVideoScheme, registerLocalVideoProtocol } from './local-video-protocol'

declare const __dirname: string

// 必须在 app.ready 前注册 scheme 为 privileged
registerLocalVideoScheme()

let mainWindow: BrowserWindow | null = null
let aiWindow: BrowserWindow | null = null
let settingsWindow: BrowserWindow | null = null
let agentBridge: AgentBridge | null = null
let retryPendingTimer: NodeJS.Timeout | null = null
const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']

function getIcon() {
  const iconPath = app.isPackaged
    ? join(process.resourcesPath, 'logo.ico')
    : join(__dirname, '../../public/logo.ico')
  return nativeImage.createFromPath(iconPath)
}

function createWindow(preloadPath: string) {
  mainWindow = new BrowserWindow({
    icon: getIcon(),
    width: 550,
    height: 420,
    minWidth: 420,
    minHeight: 340,
    show: false,
    skipTaskbar: false, // 从菜单打开的主录制窗口需在任务栏有图标，便于用户切换/回到
    frame: false,
    titleBarStyle: 'hidden',
    title: '二支录制',
    backgroundColor: '#eaeaec',
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      // 录制中主窗口会被 minimize，必须关节流否则 MediaRecorder / captureStream(0)
      // / 50ms 音频采样被降到 ~1Hz 破坏录制。idle 隐藏的开销已由 drawFrame 只录制时
      // 跑 + audio document.hidden 跳过 守卫到最小。
      backgroundThrottling: false,
    },
  })

  if (VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(VITE_DEV_SERVER_URL)
  } else {
    mainWindow.loadFile(join(process.env.DIST!, 'index.html'))
  }

  mainWindow.on('close', (e) => {
    if (!(app as any).isQuitting) {
      e.preventDefault()
      mainWindow?.hide()
    }
  })
}

app.on('gpu-process-crashed', (_event, details) => {
  log.error('GPU process crashed:', JSON.stringify(details))
})

app.whenReady().then(() => {
  process.env.DIST = join(__dirname, '../../dist')
  process.env.VITE_PUBLIC = app.isPackaged
    ? process.env.DIST
    : join(__dirname, '../../public')

  // 注册 local-video:// 协议 handler（流式播放本地视频，支持 Range seek）
  registerLocalVideoProtocol()

  ensureLogPath()
  log.info('App starting...')
  setRegistryLogger(log)
  setHwEncoderLogger(log)
  const preloadPath = join(__dirname, '..', 'preload', 'index.cjs')

  // 先启动 Agent Bridge（HTTP server + 状态机 + hooks），AI 岛改为按需懒创建
  agentBridge = createAgentBridge({
    autoInstallHooks: true,
    autoStartWatcher: true,
  })
  agentBridge.start().catch((err) => {
    log.error('Agent bridge start failed:', err?.message ?? err)
  })

  registerIpcHandlers(agentBridge)
  createWindow(preloadPath)
  setMainWindow(mainWindow!)
  createTray()
  registerGlobalShortcuts(mainWindow!)
  showFloatingBallIfVisible()
  reportIP()

  // 启动时按持久化设置对齐系统开机自启状态（防止用户在系统层面手动改过）
  try {
    const ballSettings = getBallSettings()
    app.setLoginItemSettings({ openAtLogin: ballSettings.openAtLogin })
  } catch (e) {
    log.error('Sync openAtLogin on startup failed:', e)
  }

  // AI 助手窗口 IPC
  ipcMain.handle('show-ai-window', () => {
    showAiWindow()
  })
  ipcMain.handle('show-settings-window', () => {
    showSettingsWindow()
  })
  ipcMain.handle('show-main-window', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.show()
      mainWindow.focus()
    }
  })

  // 悬浮球触发窗口
  process.on('clawd-show-record-window' as any, () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.show()
      mainWindow.focus()
    }
  })
  process.on('clawd-show-ai-window' as any, () => {
    showAiWindow()
  })
  process.on('clawd-show-settings-window' as any, () => {
    showSettingsWindow()
  })

  retryPendingTimer = setInterval(retryPending, 30_000)
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow(preloadPath)
    }
  })
})

app.on('window-all-closed', () => {
  // 关闭所有窗口后不退出，继续在托盘运行
})

app.on('before-quit', () => {
  ;(app as any).isQuitting = true
  // 通知渲染层：应用即将退出，请停止 MediaRecorder / 释放流
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) {
      try { win.webContents.send('app-before-quit') } catch { /* webContents may be gone */ }
    }
  }
  // 关闭录制相关的 overlay 窗口并清其定时器（这些 hide* 只在正常停止录制时调用，
  // quit 时若不显式调用，其内部 setInterval 会一直跑到进程死亡）
  hideRegionBorder()
  hideFloatingIsland()
  hideCameraPreview()
  hideFloatingBall()
  // 停止 AI 子系统（HTTP 服务器 + 状态机/监听器定时器 + runtime.json 清理）
  agentBridge?.stop()
  hideAiIsland()
  // kill 所有在途 ffmpeg 转换，避免 ffmpeg.exe 成为孤儿进程继续吃 CPU
  killAllConversions()
  unregisterGlobalShortcuts()
  destroyTray()
  if (retryPendingTimer) {
    clearInterval(retryPendingTimer)
    retryPendingTimer = null
  }
  mainWindow = null
  aiWindow = null
  settingsWindow = null
})

function showAiWindow() {
  if (aiWindow && !aiWindow.isDestroyed()) {
    aiWindow.show()
    aiWindow.focus()
    return
  }
  const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
  const preloadPath = join(__dirname, '..', 'preload', 'index.cjs')
  aiWindow = new BrowserWindow({
    icon: getIcon(),
    width: 480,
    height: 540,
    minWidth: 400,
    minHeight: 400,
    show: false,
    skipTaskbar: false, // 从菜单打开的 AI 助手窗口需在任务栏有图标，便于切换
    frame: false,
    titleBarStyle: 'hidden',
    title: 'AI 助手',
    backgroundColor: '#eaeaec',
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  })
  if (VITE_DEV_SERVER_URL) {
    aiWindow.loadURL(`${VITE_DEV_SERVER_URL}#/ai?t=${Date.now()}`)
  } else {
    aiWindow.loadFile(join(process.env.DIST!, 'index.html'), { hash: '/ai' })
  }
  aiWindow.once('ready-to-show', () => {
    aiWindow?.show()
  })
  aiWindow.on('closed', () => { aiWindow = null })
}

// 设置窗口（悬浮球专属设置：显示/隐藏、置顶、开机自启、重置位置）
// 范式与 showAiWindow 完全一致：独立 BrowserWindow + Vue hash 路由 /settings
function showSettingsWindow() {
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.show()
    settingsWindow.focus()
    return
  }
  const preloadPath = join(__dirname, '..', 'preload', 'index.cjs')
  settingsWindow = new BrowserWindow({
    icon: getIcon(),
    width: 420,
    height: 480,
    minWidth: 380,
    minHeight: 420,
    show: false,
    skipTaskbar: false, // 从菜单打开的设置窗口需在任务栏有图标，便于切换
    frame: false,
    titleBarStyle: 'hidden',
    title: '设置',
    backgroundColor: '#eaeaec',
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  })
  if (VITE_DEV_SERVER_URL) {
    settingsWindow.loadURL(`${VITE_DEV_SERVER_URL}#/settings?t=${Date.now()}`)
  } else {
    settingsWindow.loadFile(join(process.env.DIST!, 'index.html'), { hash: '/settings' })
  }
  settingsWindow.once('ready-to-show', () => {
    settingsWindow?.show()
  })
  settingsWindow.on('closed', () => { settingsWindow = null })
}
