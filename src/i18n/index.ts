import { createI18n } from 'vue-i18n'
import { common } from './modules/common'
import { generated, userNs, changelogNs, lotteryNs, callbackNs, samsNs, messageNs, rpaNs } from './modules/generated'
import { navNs } from './modules/nav'
import { userSearchNs } from './modules/userSearch'

// 支持的语言列表
export const SUPPORTED_LOCALES = ['zh-CN', 'en', 'zh-TW', 'ja', 'ko'] as const
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number]

/**
 * 初始语言（**必须两端一致**，故固定为站点默认语言）。
 *
 * 为什么不能在这里按 `navigator.language` 取值：
 * SSR 时没有 navigator（回落 zh-CN），客户端有（英文浏览器得到 en）——
 * 中文站点的静态 HTML 与英文浏览器首帧就会渲染出不同文案
 * （实测首页导航：服务端 `首页` vs 客户端 `Home`），直接触发
 * `Hydration text content mismatch`。
 *
 * 真实语言偏好由 `localeStore` 在**客户端挂载后**切换（见 src/stores/locale.ts），
 * 属于挂载后的正常更新，不参与水合对比。
 */
function detectLocale(): SupportedLocale {
  return 'zh-CN'
}

// 当前语言（由 locale store 在运行时统一设置，这里给默认值）
const initialLocale: SupportedLocale = detectLocale()

export const i18n = createI18n({
  legacy: false,
  locale: initialLocale,
  fallbackLocale: 'zh-CN',
  missingWarn: false,
  fallbackWarn: false,
  messages: {
    'zh-CN': { common: common['zh-CN'], ...generated['zh-CN'], user: userNs['zh-CN'], changelog: changelogNs['zh-CN'], lottery: lotteryNs['zh-CN'], callback: callbackNs['zh-CN'], sams: samsNs['zh-CN'], message: messageNs['zh-CN'], rpa: rpaNs['zh-CN'], nav: navNs['zh-CN'], userSearch: userSearchNs['zh-CN'] },
    'en': { common: common['en'], ...generated['en'], user: userNs['en'], changelog: changelogNs['en'], lottery: lotteryNs['en'], callback: callbackNs['en'], sams: samsNs['en'], message: messageNs['en'], rpa: rpaNs['en'], nav: navNs['en'], userSearch: userSearchNs['en'] },
    'zh-TW': { common: common['zh-TW'], ...generated['zh-TW'], user: userNs['zh-TW'], changelog: changelogNs['zh-TW'], lottery: lotteryNs['zh-TW'], callback: callbackNs['zh-TW'], sams: samsNs['zh-TW'], message: messageNs['zh-TW'], rpa: rpaNs['zh-TW'], nav: navNs['zh-TW'], userSearch: userSearchNs['zh-TW'] },
    'ja': { common: common['ja'], ...generated['ja'], user: userNs['ja'], changelog: changelogNs['ja'], lottery: lotteryNs['ja'], callback: callbackNs['ja'], sams: samsNs['ja'], message: messageNs['ja'], rpa: rpaNs['ja'], nav: navNs['ja'], userSearch: userSearchNs['ja'] },
    'ko': { common: common['ko'], ...generated['ko'], user: userNs['ko'], changelog: changelogNs['ko'], lottery: lotteryNs['ko'], callback: callbackNs['ko'], sams: samsNs['ko'], message: messageNs['ko'], rpa: rpaNs['ko'], nav: navNs['ko'], userSearch: userSearchNs['ko'] }
  }
})

export default i18n
