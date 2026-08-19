// logo.ts —— 应用 logo 内嵌为 dataURL 的共享辅助
// 多个自绘窗口（提醒弹窗、贴屏便签等）走 data: URL 无法引用 /logo.png，统一从这里拿 base64。
import { nativeImage } from 'electron'
import nodeFs from 'node:fs'
import { join } from 'node:path'

// 按 size 分 key 缓存：不同窗口要不同分辨率（提醒 32 / 便签 28 / 悬浮球 48），首个调用不能锁死一个尺寸
const logoCache = new Map<number, string>()

export function getLogoDataUrl(size = 32): string {
  const hit = logoCache.get(size)
  if (hit) return hit
  try {
    const paths = [
      join(__dirname, '..', '..', 'public', 'logo.png'),
      join(__dirname, '..', 'public', 'logo.png'),
      join(__dirname, '..', '..', 'resources', 'logo.png'),
    ]
    for (const p of paths) {
      if (nodeFs.existsSync(p)) {
        const img = nativeImage.createFromPath(p).resize({ width: size, height: size, quality: 'good' })
        const url = img.toDataURL()
        logoCache.set(size, url)
        return url
      }
    }
  } catch {}
  return ''
}
