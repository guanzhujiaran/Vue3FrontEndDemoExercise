import userApi from './user_api'
import type { UserNavModel } from '@/models/user/user_model.ts'
import { useUserNavStore } from '@/stores/user_nav.ts'
import type { ApiError } from '@/api/base_axios/error_handler.ts'
import type { RootObject } from '@/models/api/base_model.ts'
import biliMessage from '@/utils/message'

export const isLogin: () => Promise<[boolean, string, UserNavModel | null, ApiError | null]> = async () => {
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
    // 清空本地用户信息缓存（user_nav），但【保留 JWT token】——
    // nav 返回 -101 只代表"这一次请求未认证"，可能是 token 尚未保存/注入的
    // 竞态（如 Casdoor 回调页跳转瞬间、JWT 刚续期），并不代表 token 本身失效。
    // 无条件删 token 会把正常登录态误清掉（曾导致登录后立即被登出的问题）。
    // 真正失效时，后续带 token 的请求会继续 401/-101，由对应用户态兜底处理。
    if (resp?.code === -101 || status === 401) {
      user_nav_store.delete_user_nav()
      return [false, resp?.msg ?? '账号未登录', null, null]
    }

    if (resp?.code !== 0) {
      // 业务失败（code 既非 0 也非 -101）：
      // 注意 —— 网络异常（result.response 为空 / 进入 catch）不会走到这里，
      // 且这里【不要】删除 JWT token，只有响应 JSON 明确为 -101 时才清登录态，
      // 避免网络抖动/服务器偶发错误时把正常登录态误清掉。
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

    // JWT 续期已改由服务端通过 HttpOnly Cookie 下发（nav 响应不再携带 token），前端无需处理

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
