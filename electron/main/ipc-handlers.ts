import { ipcMain, desktopCapturer, dialog, app, BrowserWindow, shell, screen } from 'electron'
import nodeFs from 'node:fs'
import { dirname, join } from 'node:path'
import { convertWebmToMp4, convertToGif, cropVideo, mergeMultiScreen } from './ffmpeg'
import { selectRegion, registerRegionSelectorHandlers } from './region-selector'
import { registerFloatingBallHandlers } from './floating-ball'
import { showBalloon } from './tray'
import { showAiIsland, hideAiIsland, registerAiIslandHandlers } from './ai-island'
import type { AgentBridge } from './agent-bridge'
import log from './logger'

const { updateAudioLevels } = require('./region-selector')

function getRecordingsPath() {
  return join(app.getPath('userData'), 'recordings.json')
}

export function registerIpcHandlers(agentBridge?: AgentBridge) {
  registerRegionSelectorHandlers()
  registerFloatingBallHandlers()
  registerAiIslandHandlers()
  ipcMain.handle('show-ai-island', () => { showAiIsland() })
  ipcMain.handle('hide-ai-island', () => { hideAiIsland() })
  ipcMain.handle('select-region', async () => {
    return selectRegion()
  })
  ipcMain.handle('get-sources', async (_event, types?: string[]) => {
    const sources = await desktopCapturer.getSources({
      types: (types as any[]) ?? ['screen', 'window'],
      thumbnailSize: { width: 340, height: 200 },
      fetchWindowIcons: true,
    })
    return sources.map((s) => ({
      id: s.id,
      name: s.name,
      display_id: s.display_id,
      appIcon: s.appIcon?.toDataURL() || null,
      thumbnail: s.thumbnail.toDataURL(),
    }))
  })

  ipcMain.handle('get-system-audio-sources', async () => {
    try {
      const sources = await desktopCapturer.getSources({ types: ['audio'] as any[] })
      return sources.map(s => ({ id: s.id, name: s.name }))
    } catch {
      return []
    }
  })

  ipcMain.handle('show-save-dialog', async (_event, options?: {
    title?: string
    defaultPath?: string
    filters?: { name: string; extensions: string[] }[]
  }) => {
    const win = BrowserWindow.getFocusedWindow()
    if (!win) return { canceled: true, filePath: null }
    return dialog.showSaveDialog(win, {
      title: options?.title ?? 'Save Recording',
      defaultPath: options?.defaultPath ?? `recording-${Date.now()}.webm`,
      filters: options?.filters ?? [
        { name: 'WebM Video', extensions: ['webm'] },
        { name: 'MP4 Video', extensions: ['mp4'] },
        { name: 'GIF', extensions: ['gif'] },
      ],
    })
  })

  ipcMain.handle('show-open-dialog', async (_event, options?: {
    title?: string
    defaultPath?: string
    filters?: { name: string; extensions: string[] }[]
    properties?: string[]
  }) => {
    const win = BrowserWindow.getFocusedWindow()
    if (!win) return { canceled: true, filePaths: [] }
    return dialog.showOpenDialog(win, {
      title: options?.title ?? 'Select File',
      defaultPath: options?.defaultPath,
      filters: options?.filters ?? [
        { name: 'Video Files', extensions: ['webm', 'mp4', 'gif'] },
      ],
      properties: options?.properties,
    })
  })

  ipcMain.handle('get-default-save-dir', async () => {
    return app.getPath('videos') || app.getPath('desktop')
  })

  ipcMain.handle('write-file', async (_event, data: Buffer, filePath: string) => {
    try {
      await nodeFs.promises.mkdir(dirname(filePath), { recursive: true })
      await nodeFs.promises.writeFile(filePath, data)
      log.info('保存文件', filePath)
      return { success: true, filePath }
    } catch (err: any) {
      log.error('保存文件失败', filePath, err.message)
      return { success: false, filePath, error: err.message }
    }
  })

  ipcMain.handle('read-file', async (_event, filePath: string) => {
    try {
      const buffer = await nodeFs.promises.readFile(filePath)
      return buffer.buffer
    } catch (err: any) {
      throw new Error(`Failed to read file: ${err.message}`)
    }
  })

  ipcMain.handle('file-exists', async (_event, filePath: string) => {
    try {
      await nodeFs.promises.access(filePath)
      return true
    } catch {
      return false
    }
  })

  ipcMain.handle('delete-file', async (_event, filePath: string) => {
    try {
      await nodeFs.promises.unlink(filePath)
      return true
    } catch {
      return false
    }
  })

  ipcMain.handle('get-file-size', async (_event, filePath: string) => {
    try {
      const stat = await nodeFs.promises.stat(filePath)
      return stat.size
    } catch {
      return 0
    }
  })

  function safeSend(win: BrowserWindow | null, channel: string, ...args: any[]) {
    if (!win || win.isDestroyed()) return
    try { win.webContents.send(channel, ...args) } catch { /* webContents may be destroyed mid-send */ }
  }

  ipcMain.handle('convert-to-mp4', async (event, inputPath: string, outputPath: string, crop?: { x: number; y: number; width: number; height: number }) => {
    log.info('转换为 MP4', inputPath, '->', outputPath, crop ? `crop: ${crop.width}x${crop.height}` : '')
    const win = BrowserWindow.fromWebContents(event.sender)
    return convertWebmToMp4(inputPath, outputPath, (progress) => {
      safeSend(win, 'on-conversion-progress', progress)
    }, crop)
  })

  ipcMain.handle('crop-video', async (event, inputPath: string, outputPath: string, crop: { x: number; y: number; width: number; height: number }) => {
    log.info('裁剪视频', inputPath, '->', outputPath, `crop: ${crop.width}x${crop.height}+${crop.x}+${crop.y}`)
    const win = BrowserWindow.fromWebContents(event.sender)
    return cropVideo(inputPath, outputPath, crop, (progress) => {
      safeSend(win, 'on-conversion-progress', progress)
    })
  })

  ipcMain.handle('convert-to-gif', async (event, inputPath: string, outputPath: string, options?: {
    width?: number
    fps?: number
    duration?: number
  }) => {
    log.info('转换为 GIF', inputPath, '->', outputPath)
    const win = BrowserWindow.fromWebContents(event.sender)
    return convertToGif(inputPath, outputPath, options, (progress) => {
      safeSend(win, 'on-conversion-progress', progress)
    })
  })

  ipcMain.handle('merge-multi-screen', async (event, inputs: { filePath: string; bounds: { x: number; y: number; width: number; height: number } }[], outputPath: string) => {
    log.info('合并多屏录制', inputs.length, '个屏幕 ->', outputPath)
    const win = BrowserWindow.fromWebContents(event.sender)
    return mergeMultiScreen(inputs, outputPath, (progress) => {
      safeSend(win, 'on-conversion-progress', progress)
    })
  })

  ipcMain.handle('open-file-location', async (_event, filePath: string) => {
    shell.showItemInFolder(filePath)
  })

  ipcMain.handle('open-external', async (_event, url: string) => {
    shell.openExternal(url)
  })

  ipcMain.handle('open-path', async (_event, filePath: string) => {
    await shell.openPath(filePath)
  })

  ipcMain.handle('get-app-version', async () => {
    return app.getVersion()
  })

  ipcMain.handle('get-screen-scale-factor', async () => {
    return screen.getPrimaryDisplay().scaleFactor
  })

  ipcMain.handle('get-screen-bounds', async () => {
    const display = screen.getPrimaryDisplay()
    const scaleFactor = display.scaleFactor
    return {
      x: Math.round(display.bounds.x / scaleFactor),
      y: Math.round(display.bounds.y / scaleFactor),
      width: Math.round(display.bounds.width / scaleFactor),
      height: Math.round(display.bounds.height / scaleFactor),
    }
  })

  // 截图：捕获全屏并保存为 PNG
  ipcMain.handle('take-screenshot', async (_event) => {
    try {
      const sources = await desktopCapturer.getSources({
        types: ['screen'],
        thumbnailSize: { width: 0, height: 0 },
      })
      if (!sources.length) throw new Error('未找到屏幕源')

      const pngData = sources[0].thumbnail.toPNG()
      const now = new Date()
      const filename = `截图_${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}.png`
      const savePath = join(app.getPath('desktop'), filename)
      await nodeFs.promises.writeFile(savePath, pngData)

      showBalloon('二支录制', `截图已保存到桌面：${filename}`)
      return { success: true, filePath: savePath }
    } catch (err: any) {
      log.error('截图失败', err.message)
      return { success: false, error: err.message }
    }
  })

  ipcMain.handle('get-all-displays', async () => {
    const displays = screen.getAllDisplays()
    const primary = screen.getPrimaryDisplay()
    const sources = await desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize: { width: 340, height: 200 },
    })
    return displays.map((d, i) => {
      const src = sources[i]
      return {
        id: d.id,
        label: d.id === primary.id ? `主屏幕` : `屏幕 ${i + 1}`,
        bounds: d.bounds,
        scaleFactor: d.scaleFactor,
        size: { width: d.size.width, height: d.size.height },
        isPrimary: d.id === primary.id,
        sourceId: src?.id || null,
        sourceName: src?.name || '',
        thumbnail: src?.thumbnail?.toDataURL() || '',
      }
    })
  })

  ipcMain.handle('minimize-window', async (event) => {
    BrowserWindow.fromWebContents(event.sender)?.minimize()
  })

  ipcMain.handle('show-window', async (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (win) {
      win.show()
      win.focus()
    }
  })

  ipcMain.handle('maximize-window', async (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (win?.isMaximized()) {
      win.unmaximize()
    } else {
      win?.maximize()
    }
  })

  ipcMain.handle('close-window', async (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (win) {
      win.hide()
    }
  })

  ipcMain.on('notify-conversion-start', () => {
    showBalloon('二支录制', '录制完成，正在转换视频格式...')
  })

  ipcMain.on('show-about-window', () => {
    const parent = BrowserWindow.getFocusedWindow()
    if (parent) {
      const win = new BrowserWindow({
        width: 360,
        height: 400,
        resizable: false,
        skipTaskbar: true, // 跟随应用整体不进任务栏
        frame: false,
        modal: true,
        parent,
        backgroundColor: '#eaeaec',
        webPreferences: {
          preload: join(__dirname, '..', 'preload', 'index.cjs'),
          contextIsolation: true,
          nodeIntegration: false,
          sandbox: false,
        },
      })
      ipcMain.on('close-about-window', () => {
        win.close()
        ipcMain.removeAllListeners('close-about-window')
      })
      win.on('closed', () => {
        ipcMain.removeAllListeners('close-about-window')
      })
      const aboutPath = process.env['VITE_DEV_SERVER_URL']
        ? `${process.env['VITE_DEV_SERVER_URL']}about.html`
        : join(app.getAppPath(), 'dist', 'about.html')
      if (aboutPath.startsWith('http')) {
        win.loadURL(aboutPath)
      } else {
        win.loadFile(aboutPath)
      }
    }
  })

  ipcMain.on('notify-conversion-done', () => {
    showBalloon('二支录制', '视频转换完成！')
  })

  ipcMain.on('update-audio-levels', (_event, micLevel: number, sysLevel: number) => {
    updateAudioLevels(micLevel, sysLevel)
  })

  ipcMain.handle('load-recordings', async () => {
    const filePath = getRecordingsPath()
    try {
      const data = await nodeFs.promises.readFile(filePath, 'utf-8')
      const parsed = JSON.parse(data)
      log.info('加载录制历史', filePath, parsed.length, '条')
      return parsed
    } catch (err: any) {
      log.info('加载录制历史失败（可能首次运行）', filePath, err.message)
      return []
    }
  })

  ipcMain.handle('save-recordings', async (_event, recordings: unknown[]) => {
    const filePath = getRecordingsPath()
    try {
      await nodeFs.promises.writeFile(filePath, JSON.stringify(recordings), 'utf-8')
      log.info('保存录制历史', filePath, (recordings as any[]).length, '条')
      return true
    } catch (err: any) {
      log.error('保存录制历史失败', filePath, err.message)
      return false
    }
  })

  // Agent Bridge handlers
  if (agentBridge) {
    agentBridge.setStateListener((state, sessions) => {
      // 非 idle 或有活跃会话时按需创建 AI 岛；idle 且无会话时不创建，
      // 避免常驻一个透明 always-on-top 渲染进程（#7 轻量化）
      const hasActivity = state !== 'idle' || (sessions && sessions.length > 0)
      if (hasActivity) showAiIsland()
      const wins = BrowserWindow.getAllWindows()
      for (const win of wins) {
        if (!win.isDestroyed()) {
          try { win.webContents.send('agent-state-update', { state, sessions }) } catch {}
        }
      }
    })

    agentBridge.setCardListener((card) => {
      // 有卡片（权限/提问，队首）时展示 AI 岛；卡片清空时广播 null 收起
      if (card) showAiIsland()
      // IPC 无法序列化函数，只发送纯数据字段
      let safe
      if (!card) {
        safe = null
      } else if (card.kind === 'permission') {
        safe = { kind: 'permission', sessionId: card.sessionId, toolName: card.toolName, toolInput: card.toolInput, suggestions: card.suggestions, createdAt: card.createdAt }
      } else {
        safe = { kind: 'question', sessionId: card.sessionId, toolName: card.toolName, toolInput: card.toolInput, questions: card.questions, createdAt: card.createdAt }
      }
      log.info(`[IPC] broadcast card: kind=${card ? card.kind : 'null'}, wins=${BrowserWindow.getAllWindows().length}`)
      const wins = BrowserWindow.getAllWindows()
      for (const win of wins) {
        if (!win.isDestroyed()) {
          try { win.webContents.send('agent-card-update', safe) } catch (e:any) {
            log.error(`[IPC] send card to window failed: ${e.message}`)
          }
        }
      }
    })

    ipcMain.handle('agent-get-status', () => {
      const status = agentBridge?.getStatus() ?? null
      log.info(`[IPC] agentGetStatus: sessionCount=${status?.sessionCount}, displayState=${status?.displayState}, serverRunning=${status?.serverRunning}`)
      return status
    })
    ipcMain.handle('agent-install-hooks', () => { agentBridge?.installHooks(); return agentBridge?.getStatus() })
    ipcMain.handle('agent-uninstall-hooks', () => { agentBridge?.uninstallHooks(); return agentBridge?.getStatus() })
    ipcMain.handle('agent-resolve-permission', (_event, behavior: string) => agentBridge?.resolvePermission(behavior))
    ipcMain.handle('agent-dismiss-question', () => agentBridge?.dismissQuestion())
    ipcMain.handle('agent-set-auto-allow', (_event, enabled: boolean) => agentBridge?.setAutoAllow(enabled))
    ipcMain.handle('agent-get-auto-allow', () => agentBridge?.getAutoAllow() ?? false)
  }
}
