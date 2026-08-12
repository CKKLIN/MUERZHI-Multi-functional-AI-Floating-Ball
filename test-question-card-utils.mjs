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
const { resolveQuestionList, toQuestionItem, buttonLabel, progressText, questionKey, multiSelectOf, withOther, toggleOption, buildAnswers } = utils

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

// 答案构建辅助
function eqSet(actual, expected, msg) { assert(JSON.stringify([...actual].sort()) === JSON.stringify([...expected].sort()), `${msg} (got ${JSON.stringify([...actual])}, expected ${JSON.stringify([...expected])})`) }
function eqArr(actual, expected, msg) { assert(JSON.stringify(actual) === JSON.stringify(expected), `${msg} (got ${JSON.stringify(actual)}, expected ${JSON.stringify(expected)})`) }

// === questionKey：answers 的 key / 与 toQuestionItem 一致的取标题规则 ===
eq(questionKey({ question: '部署方式？' }), '部署方式？', 'questionKey 取 question')
eq(questionKey({ header: 'H' }), 'H', 'questionKey 无 question 取 header')
eq(questionKey({ text: 'T' }), 'T', 'questionKey 无 question/header 取 text')
eq(questionKey({}, 1), '问题 2', 'questionKey 全无回落「问题 N」（idx+1）')

// === multiSelectOf：多选标记 ===
eq(multiSelectOf({ multiSelect: true }), true, 'multiSelect true → 多选')
eq(multiSelectOf({ multiSelect: false }), false, 'multiSelect false → 单选')
eq(multiSelectOf({}), false, '缺省 → 单选')

// === withOther：规范化选项并追加「其他」 ===
const wo = withOther([{ label: 'A', desc: 'd' }])
eq(wo.length, 2, 'withOther 追加「其他」→ 长度 +1')
eq(wo[0].isOther, false, '原选项 isOther=false')
eq(wo[1].label, '其他', '追加项 label=其他')
eq(wo[1].isOther, true, '追加项 isOther=true')
eq(withOther([]).length, 0, '空选项列表不追加「其他」')
eq(withOther(['其他', 'B']).length, 2, '已有「其他」同名项不重复追加')
eq(withOther(['A'])[0].desc, null, '字符串选项规范化后 desc=null')

// === toggleOption：单选/多选的切换规则 ===
const t1 = toggleOption(new Set(), 'A', false)
eqSet(t1.selected, ['A'], '单选首次点击 → 选中 A')
eq(t1.isOtherPicked, false, '非其他项不触发其他输入')
const t2 = toggleOption(new Set(['A']), 'B', false)
eqSet(t2.selected, ['B'], '单选点 B 清掉 A')
const t3 = toggleOption(new Set(['A']), 'A', false)
eqSet(t3.selected, [], '单选再点已选 A → 取消')
const t4 = toggleOption(new Set(['A']), 'B', true)
eqSet(t4.selected, ['A', 'B'], '多选追加 B，保留 A')
const t5 = toggleOption(new Set(['A', 'B']), 'B', true)
eqSet(t5.selected, ['A'], '多选再点 B → 取消 B')
const t6 = toggleOption(new Set(), '其他', false)
eq(t6.isOtherPicked, true, '选「其他」→ 展开自由输入')

// === buildAnswers：单选/多选/其他/文本/无选中的答案形态 ===
const singleQ = { question: '部署方式？', multiSelect: false, options: ['本地', '云端'] }
const multiQ = { question: '需要哪些功能？', multiSelect: true, options: ['功能A', '功能B'] }
const drafts = [
  { selected: new Set(['本地']), otherText: '' },
  { selected: new Set(['功能A', '功能B']), otherText: '' },
]
const b1 = buildAnswers([singleQ, multiQ], drafts)
eqArr(b1['部署方式？'], '本地', '单选 → 字符串答案')
eqArr(b1['需要哪些功能？'], ['功能A', '功能B'], '多选 → 字符串数组')
// 选「其他」空文本 → 用「其他」；有文本 → 用文本
const b2 = buildAnswers([{ question: 'Q', multiSelect: false }], [{ selected: new Set(['其他']), otherText: '' }])
eq(b2['Q'], '其他', '单选+其他无文本 → 「其他」')
const b3 = buildAnswers([{ question: 'Q', multiSelect: false }], [{ selected: new Set(['其他']), otherText: '自定内容' }])
eq(b3['Q'], '自定内容', '单选+其他有文本 → 优先文本')
const b4 = buildAnswers([{ question: 'Q', multiSelect: true }], [{ selected: new Set(['其他']), otherText: '' }])
eqArr(b4['Q'], ['其他'], '多选+其他无文本 → 数组内「其他」')
const b5 = buildAnswers([{ question: 'Q', multiSelect: true }], [{ selected: new Set(['其他']), otherText: 'X' }])
eqArr(b5['Q'], ['X'], '多选+其他有文本 → 数组内用文本替换')
const b6 = buildAnswers([{ question: 'Q', multiSelect: true, options: ['A', '其他'] }], [{ selected: new Set(['A', '其他']), otherText: 'Y' }])
eqArr(b6['Q'], ['A', 'Y'], '多选混搭：正常选项 + 其他文本')
// 无选中 → 空字符串
const b7 = buildAnswers([singleQ], [{ selected: new Set([]), otherText: '' }])
eq(b7['部署方式？'], '', '无选中 → 空字符串')
// key 回落规则与 questionKey 一致
const b8 = buildAnswers([{ multiSelect: false, options: ['A'] }], [{ selected: new Set(['A']), otherText: '' }])
eq(b8['问题 1'], 'A', '无标题题目答案 key 用「问题 N」')

if (failures === 0) { console.log('\n全部通过 ✓'); process.exit(0) }
else { console.error(`\n${failures} 个断言失败`); process.exit(1) }