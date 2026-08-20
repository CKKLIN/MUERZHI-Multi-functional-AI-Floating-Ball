// electron/main/music-window.ts —— 音乐窗口（G6）
// 独立 BrowserWindow + Vue hash 路由 /music（与 ai/settings 窗口同范式）。
// 界面在 src/views/MusicView.vue：SMTC 信息 + 控制 + 音频回环频谱 + 歌词（见该文件）。
// IPC：
//   music-get-status → getSmtcStatus()（PowerShell/WinRT，失败降级）
//   music-control(cmd) → smtcControl(cmd)（play/pause/next/prev）
import { BrowserWindow, ipcMain, nativeImage, app } from 'electron'
import { join } from 'node:path'
import log from './logger'
import { getSmtcStatus, smtcControl } from './music-smtc'

let musicWindow: BrowserWindow | null = null

// 与其它窗口一致的任务栏/品牌图标（复制自 index.ts 的 getIcon，窗口模块不反向 import index）
function getIcon() {
  const iconPath = app.isPackaged
    ? join(process.resourcesPath, 'logo.ico')
    : join(__dirname, '..', '..', 'public', 'logo.ico')
  return nativeImage.createFromPath(iconPath)
}

export function showMusicWindow() {
  if (musicWindow && !musicWindow.isDestroyed()) {
    musicWindow.show()
    musicWindow.focus()
    return
  }
  const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
  const preloadPath = join(__dirname, '..', 'preload', 'index.cjs')
  musicWindow = new BrowserWindow({
    icon: getIcon(),
    width: 400,
    height: 480,
    minWidth: 340,
    minHeight: 380,
    show: false,
    skipTaskbar: false, // 从菜单打开的音乐窗口需在任务栏有图标，便于切换
    frame: false,
    titleBarStyle: 'hidden',
    title: '音乐',
    backgroundColor: '#eaeaec',
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  })
  if (VITE_DEV_SERVER_URL) {
    musicWindow.loadURL(`${VITE_DEV_SERVER_URL}#/music?t=${Date.now()}`)
  } else {
    musicWindow.loadFile(join(process.env.DIST!, 'index.html'), { hash: '/music' })
  }
  musicWindow.once('ready-to-show', () => {
    musicWindow?.show()
  })
  musicWindow.on('closed', () => { musicWindow = null })
  log.info('Music window shown')
}

export function closeMusicWindow() {
  if (musicWindow && !musicWindow.isDestroyed()) musicWindow.destroy()
  musicWindow = null
}

export function isMusicWindowVisible(): boolean {
  return !!(musicWindow && !musicWindow.isDestroyed())
}

export function registerMusicHandlers() {
  ipcMain.handle('show-music-window', () => showMusicWindow())
  ipcMain.handle('close-music-window', () => closeMusicWindow())
  // SMTC：读取 + 控制（失败由 music-smtc 降级返回，不抛异常）
  ipcMain.handle('music-get-status', () => getSmtcStatus())
  ipcMain.handle('music-control', (_e, cmd: string) => smtcControl(cmd))
}
