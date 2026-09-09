import { createI18n } from 'vue-i18n'
import { common } from './modules/common'
import { generated, userNs, changelogNs, lotteryNs, callbackNs, samsNs, messageNs, rpaNs } from './modules/generated'
import { navNs } from './modules/nav'
import { userSearchNs } from './modules/userSearch'

// 支持的语言列表
export const SUPPORTED_LOCALES = ['zh-CN', 'en', 'zh-TW', 'ja', 'ko'] as const
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number]

// 浏览器语言 -> 应用语言 映射
function detectLocale(): SupportedLocale {
  const nav = (typeof navigator !== 'undefined' && navigator.language) || 'zh-CN'
  const lower = nav.toLowerCase()
  if (lower.startsWith('zh')) return lower.includes('tw') || lower.includes('hk') ? 'zh-TW' : 'zh-CN'
  if (lower.startsWith('en')) return 'en'
  if (lower.startsWith('ja')) return 'ja'
  if (lower.startsWith('ko')) return 'ko'
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
