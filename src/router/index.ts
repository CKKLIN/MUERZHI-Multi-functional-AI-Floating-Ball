import { createRouter, createWebHashHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'

const AiView = () => import('../views/AiView.vue')
const SettingsView = () => import('../views/SettingsView.vue')
const TodoView = () => import('../views/TodoView.vue')
const AboutView = () => import('../views/AboutView.vue')

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', name: 'home', component: HomeView },
    { path: '/ai', name: 'ai', component: AiView },
    { path: '/settings', name: 'settings', component: SettingsView },
    { path: '/todo', name: 'todo', component: TodoView },
    { path: '/about', name: 'about', component: AboutView },
  ],
})

export default router
