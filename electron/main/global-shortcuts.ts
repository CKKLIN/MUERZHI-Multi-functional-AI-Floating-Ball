import { globalShortcut, BrowserWindow } from 'electron'
import log from './logger'

let mainWindow: BrowserWindow | null = null

export function registerGlobalShortcuts(win: BrowserWindow) {
  mainWindow = win

  globalShortcut.register('CommandOrControl+Shift+R', () => {
    log.info('Global shortcut: start/stop recording')
    mainWindow?.webContents.send('on-global-shortcut', 'startStop')
  })

  globalShortcut.register('CommandOrControl+Shift+P', () => {
    log.info('Global shortcut: pause/resume recording')
    mainWindow?.webContents.send('on-global-shortcut', 'pauseResume')
  })

  log.info('Global shortcuts registered')
}

export function unregisterGlobalShortcuts() {
  globalShortcut.unregisterAll()
}
