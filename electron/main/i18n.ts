// electron/main/i18n.ts
// 全应用双语 i18n 层（可纯 Node 单测，零依赖）。
// 词条表 zh/en 平铺 key（点分命名空间）。主题约定：
//   只翻译「用户可见的 UI 文案」；代码注释 / 内部日志保持中文（项目习惯）。
// 切换持久化在 floating-ball-settings.json 的 locale 字段（floating-ball.ts 为真相源），
//   本模块只维护进程内当前 locale 缓存，供主进程内联 HTML 构建与渲染层 bundle 下发用。

export type Locale = 'zh' | 'en'

export function isLocale(v: unknown): v is Locale {
  return v === 'zh' || v === 'en'
}

// 每个 key 的取值：string；支持 {name} 占位（translate 做替换）
const zh: Record<string, string> = {
  // === common ===
  'common.confirm': '确认',
  'common.cancel': '取消',
  'common.ok': '确定',
  'common.close': '关闭',
  'common.loading': '加载中...',
  'common.reset': '重置',
  'common.on': '开',
  'common.off': '关',
  'common.allow': '允许',
  'common.deny': '拒绝',
  'common.alwaysAllow': '始终允许',
  'common.save': '保存',

  // === 悬浮球菜单花瓣 ===
  'ball.menu.record': '录屏',
  'ball.menu.music': '音乐',
  'ball.menu.ai': 'AI助手',
  'ball.menu.todo': '待办便签',
  'ball.menu.settings': '设置',

  // === 悬浮球设置面板 ===
  'settings.group.ball': '悬浮球',
  'settings.ball.show': '显示悬浮球',
  'settings.ball.showDesc': '关闭后悬浮球隐藏，可从托盘「显示设置窗口」重新打开',
  'settings.ball.alwaysOnTop': '始终置顶',
  'settings.ball.alwaysOnTopDesc': '关闭后悬浮球可被其他窗口遮挡',
  'settings.ball.resetPos': '重置位置',
  'settings.ball.resetPosDesc': '把悬浮球移回屏幕中心',
  'settings.group.menu': '悬浮球菜单',
  'settings.group.system': '系统',
  'settings.group.language': '语言',
  'settings.system.openAtLogin': '开机自启',
  'settings.system.openAtLoginDesc': '登录系统时自动启动本应用',
  'settings.language.label': '界面语言',
  'settings.language.desc': '切换后悬浮球、AI 岛等窗口在下次打开时生效', // 说明是 next-open 策略
  'settings.lang.zh': '简体中文',
  'settings.lang.en': 'English',

  // === AI 设置面板 ===
  'ai.title': 'AI 助手',
  'ai.hooks.install': '安装 Claude Code 钩子',
  'ai.hooks.uninstall': '卸载 Claude Code 钩子',
  'ai.hooks.status': '钩子状态',

  // === AI 岛（主进程内联 HTML） ===
  'aiIsland.idle': 'AI 待机',
  'aiIsland.thinking': 'AI 思考中',
  'aiIsland.working': 'AI 工作中',
  'aiIsland.error': 'AI 出错了',
  'aiIsland.notification': '等待审批',
  'aiIsland.done': '任务完成',
  'aiIsland.permTitle': '权限请求',
  'aiIsland.permTool': '工具',
  'aiIsland.permInput': '参数',
  'aiIsland.questionTitle': 'AI 正在提问',
  'aiIsland.prevQuestion': '上一题',
  'aiIsland.nextQuestion': '下一题',
  'aiIsland.submitAnswer': '提交答案',
  'aiIsland.know': '知道了',
  'aiIsland.otherPlaceholder': '输入其他内容…',
  'aiIsland.otherHint': '可与其他选项同时选择。',
  'aiIsland.answerInClaude': '请到 Claude Code 界面作答，这里仅作提醒。',
  'aiIsland.viewDetail': '点击查看详情',
  'aiIsland.unknown': '未知操作',
  'aiIsland.other': '其他',
  'aiIsland.progress': '第 {n}/{t} 题',

  // === 录屏主界面 ===
  'record.title': '高清录屏',
  'record.start': '开始录制',
  'record.pause': '暂停',
  'record.resume': '继续',
  'record.stop': '停止',
  'record.allScreens': '多屏录制',
  'record.selectRegion': '区域录制',

  // === 待办便签 ===
  'todo.title': '待办便签',
  'todo.add': '添加',
  'todo.placeholder': '输入待办事项...',
  'todo.empty': '暂无待办',
  'todo.memo': '便签',
  'todo.task': '待办',
}

