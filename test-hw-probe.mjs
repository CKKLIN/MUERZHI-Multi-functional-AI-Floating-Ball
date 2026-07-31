// smoke: getH264Encoder 对真实 ffmpeg 应选到 nvenc（本机 -encoders 含 nvenc）
import { getH264Encoder, _resetCacheForTest } from './electron/main/hw-encoder.ts'
import path from 'node:path'
const ffmpegBin = path.join('node_modules', '@ffmpeg-installer', 'win32-x64', 'ffmpeg.exe')
_resetCacheForTest()
const enc = await getH264Encoder(ffmpegBin)
console.log('selected encoder:', enc)
console.log(enc === 'h264_nvenc' ? 'PASS (nvenc)' : enc === 'libx264' ? 'FALLBACK to libx264' : `GOT ${enc}`)
