/**
 * vue-i18n 注册。
 *
 * 沿用项目自建的 `src/i18n/index.ts`（`createI18n` 实例 + 语言清单），
 * 不使用 @nuxtjs/i18n 模块 —— 现有 i18n 用法（`useI18n()` / `t()` / locale store）
 * 保持不变，迁移成本最低。
 */
import { i18n } from '@/i18n/index'

export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.vueApp.use(i18n)
})
