import ffmpeg from 'fluent-ffmpeg'
import ffmpegPath from '@ffmpeg-installer/ffmpeg'
import { app } from 'electron'
import os from 'node:os'
import path from 'node:path'
import nodeFs from 'node:fs'
import log from './logger'
import { registerConversion, unregisterConversion } from './conversion-registry'
import { getH264Encoder, buildEncodeOptions } from './hw-encoder'

const ffmpegBinPath = app.isPackaged
  ? path.join(process.resourcesPath, 'ffmpeg.exe')
  : ffmpegPath.path
ffmpeg.setFfmpegPath(ffmpegBinPath)

export interface ConversionProgress {
  percent: number
  targetSize: number
}

const NUM_THREADS = Math.min(os.cpus().length, 8)

export function convertWebmToMp4(
  inputPath: string,
  outputPath: string,
  onProgress?: (progress: ConversionProgress) => void,
  crop?: { x: number; y: number; width: number; height: number }
): Promise<{ success: boolean; outputPath: string; error?: string }> {
  // 无裁剪：单遍 remux（复制视频流 + 转码音频），几乎瞬间完成
  if (!crop) {
    return new Promise((resolve) => {
      const cmd = ffmpeg(inputPath)
      const taskId = registerConversion(() => cmd.kill('SIGKILL'))
      cmd
        .outputOptions([
          '-c:v', 'copy',
          '-c:a', 'aac',
          '-b:a', '128k',
          '-movflags', '+faststart',
        ])
        .output(outputPath)
        .on('progress', () => {
          onProgress?.({ percent: 80, targetSize: 0 })
        })
        .on('end', () => {
          unregisterConversion(taskId)
          onProgress?.({ percent: 100, targetSize: 0 })
          resolve({ success: true, outputPath })
        })
        .on('error', (err) => {
          unregisterConversion(taskId)
          log.error('MP4 remux failed:', err.message)
          resolve({ success: false, outputPath: '', error: err.message })
        })
        .run()
    })
  }

  // 有裁剪：两遍处理（视频重编码 + 音频合并）
  const tmpPath = outputPath.replace(/\.mp4$/i, '_tmp.mp4')
  const cropFilter = `crop=${Math.round(crop.width/2)*2}:${Math.round(crop.height/2)*2}:${Math.round(crop.x/2)*2}:${Math.round(crop.y/2)*2},`
  return new Promise(async (resolve) => {
    const hwEncoder = await getH264Encoder(ffmpegBinPath)

    // pass1: 视频重编码（裁剪+pad），先试硬件编码器，失败回退 libx264
    function runPass1(encoder: 'h264_nvenc' | 'h264_qsv' | 'h264_amf' | 'libx264'): Promise<{ success: boolean; error?: string }> {
      return new Promise((res) => {
        const pass1 = ffmpeg(inputPath)
        const taskId = registerConversion(() => pass1.kill('SIGKILL'))
        pass1
          .outputOptions([
            ...buildEncodeOptions(encoder, '23', NUM_THREADS),
            '-vf', `${cropFilter}pad=ceil(iw/2)*2:ceil(ih/2)*2,format=yuv420p`,
            '-an',
            '-movflags +faststart',
          ])
          .output(tmpPath)
          .on('progress', (progress) => {
            onProgress?.({
              percent: Math.round((progress.percent ?? 0) * 100) / 200,
              targetSize: progress.targetSize ?? 0,
            })
          })
          .on('end', () => {
            unregisterConversion(taskId)
            res({ success: true })
          })
          .on('error', (err) => {
            unregisterConversion(taskId)
            log.error(`MP4 pass1 failed (${encoder}):`, err.message)
            res({ success: false, error: err.message })
          })
          .run()
      })
    }

    let p1 = await runPass1(hwEncoder)
    if (!p1.success && hwEncoder !== 'libx264') {
      log.warn(`MP4 pass1: ${hwEncoder} failed, retrying with libx264`)
      // 清掉 pass1 可能留下的部分产物
      await nodeFs.promises.unlink(tmpPath).catch(() => {})
      p1 = await runPass1('libx264')
    }
    if (!p1.success) {
      resolve({ success: false, outputPath: '', error: p1.error })
      return
    }

    // pass2: 音频合并（-c:v copy，不涉及编码器）
    const pass2 = ffmpeg(tmpPath)
    const pass2Task = registerConversion(() => pass2.kill('SIGKILL'))
    pass2
      .addInput(inputPath)
      .outputOptions([
        '-c:v', 'copy',
        '-c:a', 'aac',
        '-b:a', '128k',
        '-map', '0:v',
        '-map', '1:a?',
        '-shortest',
        '-movflags', '+faststart',
      ])
      .output(outputPath)
      .on('progress', (progress) => {
        onProgress?.({
          percent: Math.round((progress.percent ?? 0) * 100) / 200 + 50,
          targetSize: progress.targetSize ?? 0,
        })
      })
      .on('end', () => {
        unregisterConversion(pass2Task)
        nodeFs.promises.unlink(tmpPath).catch(() => {})
        resolve({ success: true, outputPath })
      })
      .on('error', (err) => {
        unregisterConversion(pass2Task)
        log.error('MP4 audio mux failed:', err.message)
        nodeFs.promises.rename(tmpPath, outputPath)
          .then(() => resolve({ success: true, outputPath }))
          .catch(() => {
            nodeFs.promises.unlink(tmpPath).catch(() => {})
            resolve({ success: false, outputPath: '', error: err.message })
          })
      })
      .run()
  })
}

