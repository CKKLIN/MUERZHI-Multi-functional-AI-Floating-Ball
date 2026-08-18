// todo-window.ts —— 待办便签窗口封装
//
// 范式与 index.ts 的 showAiWindow / showSettingsWindow 一致：独立 BrowserWindow + Vue
// hash 路由 /todo。默认置顶（persist 在 todo-settings.json 的 windowAlwaysOnTop），渲染层
// 标题栏提供置顶开关走 toggleTodoWindowAlwaysOnTop。
import { BrowserWindow, app, nativeImage } from 'electron'
import { join } from 'node:path'
import log from './logger'
import { loadTodoSettings, updateTodoSettings } from './todo-store'
import { acknowledgeTodoBadgeFlash } from './todo-badge'

let todoWindow: BrowserWindow | null = null

// 与应用其它窗口一致的任务栏/品牌图标（复制自 index.ts 的 getIcon，因窗口模块不反向 import index）
function getIcon() {
  const iconPath = app.isPackaged
    ? join(process.resourcesPath, 'logo.ico')
    : join(__dirname, '..', '..', 'public', 'logo.ico')
  return nativeImage.createFromPath(iconPath)
}

export function showTodoWindow(): void {
  if (todoWindow && !todoWindow.isDestroyed()) {
    todoWindow.show()
    todoWindow.focus()
    acknowledgeTodoBadgeFlash()
    return
  }
  const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
  const preloadPath = join(__dirname, '..', 'preload', 'index.cjs')
  todoWindow = new BrowserWindow({
    icon: getIcon(),
    width: 525,
    height: 450,
    minWidth: 320,
    minHeight: 360,
    show: false,
    skipTaskbar: false, // 从菜单打开的待办便签窗口需在任务栏有图标，便于切换
    frame: false,
    titleBarStyle: 'hidden',
    title: '待办便签',
    backgroundColor: '#eaeaec',
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  })
  todoWindow.setAlwaysOnTop(loadTodoSettings().windowAlwaysOnTop, 'normal')
  if (VITE_DEV_SERVER_URL) {
    todoWindow.loadURL(`${VITE_DEV_SERVER_URL}#/todo?t=${Date.now()}`)
  } else {
    todoWindow.loadFile(join(process.env.DIST!, 'index.html'), { hash: '/todo' })
  }
  todoWindow.once('ready-to-show', () => {
    todoWindow?.show()
  })
  todoWindow.on('closed', () => { todoWindow = null })

  // 打开窗口即视为已查看到期项，熄灭悬浮球气泡的到期闪烁
  acknowledgeTodoBadgeFlash()
  log.info('Todo window shown')
}

export function closeTodoWindow(): void {
  if (todoWindow && !todoWindow.isDestroyed()) {
    todoWindow.close()
  }
  todoWindow = null
}

export function isTodoWindowVisible(): boolean {
  return !!(todoWindow && !todoWindow.isDestroyed())
}

/** 切换待办窗口置顶并持久化，返回新值。 */
export function toggleTodoWindowAlwaysOnTop(): boolean {
  const next = !loadTodoSettings().windowAlwaysOnTop
  updateTodoSettings({ windowAlwaysOnTop: next })
  if (todoWindow && !todoWindow.isDestroyed()) {
    todoWindow.setAlwaysOnTop(next, 'normal')
  }
  return next
}

/** 打开待办窗口并定位到指定条（贴屏便签点击“打开待办”用）。 */
export function focusTodoItem(id: string): void {
  showTodoWindow()
  if (!todoWindow || todoWindow.isDestroyed()) return
  const send = () => {
    if (todoWindow && !todoWindow.isDestroyed()) {
      todoWindow.webContents.send('todo-focus-item', id)
    }
  }
  if (todoWindow.webContents.isLoading()) {
    todoWindow.webContents.once('did-finish-load', send)
  } else {
    send()
  }
}
