// local-video:// 自定义协议：让渲染层 <video> 流式播放本地视频文件，
// 支持按需读取（Range 请求用于 seek），避免把整段视频读进渲染层内存。
// 跨 dev（http://localhost）和 prod（file://）都可用，绕过同源限制。

import { protocol } from 'electron'
import { createReadStream, statSync } from 'node:fs'
import { Readable } from 'node:stream'
import { extname } from 'node:path'

const SCHEME = 'local-video'

/** 必须在 app.ready 之前调用：注册 scheme 为 privileged（支持流式/Range/cookie）。 */
export function registerLocalVideoScheme(): void {
  protocol.registerSchemesAsPrivileged([
    { scheme: SCHEME, privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true } },
  ])
}

/** 在 app.ready 之后调用：实现协议 handler，按 Range 返回文件流。 */
export function registerLocalVideoProtocol(): void {
  protocol.handle(SCHEME, (request) => {
    // URL 形如 local-video://host/C:/Users/.../x.mp4；提取 / 后的路径
    const url = new URL(request.url)
    // host 为空，pathname 以 / 开头，去掉前导 / 得到原始路径（Windows C:/...）
    let filePath = decodeURIComponent(url.pathname).replace(/^\//, '')
    // Windows 盘符前可能多一层，还原反斜杠无必要——路径用 / 即可被 fs 接受
    const range = request.headers.get('range')

    let size = 0
    try {
      size = statSync(filePath).size
    } catch {
      return new Response('File not found: ' + filePath, { status: 404 })
    }

    const ext = extname(filePath).toLowerCase()
    const mime = ext === '.mp4' ? 'video/mp4' : ext === '.webm' ? 'video/webm' : 'application/octet-stream'

    // Range 请求：返回 206 Partial Content
    if (range) {
      const m = /bytes=(\d*)-(\d*)/.exec(range)
      const start = m && m[1] ? parseInt(m[1], 10) : 0
      const end = m && m[2] ? parseInt(m[2], 10) : size - 1
      const cappedEnd = Math.min(end, size - 1)
      const stream = createReadStream(filePath, { start, end: cappedEnd })
      return new Response(Readable.toWeb(stream) as ReadableStream, {
        status: 206,
        headers: {
          'Content-Range': `bytes ${start}-${cappedEnd}/${size}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': String(cappedEnd - start + 1),
          'Content-Type': mime,
        },
      })
    }

    // 无 Range：返回完整文件流（200）
    const stream = createReadStream(filePath)
    return new Response(Readable.toWeb(stream) as ReadableStream, {
      status: 200,
      headers: {
        'Content-Length': String(size),
        'Content-Type': mime,
        'Accept-Ranges': 'bytes',
      },
    })
  })
}

/** 渲染层构造播放 URL（也供 preload 暴露）。 */
export function toLocalVideoUrl(filePath: string): string {
  // Windows: C:\Users\... → local-video:///C:/Users/...
  const normalized = filePath.replace(/\\/g, '/')
  return `${SCHEME}:///${normalized}`
}
