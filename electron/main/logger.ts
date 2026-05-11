import log from 'electron-log/main'

log.initialize()
log.transports.file.maxSize = 5 * 1024 * 1024
log.transports.console.level = 'error'

let initialized = false

function initLogPath() {
  if (initialized) return
  initialized = true
  const { app } = require('electron') as typeof import('electron')
  const { join, dirname } = require('node:path') as typeof import('node:path')

  const logDir = app.isPackaged
    ? join(dirname(app.getPath('exe')), 'logs')
    : join(app.getAppPath(), 'src', 'log')

  const getDate = () => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  }

  log.transports.file.resolvePathFn = (variables) => {
    const date = getDate()
    return join(logDir, date + '.log')
  }
}

export function ensureLogPath() {
  initLogPath()
}

export default log
