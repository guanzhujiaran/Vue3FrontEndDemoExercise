import { 自动化控制Service } from '@/api/browser/hey-api'
import { businessHandler, type BusinessHandlerResult } from '@/utils/businessHandler'
import type { CookieRequestHeaders } from '@/api/browser/cookie_api'
import type {
  ClearLoginStateBatchRequest,
  CookieData,
  ImportCookiesBatchRequest,
  OperationTaskCreatedResponse,
  OperationTaskStatusResponse
} from '@/api/browser/hey-api/types.gen'

/**
 * 浏览器操作任务（导入 / 清空）的提交与轮询。
 *
 * 为什么不在请求里等结果：慢站点 / 多页面时导入能跑几十秒，超过 nginx 默认 60s
 * 读超时 → 前端 504，但操作其实已生效。任务化后提交立即返回 task_id，前端轮询。
 *
 * 约定：
 * - 轮询间隔 1.5s，`success` / `failed` 后停止；
 * - 任务只存在服务端进程内存，重启后查询返回 404 → 按「任务不存在或已过期」提示，
 *   **不能当成成功**；
 * - 轮询失败不自动重试（避免把已生效的操作重复提交）。
 */

export interface CookieImportTaskOptions {
  /** 未启动的浏览器是否顺带启动（任务内逐项串行，不再受网关超时限制） */
  launchIfNotRunning?: boolean
  /** 导入后是否刷新已打开页面，默认 true（刷新在任务内部后台执行） */
  reloadPages?: boolean
}

export interface ClearLoginStateTaskOptions {
  /** 只清这些站点；空 = 全部 */
  domains?: string[]
  /** 清空后是否刷新已打开页面，默认 true */
  reloadPages?: boolean
}

export interface OperationTaskWaitOptions {
  /** 轮询间隔（毫秒），默认 1500 */
  intervalMs?: number
  /** 总超时（毫秒），默认 10 分钟 */
  timeoutMs?: number
  /** 每次拿到新状态时回调（用于更新进度条） */
  onUpdate?: (status: OperationTaskStatusResponse) => void
}

/** 提交批量导入任务（单个导入也走这里：一个 browser + 一组 cookie） */
export async function submitImportCookiesTask(
  browserIds: string[],
  cookieGroups: CookieData[][],
  headers: CookieRequestHeaders,
  options: CookieImportTaskOptions = {}
): Promise<BusinessHandlerResult<OperationTaskCreatedResponse>> {
  const body: ImportCookiesBatchRequest = {
    browser_ids: browserIds,
    cookie_groups: cookieGroups,
    launch_if_not_running: options.launchIfNotRunning ?? false,
    reload_pages: options.reloadPages ?? true
  }

  return businessHandler<OperationTaskCreatedResponse>(
    自动化控制Service.submitImportCookiesTaskApiV1RpaBrowserControlOperationTasksImportCookiesPost({
      body,
      headers
    }) as never,
    {
      successMessage: '',
      errorMessage: '提交导入任务失败',
      showSuccessToast: false,
      showErrorToast: false
    }
  )
}

/** 提交批量清空任务（单个清空也走这里：一个 browser） */
export async function submitClearLoginStateTask(
  browserIds: string[],
  headers: CookieRequestHeaders,
  options: ClearLoginStateTaskOptions = {}
): Promise<BusinessHandlerResult<OperationTaskCreatedResponse>> {
  const body: ClearLoginStateBatchRequest = {
    browser_ids: browserIds,
    reload_pages: options.reloadPages ?? true,
    ...(options.domains?.length ? { domains: options.domains } : {})
  }

  return businessHandler<OperationTaskCreatedResponse>(
    自动化控制Service.submitClearLoginStateTaskApiV1RpaBrowserControlOperationTasksClearLoginStatePost({
      body,
      headers
    }) as never,
    {
      successMessage: '',
      errorMessage: '提交清空任务失败',
      showSuccessToast: false,
      showErrorToast: false
    }
  )
}

/** 查询任务状态（单次） */
export async function getOperationTaskStatus(
  taskId: string,
  headers: CookieRequestHeaders
): Promise<BusinessHandlerResult<OperationTaskStatusResponse>> {
  return businessHandler<OperationTaskStatusResponse>(
    自动化控制Service.getOperationTaskStatusApiV1RpaBrowserControlOperationTasksStatusPost({
      body: { task_id: taskId },
      headers
    }) as never,
    {
      successMessage: '',
      errorMessage: '查询任务状态失败',
      showSuccessToast: false,
      showErrorToast: false
    }
  )
}

/**
 * 轮询任务直到 `success` / `failed`，返回最终状态。
 *
 * 查询失败（含 404 任务过期）直接抛错，由调用方提示 —— 不能把「查不到」当成功。
 */
export async function waitOperationTask(
  taskId: string,
  headers: CookieRequestHeaders,
  options: OperationTaskWaitOptions = {}
): Promise<OperationTaskStatusResponse> {
  const intervalMs = options.intervalMs ?? 1500
  const deadline = Date.now() + (options.timeoutMs ?? 10 * 60 * 1000)

  while (Date.now() < deadline) {
    const result = await getOperationTaskStatus(taskId, headers)
    if (!result.success || !result.data) {
      throw new Error(result.msg || '查询任务状态失败，请稍后重试')
    }

    options.onUpdate?.(result.data)
    if (result.data.status === 'success' || result.data.status === 'failed') {
      return result.data
    }

    await new Promise((resolve) => setTimeout(resolve, intervalMs))
  }

  throw new Error('任务执行超时，请稍后重试')
}
