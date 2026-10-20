// src/stores/i18n.ts
// 渲染层 i18n 单例（非 Pinia，模块级 reactive）。每个窗口启动时 initI18n() 拉一次
// 语言 bundle，并监听主进程 app-locale-changed 广播——切语言后各窗口 store 即时更新，
// 模板里调用 t() 读取 reactive 消息表，Vue 依赖追踪自动触发重渲染。
import { reactive } from 'vue'
import type { AppLocale } from '../env.d.ts'

const state = reactive<{ locale: AppLocale; messages: Record<string, string> }>({
  locale: 'zh',
  messages: {},
})

/** 翻译：渲染层主用入口（Rust 侧的翻译在 src-tauri/src/modules/i18n.rs）。缺 key 时回退显示 key 本身（防 UI 空白）。 */
export function t(key: string, params?: Record<string, string | number>): string {
  let s = state.messages[key] ?? key
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      s = s.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v))
    }
  }
  return s
}

/** 当前语言 */
export function getLocale(): AppLocale {
  return state.locale
}

/** 窗口启动时初始化（拉 bundle + 订阅广播）。不依赖 mount，挂载前 await 一次避免模板闪 key。 */
let unlistenLocaleChanged: (() => void) | null = null

export async function initI18n(): Promise<void> {
  try {
    const bundle = await window.muerzhiAPI.getAppI18n()
    if (bundle) {
      state.locale = bundle.locale
      state.messages = bundle.messages
    }
    // 模块级单例每窗口仅注册一次，unlisten 存住备 dispose（与全项目清理纪律一致）
    unlistenLocaleChanged = window.muerzhiAPI.onAppLocaleChanged((data) => {
      // 广播只带 locale；消息表以主进程为真源，变更时重新拉取 bundle
      if (data.locale && data.locale !== state.locale) {
        state.locale = data.locale
        window.muerzhiAPI.getAppI18n().then(b => { if (b) state.messages = b.messages }).catch(() => {})
      }
    })
  } catch (e) {
    console.error('[i18n] initI18n error:', e)
  }
}