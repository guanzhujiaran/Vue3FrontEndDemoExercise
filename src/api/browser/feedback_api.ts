import { client } from '@/api/browser/hey-api/client.gen'
import { authHeaders } from '@/api/http'
import { businessHandler, type BusinessHandlerResult } from '@/utils/businessHandler'

/**
 * RPA「提交报错 / 反馈」接口封装（RPA-Browser `/browser/feedback/submit|list`）。
 *
 * 与后端 app/controller/v1/browser/feedback_router.py 对应，同一条接口既给前端普通用户用、
 * 也通过 MCP 暴露给 LLM（工具 rpa_feedback_submit / rpa_feedback_list）。
 *
 * 说明：该接口未包含在预生成的 hey-api SDK 中（SDK 不重新生成），这里用 hey-api 的
 * 通用 `client.post` 直接调用，复用其 baseUrl / 响应处理，不手改任何生成产物。
 * 请求体按扁平字段组装，字段与后端 FeedbackSubmitRequest 一一对应。
 *
 * 鉴权：提交接口**允许未登录**（后端可选登录依赖）。登录态由网关注入的请求头决定，
 * 前端 `authHeaders()` 只占位、不携带真实 mid；游客提交时后端 mid 为 null。
 */

/** 报错上下文（与后端 FeedbackContext 结构一致） */
export interface FeedbackContext {
  source?: string | null
  action_id?: string | number | null
  workflow_id?: string | number | null
  run_id?: string | null
  browser_id?: string | number | null
  error_message?: string | null
  error_detail?: string | null
  page_url?: string | null
  /** 其他补充信息（自由文本 / JSON 字符串） */
  extra?: string | null
}

/** 提交报错 / 反馈请求 */
export interface FeedbackSubmitPayload {
  /** 分类：bug(缺陷/报错) / suggestion(改进建议) / other */
  category?: string
  /** 简短标题 */
  title: string
  /** 详细描述：错误现象、期望行为、复现步骤 */
  description: string
  /** 联系方式（邮箱 / QQ 等）：未登录提交时建议填写，便于服主回访 */
  contact?: string
  /** 来源标记：mcp / web */
  source?: string
  /** 相关动作 id */
  action_id?: string | number
  /** 相关工作流 id */
  workflow_id?: string | number
  /** 相关运行记录 id */
  run_id?: string
  /** 相关浏览器 id */
  browser_id?: string | number
  /** 错误摘要 */
  error_message?: string
  /** 错误详情 / 堆栈 / 失败步骤 */
  error_detail?: string
  /** 出错时页面 URL */
  page_url?: string
  /** 其他补充信息（自由文本 / JSON 字符串） */
  extra?: string
}

/** 单条反馈项（用户侧） */
export interface FeedbackItem {
  report_id: string
  category: string
  title: string
  description: string
  context?: FeedbackContext | null
  status: string
  /** 提交时间（秒级时间戳） */
  created_at?: number | null
}

/** 提交结果 */
export interface FeedbackSubmitResult {
  report_id: string
  /** 提交者 mid（未登录提交为 null） */
  mid: string | null
  /** 提交者昵称快照（未登录为 null） */
  uname: string | null
  /** 提交时间（秒级时间戳） */
  created_at?: number | null
  /** 是否已实时推送服主（弱依赖，false 表示已落库但未发出推送） */
  notified: boolean
}

/** 列表结果 */
export interface FeedbackListResult {
  items: FeedbackItem[]
  total: number
  page: number
  per_page: number
}

/** 提交一条报错 / 反馈（落库 + 实时推送服主，未登录也可提交） */
export function submitFeedback(
  payload: FeedbackSubmitPayload
): Promise<BusinessHandlerResult<FeedbackSubmitResult>> {
  return businessHandler<FeedbackSubmitResult>(
    client.post({
      responseStyle: 'data',
      url: '/api/v1/rpa/browser/feedback/submit',
      body: payload,
      headers: authHeaders(),
    }) as any,
    {
      successMessage: '',
      errorMessage: '提交反馈失败',
      showSuccessToast: false,
    }
  )
}

/** 查询当前用户自己的反馈列表（分页；需登录） */
export function listFeedback(params: {
  page: number
  per_page: number
}): Promise<BusinessHandlerResult<FeedbackListResult>> {
  return businessHandler<FeedbackListResult>(
    client.post({
      responseStyle: 'data',
      url: '/api/v1/rpa/browser/feedback/list',
      body: params,
      headers: authHeaders(),
    }) as any,
    {
      successMessage: '',
      errorMessage: '获取反馈列表失败',
      showSuccessToast: false,
    }
  )
}
