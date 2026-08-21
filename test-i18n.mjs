// i18n 层单测（纯 node，同 hw-encoder 范式）
// 运行：node --experimental-strip-types test-i18n.mjs
let failures = 0
function assert(cond, msg) {
  if (cond) { console.log('  ✓', msg) }
  else { console.error('  ✗', msg); failures++ }
}
function eq(actual, expected, msg) { assert(actual === expected, `${msg} (got ${actual}, expected ${expected})`) }

const { translate, setI18nLocale, getI18nLocale, getAppI18nBundle, isLocale } = await import('./electron/main/i18n.ts')

console.log('i18n 单测:')

// 翻译正确性
eq(translate('zh', 'ball.menu.record'), '录屏', 'zh 录屏')
eq(translate('en', 'ball.menu.record'), 'Record', 'en Record')
eq(translate('zh', 'common.allow'), '允许', 'zh 允许')
eq(translate('en', 'common.allow'), 'Allow', 'en Allow')

// 缺 key 回退：en 缺 → zh → key 本身
eq(translate('en', 'settings.language.desc'), 'Ball, AI assistant and other windows apply on next open', 'en 词条存在')
eq(translate('zh', 'settings.language.desc'), '切换后悬浮球、AI 岛等窗口在下次打开时生效', 'zh 词条存在')
eq(translate('en', 'no.such.key'), 'no.such.key', 'en 缺 key 回退 key 本身')

// 参数占位
eq(translate('zh', 'aiIsland.progress', { n: 2, t: 5 }), '第 2/5 题', 'zh 进度占位替换')
eq(translate('en', 'aiIsland.progress', { n: 2, t: 5 }), 'Q 2/5', 'en 进度占位替换')

// 运行时 locale 切换
setI18nLocale('en')
eq(getI18nLocale(), 'en', 'setI18nLocale 生效')
eq(getAppI18nBundle().locale, 'en', 'bundle locale 跟随')
eq(getAppI18nBundle().messages['ball.menu.record'], 'Record', 'bundle messages 取 en 词条')
setI18nLocale('zh')
eq(getI18nLocale(), 'zh', '切回 zh')

// isLocale 白名单
eq(isLocale('zh'), true, 'zh 合法')
eq(isLocale('en'), true, 'en 合法')
eq(isLocale('fr'), false, 'fr 非法')
eq(isLocale(undefined), false, 'undefined 非法')

if (failures === 0) { console.log('\n全部通过 ✓'); process.exit(0) }
else { console.error(`\n${failures} 个断言失败`); process.exit(1) }