export function cropVideo(
  inputPath: string,
  outputPath: string,
  crop: { x: number; y: number; width: number; height: number },
  onProgress?: (progress: ConversionProgress) => void
): Promise<{ success: boolean; outputPath: string; error?: string }> {
  const w = Math.round(crop.width / 2) * 2
  const h = Math.round(crop.height / 2) * 2
  const cx = Math.round(crop.x / 2) * 2
  const cy = Math.round(crop.y / 2) * 2
  return new Promise(async (resolve) => {
    const vf = `crop=${w}:${h}:${cx}:${cy},format=yuv420p`
    const hwEncoder = await getH264Encoder(ffmpegBinPath)

    function runOnce(encoder: 'h264_nvenc' | 'h264_qsv' | 'h264_amf' | 'libx264', crf: string): Promise<{ success: boolean; outputPath: string; error?: string }> {
      return new Promise((res) => {
        const cmd = ffmpeg(inputPath)
        const taskId = registerConversion(() => cmd.kill('SIGKILL'))
        cmd
          .outputOptions([
            ...buildEncodeOptions(encoder, crf, NUM_THREADS),
            '-vf', vf,
            '-c:a', 'copy',
            '-movflags', '+faststart',
          ])
          .output(outputPath)
          .on('progress', (progress) => {
            onProgress?.({
              percent: Math.round((progress.percent ?? 0) * 100),
              targetSize: progress.targetSize ?? 0,
            })
          })
          .on('end', () => {
            unregisterConversion(taskId)
            res({ success: true, outputPath })
          })
          .on('error', (err) => {
            unregisterConversion(taskId)
            log.error(`Crop failed (${encoder}):`, err.message)
            res({ success: false, outputPath: '', error: err.message })
          })
          .run()
      })
    }

    // 先用硬件编码器（若可用），失败则回退 libx264 重跑一次
    let result = await runOnce(hwEncoder, '18')
    if (!result.success && hwEncoder !== 'libx264') {
      log.warn(`Crop: ${hwEncoder} failed, retrying with libx264`)
      result = await runOnce('libx264', '18')
    }
    resolve(result)
  })
}

