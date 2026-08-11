// question-card-utils 单测（纯 node，无新依赖、无 loader hook）
//
// 该模块是 AI 岛提问卡「逐题推进」的纯逻辑部分：与 DOM 无关，
// 只负责把 AskUserQuestion 的 questions 数组切成单题的渲染决策
// （当前题、按钮文案、进度条文案）。DOM 侧（ai-island.ts 内联 JS）负责消费它。
//
// 运行：node --experimental-strip-types test-question-card-utils.mjs

let failures = 0
function assert(cond, msg) {
  if (cond) { console.log('  ✓', msg) }
  else { console.error('  ✗', msg); failures++ }
}
function eq(actual, expected, msg) { assert(actual === expected, `${msg} (got ${JSON.stringify(actual)}, expected ${JSON.stringify(expected)})`) }

// 纯 JS CommonJS 模块，直接 import（default = module.exports），无需类型擦除
const utils = (await import('./electron/main/question-card-utils.js')).default
const { resolveQuestionList, toQuestionItem, buttonLabel, progressText } = utils

console.log('question-card-utils 单测:')

// === resolveQuestionList：把卡片切成题目数组，告别「一次性竖排全部」 ===
eq(resolveQuestionList({ questions: ['a', 'b', 'c'] }).length, 3, '多题数组 → 原样返回')
eq(resolveQuestionList({ questions: ['a'] })[0], 'a', '单题数组 → 返回 [a]')
const fallback = {}
eq(resolveQuestionList(null).length, 1, 'null → 单题兜底 [null]')
eq(resolveQuestionList({ questions: [] }).length, 1, '空数组 → 单题兜底 [q]')
eq(resolveQuestionList({ questions: null })[0].questions, null, 'questions=null → 兜底 [q]')

// === toQuestionItem：提炼单题文本 + 选项 ===
eq(toQuestionItem({ question: '标题', options: [] }).text, '标题', '取 question')
eq(toQuestionItem({ header: 'Hdr', options: [] }).text, 'Hdr', '无 question 取 header')
eq(toQuestionItem({ text: 'Txt', options: [] }).text, 'Txt', '无 question/header 取 text')
eq(toQuestionItem({ options: [] }, 2).text, '问题 3', '全无标题回落「问题 N」（idx+1）')

const opts = toQuestionItem({ question: '选', options: ['甲', { label: '乙', description: '说明乙' }] }).options
eq(opts.length, 2, '选项数正确')
eq(opts[0].label, '甲', '字符串选项 label 原样')
eq(opts[0].desc, null, '字符串选项无 desc')
eq(opts[1].label, '乙', '对象选项取 label')
eq(opts[1].desc, '说明乙', '对象选项取 description')
eq(toQuestionItem({ question: '', options: [42] }).options[0].label, '42', '无 label 的对象/值回落 String(o)')
eq(toQuestionItem({ question: '', options: [42] }).options[0].desc, null, '无 description 的选项 desc 为 null')
eq(toQuestionItem({ question: '', options: [{ label: '同', description: '同' }] }).options[0].desc, null, 'desc 与 label 相同则不显示')

// === buttonLabel：末题才「知道了」，其余「下一题」 ===
eq(buttonLabel(0, 3), '下一题', '多题首题 → 下一题')
eq(buttonLabel(1, 3), '下一题', '多题中间 → 下一题')
eq(buttonLabel(2, 3), '知道了', '多题末题 → 知道了')
eq(buttonLabel(0, 1), '知道了', '单题 → 恒知道了')

// === progressText：多题显示进度，单题/空不显示 ===
eq(progressText(0, 3), '第 1/3 题', '多题首题进度')
eq(progressText(1, 3), '第 2/3 题', '多题中间进度')
eq(progressText(2, 3), '第 3/3 题', '多题末题进度')
eq(progressText(0, 1), null, '单题不显示进度')

if (failures === 0) { console.log('\n全部通过 ✓'); process.exit(0) }
else { console.error(`\n${failures} 个断言失败`); process.exit(1) }