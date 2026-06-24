import { AXIOS_CONFIG } from '@/utils/Const/axionsConstans'
import type { CreateClientConfig } from './hey-api/client.gen'
import { useJwtStore } from '@/stores/jwt_token'
import { useUserNavStore } from '@/stores/user_nav'

export const createClientConfig: CreateClientConfig = (config) => ({
  ...config,
  ...AXIOS_CONFIG,
  baseUrl: '',
  timeout: 30000,
  responseStyle: 'data',
  onRequest: ({ options }) => {
    const jwtStore = useJwtStore()
    const token = jwtStore.jwt
    if (token) {
      options.headers.set('Authorization', `Bearer ${token}`)
    }
    const userNavStore = useUserNavStore()
    const userInfo = userNavStore.user_nav
    if (userInfo && userInfo.uid) {
      options.headers.set('x-bili-mid', userInfo.uid)
      options.headers.set('x-bili-level', String(userInfo.level_info?.current_level || '0'))
    }
  }
})