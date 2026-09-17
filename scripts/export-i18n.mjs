// 一次性迁移脚本：从 electron/main/i18n.ts 提取 zh/en 词条 → src-tauri/i18n/{zh,en}.json
// 运行：node scripts/export-i18n.mjs（逐行解析，key/value 按引号定界，无依赖）
import { readFile, writeFile, mkdir } from 'node:fs/promises'

const text = (await readFile('electron/main/i18n.ts', 'utf8')).replace(/\r\n/g, '\n')
const SQ = "'"

// 解析一个引号定界的字符串字面量（sq=单引号），返回 [字符串值, 结束位置]
function parseString(line, i, sq) {
  i++ // 跳过开头引号
  let out = ''
  while (i < line.length) {
    const ch = line[i]
    if (ch === '\\') {
      const next = line[i + 1]
      if (sq) {
        // TS 单引号转义：\' → '，\\ → \，其余保持
        out += next === SQ || next === '\\' ? next : '\\' + next
      } else {
        out += ch + next
      }
      i += 2
      continue
    }
    if (ch === (sq ? SQ : '"')) return [out, i + 1]
    out += ch
    i++
  }
  throw new Error('字符串未闭合: ' + line)
}

function extractObject(name) {
  const re = new RegExp(`const ${name}\\s*:\\s*Record<string, string>\\s*=\\s*\\{`)
  const m = text.match(re)
  if (!m) throw new Error(`找不到 ${name} 对象`)
  const start = m.index + m[0].length
  // 找到配对的收括号（字符串感知）
  let depth = 1
  let inStr = false
  let strCh = ''
  let i = start
  while (depth > 0 && i < text.length) {
    const ch = text[i]
    if (inStr) {
      if (ch === '\\') { i += 2; continue }
      if (ch === strCh) inStr = false
    } else if (ch === SQ || ch === '"') { inStr = true; strCh = ch }
    else if (ch === '{') depth++
    else if (ch === '}') depth--
    i++
  }
  const body = text.slice(start, i - 1)

  const result = {}
  for (const rawLine of body.split('\n')) {
    const line = rawLine.trim()
    if (line === '' || line.startsWith('//')) continue
    const km = line.match(/^(['"])/)
    if (!km) continue // 跳过非词条行
    const keySq = km[1] === SQ
    let parsed
    try { parsed = parseString(line, 0, keySq) } catch { continue }
    const key = parsed[0]
    let rest = line.slice(parsed[1])
    const colon = rest.match(/^\s*:\s*/)
    if (!colon) continue
    rest = rest.slice(colon[0].length)
    const vm = rest.match(/^(['"])/)
    if (!vm) continue
    const valueSq = vm[1] === SQ
    let vParsed
    try { vParsed = parseString(rest, 0, valueSq) } catch { continue }
    result[key] = vParsed[0]
  }
  return result
}

const zh = extractObject('zh')
const en = extractObject('en')
await mkdir('src-tauri/src/i18n', { recursive: true })
await writeFile('src-tauri/src/i18n/zh.json', JSON.stringify(zh, null, 2) + '\n')
await writeFile('src-tauri/src/i18n/en.json', JSON.stringify(en, null, 2) + '\n')
console.log(`zh: ${Object.keys(zh).length} entries, en: ${Object.keys(en).length} entries`)
