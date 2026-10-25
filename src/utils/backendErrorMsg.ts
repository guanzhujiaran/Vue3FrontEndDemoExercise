/**
 * hey-api（fetch）客户端错误体提取工具。
 *
 * 背景：本项目 hey-api 客户端配置为 `responseStyle: 'data'` 且默认 `throwOnError: false`，
 * 非 2xx 响应（如后端审批拒绝的 HTTP 403）会直接 resolve `undefined`，
 * 后端响应体（StandardResponse：`{ code, msg, data }`）被丢弃，各调用方只能展示
 * 自己的兜底文案（典型症状：「更新失败 (code: undefined)」）。
 * 对调用显式传 `throwOnError: true` 后，客户端会把解析后的后端响应体抛出，
 * catch 中即可拿到后端 msg。
 *
 * 全项目约定：错误提示「尽量直接使用后端返回的 msg 字段」；
 * 仅当无 msg、或为后端默认 500 兜底文案（未知异常，msg 含错误ID与内部异常信息，不透出）时，
 * 才使用前端自己的文案。
 */

/** 后端默认 500（未知异常兜底）msg 前缀，见 RPA-Browser app/exceptions/handlers.py global_exception_handler */
const DEFAULT_SERVER_ERROR_MSG_PREFIX = '服务器内部错误'

/** 后端响应体契约（StandardResponse 子集） */
export interface BackendErrorBody {
  code?: number
  msg?: string
  data?: unknown
}

/**
 * 是否为后端「默认 500」兜底文案。
 * 该文案形如「服务器内部错误 (错误ID: xxx)\n<内部异常信息>」，包含调试信息，不应直接展示给用户。
 */
export function isDefaultServerErrorMsg(msg: string): boolean {
  return msg.trimStart().startsWith(DEFAULT_SERVER_ERROR_MSG_PREFIX)
}

/**
 * 从 catch 到的错误中提取「可直接展示」的后端 msg。
 *
 * 兼容两种来源：
 * - hey-api `throwOnError: true` 抛出的后端响应体 `{ code, msg, data }`；
 * - axios 风格错误 `error.response.data = { code, msg }`。
 *
 * @param error catch 到的错误
 * @returns 后端 msg；无 msg 或为默认 500 兜底文案时返回 null（调用方应使用自己的兜底文案）
 */
export function pickBackendMsg(error: unknown): string | null {
  if (!error || typeof error !== 'object') return null
  const err = error as Record<string, unknown>
  const candidates: unknown[] = [err.msg]
  const responseData = (err.response as Record<string, unknown> | undefined)?.data
  candidates.push(responseData)
  for (const candidate of candidates) {
    if (!candidate || typeof candidate !== 'object') continue
    const msg = (candidate as BackendErrorBody).msg
    if (typeof msg !== 'string') continue
    const trimmed = msg.trim()
    if (!trimmed) continue
    if (isDefaultServerErrorMsg(trimmed)) continue
    return trimmed
  }
  return null
}
