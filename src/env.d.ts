export interface RecordingStartOptions {
  /** 目标显示器（Tauri available_monitors 下标）*/
  targetDisplayId?: number
  /** 多屏录制：多个显示器下标；非空时忽略 targetDisplayId */
  displayIds?: number[]
  withMic: boolean
  withSys: boolean
  /** WASAPI endpoint id（listAudioDevices 返回值）；空 = 系统默认设备 */
  micDeviceId?: string | null
  sysDeviceId?: string | null
  quality: 'low' | 'medium' | 'high'
  fps: number
  withCursor: boolean
  /** 区域录制（逻辑像素）*/
  region?: { x: number; y: number; width: number; height: number } | null
  outputDir?: string | null
}

export interface CaptureSource {
  id: string
  name: string
  display_id: string
  appIcon: string | null
  thumbnail: string
}

export type BallMenuKey = 'record' | 'ai' | 'todo' | 'settings'
export type AppLocale = 'zh' | 'en'

export interface FloatingBallSettings {
  visible: boolean
  alwaysOnTop: boolean
  openAtLogin: boolean
  locale: AppLocale
  snapGutter: number
  menuItems: Record<BallMenuKey, boolean>
}

export interface AiIslandSettings {
  flat: boolean
}

export type TodoType = 'todo' | 'memo'
export type TodoPriority = 'low' | 'medium' | 'high' | 'urgent'

export interface TodoItem {
  id: string
  type: TodoType
  title: string
  content: string
  priority: TodoPriority
  reminder: string | null
  reminderFired: boolean
  done: boolean
  pinned: boolean
  pinX: number | null
  pinY: number | null
  createdAt: number
  updatedAt: number
}

export interface TodoSettings {
  badgeVisible: boolean
  windowAlwaysOnTop: boolean
  /** 手动排序（拖动排序后自动开启；关闭恢复自动排序） */
  manualSort: boolean
  stickyBoardPos: { x: number; y: number } | null
}

export interface ConversionProgress {
  percent: number
  targetSize: number
}

export interface Recording {
  id: string
  filePath: string
  fileName: string
  duration: number
  fileSize: number
  createdAt: number
  thumbnail?: string
  width?: number
  height?: number
}

export interface SaveDialogOptions {
  title?: string
  defaultPath?: string
  filters?: { name: string; extensions: string[] }[]
}

export interface SaveDialogResult {
  canceled: boolean
  filePath: string | null
}

export interface MuerzhiAPI {
  // Screen capture
  getSources: (types?: string[]) => Promise<CaptureSource[]>
  getSystemAudioSources: () => Promise<{ id: string; name: string }[]>
  /** WASAPI 输入设备（设置页麦克风下拉；id 与 recordingStart 的 micDeviceId 同域）*/
  listAudioDevices: () => Promise<{ deviceId: string; label: string }[]>

  // File dialogs
  showSaveDialog: (options?: SaveDialogOptions) => Promise<SaveDialogResult>
  showOpenDialog: (options?: SaveDialogOptions) => Promise<{ canceled: boolean; filePaths: string[] }>
  getDefaultSaveDir: () => Promise<string>

  // File I/O
  writeFile: (data: ArrayBuffer, filePath: string) => Promise<{ success: boolean; filePath: string }>
  toLocalVideoUrl: (filePath: string) => string
  readFile: (filePath: string) => Promise<ArrayBuffer>
  fileExists: (filePath: string) => Promise<boolean>
  deleteFile: (filePath: string) => Promise<boolean>
  getFileSize: (filePath: string) => Promise<number>

  // FFmpeg
  convertToMp4: (inputPath: string, outputPath: string) => Promise<{
    success: boolean
    outputPath: string
    error?: string
  }>
  convertToGif: (inputPath: string, outputPath: string, options?: {
    width?: number
    fps?: number
    duration?: number
  }) => Promise<{ success: boolean; outputPath: string; error?: string }>
  mergeMultiScreen: (inputs: { filePath: string; bounds: { x: number; y: number; width: number; height: number } }[], outputPath: string) => Promise<{ success: boolean; outputPath: string; error?: string }>

  // Events
  onConversionProgress: (callback: (progress: ConversionProgress) => void) => () => void
  onGlobalShortcut: (callback: (action: string) => void) => () => void
  onMainProcessMessage: (callback: (message: string) => void) => () => void
  onBeforeQuit: (callback: () => void) => () => void
  onMainWindowClose: (callback: () => void) => () => void

