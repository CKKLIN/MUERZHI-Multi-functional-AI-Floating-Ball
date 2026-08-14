// todo-text.ts —— 富文本 HTML 的纯文本抽取（纯函数，可单测）
//
// 用于系统通知正文/标题：把 Quill 产出的 HTML 去掉标签，保留文本（含 img 的 alt 或占位），
// 并做空白整理。不依赖 Electron。

/** 去掉 HTML 标签与实体，返回纯文本。空/纯标签输入返回 ''。 */
export function stripHtml(html: string | null | undefined): string {
  if (!html) return ''
  // 不在 <pre> 内的换行视为普通空白（block 级空行归一为单个空格）
  let s = String(html)
    .replace(/<img[^>]*alt=["']([^"']*)["'][^>]*>/gi, (_, alt) => alt || '[图]')
    .replace(/<img[^>]*>/gi, '[图]')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<\/(p|div|h[1-6]|li|blockquote)>/gi, ' ')
    .replace(/<[^>]+>/gi, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
  return s
}
