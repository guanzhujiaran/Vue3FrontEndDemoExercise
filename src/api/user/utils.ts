import { useJwtStore } from '@/stores/jwt_token'
import userApi from './user_api'
import type { UserNavModel } from '@/models/user/user_model.ts'
import { useUserNavStore } from '@/stores/user_nav.ts'
import user_api from './user_api'

export const isLogin: () => Promise<[boolean, string, UserNavModel | null]> = async () => {
  const JwtStore = useJwtStore()
  const user_nav_store = useUserNavStore()
  if (JwtStore.jwt) {
    const resp = await userApi.Nav()
    if (resp.code) {
      return [false, resp.msg, resp.data]
    }
    user_nav_store.save_user_nav(resp.data)
    if (JwtStore.is_need_jwt_refresh()) {
      user_api.RefreshToken().then((_resp) => {
        if (_resp.code) return
        JwtStore.save_jwt_token(_resp.data.jwt_token)
      })
    }
    return [true, resp.msg, resp.data]
  }
  return [false, '未登录', null]
}
