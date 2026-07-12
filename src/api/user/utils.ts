import { useJwtStore } from '@/stores/jwt_token'
import userApi from './user_api'
import type { UserNavModel } from '@/models/user/user_model.ts'
import { useUserNavStore } from '@/stores/user_nav.ts'
import user_api from './user_api'
import type { ApiError } from '@/api/base_axios/error_handler.ts'
import type { RootObject } from '@/models/api/base_model.ts'
import biliMessage from '@/utils/message'

export const isLogin: () => Promise<[boolean, string, UserNavModel | null, ApiError | null]> = async () => {
  const JwtStore = useJwtStore()
  const user_nav_store = useUserNavStore()
  
  try {
    const result = await userApi.Nav()

    // 网络层故障（DNS / 连接被拒 / CORS 等），根本没有 HTTP 响应
    // → 才触发网络诊断页
    if (!result.response) {
      const apiError: ApiError = {
        code: -9999,
        msg: '网络连接失败，请检查网络或后端服务',
        data: null
      }
      return [false, apiError.msg, null, apiError]
    }

    // 成功响应取 result.data，错误响应（如 401）取 result.error
    const resp = (result.data ?? result.error) as RootObject<UserNavModel> | undefined
    const status = result.response.status

    // nav 返回 -101（账号未登录）或网关注权返回 401 时，视为未登录：
    // 清空本地用户缓存（用户信息 + JWT），避免残留过期登录态，
    // 且不要跳转网络诊断页（这只是未登录，不是网络故障）
    if (resp?.code === -101 || status === 401) {
      user_nav_store.delete_user_nav()
      JwtStore.delete_jwt_token()
      return [false, resp?.msg ?? '账号未登录', null, null]
    }

    if (resp?.code !== 0) {
      // 业务失败（code 既非 0 也非 -101）：本地 JWT 已失效，清空避免残留过期登录态
      if (resp) {
        JwtStore.delete_jwt_token()
      }
      const serverMsg = resp?.msg ?? `请求失败 (${status})`
      // 服务器已响应但业务失败：按 HTTP 状态码提示，不弹网络诊断页
      if (status >= 500) {
        biliMessage.error(`服务器开小差了，请稍后重试 (${status})`)
      } else if (status !== 200) {
        biliMessage.error(serverMsg)
      }
      return [false, serverMsg, (resp?.data as UserNavModel) ?? null, null]
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
    // 兜底：client 直接抛出（极端网络异常等）
    const apiError: ApiError = {
      code: -9999,
      msg: error?.message || '网络连接失败',
      data: null
    }
    return [false, apiError.msg, null, apiError]
  }
}
