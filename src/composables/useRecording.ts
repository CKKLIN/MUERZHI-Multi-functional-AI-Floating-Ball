import { ref, shallowRef } from 'vue'
import { useRecordingStore } from '../stores/recording'
import { useSettingsStore } from '../stores/settings'
import log from '../log'

export interface Region {
  x: number
  y: number
  width: number
  height: number
}

/** 显示器下标：'screen:1' → 1；解析不出来时按主屏 0 处理 */
function displayIndexFromSourceId(sourceId: string | undefined): number {
  if (!sourceId) return 0
  const m = /^screen:(\d+)$/.exec(sourceId)
  return m ? Number(m[1]) : 0
}

/**
 * 录制编排（P4：采集全部下沉到 Rust）
 *
 * 与 Electron 版的根本差异：屏幕采集不再走 `getUserMedia({chromeMediaSource:'desktop'})`
 * —— WebView2 没有 desktopCapturer，拿不到桌面视频源。现在渲染层只负责：
 *   1. 把用户选择（显示器/区域/音频开关/画质/fps/输出目录）整理成 options 交给
 *      `recording_start`；
 *   2. 维护计时器与 UI 状态；
 *   3. 摄像头预览（可选的画中画预览窗口由 Rust 侧原生窗负责，主窗口只显示预览流）。
 * 暂停/继续/停止都是 Rust 侧的状态机（暂停 = 分段，停止 = ffmpeg 拼接+混音后落盘）。
 * 因此本 composable 里的 `previewStream` 只用于主窗口内的小预览，不参与录制。
 */
export function useRecording() {
  const store = useRecordingStore()
  const settingsStore = useSettingsStore()

  let countInterval: ReturnType<typeof setInterval> | null = null
  // 停止后自动重开主窗口（正常停止 true；窗口被关闭路径置 false）
  let reopenOnStop = true
  // Rust 侧上一次上报的状态（用于把 recording-stopped 的时长写回 store）
  let recordingStartedAt = 0

  const cameraPosition = ref<{ x: number; y: number; width: number; height: number }>({
    x: 20, y: 20, width: 240, height: 180,
  })
  const cameraStream = shallowRef<MediaStream | null>(null)
  const previewStream = ref<MediaStream | null>(null)

  function startTimer() {
    if (countInterval) return
    countInterval = setInterval(() => {
      store.elapsedSeconds++
    }, 1000)
  }

  function stopTimer() {
    if (countInterval) {
      clearInterval(countInterval)
      countInterval = null
    }
  }

  function setDrawAnnotations(_fn: (ctx: CanvasRenderingContext2D) => void) {
    // P4：画笔标注的合成尚未接线（Rust 侧需 ffmpeg overlay 合成 strokes.webm）。
    // 显式空实现而不是静默吞掉：调用方（HomeView）仍能把画笔 UI 打开用于圈重点，
    // 但笔迹不会进成品。见 CLAUDE.md「迁移遗留」。
  }

  function setCameraPosition(pos: { x: number; y: number; width: number; height: number }) {
    cameraPosition.value = { ...pos }
  }

  function setReopenOnStop(v: boolean) {
    reopenOnStop = v
  }

  /**
   * 开始录制：把选择结果交给 Rust，Rust 起 WGC 采集段 + WASAPI 音频线程。
   * 入参 sourceId 只用于取显示器下标（本工程采集按显示器寻址，无窗口捕获）。
   */
  async function startCapture(
    sourceId: string,
    region?: Region,
    _audioTracks?: MediaStreamTrack[],
    multiScreenSources?: { sourceId: string; bounds: { x: number; y: number; width: number; height: number } }[],
  ) {
    reopenOnStop = true
    const displayIds = multiScreenSources?.length
      ? multiScreenSources.map(s => displayIndexFromSourceId(s.sourceId))
      : []

    const options: Record<string, unknown> = {
      targetDisplayId: displayIndexFromSourceId(sourceId),
      displayIds,
      withMic: store.isMicrophoneEnabled,
      withSys: store.isSystemAudioEnabled,
      // 设置页现在填的是 WASAPI endpoint id（list_audio_devices），与 Rust 侧同域
      micDeviceId: settingsStore.microphoneDeviceId || null,
      sysDeviceId: settingsStore.systemAudioSourceId || null,
      quality: settingsStore.videoQuality,
      fps: settingsStore.maxFps,
      // 光标：录制回放里出现鼠标更符合直觉（Electron 版用 cursor:'always' 语义）
      withCursor: true,
      region: region ?? null,
      outputDir: settingsStore.outputDir || null,
    }

    // 采集期间主窗口让位（WGC 抓的是整块屏，主窗口挡在桌面上会被录进去）
    window.electronAPI.minimizeWindow()

    try {
      await window.electronAPI.recordingStart(options)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      window.electronAPI.showWindow()
      throw new Error(`录制启动失败: ${msg}`)
    }

    recordingStartedAt = Date.now()
    startTimer()
    store.setState('recording')
    const modeLabel = displayIds.length > 1
      ? `multi-screen (${displayIds.length} displays)`
      : region ? `region: ${region.width}x${region.height}` : 'full screen'
    log.info('Recording started', modeLabel)
  }

  async function pause() {
    try {
      await window.electronAPI.recordingPause()
      stopTimer()
      store.setState('paused')
      log.info('Recording paused')
    } catch (err: unknown) {
      log.error('暂停失败', err)
    }
  }

  async function resume() {
    try {
      await window.electronAPI.recordingResume()
      startTimer()
      store.setState('recording')
      log.info('Recording resumed')
    } catch (err: unknown) {
      log.error('继续失败', err)
    }
  }

  /**
   * 停止录制：Rust 侧收尾（拼接/裁剪/合并/混音）后返回最终 mp4 路径。
   * 转换期间需要显示进度气泡，故先切 converting 再等 invoke 返回。
   */
  async function stop(): Promise<void> {
    stopTimer()
    if (store.elapsedSeconds === 0 && recordingStartedAt > 0) {
      store.elapsedSeconds = Math.round((Date.now() - recordingStartedAt) / 1000)
    }
    const elapsed = store.elapsedSeconds
    const width = store.selectedRegion ? Math.round(store.selectedRegion.width) : 0
    const height = store.selectedRegion ? Math.round(store.selectedRegion.height) : 0

    store.setState('converting')
    window.electronAPI.notifyConversionStart()
    if (reopenOnStop) setTimeout(() => window.electronAPI.showWindow(), 50)

    try {
      const finalPath = await window.electronAPI.recordingStop()
      const fileName = finalPath.split(/[\\/]/).pop() || finalPath
      const size = await window.electronAPI.getFileSize(finalPath)
      store.addRecording({
        id: crypto.randomUUID(),
        filePath: finalPath,
        fileName,
        duration: elapsed,
        fileSize: size,
        createdAt: Date.now(),
        thumbnail: undefined,
        width: width || undefined,
        height: height || undefined,
      })
      window.electronAPI.notifyConversionDone(finalPath)
      log.info('[recording] 已保存', finalPath)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      log.error('录制保存失败', msg)
    } finally {
      recordingStartedAt = 0
      store.resetState()
    }
  }

  function cleanupStreams() {
    // 渲染层不再持有录制用媒体流：只剩摄像头预览（由调用方 stopCamera 释放）
    stopTimer()
    previewStream.value = null
  }

  return {
    previewStream,
    cameraStream,
    cameraPosition,
    setDrawAnnotations,
    setCameraPosition,
    setReopenOnStop,
    startCapture,
    pause,
    resume,
    stop,
    cleanupStreams,
  }
}
