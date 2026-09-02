// logo.ts —— 应用 logo 内嵌为 dataURL 的共享辅助
// 多个自绘窗口（提醒弹窗、贴屏便签等）走 data: URL 无法引用 /logo.png，统一从这里拿 base64。
import { app, nativeImage } from 'electron'
import nodeFs from 'node:fs'
import { join } from 'node:path'

// 按 size 分 key 缓存：不同窗口要不同分辨率（提醒 32 / 便签 28 / 悬浮球 48），首个调用不能锁死一个尺寸
const logoCache = new Map<number, string>()

export function getLogoDataUrl(size = 32): string {
  const hit = logoCache.get(size)
  if (hit) return hit
  try {
    // dev：项目 public/（dist-electron/main 相对上溯两级）。
    // 打包：__dirname 在 app.asar/dist-electron/main 下，上溯任何级都到不了真实 resources/，
    // 且 asar 内不含 public/ —— 必须用 process.resourcesPath（extraResources 把 logo.png 复制到那里），
    // 与 tray.ts 的取法保持一致。此前打包后三个候选全落空返回 ''，悬浮球/便签/提醒的 logo 全都不显示。
    const paths = app.isPackaged
      ? [join(process.resourcesPath, 'logo.png')]
      : [
          join(__dirname, '..', '..', 'public', 'logo.png'),
          join(__dirname, '..', 'public', 'logo.png'),
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
