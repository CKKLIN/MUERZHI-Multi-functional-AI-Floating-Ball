import { Tray, Menu, nativeImage, BrowserWindow, app } from 'electron'
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

function createTray() {
  if (tray && !tray.isDestroyed()) return
  tray = new Tray(getTrayIcon())

  tray.setToolTip('二支录制')

  const contextMenu = Menu.buildFromTemplate([
    {
      label: '显示主窗口',
      click: () => {
        const win = BrowserWindow.getAllWindows()[0]
        if (win) {
          win.show()
          win.focus()
        }
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
    const win = BrowserWindow.getAllWindows()[0]
    if (win) {
      win.show()
      win.focus()
    }
  })

  log.info('System tray created')
}

function showBalloon(title: string, content: string) {
  if (tray && !tray.isDestroyed()) {
    tray.displayBalloon({ title, content })
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
