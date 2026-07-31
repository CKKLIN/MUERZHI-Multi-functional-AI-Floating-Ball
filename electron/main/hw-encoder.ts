import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

// 硬件 H.264 编码器探测：启动时按 nvenc > qsv > amf 优先级选第一个可用者，
// re-encode 路径优先用硬编器，CPU 占用可从 ~800% 降到个位数 %。
// 探测结果进程内缓存，只跑一次。运行时硬编失败由调用方回退 libx264。
//
// 本模块不直接依赖 electron / electron-log（日志通过 setHwEncoderLogger 注入），
// 因此 pickHwEncoder 可脱离 Electron 单测。

export type H264Encoder = 'h264_nvenc' | 'h264_qsv' | 'h264_amf' | 'libx264'
export type HwLogger = { info: (...a: unknown[]) => void; warn: (...a: unknown[]) => void }

const PRIORITY: H264Encoder[] = ['h264_nvenc', 'h264_qsv', 'h264_amf']

let cached: H264Encoder | null = null
let probing: Promise<H264Encoder> | null = null
let logger: HwLogger = { info: () => {}, warn: () => {} }

/** 注入日志实现（生产环境在 main 进程入口调用，传入 electron-log 实例）。 */
export function setHwEncoderLogger(log: HwLogger): void {
  logger = log
}

/** 从 ffmpeg -encoders 输出里解析出可用的 h264 硬编器，按优先级返回第一个。
 *  纯函数，便于单测（注入 encoders 文本）。无可用硬编器时返回 'libx264'。 */
export function pickHwEncoder(encodersText: string): H264Encoder {
  for (const enc of PRIORITY) {
    // -encoders 输出形如 " V..... h264_nvenc  NVIDIA NVENC H.264 encoder"
    if (new RegExp(`\\b${enc}\\b`).test(encodersText)) return enc
  }
  return 'libx264'
}

/** 探测可用硬件编码器，结果进程内缓存。多次调用返回同一 Promise。
 *  失败（ffmpeg 不可用 / 超时）时回退 'libx264'。 */
export function getH264Encoder(ffmpegBin: string): Promise<H264Encoder> {
  if (cached) return Promise.resolve(cached)
  if (probing) return probing
  probing = (async () => {
    try {
      const { stdout } = await execFileAsync(ffmpegBin, ['-hide_banner', '-encoders'], {
        timeout: 5000,
        maxBuffer: 2 * 1024 * 1024,
      })
      const enc = pickHwEncoder(stdout)
      logger.info(`H.264 encoder selected: ${enc}`)
      cached = enc
      return enc
    } catch (err: any) {
      logger.warn('HW encoder probe failed, falling back to libx264:', err?.message ?? err)
      cached = 'libx264'
      return 'libx264'
    } finally {
      probing = null
    }
  })()
  return probing
}

/** 仅测试用：重置缓存。 */
export function _resetCacheForTest(): void {
  cached = null
  probing = null
}

/** 为给定编码器和 crf 构造 ffmpeg outputOptions（re-encode 路径用）。
 *  libx264 用 -crf；硬编器用各自的质量参数（nvenc -cq、qsv -global_quality、amf -qp_i/-qp_p）。
 *  纯函数，便于单测。 */
export function buildEncodeOptions(encoder: H264Encoder, crf: string, numThreads: number): string[] {
  switch (encoder) {
    case 'h264_nvenc':
      // nvenc: -preset p1..p7（p4 平衡），-cq 质量，-rc vbr 码率控制
      return ['-c:v', 'h264_nvenc', '-preset', 'p4', '-rc', 'vbr', '-cq', crf, '-b:v', '0']
    case 'h264_qsv':
      // qsv: -preset veryfast/fast/balanced，-global_quality 质量
      return ['-c:v', 'h264_qsv', '-preset', 'veryfast', '-global_quality', crf]
    case 'h264_amf':
      // amf: -quality balanced/speed，-rc cqp，-qp_i/-qp_p 质量
      return ['-c:v', 'h264_amf', '-quality', 'balanced', '-rc', 'cqp', '-qp_i', crf, '-qp_p', crf]
    case 'libx264':
    default:
      return ['-c:v', 'libx264', '-preset', 'ultrafast', '-crf', crf, '-threads', String(numThreads)]
  }
}


