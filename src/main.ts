import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import './style.css'
import { initI18n } from './stores/i18n'
import { vTip } from './utils/tip'
import { installApiBridge } from './api/bridge'

// 先注入 window.muerzhiAPI 桥再挂载（原生页直接用 __TAURI__，渲染层统一走桥）
installApiBridge()

const app = createApp(App)
// 全局兜底：未捕获的 Promise 异常与渲染层错误也进日志文件（postMessage/文件读写等
// 异步链路抛错不会打断 UI，但没日志就无从排查）
app.config.errorHandler = (err, _instance, info) => {
  import('./log').then(({ default: log }) => {
    log.error('[Vue errorHandler]', info, err)
  })
}
window.addEventListener('unhandledrejection', (e) => {
  import('./log').then(({ default: log }) => {
    log.error('[unhandledrejection]', e.reason)
  })
})
app.use(createPinia())
app.use(router)
// 统一悬浮提示：v-tip 指令替代原生 title（样式可控 + 滚动容器内不裁剪）
app.directive('tip', vTip)
// 先拉齐语言 bundle 再挂载，避免模板先以 key 闪一下再翻译
initI18n().finally(() => app.mount('#app'))
