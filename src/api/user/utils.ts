import { useJwtStore } from '@/stores/jwt_token'
import userApi from './user_api'
import type { UserNavModel } from '@/models/user/user_model.ts'
import { useUserNavStore } from '@/stores/user_nav.ts'
import user_api from './user_api'
import type { ApiError } from '@/api/base_axios/error_handler.ts'

export const isLogin: () => Promise<[boolean, string, UserNavModel | null, ApiError | null]> = async () => {
  const JwtStore = useJwtStore()
  const user_nav_store = useUserNavStore()
  
  try {
    const resp = await userApi.Nav()
    
    if (resp.code !== 0) {
      return [false, resp.msg, resp.data, null]
    }
    
    user_nav_store.save_user_nav(resp.data)
    
    if (JwtStore.jwt && JwtStore.is_need_jwt_refresh()) {
      user_api.RefreshToken().then((_resp) => {
        if (_resp.code) return
        JwtStore.save_jwt_token(_resp.data.jwt_token)
      })
    }
    
    return [true, resp.msg, resp.data, null]
  } catch (error: any) {
    const apiError: ApiError = {
      code: -9999,
      msg: error?.message || '网络连接失败',
      data: null
    }
    return [false, apiError.msg, null, apiError]
  }
}
