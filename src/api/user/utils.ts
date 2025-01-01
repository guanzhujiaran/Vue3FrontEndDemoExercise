import { useJwtStore } from '@/stores/jwt_token'
import userApi from './user_api'
import type { UserNavModel } from '@/models/user/user_model.ts'
import { useUserNavStore } from '@/stores/user_nav.ts'

export const isLogin: () => Promise<[boolean, string, UserNavModel | null]> = async () => {
  const JwtStore = useJwtStore()
  const user_nav_store = useUserNavStore()
  if (JwtStore.jwt) {
    const resp = await userApi.Nav()
    if (resp.code) {
      user_nav_store.delete_user_nav()
      return [false, resp.msg, resp.data]
    }
    user_nav_store.save_user_nav(resp.data)
    return [true, resp.msg, resp.data]
  }
  user_nav_store.delete_user_nav()
  return [false, resp.msg, null]
}
