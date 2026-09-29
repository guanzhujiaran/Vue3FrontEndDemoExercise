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
    /**
     * 当前语言。
     *
     * 初值固定 `zh-CN`（与服务端渲染一致），**不能**在首帧调用 `detectLocale()`：
     * 服务端没有 navigator、客户端有，中文静态 HTML 与英文浏览器首帧会渲染成
     * 不同文案（实测「首页」vs「Home」）→ hydration mismatch。
     * 浏览器语言在客户端挂载后由 `applyBrowserLocale()` 应用。
     */
    const locale = ref<SupportedLocale>('zh-CN')
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

    /**
     * 按浏览器语言切换（**只能在客户端挂载之后调用**）。
     * 用户已显式选过语言（persist 里有记录）时不覆盖其选择。
     */
    const applyBrowserLocale = () => {
      if (typeof localStorage === 'undefined') return
      if (localStorage.getItem('locale-store')) return
      const detected = detectLocale()
      if (detected !== locale.value) setLocale(detected)
    }

    return { locale, elLocale, acceptLanguage, setLocale, init, applyBrowserLocale }
  },
  {
    persist: {
      key: 'locale-store',
      storage: localStorage
    }
  }
)
