// smoke: getH264Encoder 对真实 ffmpeg 应选到 nvenc（本机 -encoders 含 nvenc）
import { getH264Encoder, _resetCacheForTest } from './electron/main/hw-encoder.ts'
import path from 'node:path'
import fs from 'node:fs'
// 优先用裁剪版 vendor ffmpeg（与打包产物一致）；历史 node_modules 路径仅作过渡回退
const vendorBin = path.join('vendor', 'ffmpeg', 'ffmpeg.exe')
const legacyBin = path.join('node_modules', '@ffmpeg-installer', 'win32-x64', 'ffmpeg.exe')
const ffmpegBin = fs.existsSync(vendorBin) ? vendorBin : legacyBin
_resetCacheForTest()
const enc = await getH264Encoder(ffmpegBin)
console.log('selected encoder:', enc)
console.log(enc === 'h264_nvenc' ? 'PASS (nvenc)' : enc === 'libx264' ? 'FALLBACK to libx264' : `GOT ${enc}`)
