import { Tray, Menu, nativeImage, app } from 'electron'
import { join } from 'node:path'
import log from './logger'

declare const __dirname: string

let tray: Tray | null = null

function getTrayIcon() {
  const iconPath = app.isPackaged
    ? join(process.resourcesPath, 'logo.ico')
    : join(__dirname, '../../public/logo.ico')
  const img = nativeImage.createFromPath(iconPath)
  return img.resize({ width: 16, height: 16 })
}

function getBalloonIcon() {
  const iconPath = app.isPackaged
    ? join(process.resourcesPath, 'logo.png')
    : join(__dirname, '../../public/logo.png')
  if (iconPath) {
    const img = nativeImage.createFromPath(iconPath)
    const resized = img.resize({ width: 64, height: 64, quality: 'better' })
    return resized
  }
  return nativeImage.createEmpty()
}

function createTray() {
  if (tray && !tray.isDestroyed()) return
  tray = new Tray(getTrayIcon())

  tray.setToolTip('二支录制')

  const contextMenu = Menu.buildFromTemplate([
    {
      label: '显示设置窗口',
      click: () => {
        // 走 process 通道由 index.ts 统一处理，避免与 index 循环依赖
        process.emit('clawd-show-settings-window' as any)
      },
    },
    { type: 'separator' },
    {
      label: '退出',
      click: () => {
        const { app } = require('electron') as typeof import('electron')
        app.quit()
      },
    },
  ])
  tray.setContextMenu(contextMenu)

  tray.on('click', () => {
    process.emit('clawd-show-settings-window' as any)
  })

  log.info('System tray created')
}

function showBalloon(title: string, content: string) {
  if (tray && !tray.isDestroyed()) {
    tray.displayBalloon({ title, content, icon: getBalloonIcon() })
    log.info('Tray balloon:', title, content)
  }
}

function destroyTray() {
  if (tray && !tray.isDestroyed()) {
    tray.destroy()
    tray = null
  }
}

module.exports = { createTray, showBalloon, destroyTray }
