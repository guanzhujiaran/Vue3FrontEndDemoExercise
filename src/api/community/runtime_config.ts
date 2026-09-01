import type { CreateClientConfig } from './hey-api/client.gen'
import { useLocaleStore } from '@/stores/locale'
import { authHeaders } from '@/api/http'

export const createClientConfig: CreateClientConfig = (config) => ({
  ...config,
  baseUrl:'',
  timeout:30000,
  responseStyle: 'data',
  // JWT 已改为 HttpOnly Cookie，浏览器自动随请求携带（credentials 保证跨域也携带）
  credentials: 'include',
  onRequest: ({ options }) => {
    // 注入当前语言，供后端 fastapi-i18n 按 Accept-Language 返回对应语言文案
    const LocaleStore = useLocaleStore()
    options.headers.set('Accept-Language', LocaleStore.acceptLanguage)
    // 统一注入网关占位鉴权头（x-bili-mid / x-bili-level，真实值由网关注入）
    for (const [k, v] of Object.entries(authHeaders())) {
      options.headers.set(k, v)
    }
  }
})
