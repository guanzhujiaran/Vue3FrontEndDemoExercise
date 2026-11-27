import { 浏览器会话控制Service } from '@/api/browser/hey-api'
import { businessHandler, type BusinessHandlerResult } from '@/utils/businessHandler'
import type { CookieRequestHeaders } from '@/api/browser/cookie_api'
import type { CreateSessionResponse } from '@/api/browser/hey-api/types.gen'

/**
 * 启动单个浏览器会话（幂等：已经在跑就直接返回现有会话）。
 *
 * 专门服务「批量导出前先启动未启动的浏览器」：**必须逐项独立请求**。
 * 不能把 N 个启动塞进一个批量请求 —— 每个浏览器启动要 10~30s（内存不足还会
 * 进启动队列），一个请求里串行启动必然撞网关读超时，出现「前端报失败、
 * 后端仍在启动」的不一致。逐项请求超时隔离，前端也能展示进度。
 *
 * 返回 `queued=true` 表示内存不足、启动在后台队列继续：此时读不到 cookie，
 * 调用方应提示用户稍后重试，而不是立刻去导出。
 */
export async function startBrowserSession(
  browserId: string,
  headers: CookieRequestHeaders
): Promise<BusinessHandlerResult<CreateSessionResponse>> {
  return businessHandler<CreateSessionResponse>(
    浏览器会话控制Service.createBrowserSessionApiV1RpaBrowserControlCreatePost({
      query: { browser_id: browserId },
      headers
    }) as never,
    {
      successMessage: '',
      errorMessage: '启动浏览器失败',
      showSuccessToast: false,
      showErrorToast: false
    }
  )
}
