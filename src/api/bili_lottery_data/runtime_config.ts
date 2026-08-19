import type { CreateClientConfig } from './hey-api/client.gen'
import { useJwtStore } from '@/stores/jwt_token'
import { useLocaleStore } from '@/stores/locale'

export const createClientConfig: CreateClientConfig = (config) => ({
  ...config,
  baseUrl:'',
  timeout:30000,
  responseStyle: 'data',
  onRequest: ({ options }) => {
    const JwtStore = useJwtStore()
    const token = JwtStore.jwt
    if (token) {
      options.headers.set('Authorization', `Bearer ${token}`)
    }
    // 注入当前语言，供后端 fastapi-i18n 按 Accept-Language 返回对应语言文案
    const LocaleStore = useLocaleStore()
    options.headers.set('Accept-Language', LocaleStore.acceptLanguage)
  }
})
