import type { CreateClientConfig } from './hey-api/client.gen'
import { useLocaleStore } from '@/stores/locale'

/**
 * SSR / 预渲染在 Node 里执行，没有「同源」概念：相对路径会让 fetch 直接抛
 * `Failed to parse URL`，因此服务端改用绝对地址（构建期用 `PRERENDER_API_TARGET`
 * 指向生产域名，保证预渲染产物里是线上数据）；浏览器始终走同源相对路径，
 * 由 nginx（生产）/ dev proxy（本地）转发。
 */
/**
 * SSR / 预渲染时的后端绝对地址：由构建期 `PRERENDER_API_TARGET` 静态注入（见 nuxt.config.ts）。
 * 浏览器端永远用同源相对路径（空字符串），故这里只保留服务端取值。
 */
declare const __SSR_API_TARGET__: string
const SSR_API_TARGET = typeof __SSR_API_TARGET__ === 'string' ? __SSR_API_TARGET__ : ''

export const createClientConfig: CreateClientConfig = (config) => ({
  ...config,
  baseUrl: import.meta.server ? SSR_API_TARGET : '',
  timeout: 30000,
  responseStyle: 'data',
  // JWT 已改为 HttpOnly Cookie，浏览器自动随请求携带（credentials 保证跨域也携带）
  credentials: 'include',
  onRequest: ({ options }) => {
    // 注入当前语言，供后端 fastapi-i18n 按 Accept-Language 返回对应语言文案
    const LocaleStore = useLocaleStore()
    options.headers.set('Accept-Language', LocaleStore.acceptLanguage)
  }
})
