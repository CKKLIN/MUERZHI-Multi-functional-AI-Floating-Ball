import { ref, shallowRef, onUnmounted } from 'vue'

export function useAudioCapture() {
  let audioCtx: AudioContext | null = null
  let micSource: MediaStreamAudioSourceNode | null = null
  let sysSource: MediaStreamAudioSourceNode | null = null
  let micStream: MediaStream | null = null
  let sysStream: MediaStream | null = null
  let analyser: AnalyserNode | null = null

  const micLevel = ref(0)
  const sysLevel = ref(0)
  // 电平采样定时器（~20Hz）。用 setInterval 而非 rAF，避免静音/最小化时仍每帧
  // getByteFrequencyData（GPU→CPU 回读）+ 写两个响应式 ref。
  let levelInterval: ReturnType<typeof setInterval> | null = null
  // 死区：计算出的电平与上次差值小于阈值就不写 ref，避免无意义的响应式通知
  let lastMic = 0
  let lastSys = 0
  const DEADBAND = 0.02

  async function startMicrophone(deviceId?: string): Promise<MediaStreamTrack[]> {
    try {
      micStream?.getTracks().forEach(t => t.stop())
      micStream = await navigator.mediaDevices.getUserMedia({
        audio: deviceId ? { deviceId: { exact: deviceId } } : true,
        video: false,
      })
      return micStream.getAudioTracks()
    } catch (err) {
      console.warn('麦克风获取失败:', err)
      micStream = null
      return []
    }
  }

  async function startSystemAudio(sourceId: string): Promise<MediaStreamTrack[]> {
    try {
      sysStream?.getTracks().forEach(t => t.stop())
      sysStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          mandatory: {
            chromeMediaSource: 'desktop',
            chromeMediaSourceId: sourceId,
          },
        } as any,
        video: false,
      })
      return sysStream.getAudioTracks()
    } catch (err) {
      console.warn('系统音频获取失败:', err)
      sysStream = null
      return []
    }
  }

  function getMixedAudioStream(
    micTracks: MediaStreamTrack[],
    sysTracks: MediaStreamTrack[],
  ): MediaStream {
    if (micTracks.length === 0 && sysTracks.length === 0) {
      return new MediaStream()
    }
    if (micTracks.length > 0 && sysTracks.length === 0) {
      return new MediaStream(micTracks)
    }
    if (micTracks.length === 0 && sysTracks.length > 0) {
      return new MediaStream(sysTracks)
    }

    // 混合多个音频源
    const allTracks = [...micTracks, ...sysTracks]
    return new MediaStream(allTracks)
  }

  let micAnalyser: AnalyserNode | null = null
  let sysAnalyser: AnalyserNode | null = null

  function startLevelMonitoring(micTracks: MediaStreamTrack[], sysTracks: MediaStreamTrack[]) {
    stopLevelMonitoring()
    if (micTracks.length === 0 && sysTracks.length === 0) return

    audioCtx = new AudioContext()

    if (micTracks.length > 0) {
      micAnalyser = audioCtx.createAnalyser()
      micAnalyser.fftSize = 256
      const micSource = audioCtx.createMediaStreamSource(new MediaStream(micTracks))
      micSource.connect(micAnalyser)
    }

    if (sysTracks.length > 0) {
      sysAnalyser = audioCtx.createAnalyser()
      sysAnalyser.fftSize = 256
      const sysSource = audioCtx.createMediaStreamSource(new MediaStream(sysTracks))
      sysSource.connect(sysAnalyser)
    }

    const dataArray = new Uint8Array(128)

    function computeLevel(analyser: AnalyserNode | null): number {
      if (!analyser) return 0
      analyser.getByteFrequencyData(dataArray)
      let sum = 0
      for (let i = 0; i < dataArray.length; i++) { const v = dataArray[i] / 255; sum += v * v }
      return Math.min(Math.sqrt(sum / dataArray.length) * 3, 1)
    }

    function updateLevel() {
      // 页面隐藏时跳过采样（定时器仍在跑，可见时自动恢复）
      if (document.hidden) return
      const mic = computeLevel(micAnalyser)
      const sys = computeLevel(sysAnalyser)
      // 死区：仅当变化超过阈值才写 ref，减少响应式下游通知
      if (Math.abs(mic - lastMic) >= DEADBAND) { micLevel.value = mic; lastMic = mic }
      if (Math.abs(sys - lastSys) >= DEADBAND) { sysLevel.value = sys; lastSys = sys }
    }
    levelInterval = setInterval(updateLevel, 50)
  }

  function stopLevelMonitoring() {
    if (levelInterval) {
      clearInterval(levelInterval)
      levelInterval = null
    }
    micAnalyser = null
    sysAnalyser = null
    micLevel.value = 0
    sysLevel.value = 0
    lastMic = 0
    lastSys = 0
  }

  async function cleanup() {
    micStream?.getTracks().forEach(t => t.stop())
    sysStream?.getTracks().forEach(t => t.stop())
    micStream = null
    sysStream = null
    stopLevelMonitoring()
    if (audioCtx) {
      await audioCtx.close()
      audioCtx = null
    }
    analyser = null
    micAnalyser = null
    sysAnalyser = null
    micSource = null
    sysSource = null
  }

  onUnmounted(() => {
    cleanup()
  })

  return {
    micLevel,
    sysLevel,
    startMicrophone,
    startSystemAudio,
    getMixedAudioStream,
    startLevelMonitoring,
    stopLevelMonitoring,
    cleanup,
  }
}
