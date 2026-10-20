import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export type RecordingState = 'idle' | 'selecting' | 'recording' | 'paused' | 'converting'

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

export const useRecordingStore = defineStore('recording', () => {
  const state = ref<RecordingState>('idle')
  const recordings = ref<Recording[]>([])
  const selectedSource = ref<{ id: string; name: string; thumbnail: string } | null>(null)
  const recordingMode = ref<'full' | 'region' | 'allscreens'>('full')
  const multiScreenSources = ref<{ sourceId: string; bounds: { x: number; y: number; width: number; height: number } }[]>([])
  const selectedRegion = ref<{ x: number; y: number; width: number; height: number } | null>(null)
  const isCameraEnabled = ref(false)
  const isSystemAudioEnabled = ref(false)
  const isMicrophoneEnabled = ref(false)
  const elapsedSeconds = ref(0)
  const conversionProgress = ref(0)
  const currentOutputPath = ref('')

  const isRecording = computed(() => state.value === 'recording')
  const isPaused = computed(() => state.value === 'paused')
  const canStart = computed(() => state.value === 'idle')
  const canPause = computed(() => state.value === 'recording')
  const canResume = computed(() => state.value === 'paused')
  const canStop = computed(() => state.value === 'recording' || state.value === 'paused')

  function setState(newState: RecordingState) {
    state.value = newState
  }

  function resetState() {
    state.value = 'idle'
    elapsedSeconds.value = 0
    conversionProgress.value = 0
    currentOutputPath.value = ''
    selectedSource.value = null
    recordingMode.value = 'full'
    selectedRegion.value = null
    multiScreenSources.value = []
    isCameraEnabled.value = false
  }

  // 历史条数上限：每条记录内嵌 base64 缩略图（几十 KB/条），不设上限的话
  // 每次增删都是数 MB 级的全量序列化 + IPC + localStorage 写
  const MAX_RECORDINGS = 100

  async function addRecording(recording: Recording) {
    recordings.value.unshift(recording)
    if (recordings.value.length > MAX_RECORDINGS) {
      recordings.value = recordings.value.slice(0, MAX_RECORDINGS)
    }
    saveRecordings()
  }

  async function removeRecording(id: string) {
    recordings.value = recordings.value.filter(r => r.id !== id)
    saveRecordings()
  }

  function loadRecordings() {
    // 持久化走 Rust 侧 recordings.json（%APPDATA%/com.muerzhi.aiball/）：
    // localStorage 在 WebView2 升级/数据目录清理后会丢，且退出时进程可能直接结束
    // 没机会 flush；后端 JSON 文件才是唯一真相源。Rust invoke 不可用（纯 vite 调试）时退 localStorage。
    void (async () => {
      let loaded: Recording[] | null = null
      try {
        const list = await window.muerzhiAPI.loadRecordings()
        if (Array.isArray(list)) loaded = list as Recording[]
      } catch {
        // fallthrough → localStorage
      }
      if (loaded === null) {
        try {
          const saved = localStorage.getItem('screen-recorder-recordings')
          loaded = saved ? (JSON.parse(saved) as Recording[]) : []
        } catch {
          loaded = []
        }
      }
      recordings.value = loaded
      // 补齐历史记录的缩略图：旧数据没有 thumbnail 字段（当时未抽帧）。对缺缩略图的
      // mp4 记录后台逐条补抽，抽到就回填并落盘 —— 列表展示不阻塞启动。
      backfillThumbnails()
    })()
  }

  async function backfillThumbnails() {
    for (const rec of recordings.value) {
      if (rec.thumbnail !== undefined || !rec.filePath) continue
      if (!rec.filePath.toLowerCase().endsWith('.mp4')) continue
      try {
        const thumb = await window.muerzhiAPI.generateThumbnail(rec.filePath)
        // 抽帧失败（文件被删）也标记为空串，避免每次启动都重试
        rec.thumbnail = thumb || ''
      } catch {
        rec.thumbnail = ''
      }
    }
    saveRecordings()
  }

  function saveRecordings() {
    // 同 loadRecordings：真相源是 Rust 侧 recordings.json；localStorage 是降级备份
    try {
      localStorage.setItem('screen-recorder-recordings', JSON.stringify(recordings.value))
    } catch {
      // Storage full
    }
    void window.muerzhiAPI.saveRecordings(recordings.value).catch(() => {})
  }

  return {
    state,
    recordings,
    selectedSource,
    recordingMode,
    multiScreenSources,
    selectedRegion,
    isCameraEnabled,
    isSystemAudioEnabled,
    isMicrophoneEnabled,
    elapsedSeconds,
    conversionProgress,
    currentOutputPath,
    isRecording,
    isPaused,
    canStart,
    canPause,
    canResume,
    canStop,
    setState,
    resetState,
    addRecording,
    removeRecording,
    loadRecordings,
    saveRecordings,
  }
})
