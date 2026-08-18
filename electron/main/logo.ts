// logo.ts —— 应用 logo 内嵌为 dataURL 的共享辅助
// 多个自绘窗口（提醒弹窗、贴屏便签等）走 data: URL 无法引用 /logo.png，统一从这里拿 base64。
import { nativeImage } from 'electron'
import nodeFs from 'node:fs'
import { join } from 'node:path'

let logoDataUrl: string | null = null

export function getLogoDataUrl(size = 32): string {
  if (logoDataUrl) return logoDataUrl
  try {
    const paths = [
      join(__dirname, '..', '..', 'public', 'logo.png'),
      join(__dirname, '..', 'public', 'logo.png'),
      join(__dirname, '..', '..', 'resources', 'logo.png'),
    ]
    for (const p of paths) {
      if (nodeFs.existsSync(p)) {
        const img = nativeImage.createFromPath(p).resize({ width: size, height: size, quality: 'good' })
        logoDataUrl = img.toDataURL()
        return logoDataUrl
      }
    }
  } catch {}
  return ''
}
