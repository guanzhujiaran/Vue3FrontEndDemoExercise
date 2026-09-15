import { businessHandler } from '@/utils/businessHandler'
import type { BusinessHandlerOptions } from '@/utils/businessHandler'

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
 * request 的可选配置：控制成功/失败提示行为与文案。
 *
 * 说明：
 * - 业务成功（code === 0）默认**不弹成功 toast**（静默成功），
 *   需要提示时传 `{ showSuccessToast: true, successMessage: 'xxx' }`；
 * - 业务失败 / 网络失败默认自动弹错误 toast，可通过 `showErrorToast: false`
 *   关闭，或 `errorMessage` 自定义文案；
 * - `autoHandleError: false` 时业务失败只返回结果、不弹任何错误提示，
 *   由调用方自行处理（配合 `showErrorToast` 一起用）。
 */
export interface RequestOptions extends BusinessHandlerOptions {}

/**
 * 通用请求：把 SDK 的 RequestResult 适配为 businessHandler 的 { code, data, msg } 契约。
 * @param call    返回 RequestResult 的 SDK 调用（如 unreadSummaryApiV1MessageMsgFeedUnreadGet({...})）
 * @param fallback 业务失败 / 网络异常时返回的兜底值（保证上层不崩溃）
 * @param options 可选配置：是否提示成功/失败、自定义文案（透传给 businessHandler）
 */
export async function request<T>(
  call: () => Promise<unknown>,
  fallback: T,
  options: RequestOptions = {}
): Promise<T> {
  const result = await businessHandler<T>(
    call().then((r) => {
      const rr = r as {
        data?: any
        code?: number | string
        msg?: string
        error?: unknown
        __http_status?: number
        __server_error?: boolean
      } | null
      // SDK 为 responseStyle: 'data' 风格：
      //  - HTTP 200 且解析成功 → resolve 后端响应体（StandardResponse 或网关 {code,msg,ttl}）
      //  - HTTP 错误（如 500）→ resolve undefined（拿不到状态码，undefined 即代表
      //    HTTP/服务器层失败）
      if (!rr) {
        return { code: -1, msg: options.errorMessage || '服务器出错，请稍后重试', data: undefined }
      }
      // fields 风格兜底（本项目为 data 风格，理论上不会走到）：r 为 {error,...} 表示失败
      if (rr.error || rr.__server_error || (rr.__http_status ?? 0) >= 500) {
        return { code: -1, msg: options.errorMessage || '服务器出错，请稍后重试', data: undefined }
      }
      // data 风格下 rr 即后端响应体本身（{code, msg, data?, ttl?}）。
      // 优先按业务码识别：有 code 字段（含业务失败，如 -101 未登录 / 400 参数错误）
      // → 原样透传业务码与后端 msg，绝不归并为「服务器出错」；
      // 无 code 字段 → 纯业务对象，视为成功。
      const code = typeof rr.code === 'number' ? rr.code : 0
      if (code !== 0) {
        return { code, msg: rr.msg || '请求失败', data: rr.data }
      }
      return { code: 0, msg: rr.msg || 'ok', data: rr.data }
    }),
    {
      showSuccessToast: false, // 默认静默成功；需要提示时由调用方传 options.showSuccessToast
      showErrorToast: true,
      autoHandleError: true,
      ...options,
    }
  )
  return result.success ? ((result.data as T) ?? fallback) : fallback
}

/**
 * 通用请求（只关心「成功与否」的写操作 / 无返回体接口）。
 *
 * 背景：`request()` 的契约是「返回数据」（失败返回 fallback）。对没有业务返回体的写接口
 * （如审核提交，成功时 `data` 也是空），成功与失败的返回值无法区分，调用方会把失败当成功。
 * 本函数直接返回 `businessHandler` 的成功标志（业务码 === 0 且网络层成功），
 * 便于 `if (!ok) return` 判定；错误提示仍由 businessHandler 统一处理。
 *
 * @param call    返回 SDK 调用结果的函数（如 () => SomeService.someAction({...})）
 * @param options 可选配置：提示文案、是否自动弹错误（透传给 businessHandler）
 */
export async function requestOk(
  call: () => Promise<unknown>,
  options: RequestOptions = {}
): Promise<boolean> {
  const result = await businessHandler<unknown>(
    // SDK 的 RequestResult 与 businessHandler 的响应契约结构一致（{ code, msg, data }），
    // 这里只需要「成功标志」，故按契约做结构断言（与 request() 内部的处理方式一致）
    call() as Promise<{ code: number; data?: unknown; msg?: string }>,
    {
      showSuccessToast: false,
      showErrorToast: true,
      autoHandleError: true,
      ...options,
    }
  )
  return result.success
}
