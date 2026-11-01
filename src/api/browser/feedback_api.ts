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
 * 请求体按扁平字段组装，字段与后端 FeedbackSubmitRequest 一一对应（新增字段见 ★ 标注）。
 */

/** 提交报错 / 反馈请求（★ 为本接口新增字段） */
export interface FeedbackSubmitPayload {
  /** ★ 分类：bug(缺陷/报错) / suggestion(改进建议) / other */
  category?: string
  /** ★ 简短标题 */
  title: string
  /** ★ 详细描述：错误现象、期望行为、复现步骤 */
  description: string
  /** ★ 来源标记：mcp / web */
  source?: string
  /** ★ 相关动作 id */
  action_id?: string | number
  /** ★ 相关工作流 id */
  workflow_id?: string | number
  /** ★ 相关运行记录 id */
  run_id?: string
  /** ★ 相关浏览器 id */
  browser_id?: string | number
  /** ★ 错误摘要 */
  error_message?: string
  /** ★ 错误详情 / 堆栈 / 失败步骤 */
  error_detail?: string
  /** ★ 出错时页面 URL */
  page_url?: string
  /** ★ 其他键值对 */
  extra?: Record<string, unknown>
}

/** 单条反馈项 */
export interface FeedbackItem {
  report_id: string
  category: string
  title: string
  description: string
  context?: Record<string, unknown> | null
  status: string
  created_at?: string | null
}

/** 提交结果 */
export interface FeedbackSubmitResult {
  report_id: string
  mid: string
  created_at?: string | null
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

/** 提交一条报错 / 反馈（落库 + 实时推送服主） */
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
      successMessage: '已提交并通知服主',
      errorMessage: '提交反馈失败',
      showSuccessToast: true,
    }
  )
}

/** 查询当前用户自己的反馈列表（分页） */
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
