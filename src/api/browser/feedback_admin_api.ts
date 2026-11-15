/**
 * 报错 / 反馈管理端接口封装（RPA-Browser `/api/admin/rpa/feedback/*`，仅管理员）。
 *
 * 后端接口尚未进入 hey-api 生成的 SDK（需重新生成 openapi 后才会出现），
 * 故沿用项目既有做法——直接使用底层 `client` 以 URL 透传（同 workflowAdminApi）。
 * 鉴权由后端 `require_admin` 强制校验（root 或 be-message 判定的管理员）。
 *
 * 约定：mid 一律用**数字字符串**传递 / 接收，避免前端大整数精度问题。
 */
import { client } from '@/api/browser/hey-api/client.gen'
import type { BusinessResponse } from '@/utils/businessHandler'

const BASE = '/api/admin/rpa/feedback'
const JSON_HEADERS = { 'Content-Type': 'application/json' }

/** 反馈处理状态 */
export type AdminFeedbackStatus = 'pending' | 'resolved' | 'ignored'

/** 反馈分类 */
export type AdminFeedbackCategory = 'bug' | 'suggestion' | 'other'

/** 报错上下文（与后端 FeedbackContext 结构一致） */
export interface AdminFeedbackContext {
  source?: string | null
  action_id?: string | number | null
  workflow_id?: string | number | null
  run_id?: string | null
  browser_id?: string | number | null
  error_message?: string | null
  error_detail?: string | null
  page_url?: string | null
  extra?: string | null
}

/** 管理端反馈项（全字段） */
export interface AdminFeedbackItem {
  id: number
  report_id: string
  /** 提交者 mid（游客为 null） */
  mid: string | null
  /** 提交者昵称快照 */
  uname: string | null
  /** 联系方式（游客填写） */
  contact: string | null
  category: string
  title: string
  description: string
  context?: AdminFeedbackContext | null
  status: string
  admin_remark: string
  /** 处理人 mid */
  handled_by: number | null
  /** 处理时间（秒级时间戳） */
  handled_at: number | null
  /** 提交时间（秒级时间戳） */
  created_at: number | null
  /** 最近更新时间（秒级时间戳） */
  updated_at: number | null
}

/** 管理端反馈列表筛选参数 */
export interface AdminFeedbackListParams {
  page: number
  per_page: number
  /** 数字字符串 */
  mid?: string
  status?: AdminFeedbackStatus
  category?: AdminFeedbackCategory
  keyword?: string
  uname?: string
}

/** 管理端反馈列表结果 */
export interface AdminFeedbackListResult {
  page: number
  per_page: number
  total: number
  items: AdminFeedbackItem[]
}

/** 管理端补录请求 */
export interface AdminFeedbackCreatePayload {
  category?: AdminFeedbackCategory
  title: string
  description: string
  mid?: string
  uname?: string
  contact?: string
  status?: AdminFeedbackStatus
  admin_remark?: string
  context?: AdminFeedbackContext
}

/** 管理端更新请求（未传字段保持不变；mid 传 null 表示游客） */
export interface AdminFeedbackUpdatePayload {
  report_id: string
  category?: AdminFeedbackCategory
  title?: string
  description?: string
  mid?: string | null
  uname?: string | null
  contact?: string | null
  status?: AdminFeedbackStatus
  admin_remark?: string
  context?: AdminFeedbackContext
}

/** 批量删除结果 */
export interface AdminFeedbackDeleteResult {
  deleted: number
  report_ids: string[]
}

type Resp<T> = Promise<BusinessResponse<T>>

/** 全量反馈列表（跨提交者，含游客），支持状态 / 分类 / 提交者 / 关键词筛选 */
export function listFeedbacksAdmin(body: AdminFeedbackListParams): Resp<AdminFeedbackListResult> {
  return client.post({
    url: `${BASE}/list`,
    body,
    headers: JSON_HEADERS
  }) as unknown as Resp<AdminFeedbackListResult>
}

/** 单条反馈详情 */
export function getFeedbackAdmin(reportId: string): Resp<AdminFeedbackItem> {
  return client.post({
    url: `${BASE}/get`,
    body: { report_id: reportId },
    headers: JSON_HEADERS
  }) as unknown as Resp<AdminFeedbackItem>
}

/** 管理端手工补录一条反馈 */
export function createFeedbackAdmin(body: AdminFeedbackCreatePayload): Resp<AdminFeedbackItem> {
  return client.post({
    url: `${BASE}/create`,
    body,
    headers: JSON_HEADERS
  }) as unknown as Resp<AdminFeedbackItem>
}

/** 更新一条反馈（状态置 resolved / ignored 时后端自动记录处理人与时间） */
export function updateFeedbackAdmin(body: AdminFeedbackUpdatePayload): Resp<AdminFeedbackItem> {
  return client.post({
    url: `${BASE}/update`,
    body,
    headers: JSON_HEADERS
  }) as unknown as Resp<AdminFeedbackItem>
}

/** 删除反馈（单条 / 勾选批量共用） */
export function deleteFeedbacksAdmin(reportIds: string[]): Resp<AdminFeedbackDeleteResult> {
  return client.post({
    url: `${BASE}/delete`,
    body: { report_ids: reportIds },
    headers: JSON_HEADERS
  }) as unknown as Resp<AdminFeedbackDeleteResult>
}
