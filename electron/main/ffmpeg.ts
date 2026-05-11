import ffmpeg from 'fluent-ffmpeg'
import ffmpegPath from '@ffmpeg-installer/ffmpeg'
import { app } from 'electron'
import os from 'node:os'
import path from 'node:path'
import nodeFs from 'node:fs'
import log from './logger'

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
      ffmpeg(inputPath)
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
          onProgress?.({ percent: 100, targetSize: 0 })
          resolve({ success: true, outputPath })
        })
        .on('error', (err) => {
          log.error('MP4 remux failed:', err.message)
          resolve({ success: false, outputPath: '', error: err.message })
        })
        .run()
    })
  }

  // 有裁剪：两遍处理（视频重编码 + 音频合并）
  const tmpPath = outputPath.replace(/\.mp4$/i, '_tmp.mp4')
  const cropFilter = `crop=${Math.round(crop.width/2)*2}:${Math.round(crop.height/2)*2}:${Math.round(crop.x/2)*2}:${Math.round(crop.y/2)*2},`
  return new Promise((resolve) => {
    ffmpeg(inputPath)
      .outputOptions([
        '-c:v libx264',
        '-preset ultrafast',
        '-crf 23',
        '-threads', String(NUM_THREADS),
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
        ffmpeg(tmpPath)
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
            nodeFs.promises.unlink(tmpPath).catch(() => {})
            resolve({ success: true, outputPath })
          })
          .on('error', (err) => {
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
      .on('error', (err) => {
        log.error('MP4 conversion failed:', err.message)
        resolve({ success: false, outputPath: '', error: err.message })
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
  return new Promise((resolve) => {
    ffmpeg(inputPath)
      .outputOptions([
        '-c:v', 'libx264',
        '-preset', 'ultrafast',
        '-crf', '18',
        '-threads', String(NUM_THREADS),
        '-vf', `crop=${w}:${h}:${cx}:${cy},format=yuv420p`,
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
        resolve({ success: true, outputPath })
      })
      .on('error', (err) => {
        log.error('Crop failed:', err.message)
        resolve({ success: false, outputPath: '', error: err.message })
      })
      .run()
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

    // Step 1: Remux each webm to mp4 to fix duration metadata
    const remuxedPaths: string[] = []
    let remuxDone = 0
    const totalInputs = inputs.length

    for (let i = 0; i < totalInputs; i++) {
      const remuxedPath = inputs[i].filePath.replace(/\.webm$/i, '_remux.mp4')
      remuxedPaths.push(remuxedPath)

      ffmpeg(inputs[i].filePath)
        .outputOptions(['-c', 'copy'])
        .output(remuxedPath)
        .on('end', () => {
          log.info(`Merge remux ${i + 1}/${totalInputs} done`)
          remuxDone++
          if (remuxDone === totalInputs) {
            doMerge()
          }
        })
        .on('error', (err) => {
          log.error(`Merge remux ${i + 1} failed:`, err.message)
          remuxDone++
          if (remuxDone === totalInputs) {
            doMerge()
          }
        })
        .run()
    }

    function doMerge() {
      const cmd = ffmpeg()
      for (const p of remuxedPaths) {
        cmd.addInput(p)
      }

      // Build filter_complex: pad background + overlay each video at correct position
      const filters: string[] = []
      filters.push(`color=c=black:s=${cw}x${ch}[bg]`)

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

      cmd
        .complexFilter(filters)
        .outputOptions([
          '-c:v', 'libx264',
          '-preset', 'ultrafast',
          '-crf', '23',
          '-threads', String(NUM_THREADS),
          '-movflags', '+faststart',
        ])
        .output(outputPath)
        .on('start', (cmdLine) => {
          log.info('Merge ffmpeg command started')
        })
        .on('progress', (progress) => {
          onProgress?.({
            percent: Math.round((progress.percent ?? 0)),
            targetSize: progress.targetSize ?? 0,
          })
        })
        .on('end', () => {
          log.info('Merge completed successfully')
          // Clean up all temp files
          for (const inp of inputs) {
            nodeFs.promises.unlink(inp.filePath).catch(() => {})
          }
          for (const p of remuxedPaths) {
            nodeFs.promises.unlink(p).catch(() => {})
          }
          resolve({ success: true, outputPath })
        })
        .on('error', (err) => {
          log.error('Multi-screen merge failed:', err.message)
          for (const inp of inputs) {
            nodeFs.promises.unlink(inp.filePath).catch(() => {})
          }
          for (const p of remuxedPaths) {
            nodeFs.promises.unlink(p).catch(() => {})
          }
          resolve({ success: false, outputPath: '', error: err.message })
        })
        .run()
    }
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
    execFile(ffmpegBin, args1, (err1) => {
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
        nodeFs.promises.unlink(palettePath).catch(() => {})
        if (err2) {
          log.error('GIF creation failed:', err2.message)
          resolve({ success: false, outputPath: '', error: err2.message })
        } else {
          resolve({ success: true, outputPath })
        }
      })

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
  })
}
