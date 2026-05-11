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
  let levelAnimFrame: number | null = null

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

    function updateLevel() {
      if (micAnalyser) {
        micAnalyser.getByteFrequencyData(dataArray)
        let sum = 0
        for (let i = 0; i < dataArray.length; i++) { const v = dataArray[i] / 255; sum += v * v }
        micLevel.value = Math.min(Math.sqrt(sum / dataArray.length) * 3, 1)
      }
      if (sysAnalyser) {
        sysAnalyser.getByteFrequencyData(dataArray)
        let sum = 0
        for (let i = 0; i < dataArray.length; i++) { const v = dataArray[i] / 255; sum += v * v }
        sysLevel.value = Math.min(Math.sqrt(sum / dataArray.length) * 3, 1)
      }
      levelAnimFrame = requestAnimationFrame(updateLevel)
    }
    levelAnimFrame = requestAnimationFrame(updateLevel)
  }

  function stopLevelMonitoring() {
    if (levelAnimFrame) {
      cancelAnimationFrame(levelAnimFrame)
      levelAnimFrame = null
    }
    micAnalyser = null
    sysAnalyser = null
    micLevel.value = 0
    sysLevel.value = 0
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
