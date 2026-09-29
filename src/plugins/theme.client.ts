/**
 * 主题初始化（对应原 createApp.ts 里挂载前的两步）。
 *
 * 必须在客户端挂载前执行，否则会出现「先按默认主题渲染、再跳成用户主题」的闪烁。
 * 服务端不执行：SSR 环境没有 localStorage / document（store 内部也有守卫）。
 */
import { useHueThemeStore } from '@/stores/hue_theme'
import { useUserPrefStore } from '@/stores/user_pref'

export default defineNuxtPlugin(() => {
  useHueThemeStore().restoreFromLocalStorage()
  useUserPrefStore().applyThemes()
})
