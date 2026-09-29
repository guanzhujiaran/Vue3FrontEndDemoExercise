/**
 * Nuxt 路由配置：**直接复用**既有 `src/router/index.ts` 的 928 行路由表。
 *
 * 这样迁移不需要把 70 条路由（含嵌套、动态参数、meta、懒加载）重写成 `pages/` 文件式路由，
 * 组件的 `useRoute()` / `<RouterView>` 用法也完全不变。
 *
 * 注意：路由守卫不在这里注册（`router.options` 只能配置 options），
 * 见 `src/plugins/router-guards.ts`。
 */
import type { RouterConfig } from '@nuxt/schema'
import { routes } from './router/index'

export default <RouterConfig>{
  routes: () => routes
}
