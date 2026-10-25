/**
 * 工作流管理端（root 专属）接口封装。
 *
 * 后端新增的管理端工作流接口尚未进入 hey-api 生成的 SDK（需重新生成 openapi 后才会出现），
 * 故这里沿用项目既有做法——直接使用底层 `client` 以 URL 透传（同 WorkflowManagement 的 JSON 导入）。
 * 所有接口均以 root 身份访问，后端 `require_root` 强制校验。
 */
import { client } from '@/api/browser/hey-api/client.gen'
import type { BusinessResponse } from '@/utils/businessHandler'

const BASE = '/api/admin/rpa/workflow'
const JSON_HEADERS = { 'Content-Type': 'application/json' }

/** 管理端工作流列表项（附带作者 mid） */
export interface AdminWorkflowItem {
  id: number
  workflow_id: number
  /** 工作流作者 mid（后端已字符串化） */
  mid: string
  name: string
  custom_action_id: string | null
  description: string
  browser_id: number | null
  trigger_type: string
  trigger_config: Record<string, unknown> | null
  is_enabled: boolean
  is_public: boolean
  is_verified: boolean
  likes_count: number
  forks_count: number
  last_run_at: string | null
  last_run_status: string | null
  next_run_at: string | null
  created_at: string | null
  updated_at: string | null
}

export interface AdminWorkflowListResult {
  page: number
  per_page: number
  total: number
  items: AdminWorkflowItem[]
}

export interface AdminWorkflowListParams {
  page: number
  per_page: number
  name?: string
  mid?: number
  is_public?: boolean
  is_enabled?: boolean
  sort_by?: string
  sort_order?: string
}

export interface AdminWorkflowRunItem {
  id: number
  run_id: string
  workflow_id: number
  browser_id: number
  trigger_source: string
  status: string
  total: number
  success_count: number
  failed_count: number
  execution_id: string
  error_message: string | null
  duration_ms: number
  started_at: string | null
  finished_at: string | null
}

type Resp<T> = Promise<BusinessResponse<T>>

/** 全量工作流列表（跨作者，支持名称/作者/可见性/启停筛选与排序） */
export function listWorkflowsAdmin(body: AdminWorkflowListParams): Resp<AdminWorkflowListResult> {
  return client.post({
    url: `${BASE}/list`,
    body,
    headers: JSON_HEADERS
  }) as unknown as Resp<AdminWorkflowListResult>
}

/** 启用 / 停用任意工作流 */
export function setWorkflowEnabledAdmin(id: number, is_enabled: boolean): Resp<unknown> {
  return client.post({
    url: `${BASE}/set-enabled`,
    body: { id, is_enabled },
    headers: JSON_HEADERS
  }) as unknown as Resp<unknown>
}

/** 删除任意工作流 */
export function deleteWorkflowAdmin(id: number): Resp<{ message?: string }> {
  return client.post({
    url: `${BASE}/delete`,
    body: { id },
    headers: JSON_HEADERS
  }) as unknown as Resp<{ message?: string }>
}

/** 查询任意工作流的运行记录（最新在前） */
export function listWorkflowRunsAdmin(
  workflowId: number,
  page: number,
  perPage: number
): Resp<{ items: AdminWorkflowRunItem[]; total: number }> {
  return client.post({
    url: `${BASE}/runs`,
    body: { workflow_id: workflowId, page, per_page: perPage },
    headers: JSON_HEADERS
  }) as unknown as Resp<{ items: AdminWorkflowRunItem[]; total: number }>
}
