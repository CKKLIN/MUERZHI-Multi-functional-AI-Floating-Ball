import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import './style.css'
import { initI18n } from './stores/i18n'
import { vTip } from './utils/tip'
import { installElectronApiBridge } from './api/bridge'

// Tauri 环境：先注入 electronAPI 兼容桥再挂载（Electron 下 preload 已提供同名 API）
// 检测方式：Electron preload 暴露 electronAPI 且有 ipcRenderer；WebView2 无
if (typeof window !== 'undefined' && !(window as any).electronAPI) {
  installElectronApiBridge()
}

const app = createApp(App)
app.use(createPinia())
app.use(router)
// 统一悬浮提示：v-tip 指令替代原生 title（样式可控 + 滚动容器内不裁剪）
app.directive('tip', vTip)
// 先拉齐语言 bundle 再挂载，避免模板先以 key 闪一下再翻译
initI18n().finally(() => app.mount('#app'))
