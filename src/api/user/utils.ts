import { useJwtStore } from '@/stores/jwt_token'
import userApi from './user_api'

export const isLogin: () => Promise<[boolean, string]> = async () => {
  const JwtStore = useJwtStore()
  if (JwtStore.jwt) {
    const resp = await userApi.Nav()
    if (resp.code) {
      return [false, resp.msg]
    }
    return [true, '账号已登录！']
  }
  return [false, '账号未登录！']
}
