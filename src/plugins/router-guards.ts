/**
 * 把既有的全局路由守卫接到 Nuxt 的 router 实例上。
 *
 * 同时把该实例注入 `@/router` 的 live binding —— 项目里历史代码
 * `import router from '@/router'` 后 `router.push(...)` 的调用点会自动跟随，
 * 不需要逐个改写成 `useRouter()`。
 */
import type { Router } from 'vue-router'
import { registerRouterGuards, setAppRouter } from '@/router/index'

export default defineNuxtPlugin(() => {
  const router = useRouter()
  setAppRouter(router as unknown as Router)
  registerRouterGuards(router as unknown as Router)
})
