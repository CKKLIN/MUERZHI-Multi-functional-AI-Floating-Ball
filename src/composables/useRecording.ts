import { ref, shallowRef, onUnmounted } from 'vue'
import { useRecordingStore } from '../stores/recording'
import { useSettingsStore } from '../stores/settings'
import log from '../log'

export interface Region {
  x: number
  y: number
  width: number
  height: number
}

type DisplayGeom = { x: number; y: number; width: number; height: number; scale: number }

/** 显示器几何：bounds 是物理像素；scale 用来把选区（逻辑像素）换算成物理像素 */
async function displayGeom(displayIndex: number): Promise<DisplayGeom> {
  const displays = await window.muerzhiAPI.getAllDisplays()
  const d = displays.find((x) => x.id === displayIndex) || displays[0]
  if (!d) return { x: 0, y: 0, width: 0, height: 0, scale: 1 }
  return {
    x: d.bounds.x,
    y: d.bounds.y,
    width: d.bounds.width,
    height: d.bounds.height,
    scale: d.scaleFactor || 1,
  }
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

  // 兜底：组件卸载（正常停止路径之外的窗口关闭等）时计时器必须停，
  // 否则泄漏的 interval 每秒把已卸载页面的 elapsedSeconds +1
  onUnmounted(stopTimer)

  function stopTimer() {
    if (countInterval) {
      clearInterval(countInterval)
      countInterval = null
    }
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

    // 画中画几何：摄像头预览窗在屏幕上的位置换算成成品画面里的左上角坐标。
    // 预览窗由 Rust 管理（用户可拖拽），这里只把「相对录制画面原点」的偏移交给合成用。
    //
    // ⚠️ 量纲（与 Rust crop_video 同一口径，见 recording/mod.rs 的注释）：
    // cameraGeometry()（窗口 outer_position/outer_size）是**物理像素**；
    // region 也是**物理像素**（选区页 toPhysical 上报）——直接用，不再乘缩放比。
    // 早先这里按「region 是逻辑像素」换算（region×scale + 屏原点），150% 屏上
    // 把物理选区又放大 1.5 倍，PiP 位置整体偏移（用户反馈「录出来的视频里预览窗
    // 不在我拖动的位置」）。
    let cameraRect: { x: number; y: number; width: number; height: number } | null = null
    if (store.isCameraEnabled) {
      const geo = await window.muerzhiAPI.cameraGeometry()
      if (geo) {
        let origin: { x: number; y: number }
        let canvas: { width: number; height: number }
        if (region) {
          // 区域录制：成品 = 「目标显示器画面裁出选区」。裁剪把 region.x/y 平移到
          // 视频 (0,0)（Rust：crop = region − 目标屏原点），所以画中画换算原点
          // 就是选区左上角本身（虚拟桌面物理坐标），与落在哪块屏无关 ——
          // 曾写 displayGeom(0).origin + region，主屏不在 (0,0) 的机器上会偏。
          origin = { x: region.x, y: region.y }
          canvas = { width: region.width, height: region.height }
        } else if (displayIds.length > 1) {
          // 多屏：成品是各屏按物理 bounds 叠加的画布，原点 = 最小 bounds（同 merge_multi_screen）
          const geoms = await Promise.all(displayIds.map(displayGeom))
          const minX = Math.min(...geoms.map((g) => g.x))
          const minY = Math.min(...geoms.map((g) => g.y))
          origin = { x: minX, y: minY }
          canvas = {
            width: Math.max(...geoms.map((g) => g.x + g.width)) - minX,
            height: Math.max(...geoms.map((g) => g.y + g.height)) - minY,
          }
        } else {
          // 单屏全屏：成品 = 目标显示器画面，原点 = 该屏物理左上角
          const g = await displayGeom(displayIndexFromSourceId(sourceId))
          origin = { x: g.x, y: g.y }
          canvas = { width: g.width, height: g.height }
        }
        const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(v, hi))
        cameraRect = {
          x: clamp(Math.round(geo.x - origin.x), 0, Math.max(0, Math.round(canvas.width - geo.width))),
          y: clamp(Math.round(geo.y - origin.y), 0, Math.max(0, Math.round(canvas.height - geo.height))),
          width: Math.round(geo.width),
          height: Math.round(geo.height),
        }
      }
    }

    const options: Record<string, unknown> = {
      targetDisplayId: displayIndexFromSourceId(sourceId),
      displayIds,
      withCamera: store.isCameraEnabled,
      cameraRect,
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
    window.muerzhiAPI.minimizeWindow()

    try {
      await window.muerzhiAPI.recordingStart(options)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      window.muerzhiAPI.showWindow()
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
      await window.muerzhiAPI.recordingPause()
      stopTimer()
      store.setState('paused')
      log.info('Recording paused')
    } catch (err: unknown) {
      log.error('暂停失败', err)
    }
  }

  async function resume() {
    try {
      await window.muerzhiAPI.recordingResume()
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
    window.muerzhiAPI.notifyConversionStart()
    if (reopenOnStop) setTimeout(() => window.muerzhiAPI.showWindow(), 50)

    try {
      const result = await window.muerzhiAPI.recordingStop()
      const finalPath = result.outputPath
      const fileName = finalPath.split(/[\\/]/).pop() || finalPath
      const size = await window.muerzhiAPI.getFileSize(finalPath)
      store.addRecording({
        id: crypto.randomUUID(),
        filePath: finalPath,
        fileName,
        duration: elapsed,
        fileSize: size,
        createdAt: Date.now(),
        thumbnail: result.thumbnail || undefined,
        width: width || undefined,
        height: height || undefined,
      })
      window.muerzhiAPI.notifyConversionDone(finalPath)
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
    setCameraPosition,
    setReopenOnStop,
    startCapture,
    pause,
    resume,
    stop,
    cleanupStreams,
  }
}