const en: Record<string, string> = {
  // === common ===
  'common.confirm': 'Confirm',
  'common.cancel': 'Cancel',
  'common.ok': 'OK',
  'common.close': 'Close',
  'common.loading': 'Loading...',
  'common.reset': 'Reset',
  'common.on': 'On',
  'common.off': 'Off',
  'common.allow': 'Allow',
  'common.deny': 'Deny',
  'common.alwaysAllow': 'Always Allow',
  'common.save': 'Save',

  // === floating ball menu petals ===
  'ball.menu.record': 'Record',
  'ball.menu.music': 'Music',
  'ball.menu.ai': 'AI',
  'ball.menu.todo': 'Notes',
  'ball.menu.settings': 'Settings',

  // === floating ball settings panel ===
  'settings.group.ball': 'Floating Ball',
  'settings.ball.show': 'Show Floating Ball',
  'settings.ball.showDesc': 'Hidden ball can be reopened from the tray menu “Show Settings Window”',
  'settings.ball.alwaysOnTop': 'Always on Top',
  'settings.ball.alwaysOnTopDesc': 'When off, other windows may cover the ball',
  'settings.ball.resetPos': 'Reset Position',
  'settings.ball.resetPosDesc': 'Move the ball back to the center of the screen',
  'settings.group.menu': 'Ball Menu',
  'settings.group.system': 'System',
  'settings.group.language': 'Language',
  'settings.system.openAtLogin': 'Open at Login',
  'settings.system.openAtLoginDesc': 'Auto start this app when you sign in',
  'settings.language.label': 'Interface Language',
  'settings.language.desc': 'Ball, AI assistant and other windows apply on next open',
  'settings.lang.zh': '简体中文',
  'settings.lang.en': 'English',

  // === AI settings panel ===
  'ai.title': 'AI Assistant',
  'ai.hooks.install': 'Install Claude Code hooks',
  'ai.hooks.uninstall': 'Uninstall Claude Code hooks',
  'ai.hooks.status': 'Hook status',

  // === AI island (inline HTML) ===
  'aiIsland.idle': 'AI idle',
  'aiIsland.thinking': 'AI thinking',
  'aiIsland.working': 'AI working',
  'aiIsland.error': 'AI error',
  'aiIsland.notification': 'Approval needed',
  'aiIsland.done': 'Task done',
  'aiIsland.permTitle': 'Permission Request',
  'aiIsland.permTool': 'Tool',
  'aiIsland.permInput': 'Arguments',
  'aiIsland.questionTitle': 'AI is asking',
  'aiIsland.prevQuestion': 'Previous',
  'aiIsland.nextQuestion': 'Next',
  'aiIsland.submitAnswer': 'Submit',
  'aiIsland.know': 'Got it',
  'aiIsland.otherPlaceholder': 'Type other...',
  'aiIsland.otherHint': 'Can be selected together with other options.',
  'aiIsland.answerInClaude': 'Answer in the Claude Code interface; this is just a reminder.',
  'aiIsland.viewDetail': 'Click to view details',
  'aiIsland.unknown': 'Unknown action',
  'aiIsland.other': 'Other',
  'aiIsland.progress': 'Q {n}/{t}',

  // === recording main UI ===
  'record.title': 'HD Screen Recorder',
  'record.start': 'Start',
  'record.pause': 'Pause',
  'record.resume': 'Resume',
  'record.stop': 'Stop',
  'record.allScreens': 'All screens',
  'record.selectRegion': 'Select region',

  // === todo ===
  'todo.title': 'Todo Notes',
  'todo.add': 'Add',
  'todo.placeholder': 'Type a todo...',
  'todo.empty': 'No todos yet',
  'todo.memo': 'Memo',
  'todo.task': 'Task',
}

// ==== 运行时 ====

let currentLocale: Locale = 'zh'

/** 主进程内联 HTML 构建 / 启动时调用。渲染进程不直接调（走 getAppI18nBundle）。 */
export function setI18nLocale(l: Locale): void {
  currentLocale = l
}

export function getI18nLocale(): Locale {
  return currentLocale
}

/** 把 key 翻译为指定语言；缺失 key 时回退 en → zh → key 本身（防 UI 空白）。 */
export function translate(locale: Locale, key: string, params?: Record<string, string | number>): string {
  const dict = locale === 'en' ? en : zh
  let s = dict[key] ?? en[key] ?? zh[key] ?? key
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      s = s.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v))
    }
  }
  return s
}

/** 当前语言的 t()（主进程内联 HTML、渲染层 bundle 的下游都走它）。 */
export function t(key: string, params?: Record<string, string | number>): string {
  return translate(currentLocale, key, params)
}

/** 给渲染进程的完整 bundle（locale + 当前语言词条表），一次拉齐免循环 IPC。 */
export function getAppI18nBundle(): { locale: Locale; messages: Record<string, string> } {
  return { locale: currentLocale, messages: currentLocale === 'en' ? en : zh }
}

export const I18N_OF = { zh, en } as const