import { join } from 'node:path'
import { app, BrowserWindow, nativeImage } from 'electron'
import log, { ensureLogPath } from './logger'
import { registerIpcHandlers } from './ipc-handlers'
import { setMainWindow } from './region-selector'
import { registerGlobalShortcuts, unregisterGlobalShortcuts } from './global-shortcuts'
import { createTray, destroyTray } from './tray'
import { reportIP, retryPending } from './ip-reporter'
import { showFloatingBall } from './floating-ball'
import { createAgentBridge, type AgentBridge } from './agent-bridge'

declare const __dirname: string

let mainWindow: BrowserWindow | null = null
let agentBridge: AgentBridge | null = null
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
    frame: false,
    titleBarStyle: 'hidden',
    title: '二支录制',
    backgroundColor: '#eaeaec',
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
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

  ensureLogPath()
  log.info('App starting...')
  const preloadPath = join(__dirname, '..', 'preload', 'index.cjs')
  registerIpcHandlers(agentBridge)
  createWindow(preloadPath)
  setMainWindow(mainWindow!)
  createTray()
  registerGlobalShortcuts(mainWindow!)
  showFloatingBall()
  reportIP()

  // 启动 Agent Bridge
  agentBridge = createAgentBridge({
    autoInstallHooks: false,
    autoStartWatcher: false,
  })
  agentBridge.start()

  setInterval(retryPending, 30_000)

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
  unregisterGlobalShortcuts()
  destroyTray()
  mainWindow = null
})
