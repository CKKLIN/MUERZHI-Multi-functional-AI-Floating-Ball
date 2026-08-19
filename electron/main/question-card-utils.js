// electron/main/question-card-utils.js
// AI 岛提问卡「逐题推进」的纯逻辑部分（CommonJS、零依赖、不 import Electron）：
// 把 AskUserQuestion 的 questions 数组切成单题渲染决策（当前题文本、按钮文案、进度条）。
//
// 为什么是纯 JS 文件而不是 TS：
//   - AI 岛窗口用 data: URL 加载内联 HTML，nodeIntegration:true，内联 <script> 只能在运行时
//     require('electron') + require(文件路径)，拿不到 vite 打包进 index.cjs 的 TS 模块（不同窗口上下文）；
//   - 所以这份逻辑必须作为独立文件在运行时存在，走与 clawd-hook.js 完全相同的发布链路：
//     vite dev 复制到 dist-electron/main/（__dirname） + electron-builder extraResources（process.resourcesPath）。
//   - 它同时被纯 Node 单测 import（test-question-card-utils.mjs），与 hw-encoder/conversion-registry 同一测试范式。

/** 把卡片（含 questions 数组或单题）解析成题目数组；无数组/空数组视为单题（单题兜底） */
function resolveQuestionList(q) {
  if (q && Array.isArray(q.questions) && q.questions.length) return q.questions
  return [q]
}

/** 单题 → 渲染视图：标题取 question||header||text（全无回落「问题 N」）+ 选项（label/desc） */
function toQuestionItem(item, idx = 0) {
  const text = (item && (item.question || item.header || item.text)) || ('问题 ' + (idx + 1))
  const options = ((item && item.options) || []).map((o) => {
    const label = typeof o === 'string' ? o : ((o && o.label) || String(o))
    const desc = o && o.description
    return { label, desc: (desc && String(desc) !== String(label)) ? String(desc) : null }
  })
  return { text, options }
}

/** 按钮文案：末题/单题 → 知道了；否则 → 下一题（本地推进，不关卡） */
function buttonLabel(index, total) {
  return index < total - 1 ? '下一题' : '知道了'
}

/** 进度文案：多题 → 「第 X/N 题」；单题 → null（不显示进度条） */
function progressText(index, total) {
  return total > 1 ? ('第 ' + (index + 1) + '/' + total + ' 题') : null
}

// === 可作答提问：答案构建的纯逻辑（供 ai-island 内联 JS 与单测复用） ===

/** 题目文本 —— 即 answers 的 key，且与服务端 echoQuestionsFrom 的回显 key 规则一致 */
function questionKey(item, idx = 0) {
  return (item && (item.question || item.header || item.text)) || ('问题 ' + (idx + 1))
}

/** 该题是否允许多选 */
function multiSelectOf(item) {
  return !!(item && item.multiSelect)
}

/** 规范化选项列表并在末尾追加「其他」（自由输入）。仅当已有至少一个选项且尚无同名项才追加。
 *  otherLabel 可注入本地化标签（默认「其他」），保证展示/答案构建的 key 一致。 */
function withOther(options, otherLabel) {
  const other = otherLabel || '其他'
  const opts = (options || []).map((o) => ({
    label: (o && o.label != null) ? o.label : String(o),
    desc: (o && o.desc) ? o.desc : null,
    isOther: false,
  }))
  if (!opts.length) return opts
  if (opts.some((o) => o.label === other)) return opts
  opts.push({ label: other, desc: null, isOther: true })
  return opts
}

/** 切换选项选中态，返回新的 Set。
 *  单选：点新的清掉旧的，仅保留一个；再点已选的→取消。
 *  多选：再次点已选的→取消，其余可同时勾选。
 *  返回 isOtherPicked 供 UI 决定是否展开「其他」自由输入框。 */
function toggleOption(selected, label, multiSelect, otherLabel) {
  const other = otherLabel || '其他'
  const next = new Set(selected || [])
  if (multiSelect) {
    if (next.has(label)) next.delete(label)
    else next.add(label)
  } else {
    next.clear()
    if (!(selected && selected.has(label))) next.add(label)
  }
  return { selected: next, isOtherPicked: next.has(other) }
}

/** 把逐题覆盖态（selected labels + otherText）转成 Claude 的 updatedInput.answers。
 *  drafts: 每题的 { selected: Set<string>, otherText: string }。
 *  answers[key]：单选→字符串、多选→字符串数组；选「其他」且有自由文本→优先用文本（多选时数组内文本替换『其他』）；
 *  无选中→空字符串。key 为题目文本（questionKey）。 */
function buildAnswers(questions, drafts, otherLabel) {
  const other = otherLabel || '其他'
  const answers = {}
  ;(questions || []).forEach((q, i) => {
    const d = drafts && drafts[i]
    const selected = (d && d.selected) ? Array.from(d.selected) : []
    const otherText = (d && d.otherText) || ''
    const hasOther = selected.includes(other)
    const labels = selected.filter((l) => l !== other)
    const key = questionKey(q, i)

    if (multiSelectOf(q)) {
      const arr = labels.slice()
      if (hasOther) arr.push(otherText || other)
      answers[key] = arr.length ? arr : ''
    } else if (hasOther) {
      answers[key] = otherText || other
    } else if (selected.length) {
      answers[key] = selected[0]
    } else {
      answers[key] = ''
    }
  })
  return answers
}

module.exports = { resolveQuestionList, toQuestionItem, buttonLabel, progressText, questionKey, multiSelectOf, withOther, toggleOption, buildAnswers }