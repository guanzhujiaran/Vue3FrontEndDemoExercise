// 用户反馈接口封装：调用 be-message-service 的 /api/v1/message/push/feedback。
//
// 直接使用 hey-api 生成的 message-service SDK 函数（submitFeedbackApiV1MessagePushFeedbackPost），
// 不再手动拼 URL 发送请求。反馈只发到站长自己的推送设置，
// 通过 source 字段告知站长这条反馈来自哪个页面 / 模块。
import { PushService } from '@/api/community/hey-api'
import type { FeedbackRequest } from '@/api/community/hey-api'

export type { FeedbackRequest }

/**
 * 反馈来源渠道：各页面把自己的来源传进来，后端据此拼成
 * 「用户反馈|{source}」推送标题，站长一眼能看出反馈来自哪个页面。
 *
 * 抽奖类页面必须使用具体类型（官方抽奖 / 预约抽奖 / 充电抽奖 / 话题抽奖 /
 * 第三方抽奖），不要统一落到笼统的「抽奖数据页」。
 */
export const FEEDBACK_SOURCE = {
  OFFICIAL_LOTTERY: '官方抽奖',
  RESERVE_LOTTERY: '预约抽奖',
  CHARGE_LOTTERY: '充电抽奖',
  TOPIC_LOTTERY: '话题抽奖',
  OTHERS_LOT_DYN: '第三方抽奖',
  LOTTERY_DATA: '抽奖数据页',
  HOME: '首页',
  BILI_DYNAMIC: 'B站动态',
  GENERAL: '通用建议',
  OTHER: '其他',
} as const

export type FeedbackSource = (typeof FEEDBACK_SOURCE)[keyof typeof FEEDBACK_SOURCE]

/**
 * 联系方式最大长度（字符）。
 * 与后端 app/models/push.py 的 FEEDBACK_CONTACT_MAX_LENGTH 保持一致，
 * 前端只做体验层拦截，后端才是最终校验。
 */
export const FEEDBACK_CONTACT_MAX_LENGTH = 100

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
  return (await PushService.submitFeedbackApiV1MessagePushFeedbackPost({
    body: req,
    throwOnError: true,
  })) as unknown as StandardFeedbackResponse
}