export function mergeMultiScreen(
  inputs: { filePath: string; bounds: { x: number; y: number; width: number; height: number } }[],
  outputPath: string,
  onProgress?: (progress: ConversionProgress) => void,
): Promise<{ success: boolean; outputPath: string; error?: string }> {
  return new Promise((resolve) => {
    const totalW = Math.max(...inputs.map(i => i.bounds.x + i.bounds.width)) - Math.min(...inputs.map(i => i.bounds.x))
    const totalH = Math.max(...inputs.map(i => i.bounds.y + i.bounds.height)) - Math.min(...inputs.map(i => i.bounds.y))
    const originX = Math.min(...inputs.map(i => i.bounds.x))
    const originY = Math.min(...inputs.map(i => i.bounds.y))
    const cw = Math.round(totalW / 2) * 2
    const ch = Math.round(totalH / 2) * 2

    log.info('Merge canvas size:', cw, 'x', ch)
    log.info('Merge inputs:', inputs.map((inp, i) => `[${i}] ${inp.filePath} bounds=${JSON.stringify(inp.bounds)}`).join(', '))

  // Step 1: Remux each webm to mp4 to fix duration metadata —— 串行执行，
  // 任一失败即短路返回并清理已生成文件，避免带着缺失输入进入最终合并导致全丢。
  const remuxedPaths: string[] = []
  const totalInputs = inputs.length

  function remuxOne(filePath: string, index: number): Promise<{ success: boolean; remuxedPath: string; error?: string }> {
    const remuxedPath = filePath.replace(/\.webm$/i, '_remux.mp4')
    return new Promise((resolve) => {
      const remux = ffmpeg(filePath)
      const taskId = registerConversion(() => remux.kill('SIGKILL'))
      remux
        .outputOptions(['-c', 'copy'])
        .output(remuxedPath)
        .on('end', () => {
          unregisterConversion(taskId)
          log.info(`Merge remux ${index + 1}/${totalInputs} done`)
          resolve({ success: true, remuxedPath })
        })
        .on('error', (err) => {
          unregisterConversion(taskId)
          log.error(`Merge remux ${index + 1} failed:`, err.message)
          resolve({ success: false, remuxedPath, error: err.message })
        })
        .run()
    })
  }

  // 清理已生成的 remux 临时文件 + 原始 webm 输入（失败短路 / 合并失败时调用）
  async function cleanupTempFiles() {
    for (const p of remuxedPaths) {
      await nodeFs.promises.unlink(p).catch(() => {})
    }
    for (const inp of inputs) {
      await nodeFs.promises.unlink(inp.filePath).catch(() => {})
    }
  }

  // Step 2: 最终合并（先试硬件编码器，失败回退 libx264）
  async function doMerge(): Promise<{ success: boolean; outputPath: string; error?: string }> {
    const hwEncoder = await getH264Encoder(ffmpegBinPath)
    const filters: string[] = [`color=c=black:s=${cw}x${ch}[bg]`]
    let prevLabel = '[bg]'
    for (let i = 0; i < inputs.length; i++) {
      const inp = inputs[i]
      const dx = Math.round((inp.bounds.x - originX) / 2) * 2
      const dy = Math.round((inp.bounds.y - originY) / 2) * 2
      const sw = Math.round(inp.bounds.width / 2) * 2
      const sh = Math.round(inp.bounds.height / 2) * 2
      const scaledLabel = `[s${i}]`
      const outLabel = i === inputs.length - 1 ? '[out]' : `[tmp${i}]`
      filters.push(`[${i}:v]scale=${sw}:${sh},setsar=1${scaledLabel}`)
      filters.push(`${prevLabel}${scaledLabel}overlay=${dx}:${dy}${outLabel}`)
      prevLabel = outLabel
    }
    filters.push('[out]format=yuv420p')
    log.info('Merge filter_complex:', filters.join(';'))

    function runMergeOnce(encoder: 'h264_nvenc' | 'h264_qsv' | 'h264_amf' | 'libx264'): Promise<{ success: boolean; outputPath: string; error?: string }> {
      return new Promise((resolve) => {
        const cmd = ffmpeg()
        const taskId = registerConversion(() => cmd.kill('SIGKILL'))
        for (const p of remuxedPaths) {
          cmd.addInput(p)
        }
        cmd
          .complexFilter(filters)
          .outputOptions([
            ...buildEncodeOptions(encoder, '23', NUM_THREADS),
            '-movflags', '+faststart',
          ])
          .output(outputPath)
          .on('start', () => {
            log.info(`Merge ffmpeg command started (${encoder})`)
          })
          .on('progress', (progress) => {
            // remux 阶段占 0-30%，合并阶段占 30-100%
            const pct = Math.round((progress.percent ?? 0))
            onProgress?.({ percent: Math.min(30 + pct * 0.7, 100), targetSize: progress.targetSize ?? 0 })
          })
          .on('end', () => {
            unregisterConversion(taskId)
            log.info('Merge completed successfully')
            for (const inp of inputs) {
              nodeFs.promises.unlink(inp.filePath).catch(() => {})
            }
            for (const p of remuxedPaths) {
              nodeFs.promises.unlink(p).catch(() => {})
            }
            resolve({ success: true, outputPath })
          })
          .on('error', (err) => {
            unregisterConversion(taskId)
            log.error(`Multi-screen merge failed (${encoder}):`, err.message)
            for (const inp of inputs) {
              nodeFs.promises.unlink(inp.filePath).catch(() => {})
            }
            for (const p of remuxedPaths) {
              nodeFs.promises.unlink(p).catch(() => {})
            }
            resolve({ success: false, outputPath: '', error: err.message })
          })
          .run()
      })
    }

    let result = await runMergeOnce(hwEncoder)
    if (!result.success && hwEncoder !== 'libx264') {
      log.warn(`Merge: ${hwEncoder} failed, retrying with libx264`)
      await nodeFs.promises.unlink(outputPath).catch(() => {})
      result = await runMergeOnce('libx264')
    }
    return result
  }

  // 串行 remux：任一失败即短路清理并返回，不进入 doMerge
  ;(async () => {
    for (let i = 0; i < totalInputs; i++) {
      const r = await remuxOne(inputs[i].filePath, i)
      if (!r.success) {
        log.error(`Merge aborted: remux ${i + 1}/${totalInputs} failed, short-circuiting`)
        // 失败那次也可能留下部分写入的 _remux.mp4，一并清理
        await nodeFs.promises.unlink(r.remuxedPath).catch(() => {})
        await cleanupTempFiles()
        resolve({ success: false, outputPath: '', error: r.error })
        return
      }
      remuxedPaths.push(r.remuxedPath)
      // remux 进度：0-30%
      onProgress?.({ percent: Math.round(((i + 1) / totalInputs) * 30), targetSize: 0 })
    }
    const result = await doMerge()
    resolve(result)
  })()
  })
}

