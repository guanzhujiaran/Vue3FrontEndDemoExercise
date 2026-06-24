import { AXIOS_CONFIG } from '@/utils/Const/axionsConstans'
import type { CreateClientConfig } from './hey-api/client.gen'
import { useJwtStore } from '@/stores/jwt_token'
import { useUserNavStore } from '@/stores/user_nav'

export const createClientConfig: CreateClientConfig = (config) => ({
  ...config,
  ...AXIOS_CONFIG,
  baseUrl:'',
  timeout:30000,
  responseStyle: 'data',
  onRequest: ({ options }) => {
    const JwtStore = useJwtStore()
    const token = JwtStore.jwt
    if (token) {
      options.headers.set('Authorization', `Bearer ${token}`)
    }
    const UserNavStore = useUserNavStore()
    const userInfo = UserNavStore.user_nav
    if (userInfo && userInfo.uid) {
      options.headers.set('x-bili-mid', userInfo.uid)
      options.headers.set('x-bili-level', String(userInfo.level_info?.current_level || '0'))
    }
  }
})
