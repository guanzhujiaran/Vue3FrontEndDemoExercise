// 用户反馈接口封装：调用 be-message-service 的 /api/v1/message/push/feedback。
//
// 直接使用 hey-api 生成的 message-service SDK 函数（submitFeedbackApiV1MessagePushFeedbackPost），
// 不再手动拼 URL 发送请求。反馈只发到站长自己的推送设置，
// 通过 source 字段告知站长这条反馈来自哪个页面 / 模块。
import { submitFeedbackApiV1MessagePushFeedbackPost } from '@/api/notify/hey-api'
import type { FeedbackRequest } from '@/api/notify/hey-api'

export type { FeedbackRequest }

/** 与后端 StandardResponse 同构的统一响应 */
export interface StandardFeedbackResponse {
  code: number
  msg?: string
  data?: {
    success?: boolean
    message?: string
  } | null
}

/** 提交用户反馈：仅推送给站长自己的推送设置，并标注来源渠道。 */
export async function submitFeedback(req: FeedbackRequest): Promise<StandardFeedbackResponse> {
  // throwOnError: true 让 SDK 在 HTTP 错误时抛异常，沿用原有 try/catch 错误处理逻辑；
  // responseStyle: 'data' 下函数直接返回 StandardResponse 响应体（含 code / msg / data）。
  return (await submitFeedbackApiV1MessagePushFeedbackPost({
    body: req,
    throwOnError: true,
  })) as StandardFeedbackResponse
}