export function convertToGif(
  inputPath: string,
  outputPath: string,
  options?: { width?: number; fps?: number; duration?: number },
  onProgress?: (progress: ConversionProgress) => void
): Promise<{ success: boolean; outputPath: string; error?: string }> {
  const { execFile } = require('node:child_process')
  const ffmpegBin = ffmpegPath.path
  const width = options?.width ?? 480
  const fps = options?.fps ?? 10
  const palettePath = path.join(os.tmpdir(), `gif_palette_${Date.now()}.png`)

  log.info('GIF conversion - input:', inputPath, 'palette:', palettePath, 'output:', outputPath)

  // Pass 1: generate palette
  const args1 = [
    '-y',
    '-i', inputPath,
    '-vf', `fps=${fps},scale=${width}:-1:flags=lanczos,palettegen`,
    palettePath,
  ]

  return new Promise((resolve) => {
    let task1Id = ''
    let task2Id = ''
    // Pass 1
    const proc1 = execFile(ffmpegBin, args1, (err1) => {
      unregisterConversion(task1Id)
      if (err1) {
        log.error('GIF palette gen failed:', err1.message)
        resolve({ success: false, outputPath: '', error: err1.message })
        return
      }
      log.info('GIF palette generated successfully')

      // Pass 2: apply palette to create GIF
      const args2 = [
        '-y',
        '-i', inputPath,
        '-i', palettePath,
        '-filter_complex', `[0:v]fps=${fps},scale=${width}:-1:flags=lanczos[x];[x][1:v]paletteuse`,
        outputPath,
      ]

      const proc = execFile(ffmpegBin, args2, (err2) => {
        unregisterConversion(task2Id)
        nodeFs.promises.unlink(palettePath).catch(() => {})
        if (err2) {
          log.error('GIF creation failed:', err2.message)
          resolve({ success: false, outputPath: '', error: err2.message })
        } else {
          resolve({ success: true, outputPath })
        }
      })
      task2Id = registerConversion(() => proc.kill('SIGKILL'))

      if (proc.stdout) {
        proc.stdout.on('data', (data: Buffer) => {
          const match = data.toString().match(/time=(\d+:\d+:\d+\.\d+)/)
          if (match && options?.duration) {
            const parts = match[1].split(':').map(Number)
            const current = parts[0] * 3600 + parts[1] * 60 + parts[2]
            const percent = Math.min(Math.round((current / options.duration) * 100), 99)
            onProgress?.({ percent: percent + 50, targetSize: 0 })
          } else {
            onProgress?.({ percent: 75, targetSize: 0 })
          }
        })
      }
    })
    task1Id = registerConversion(() => proc1.kill('SIGKILL'))
  })
}
