import { useJwtStore } from '@/stores/jwt_token'
import userApi from './user_api'
import type { UserNavModel } from '@/models/user/user_model.ts'

export const isLogin: () => Promise<[boolean, string, UserNavModel | null]> = async () => {
  const JwtStore = useJwtStore()
  if (JwtStore.jwt) {
    const resp = await userApi.Nav()
    if (resp.code) {
      return [false, resp.msg, resp.data]
    }
    return [true, '账号已登录！', resp.data]
  }
  return [false, '账号未登录！', null]
}
