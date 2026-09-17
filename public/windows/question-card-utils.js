// AI 岛提问卡纯逻辑 — 移植 electron/main/question-card-utils.js（零依赖）
// 供 ai-island.html 与 Rust 侧单测共用同一份语义（原 TS 版被 test-question-card-utils.mjs 覆盖）

/** 卡片（含 questions 数组或单题）→ 题目数组；无数组/空数组视为单题 */
export function resolveQuestionList(q) {
  if (q && Array.isArray(q.questions) && q.questions.length) return q.questions
  return [q]
}

/** 单题 → 渲染视图：标题取 question||header||text（全无回落「问题 N」）+ 选项（label/desc） */
export function toQuestionItem(item, idx = 0) {
  const text = (item && (item.question || item.header || item.text)) || ('问题 ' + (idx + 1))
  const options = ((item && item.options) || []).map((o) => {
    const label = typeof o === 'string' ? o : ((o && o.label) || String(o))
    const desc = o && o.description
    return { label, desc: (desc && String(desc) !== String(label)) ? String(desc) : null }
  })
  return { text, options }
}

/** 按钮文案：末题/单题 → 知道了；否则 → 下一题（本地推进，不关卡） */
export function buttonLabel(index, total) {
  return index < total - 1 ? '下一题' : '知道了'
}

/** 进度文案：多题 → 「第 X/N 题」；单题 → null */
export function progressText(index, total) {
  return total > 1 ? ('第 ' + (index + 1) + '/' + total + ' 题') : null
}

/** 题目文本 —— answers 的 key */
export function questionKey(item, idx = 0) {
  return (item && (item.question || item.header || item.text)) || ('问题 ' + (idx + 1))
}

export function multiSelectOf(item) {
  return !!(item && item.multiSelect)
}

/** 在末尾追加「其他」自由输入（仅当有选项且尚无同名项） */
export function withOther(options, otherLabel) {
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

/** 切换选项选中态；单选点新的清旧，多选可叠加；返回 {selected, isOtherPicked} */
export function toggleOption(selected, label, multiSelect, otherLabel) {
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

/** 逐题覆盖态 → Claude updatedInput.answers（单选字符串 / 多选数组 / 「其他」用自由文本） */
export function buildAnswers(questions, drafts, otherLabel) {
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
