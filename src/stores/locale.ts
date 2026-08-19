import { defineStore } from 'pinia'
import { SUPPORTED_LOCALES, type SupportedLocale } from '@/i18n'

// Element Plus 各语言包
import zhCn from 'element-plus/es/locale/lang/zh-cn'
import en from 'element-plus/es/locale/lang/en'
import zhTw from 'element-plus/es/locale/lang/zh-tw'
import ja from 'element-plus/es/locale/lang/ja'
import ko from 'element-plus/es/locale/lang/ko'

const elLocaleMap: Record<SupportedLocale, any> = {
  'zh-CN': zhCn,
  'en': en,
  'zh-TW': zhTw,
  'ja': ja,
  'ko': ko
}

function detectLocale(): SupportedLocale {
  const nav = (typeof navigator !== 'undefined' && navigator.language) || 'zh-CN'
  const lower = nav.toLowerCase()
  if (lower.startsWith('zh')) return lower.includes('tw') || lower.includes('hk') ? 'zh-TW' : 'zh-CN'
  if (lower.startsWith('en')) return 'en'
  if (lower.startsWith('ja')) return 'ja'
  if (lower.startsWith('ko')) return 'ko'
  return 'zh-CN'
}

export const useLocaleStore = defineStore(
  'locale',
  () => {
    const locale = ref<SupportedLocale>(detectLocale())
    const elLocale = computed(() => elLocaleMap[locale.value])
    // 用于注入后端 Accept-Language 请求头（fastapi-i18n 会把 '-' 规范为 '_'，
    // 因此直接发 'zh-CN' / 'zh-TW' 等即可匹配后端 locale 目录）
    const acceptLanguage = computed(() => locale.value)

    const setLocale = (l: SupportedLocale) => {
      if (!SUPPORTED_LOCALES.includes(l)) return
      locale.value = l
      if (typeof document !== 'undefined') {
        document.documentElement.lang = l
      }
      // 同步给 vue-i18n 全局实例
      import('@/i18n').then(({ i18n }) => {
        i18n.global.locale.value = l
      })
    }

    // 初始化：从持久化恢复（已在 persist 中），同步到 i18n
    const init = () => {
      setLocale(locale.value)
    }

    return { locale, elLocale, acceptLanguage, setLocale, init }
  },
  {
    persist: {
      key: 'locale-store',
      storage: localStorage
    }
  }
)
