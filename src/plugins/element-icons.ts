/**
 * Element Plus 图标全局注册（对应原 createApp.ts 的循环注册）。
 *
 * 模板里大量直接写 `<el-icon><Search /></el-icon>` 这类用法，依赖全局注册；
 * 两端都注册，保证 SSR 输出的 HTML 里图标同样渲染出来。
 */
import * as ElementPlusIconsVue from '@element-plus/icons-vue'

export default defineNuxtPlugin((nuxtApp) => {
  for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
    nuxtApp.vueApp.component(key, component)
  }
})
