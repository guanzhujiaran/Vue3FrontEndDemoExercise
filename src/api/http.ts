import { businessHandler } from '@/utils/businessHandler'

/**
 * hey-api 系列（fetch 客户端）的通用请求入口：所有接口都必须经过本层，
 * 由 businessHandler 统一完成「业务码判断 + 成功/错误提示」。
 *
 * SDK 生成的 *Api 函数返回 RequestResult<...>：
 *   - 成功时 r.data 为后端业务对象（responseStyle:'data' 下已是 StandardResponse.data），r.error 为空；
 *   - 失败时 r.data 为空，r.error 携带错误信息。
 * 本层先把 SDK 结果归一化成 businessHandler 约定的 { code, data, msg } 契约，
 * 再交给 businessHandler 统一处理，保证「全部用 businessHandler 处理请求」。
 */

/** 鉴权头占位（网关注入真实值），各服务共用 */
export function authHeaders(): Record<string, string> {
  return { 'x-bili-mid': '', 'x-bili-level': '' }
}

/**
 * 通用请求：把 SDK 的 RequestResult 适配为 businessHandler 的 { code, data, msg } 契约。
 * @param call    返回 RequestResult 的 SDK 调用（如 unreadSummaryApiV1MessageMsgFeedUnreadGet({...})）
 * @param fallback 业务失败 / 网络异常时返回的兜底值（保证上层不崩溃）
 */
export async function request<T>(
  call: () => Promise<{ data?: T | null; error?: unknown }>,
  fallback: T
): Promise<T> {
  const result = await businessHandler<T>(
    call().then((r) => {
      if (r.error || r.data == null) {
        // 网络/HTTP 失败：交给 businessHandler 判失败并弹错
        return { code: -1, msg: '请求失败', data: undefined }
      }
      // 成功：把业务对象包进 data 字段，code 置 0
      return { code: 0, msg: 'ok', data: r.data as T }
    }),
    { showSuccessToast: false, errorMessage: '请求失败' }
  )
  return result.success ? ((result.data as T) ?? fallback) : fallback
}