  // Shell
  openFileLocation: (filePath: string) => Promise<void>
  openExternal: (url: string) => Promise<void>
  openPath: (filePath: string) => Promise<void>
  /** 在文件管理器中打开日志目录（定位到当前日志文件）*/
  openLogDir: () => Promise<void>

  // App info
  getAppVersion: () => Promise<string>
  showAboutWindow: () => void

  // Screen info
  getScreenScaleFactor: () => Promise<number>
  getScreenBounds: () => Promise<{ x: number; y: number; width: number; height: number }>
  getAllDisplays: () => Promise<{ id: number; label: string; bounds: { x: number; y: number; width: number; height: number }; scaleFactor: number; size: { width: number; height: number }; isPrimary: boolean; sourceId: string | null; sourceName: string; thumbnail: string }[]>

  // Window
  minimizeWindow: () => Promise<void>
  showWindow: () => Promise<void>
  maximizeWindow: () => Promise<void>
  closeWindow: () => Promise<void>

  // Tray notifications
  notifyConversionStart: () => void
  notifyConversionDone: (filePath: string) => void

  // Screenshot（P4：Rust DXGI 抓帧存桌面）
  takeScreenshot: () => Promise<{ success: boolean; filePath?: string; error?: string }>

  // 录制会话（P4：采集全在 Rust —— WGC 画面 + WASAPI 音频，停止后 ffmpeg 合成）
  recordingStart: (options: RecordingStartOptions) => Promise<string>
  recordingPause: () => Promise<void>
  recordingResume: () => Promise<void>
  recordingStop: () => Promise<{ outputPath: string; thumbnail?: string | null }>
  recordingSetMic: (on: boolean) => Promise<boolean>
  recordingSetCamera: (on: boolean, deviceId?: string) => Promise<boolean>
  recordingGetStatus: () => Promise<{ state: 'idle' | 'recording' | 'paused' | 'converting'; frames: number; tracks: number; elapsedSec: number }>
  onRecordingState: (callback: (data: { state: string; id?: string; tracks?: number }) => void) => () => void
  onRecordingStopped: (callback: (data: { id: string; outputPath: string; elapsed: number; fileName: string; thumbnail?: string | null }) => void) => () => void
  /** Rust 侧 WASAPI 实时电平（20Hz）；主窗口最小化时本地分析器拿不到数据 */
  onAudioLevels: (callback: (data: { mic: number; sys: number }) => void) => () => void

  // Region selector
  selectRegion: () => Promise<{ x: number; y: number; width: number; height: number; sourceId: string } | null>
  showRegionBorder: (region: { x: number; y: number; width: number; height: number }, audioState?: { micEnabled: boolean; sysEnabled: boolean }) => Promise<void>
  hideRegionBorder: () => Promise<void>
  hideBorderOnly: () => Promise<void>
  hideCameraPreview: () => Promise<void>
  /** 摄像头预览窗当前几何（物理像素）*/
  cameraGeometry: () => Promise<{ x: number; y: number; width: number; height: number } | null>
  toggleCameraPreview: (show: boolean, cameraDeviceId?: string) => Promise<void>
  showFloatingIsland: (audioState?: { micEnabled: boolean; sysEnabled: boolean }, targetDisplayId?: number) => Promise<void>
  hideFloatingIsland: () => Promise<void>
  setIslandState: (state: 'idle' | 'recording' | 'paused', elapsedSeconds?: number) => Promise<void>
  updateToolbarState: (state: 'idle' | 'recording' | 'paused', elapsedSeconds?: number) => Promise<void>
  /** 渲染层试音电平 → 原生工具条/悬浮岛音量表（未录制时 WASAPI 无数据，靠这条） */
  emitPreviewAudioLevel: (level: number) => Promise<void>
  /** 麦克风/摄像头开关状态 → 原生按钮点亮/熄灭 */
  pushIslandAudioState: (state: { micEnabled: boolean; cameraEnabled: boolean }) => Promise<void>
  onToolbarAction: (callback: (action: string) => void) => () => void

  // Media devices
  getMediaDevices: () => Promise<MediaDeviceInfo[]>

  // Recordings persistence
  loadRecordings: () => Promise<Recording[]>
  saveRecordings: (recordings: Recording[]) => Promise<boolean>
  /** 为既有 mp4 记录补抽首帧缩略图（返回 base64 data URL；非 mp4/失败返回 null） */
  generateThumbnail: (filePath: string) => Promise<string | null>

