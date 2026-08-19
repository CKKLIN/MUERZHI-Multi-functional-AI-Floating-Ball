import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import './style.css'
import { initI18n } from './stores/i18n'

const app = createApp(App)
app.use(createPinia())
app.use(router)
// 先拉齐语言 bundle 再挂载，避免模板先以 key 闪一下再翻译
initI18n().finally(() => app.mount('#app'))
