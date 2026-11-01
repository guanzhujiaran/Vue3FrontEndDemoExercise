import { 工作流管理Service } from '@/api/browser/hey-api'
import { businessHandler, type BusinessHandlerResult } from '@/utils/businessHandler'

/**
 * 工作流「已处理资源记录」接口封装（RPA-Browser `/workflows/resources/list`）。
 *
 * 数据来源是执行期 `mark_resource_result` 写入的 WorkflowResourceRecord：
 * `id` 是记录主键，`resource_id` 是业务主键（动态ID / 预约ID 等）。
 * 接口函数取自生成的 `services/工作流管理Service.gen.ts`，不手改生成产物。
 *
 * 说明：请求体统一按 `Record<string, unknown>` 组装后再交给生成函数，
 * 这样后端新增筛选字段（业务主键 / 运行 / 处理次数 / 时间区间）时，
 * 前端不会因为本地 SDK 尚未重新生成而编译失败。
 */

/** 已处理资源记录项（生成类型的 items 为 unknown，这里本地建模） */
export interface WorkflowResourceRecordItem {
  /** 记录主键（自增） */
  id: number
  workflow_id: number
  browser_id: number
  /** 资源类型命名空间（如 bili_lottery_official） */
  resource_type: string
  /** 业务主键 */
  resource_id: string
  status: string
  process_count: number
  fail_reason: string | null
  /** 执行批次ID（工作流运行场景 = run_id，与操作日志 execution_id 同名同值） */
  execution_id: string | null
  extra: Record<string, unknown> | null
  first_processed_at: string | null
  last_processed_at: string | null
}

export interface WorkflowResourceRecordQuery {
  workflow_id: number
  page?: number
  per_page?: number
  /** 资源类型（模糊/精确，后端按等于处理） */
  resource_type?: string
  /** 处理状态：success / skipped / failed */
  status?: string
  browser_id?: number
  /** 业务主键（模糊） */
  resource_id?: string
  /** 执行批次ID（精确；= 该次运行的 run_id） */
  execution_id?: string
  /** 处理次数下限 */
  process_count_min?: number
  /** 处理次数上限 */
  process_count_max?: number
  /** 最近处理时间起始（ISO） */
  processed_from?: string
  /** 最近处理时间截止（ISO） */
  processed_to?: string
}

export interface WorkflowResourceRecordPage {
  items: WorkflowResourceRecordItem[]
  total: number
  page: number
  per_page: number
}

/** 删除已处理资源记录的请求（除 workflow_id 外至少要给一个条件，服务端强制） */
export interface WorkflowResourceRecordDeleteQuery {
  workflow_id: number
  /** 记录主键（列表页勾选删除） */
  ids?: number[]
  /** 执行批次ID（= 该次运行的 run_id）：清理某一轮写入的记录 */
  execution_id?: string
  browser_id?: number
  resource_type?: string
  /** success / skipped / failed */
  status?: string
  /** 业务主键，精确匹配 */
  resource_id?: string
  /** true = 只统计将删除的条数（前端二次确认用） */
  dry_run?: boolean
}

export interface WorkflowResourceRecordDeleteResult {
  deleted: number
  dry_run: boolean
}

/** 分页查询某工作流的已处理资源记录（按最近处理时间倒序） */
export function listWorkflowResources(
  query: WorkflowResourceRecordQuery,
  headers: Record<string, string>
): Promise<BusinessHandlerResult<WorkflowResourceRecordPage>> {
  const payload: Record<string, unknown> = {
    workflow_id: query.workflow_id,
    page: query.page ?? 1,
    per_page: query.per_page ?? 20,
  }
  const optionalKeys = [
    'resource_type',
    'status',
    'browser_id',
    'resource_id',
    'execution_id',
    'process_count_min',
    'process_count_max',
    'processed_from',
    'processed_to',
  ] as const
  for (const key of optionalKeys) {
    const value = query[key]
    if (value !== undefined && value !== null && value !== '') {
      payload[key] = value
    }
  }

  return businessHandler<WorkflowResourceRecordPage>(
    工作流管理Service.listWorkflowResourcesApiV1RpaBrowserControlWorkflowsResourcesListPost({
      body: payload as any,
      headers,
    }) as any,
    {
      successMessage: '',
      errorMessage: '获取已处理数据失败',
      showSuccessToast: false,
    }
  )
}

/**
 * 删除已处理资源记录（删掉后这些资源会重新参与下一轮取数）。
 *
 * 约定：调用方必须先用 `dry_run: true` 预览影响面并二次确认，再真正删除。
 */
export function deleteWorkflowResources(
  query: WorkflowResourceRecordDeleteQuery,
  headers: Record<string, string>
): Promise<BusinessHandlerResult<WorkflowResourceRecordDeleteResult>> {
  const payload: Record<string, unknown> = {
    workflow_id: query.workflow_id,
  }
  const optionalKeys = [
    'ids',
    'execution_id',
    'browser_id',
    'resource_type',
    'status',
    'resource_id',
    'dry_run',
  ] as const
  for (const key of optionalKeys) {
    const value = query[key]
    if (value !== undefined && value !== null && value !== '') {
      payload[key] = value
    }
  }

  return businessHandler<WorkflowResourceRecordDeleteResult>(
    工作流管理Service.deleteWorkflowResourcesApiV1RpaBrowserControlWorkflowsResourcesDeletePost({
      body: payload as any,
      headers,
    }) as any,
    {
      successMessage: '',
      errorMessage: '清理资源记录失败',
      showSuccessToast: false,
    }
  )
}
