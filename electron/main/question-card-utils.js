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

module.exports = { resolveQuestionList, toQuestionItem, buttonLabel, progressText }