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

export function useRecording() {
  const store = useRecordingStore()
  const settingsStore = useSettingsStore()

  let mediaRecorder: MediaRecorder | null = null
  let isStarting = false
  let videoStream: MediaStream | null = null
  let audioStream: MediaStream | null = null
  let combinedStream: MediaStream | null = null
  let chunks: Blob[] = []
  let drawRafId: number | null = null
  // requestVideoFrameCallback 句柄（rVFC 驱动的合成路径）；rVFC 不可用时为 null
  let drawRvfcId: number | null = null
  // canvas 流的视频 track；captureStream(0) 模式下手动 requestFrame() 推帧
  let canvasTrack: CanvasCaptureMediaStreamTrack | null = null
  let countInterval: ReturnType<typeof setInterval> | null = null
  let compositeCanvas: HTMLCanvasElement | null = null
  let compositeCtx: CanvasRenderingContext2D | null = null
  let screenVideo: HTMLVideoElement | null = null
  let cameraVideo: HTMLVideoElement | null = null
  let canvasStream: MediaStream | null = null
  // 多屏分别录制
  let multiRecorders: { recorder: MediaRecorder; stream: MediaStream; chunks: Blob[] }[] = []
  let multiDisplayBounds: { x: number; y: number; width: number; height: number }[] = []
  let multiTempFiles: string[] = []
  let captureRegion: Region | null = null
  let captureScaleFactor = 1
  let captureVideoWidth = 0
  let captureVideoHeight = 0

  // 绘制回调（由 useDrawingCanvas 提供）
  let drawAnnotations: ((ctx: CanvasRenderingContext2D) => void) | null = null

  // 摄像头位置（由 useCameraOverlay 提供）
  const cameraPosition = ref<{ x: number; y: number; width: number; height: number }>({
    x: 20, y: 20, width: 240, height: 180,
  })
  const cameraStream = shallowRef<MediaStream | null>(null)

  // 预览流（用于实时预览）
  const previewStream = ref<MediaStream | null>(null)

  let useDirectMp4 = false

  function getSupportedMimeType(): string {
    // 优先 H.264 硬件加速（Windows D3D11VA/NVENC），编码效率远超 VP9 软编码
    const h264Types = [
      'video/webm;codecs=h264,opus',
      'video/webm;codecs=h264',
    ]
    for (const type of h264Types) {
      if (MediaRecorder.isTypeSupported(type)) return type
    }
    // 尝试直接输出 MP4（部分浏览器支持）
    const mp4Types = [
      'video/mp4;codecs=avc1,opus',
      'video/mp4;codecs=avc1',
      'video/mp4',
    ]
    for (const type of mp4Types) {
      if (MediaRecorder.isTypeSupported(type)) {
        useDirectMp4 = true
        return type
      }
    }
    // 回退 VP9/VP8
    const fallbackTypes = [
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm;codecs=vp9',
      'video/webm;codecs=vp8',
      'video/webm',
    ]
    for (const type of fallbackTypes) {
      if (MediaRecorder.isTypeSupported(type)) return type
    }
    return 'video/webm'
  }

  function getBitrate(quality: 'low' | 'medium' | 'high', width: number, height: number): number {
    // 按分辨率动态计算码率：1080p 基准，每增加 480p +3Mbps
    const pixels = width * height
    const base1080p = 1920 * 1080
    const increment480p = 640 * 480
    const extraSteps = Math.max(0, Math.round((pixels - base1080p) / increment480p))
    const baseBitrate = 5_000_000 + extraSteps * 3_000_000
    switch (quality) {
      case 'low': return Math.round(baseBitrate * 0.4)
      case 'medium': return Math.round(baseBitrate * 0.7)
      case 'high': return baseBitrate
    }
  }

  function waitForVideoFrame(video: HTMLVideoElement, timeoutMs = 2000): Promise<void> {
    return new Promise((resolve) => {
      if ('requestVideoFrameCallback' in HTMLVideoElement.prototype) {
        const timer = setTimeout(() => {
          resolve()
        }, timeoutMs)
        ;(video as any).requestVideoFrameCallback(() => {
          clearTimeout(timer)
          resolve()
        })
      } else {
        setTimeout(resolve, 500)
      }
    })
  }

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

  function setDrawAnnotations(fn: (ctx: CanvasRenderingContext2D) => void) {
    drawAnnotations = fn
  }

  function setCameraPosition(pos: { x: number; y: number; width: number; height: number }) {
    cameraPosition.value = { ...pos }
  }

  function drawFrame() {
    if (!compositeCtx || !screenVideo) return

    if (captureRegion) {
      compositeCtx.drawImage(screenVideo, captureRegion.x * captureScaleFactor, captureRegion.y * captureScaleFactor, captureRegion.width * captureScaleFactor, captureRegion.height * captureScaleFactor, 0, 0, captureVideoWidth, captureVideoHeight)
    } else {
      compositeCtx.drawImage(screenVideo, 0, 0, captureVideoWidth, captureVideoHeight)
    }

    // 摄像头叠加：当前 cameraVideo 从未赋值（见 startCamera 未接进 canvas 路径），
    // 此分支保持兼容；若将来接通，应以 cameraVideo 推进新帧为门控避免每帧重画。
    if (cameraVideo?.srcObject && store.isCameraEnabled) {
      const { x, y, width, height } = cameraPosition.value
      compositeCtx.save()
      compositeCtx.beginPath()
      compositeCtx.roundRect(x, y, width, height, 8)
      compositeCtx.clip()
      compositeCtx.drawImage(cameraVideo, x, y, width, height)
      compositeCtx.restore()
      compositeCtx.strokeStyle = 'rgba(255,255,255,0.3)'
      compositeCtx.lineWidth = 2
      compositeCtx.beginPath()
      compositeCtx.roundRect(x, y, width, height, 8)
      compositeCtx.stroke()
    }

    if (drawAnnotations && store.isDrawingEnabled) {
      compositeCtx.save()
      drawAnnotations(compositeCtx)
      compositeCtx.restore()
    }
  }

  // 合成绘制循环：优先用 requestVideoFrameCallback 驱动，只在屏幕视频真正有新帧时
  // 重绘 + 推帧给 canvas 流；120Hz 屏上不再每帧唤醒 rAF 做空判断。
  // rVFC 不可用时回退到固定 fps 的 rAF 节流（旧逻辑）。
  function hasRvfc(): boolean {
    return typeof HTMLVideoElement !== 'undefined' &&
      'requestVideoFrameCallback' in HTMLVideoElement.prototype
  }

  function startDrawLoop() {
    stopDrawLoop()
    if (!compositeCtx || !screenVideo) return

    if (hasRvfc()) {
      const onFrame = () => {
        if (!store.isRecording) { drawRvfcId = null; return }
        drawFrame()
        canvasTrack?.requestFrame()
        drawRvfcId = (screenVideo as any).requestVideoFrameCallback(onFrame)
      }
      drawFrame()
      canvasTrack?.requestFrame()
      drawRvfcId = (screenVideo as any).requestVideoFrameCallback(onFrame)
    } else {
      // 回退：固定 fps 的 rAF 节流
      const fps = settingsStore.maxFps
      const targetIntervalMs = 1000 / fps
      let lastDrawTime = performance.now()
      const drawLoop = () => {
        if (!store.isRecording) { drawRafId = null; return }
        const now = performance.now()
        if (now - lastDrawTime >= targetIntervalMs * 0.9) {
          drawFrame()
          lastDrawTime = now - ((now - lastDrawTime) % targetIntervalMs)
        }
        drawRafId = requestAnimationFrame(drawLoop)
      }
      drawRafId = requestAnimationFrame(drawLoop)
    }
  }

  function stopDrawLoop() {
    if (drawRvfcId !== null && screenVideo && 'cancelVideoFrameCallback' in screenVideo) {
      ;(screenVideo as any).cancelVideoFrameCallback(drawRvfcId)
    }
    drawRvfcId = null
    if (drawRafId !== null) {
      cancelAnimationFrame(drawRafId)
      drawRafId = null
    }
  }

  async function startCapture(sourceId: string, region?: Region, audioTracks?: MediaStreamTrack[], multiScreenSources?: { sourceId: string; bounds: { x: number; y: number; width: number; height: number } }[]) {
    if (isStarting) return
    isStarting = true
    try {
      const needsCanvas = store.isDrawingEnabled || !!multiScreenSources
      useDirectMp4 = false
      multiRecorders = []
      multiDisplayBounds = []
      multiTempFiles = []

      if (multiScreenSources && multiScreenSources.length > 0) {
        // === 多屏分别录制模式：每个屏幕用直接流录制，零 canvas 开销 ===
        multiRecorders = []
        multiDisplayBounds = []
        multiTempFiles = []

        const mimeType = getSupportedMimeType()
        log.info('Multi-screen: acquiring', multiScreenSources.length, 'streams')

        for (let i = 0; i < multiScreenSources.length; i++) {
          const s = multiScreenSources[i]
          log.info('Multi-screen: acquiring stream', i + 1, 'sourceId:', s.sourceId)
          const constraints: any = {
            audio: false,
            video: {
              mandatory: {
                chromeMediaSource: 'desktop',
                chromeMediaSourceId: s.sourceId,
                maxFrameRate: settingsStore.maxFps,
              },
            },
          }
          const stream = await navigator.mediaDevices.getUserMedia(constraints)
          log.info('Multi-screen: stream', i + 1, 'acquired, tracks:', stream.getTracks().length)

          // 等待流就绪
          const tmpVideo = document.createElement('video')
          tmpVideo.srcObject = stream
          tmpVideo.muted = true
          tmpVideo.play()
          await new Promise<void>((resolve) => {
            if (tmpVideo.readyState >= 2 && tmpVideo.videoWidth > 0) { resolve(); return }
            const onReady = () => { tmpVideo.removeEventListener('canplay', onReady); resolve() }
            tmpVideo.addEventListener('canplay', onReady)
            setTimeout(onReady, 3000)
          })
          log.info('Multi-screen: video', i + 1, 'ready', tmpVideo.videoWidth, 'x', tmpVideo.videoHeight)
          tmpVideo.pause()
          tmpVideo.srcObject = null

          const recChunks: Blob[] = []
          const bitrate = getBitrate(settingsStore.videoQuality, tmpVideo.videoWidth, tmpVideo.videoHeight)

          const recorder = new MediaRecorder(stream, {
            mimeType,
            videoBitsPerSecond: bitrate,
          })
          recorder.ondataavailable = (e) => { if (e.data.size > 0) recChunks.push(e.data) }

          multiRecorders.push({ recorder, stream, chunks: recChunks })
          multiDisplayBounds.push({ ...s.bounds })

          if (i === 0) {
            captureVideoWidth = tmpVideo.videoWidth
            captureVideoHeight = tmpVideo.videoHeight
          }
        }

        captureRegion = null
        captureScaleFactor = 1

        // 计算虚拟屏幕总尺寸（用于最终输出信息）
        const minX = Math.min(...multiDisplayBounds.map(b => b.x))
        const minY = Math.min(...multiDisplayBounds.map(b => b.y))
        const maxX = Math.max(...multiDisplayBounds.map(b => b.x + b.width))
        const maxY = Math.max(...multiDisplayBounds.map(b => b.y + b.height))
        captureVideoWidth = maxX - minX
        captureVideoHeight = maxY - minY

        // 所有 recorder 同时开始
        for (const r of multiRecorders) {
          r.recorder.start(1000)
        }

      } else {
        // === 单屏 / 区域模式（原有逻辑） ===
        const constraints: any = {
          audio: false,
          video: {
            mandatory: {
              chromeMediaSource: 'desktop',
              chromeMediaSourceId: sourceId,
              maxFrameRate: settingsStore.maxFps,
            },
          },
        }
        videoStream = await navigator.mediaDevices.getUserMedia(constraints)

        screenVideo = document.createElement('video')
        screenVideo.srcObject = videoStream
        screenVideo.muted = true
        screenVideo.play()

        await new Promise<void>((resolve) => {
          if (screenVideo!.readyState >= 2 && screenVideo!.videoWidth > 0) {
            resolve()
            return
          }
          const onReady = () => {
            screenVideo!.removeEventListener('canplay', onReady)
            resolve()
          }
          screenVideo!.addEventListener('canplay', onReady)
          setTimeout(onReady, 1000)
        })

        await waitForVideoFrame(screenVideo)

        captureScaleFactor = await window.electronAPI.getScreenScaleFactor()
        captureRegion = region || null
        store.selectedRegion = region || null
        store.recordingMode = region ? 'region' : 'full'

        captureVideoWidth = screenVideo.videoWidth
        captureVideoHeight = screenVideo.videoHeight

        const mimeType = getSupportedMimeType()
        const bitrate = getBitrate(settingsStore.videoQuality, captureVideoWidth, captureVideoHeight)

        if (!needsCanvas) {
          combinedStream = videoStream
          if (audioTracks && audioTracks.length > 0) {
            audioTracks.forEach(track => combinedStream!.addTrack(track))
          }

          previewStream.value = combinedStream

          mediaRecorder = new MediaRecorder(combinedStream, {
            mimeType,
            videoBitsPerSecond: bitrate,
          })
          mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data) }
          mediaRecorder.onstop = () => {
            handleRecordingStop().finally(() => { stopResolve?.(); stopResolve = null })
          }

          mediaRecorder.start(1000)
        } else {
          const canvasWidth = region ? Math.round(region.width * captureScaleFactor) : captureVideoWidth
          const canvasHeight = region ? Math.round(region.height * captureScaleFactor) : captureVideoHeight
          captureVideoWidth = canvasWidth
          captureVideoHeight = canvasHeight

          compositeCanvas = document.createElement('canvas')
          compositeCanvas.width = canvasWidth
          compositeCanvas.height = canvasHeight
          compositeCtx = compositeCanvas.getContext('2d', { alpha: false })!

          // captureStream(0): canvas 流不自动采样，由 startDrawLoop 在每帧 drawFrame 后
          // 手动 requestFrame() 推帧，避免双时钟采样 + 120Hz 空唤醒
          canvasStream = compositeCanvas.captureStream(0)
          canvasTrack = canvasStream.getVideoTracks()[0] as CanvasCaptureMediaStreamTrack | null

          if (audioTracks && audioTracks.length > 0) {
            audioTracks.forEach(track => canvasStream!.addTrack(track))
          }

          combinedStream = canvasStream
          previewStream.value = canvasStream

          mediaRecorder = new MediaRecorder(combinedStream, {
            mimeType,
            videoBitsPerSecond: getBitrate(settingsStore.videoQuality, canvasWidth, canvasHeight),
          })
          mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data) }
          mediaRecorder.onstop = () => {
            handleRecordingStop().finally(() => { stopResolve?.(); stopResolve = null })
          }

          // 少量预热帧确保首帧不为空，然后启动 rVFC 驱动的绘制循环
          drawFrame()
          canvasTrack?.requestFrame()
          mediaRecorder.start(1000)
          startDrawLoop()
        }
      }

      startTimer()
      store.setState('recording')
      window.electronAPI.minimizeWindow()
      const modeLabel = multiScreenSources ? `multi-screen (${multiScreenSources.length} displays)` : region ? `region: ${region.width}x${region.height}` : 'full screen'
      log.info('Recording started', modeLabel, needsCanvas ? '(canvas)' : '(direct)', mediaRecorder?.mimeType ?? '')
    } catch (err: any) {
      log.error('Failed to start recording:', err.message)
      cleanupStreams()
      throw new Error(`录制启动失败: ${err.message}`)
    } finally {
      isStarting = false
    }
  }

  let cleanupProgressListener: (() => void) | null = null

  async function handleRecordingStop() {
    store.setState('converting')
    stopTimer()

    // 恢复窗口并通知托盘
    window.electronAPI.notifyConversionStart()
    setTimeout(() => window.electronAPI.showWindow(), 50)

    try {
      const now = new Date()
      const timestamp = now.toISOString().replace(/[:.]/g, '-').replace('T', '_').slice(0, 19)

      if (multiRecorders.length > 0) {
        // === 多屏模式：保存各屏幕临时文件，然后用 ffmpeg 合并 ===
        const tempInputs: { filePath: string; bounds: { x: number; y: number; width: number; height: number } }[] = []

        for (let i = 0; i < multiRecorders.length; i++) {
          const r = multiRecorders[i]
          const blob = new Blob(r.chunks, { type: 'video/webm' })
          const buffer = await blob.arrayBuffer()
          const tmpPath = `${settingsStore.outputDir}\\_multi_${timestamp}_${i}.webm`
          await window.electronAPI.writeFile(buffer, tmpPath)
          tempInputs.push({ filePath: tmpPath, bounds: multiDisplayBounds[i] })
        }

        const mp4FileName = `MUERZHI-${timestamp}.mp4`
        const mp4Path = `${settingsStore.outputDir}\\${mp4FileName}`

        store.conversionProgress = 0
        cleanupProgressListener = window.electronAPI.onConversionProgress((progress) => {
          store.conversionProgress = progress.percent
        })

        const result = await window.electronAPI.mergeMultiScreen(tempInputs, mp4Path)

        if (result.success) {
          const size = await window.electronAPI.getFileSize(result.outputPath)
          store.addRecording({
            id: crypto.randomUUID(),
            filePath: result.outputPath,
            fileName: mp4FileName,
            duration: store.elapsedSeconds,
            fileSize: size,
            createdAt: Date.now(),
            thumbnail: undefined,
            width: captureVideoWidth,
            height: captureVideoHeight,
          })
          window.electronAPI.notifyConversionDone(result.outputPath)
        } else {
          log.error('Multi-screen merge failed')
        }
      } else {
        // === 单屏 / 区域模式（原有逻辑） ===
        log.info('[handleRecordingStop] 单屏模式, chunks:', chunks.length)
        if (chunks.length === 0) {
          store.resetState()
          cleanupStreams()
          return
        }

        const blob = new Blob(chunks, { type: mediaRecorder!.mimeType })
        const buffer = await blob.arrayBuffer()
        chunks = []

        const isAlreadyMp4 = useDirectMp4 || mediaRecorder!.mimeType.startsWith('video/mp4')
        const ext = isAlreadyMp4 ? 'mp4' : 'webm'
        const fileName = `MUERZHI-${timestamp}.${ext}`
        const filePath = `${settingsStore.outputDir}\\${fileName}`

        await window.electronAPI.writeFile(buffer, filePath)

        let finalPath = filePath
        let finalFileName = fileName
        let fileSize = buffer.byteLength

        const needCrop = captureRegion && !store.isDrawingEnabled
        const needConvert = !isAlreadyMp4 && settingsStore.defaultFormat === 'mp4'
        log.info('[handleRecordingStop] needCrop:', needCrop, 'needConvert:', needConvert)

        if (needCrop && needConvert) {
          const mp4FileName = `MUERZHI-${timestamp}.mp4`
          const mp4Path = `${settingsStore.outputDir}\\${mp4FileName}`
          const cropParams = {
            x: Math.round(captureRegion!.x * captureScaleFactor),
            y: Math.round(captureRegion!.y * captureScaleFactor),
            width: Math.round(captureRegion!.width * captureScaleFactor),
            height: Math.round(captureRegion!.height * captureScaleFactor),
          }

          store.conversionProgress = 0
          cleanupProgressListener = window.electronAPI.onConversionProgress((progress) => {
            store.conversionProgress = progress.percent
          })

          const result = await window.electronAPI.convertToMp4(filePath, mp4Path, cropParams)
          if (result.success) {
            await window.electronAPI.deleteFile(filePath)
            finalPath = result.outputPath
            finalFileName = mp4FileName
            const size = await window.electronAPI.getFileSize(result.outputPath)
            fileSize = size
          } else {
            finalPath = filePath
            finalFileName = fileName
          }
        } else if (needCrop) {
          const cropExt = isAlreadyMp4 ? 'mp4' : 'webm'
          const cropFileName = `MUERZHI-${timestamp}_cropped.${cropExt}`
          const cropPath = `${settingsStore.outputDir}\\${cropFileName}`
          const cropParams = {
            x: Math.round(captureRegion!.x * captureScaleFactor),
            y: Math.round(captureRegion!.y * captureScaleFactor),
            width: Math.round(captureRegion!.width * captureScaleFactor),
            height: Math.round(captureRegion!.height * captureScaleFactor),
          }

          store.conversionProgress = 0
          cleanupProgressListener = window.electronAPI.onConversionProgress((progress) => {
            store.conversionProgress = progress.percent
          })

          const result = await window.electronAPI.cropVideo(filePath, cropPath, cropParams)
          if (result.success) {
            await window.electronAPI.deleteFile(filePath)
            finalPath = result.outputPath
            finalFileName = cropFileName
            const size = await window.electronAPI.getFileSize(result.outputPath)
            fileSize = size
          } else {
            finalPath = filePath
            finalFileName = fileName
          }
        } else if (needConvert) {
          const mp4FileName = `MUERZHI-${timestamp}.mp4`
          const mp4Path = `${settingsStore.outputDir}\\${mp4FileName}`

          store.conversionProgress = 0
          cleanupProgressListener = window.electronAPI.onConversionProgress((progress) => {
            store.conversionProgress = progress.percent
          })

          const result = await window.electronAPI.convertToMp4(filePath, mp4Path)
          if (result.success) {
            await window.electronAPI.deleteFile(filePath)
            finalPath = result.outputPath
            finalFileName = mp4FileName
            const size = await window.electronAPI.getFileSize(result.outputPath)
            fileSize = size
          } else {
            finalPath = filePath
            finalFileName = fileName
          }
        }

        log.info('[handleRecordingStop] 开始保存录制记录, finalPath:', finalPath)
        const thumbnail = await generateThumbnail(blob)

        store.addRecording({
          id: crypto.randomUUID(),
          filePath: finalPath,
          fileName: finalFileName,
          duration: store.elapsedSeconds,
          fileSize,
          createdAt: Date.now(),
          thumbnail,
          width: captureVideoWidth,
          height: captureVideoHeight,
        })

        window.electronAPI.notifyConversionDone(finalPath)
      }
    } catch (err) {
      log.error('Failed to save recording:', err)
    } finally {
      log.info('[handleRecordingStop] finally block')
      cleanupProgressListener?.()
      cleanupProgressListener = null
      store.resetState()
      cleanupStreams()
    }
  }

  async function generateThumbnail(blob: Blob): Promise<string | undefined> {
    let url: string | undefined
    try {
      url = URL.createObjectURL(blob)
      const video = document.createElement('video')
      video.src = url
      video.muted = true
      video.currentTime = 1

      await new Promise<void>((resolve) => {
        video.onseeked = () => resolve()
        setTimeout(resolve, 3000)
      })

      const canvas = document.createElement('canvas')
      canvas.width = 160
      canvas.height = 90
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(video, 0, 0, 160, 90)
      const dataUrl = canvas.toDataURL('image/jpeg', 0.7)

      video.pause()
      video.src = ''
      return dataUrl
    } catch {
      return undefined
    } finally {
      if (url) URL.revokeObjectURL(url)
    }
  }

  function pause() {
    if (multiRecorders.length > 0) {
      for (const r of multiRecorders) {
        if (r.recorder.state === 'recording') r.recorder.pause()
      }
      stopTimer()
      store.setState('paused')
      log.info('Recording paused (multi-screen)')
      return
    }
    if (mediaRecorder?.state === 'recording') {
      mediaRecorder.pause()
      stopTimer()
      store.setState('paused')
      log.info('Recording paused')
    }
  }

  function resume() {
    if (multiRecorders.length > 0) {
      for (const r of multiRecorders) {
        if (r.recorder.state === 'paused') r.recorder.resume()
      }
      startTimer()
      store.setState('recording')
      log.info('Recording resumed (multi-screen)')
      return
    }
    if (mediaRecorder?.state === 'paused') {
      mediaRecorder.resume()
      startTimer()
      // 恢复绘制循环
      if (compositeCtx && screenVideo) {
        startDrawLoop()
      }
      store.setState('recording')
      log.info('Recording resumed')
    }
  }

  let stopResolve: (() => void) | null = null

  async function stop() {
    if (multiRecorders.length > 0 && multiRecorders.some(r => r.recorder.state === 'recording' || r.recorder.state === 'paused')) {
      log.info('Recording stopped (multi-screen)')
      return new Promise<void>((resolve) => {
        stopResolve = resolve
        const last = multiRecorders[multiRecorders.length - 1]
        last.recorder.onstop = () => {
          handleRecordingStop().finally(() => { stopResolve?.(); stopResolve = null })
        }
        for (const r of multiRecorders) {
          if (r.recorder.state === 'recording' || r.recorder.state === 'paused') {
            r.recorder.stop()
          }
        }
      })
    }
    if (mediaRecorder && (mediaRecorder.state === 'recording' || mediaRecorder.state === 'paused')) {
      log.info('Recording stopped')
      return new Promise<void>((resolve) => {
        stopResolve = resolve
        mediaRecorder.stop()
      })
    }
  }

  function cleanupStreams() {
    // 停止绘制循环（rVFC 句柄需在 screenVideo 置空前取消）
    stopDrawLoop()
    if (countInterval) {
      clearInterval(countInterval)
      countInterval = null
    }
    videoStream?.getTracks().forEach(t => t.stop())
    audioStream?.getTracks().forEach(t => t.stop())
    combinedStream?.getTracks().forEach(t => t.stop())
    canvasStream?.getTracks().forEach(t => t.stop())
    videoStream = null
    audioStream = null
    combinedStream = null
    canvasStream = null
    canvasTrack = null
    if (screenVideo) {
      screenVideo.srcObject = null
      screenVideo = null
    }
    // 多屏资源清理
    for (const r of multiRecorders) {
      r.stream.getTracks().forEach(t => t.stop())
    }
    multiRecorders = []
    multiDisplayBounds = []
    multiTempFiles = []
    if (cameraVideo) {
      cameraVideo.srcObject = null
      cameraVideo = null
    }
    compositeCanvas = null
    compositeCtx = null
    previewStream.value = null
    captureRegion = null
    captureScaleFactor = 1
    captureVideoWidth = 0
    captureVideoHeight = 0
    chunks = []
    mediaRecorder = null
  }

  return {
    previewStream,
    cameraStream: cameraStream,
    cameraPosition,
    setDrawAnnotations,
    setCameraPosition,
    startCapture,
    pause,
    resume,
    stop,
  }
}