  // Scheduled recording
  onScheduledRecording: (callback: () => void) => () => void

  // Agent bridge
  agentGetStatus: () => Promise<AgentBridgeStatus | null>
  agentInstallHooks: () => Promise<AgentBridgeStatus | null>
  agentUninstallHooks: () => Promise<AgentBridgeStatus | null>
  agentInstallAntigravityHooks: () => Promise<AgentBridgeStatus | null>
  agentUninstallAntigravityHooks: () => Promise<AgentBridgeStatus | null>
  agentResolvePermission: (behavior: string) => Promise<void>
  agentDismissQuestion: () => Promise<void>
  agentSubmitQuestion: (sessionId: string, answers: Record<string, unknown>) => Promise<void>
  agentSetAutoAllow: (enabled: boolean) => Promise<void>
  agentGetAutoAllow: () => Promise<boolean>
  agentGetAutoAllowSessions: () => Promise<string[]>
  agentSetAutoAllowSession: (sessionId: string, enabled: boolean) => Promise<string[]>
  agentGetCardExpiry: () => Promise<{ enabled: boolean; seconds: number }>
  agentSetCardExpiry: (enabled: boolean, seconds: number) => Promise<void>
  onAgentStateUpdate: (callback: (data: AgentStatePayload) => void) => () => void
  onAgentPermissionRequest: (callback: (data: AgentPermissionPayload) => void) => () => void
  showAiWindow: () => Promise<void>
  showSettingsWindow: () => Promise<void>
  showMainWindow: () => Promise<void>
  getFloatingBallSettings: () => Promise<FloatingBallSettings>
  setFloatingBallSettings: (patch: Partial<FloatingBallSettings>) => Promise<FloatingBallSettings>
  resetFloatingBallPosition: () => Promise<void>
  getAppI18n: () => Promise<{ locale: AppLocale; messages: Record<string, string> }>
  onAppLocaleChanged: (callback: (data: { locale: AppLocale }) => void) => () => void
  showAiIsland: () => Promise<void>
  hideAiIsland: () => Promise<void>
  getAiIslandSettings: () => Promise<AiIslandSettings>
  setAiIslandSettings: (patch: Partial<AiIslandSettings>) => Promise<AiIslandSettings>

  // Todo / 待办便签
  todoGet: () => Promise<TodoItem[]>
  todoCreate: (input: Partial<TodoItem> & Pick<TodoItem, 'type'>) => Promise<TodoItem[]>
  todoUpdate: (id: string, patch: Partial<Omit<TodoItem, 'id' | 'createdAt'>>) => Promise<TodoItem[]>
  todoDelete: (id: string) => Promise<TodoItem[]>
  todoToggleDone: (id: string) => Promise<TodoItem[]>
  todoTogglePin: (id: string) => Promise<TodoItem[]>
  onTodoFocusItem: (callback: (id: string) => void) => () => void
  onTodoDataChanged: (callback: (items: TodoItem[]) => void) => () => void
  showTodoWindow: () => Promise<void>
  closeTodoWindow: () => Promise<void>
  todoWindowVisible: () => Promise<boolean>
  todoToggleAlwaysOnTop: () => Promise<boolean>
  todoGetSettings: () => Promise<TodoSettings>
  todoSetSettings: (patch: Partial<TodoSettings>) => Promise<TodoSettings>
}

export interface AgentSession {
  sessionId: string
  agentId: string
  state: string
  title?: string
  toolName?: string
  contextUsage?: { used: number; limit: number }
  model?: string
  updatedAt: number
}

export interface AgentStatePayload {
  state: string
  sessions: AgentSession[]
}

export interface AgentPermissionPayload {
  sessionId: string
  toolName: string
  toolInput: any
  suggestions: string[] | null
}

export type AgentCardPayload =
  | ({ kind: 'permission' } & AgentPermissionPayload)
  | { kind: 'question'; sessionId: string; toolName: string; toolInput: any; questions: any[] | null; answerable: boolean }

export interface AgentBridgeStatus {
  serverRunning: boolean
  port: number | null
  hookInstalled: boolean | null
  antigravityHookInstalled?: boolean | null
  displayState: string
  currentCard: AgentCardPayload | null
  sessionCount: number
  sessions?: AgentSession[]
  claudeRunning: boolean
}

declare global {
  interface Window {
    muerzhiAPI: MuerzhiAPI
  }
}

export {}
