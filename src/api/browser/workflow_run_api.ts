import { 工作流管理Service, type WorkflowRunLogDetailResponse } from '@/api/browser/hey-api'
import { businessHandler, type BusinessHandlerResult } from '@/utils/businessHandler'

/**
 * 工作流运行进度 / 断点恢复接口封装（RPA-Browser `/workflows/runs/*`）。
 *
 * 进度走 SSE 长连接：首帧为快照（等价一次 `runs/get`），之后步骤边界与循环轮次
 * 变更即时推送，终态帧下发后服务端主动关闭连接。
 * 接口函数一律取自生成的 `services/工作流管理Service.gen.ts`，不手改生成产物。
 */

/** 终态：到达后不再期待后续进度帧 */
export const TERMINAL_RUN_STATUS = ['success', 'failed', 'interrupted', 'cancelled'] as const

export type TerminalRunStatus = (typeof TERMINAL_RUN_STATUS)[number]

export const isTerminalRunStatus = (status: string): boolean =>
  (TERMINAL_RUN_STATUS as readonly string[]).includes(status)

/**
 * 运行进度快照（对应后端 `WorkflowRunProgressData`）。
 *
 * SSE 响应未在 OpenAPI 中声明 schema（生成类型为 unknown），因此在此本地建模；
 * 时间字段均为**秒级时间戳**（后端统一口径，非 ISO 字符串）。
 */
export interface WorkflowRunProgress {
  run_id: string
  workflow_id: number
  workflow_name: string
  status: string
  trigger_source: string
  browser_id: number
  started_at: number
  updated_at: number
  finished_at: number | null
  duration_ms: number
  total_steps: number
  completed_steps: number
  current_step_index: number
  current_step_name: string
  success_count: number
  failed_count: number
  /** 当前最外层循环的动作ID/名称（不在循环内时为空串） */
  loop_action_name: string
  /** 当前循环已完成的轮次（1 基；不在循环内为 0） */
  loop_index: number
  /** 当前循环总轮次（未知时为 0，配合 loop_total_known 判断） */
  loop_total: number
  /** 循环总轮次是否可预知（while/until 等条件循环为 false） */
  loop_total_known: boolean
  /** 本轮循环体内已完成动作数（第二条进度条） */
  loop_body_completed: number
  /** 本轮循环体动作总数；0 = 非循环体/未知 */
  loop_body_total: number
  /** 本轮循环体内当前正在执行的动作名 */
  loop_body_step_name: string
  resume_of: string | null
  resume_count: number
  error_message: string | null
}

/**
 * 运行消息（步骤级明细，对应后端 `WorkflowRunLogEvent`）。
 *
 * 与进度快照是**增量**关系：每条只描述一个事件（步骤开始/结束、循环轮次、运行结束）。
 */
export interface WorkflowRunLogEvent {
  run_id: string
  /** 运行内自增序号：前端据此去重、断线补齐 */
  seq: number
  /** 秒级时间戳 */
  ts: number
  kind: 'step_started' | 'step_finished' | 'loop_iteration' | 'loop_finished' | 'run_finished' | string
  /** 展示级别：info / success / warn / error */
  level: string
  /** 后端拼好的可读文案，直接展示即可 */
  text: string
  /**
   * 步骤返回内容明细（step_finished / body_step_finished 携带动作的返回数据，
   * 如 fetch_external_data 的接口响应）；打印不落库，默认不裁剪；无内容时为 null。
   */
  detail: string | null
  action_id: string
  action_name: string
  step_index: number | null
  total_steps: number
  success: boolean | null
  duration_ms: number | null
  error: string | null
  loop_index: number
  loop_total: number
  /**
   * 嵌套层级：0=顶层步骤消息；1=最外层循环体内；2=再内一层……
   * 打印是全量的（含嵌套循环），前端据此逐级缩进/嵌套展示。
   */
  depth: number
}

/** 请求头（与 `useUserNavStore().user_header` 对齐） */
export type WorkflowRequestHeaders = Record<string, string>

export interface RunProgressSubscriptionHandlers {
  /** 每收到一帧进度（含首帧快照）回调一次 */
  onProgress: (progress: WorkflowRunProgress) => void
  /** 每收到一条运行消息（步骤级明细）回调一次 */
  onLogEvent?: (event: WorkflowRunLogEvent) => void
  /** 连接异常（仅诊断用；内部已自动回退轮询，调用方通常无需处理） */
  onError?: (error: unknown) => void
}

/** 运行时校验：SSE 帧必须是带 run_id 的对象，避免脏帧污染视图 */
function toProgress(raw: unknown): WorkflowRunProgress | null {
  if (!raw || typeof raw !== 'object') return null
  const candidate = raw as Partial<WorkflowRunProgress>
  if (typeof candidate.run_id !== 'string' || !candidate.run_id) return null
  // 运行消息没有 status，靠 kind/seq 区分，避免误当成进度快照
  if (typeof candidate.status !== 'string') return null
  return candidate as WorkflowRunProgress
}

/** 运行时校验：运行消息（kind + seq + text） */
function toLogEvent(raw: unknown): WorkflowRunLogEvent | null {
  if (!raw || typeof raw !== 'object') return null
  const candidate = raw as Partial<WorkflowRunLogEvent>
  if (typeof candidate.run_id !== 'string' || !candidate.run_id) return null
  if (typeof candidate.seq !== 'number' || typeof candidate.kind !== 'string') return null
  return candidate as WorkflowRunLogEvent
}

/** ISO 字符串 → 秒级时间戳（后端时间统一口径；SSE 已是秒级，这里只处理 runs/get） */
function toSeconds(value?: string | null): number {
  if (!value) return 0
  const parsed = Date.parse(value)
  return Number.isNaN(parsed) ? 0 : Math.floor(parsed / 1000)
}

/**
 * 把 `runs/get` 详情映射成与 SSE 同构的进度快照（轮询兜底用）。
 *
 * 详情接口不返回 `loop_total_known`，按「loop_total > 0 即可预知」推导。
 */
export function detailToRunProgress(
  rawDetail: WorkflowRunLogDetailResponse
): WorkflowRunProgress {
  // 后端已新增循环体进度字段，本地生成类型尚未包含（下次生成 SDK 后自动对齐）
  const detail = rawDetail as WorkflowRunLogDetailResponse & {
    loop_body_completed?: number
    loop_body_total?: number
    loop_body_step_name?: string
  }
  const loopTotal = detail.loop_total ?? 0
  const startedAt = toSeconds(detail.started_at)
  return {
    run_id: detail.run_id,
    workflow_id: Number(detail.workflow_id ?? 0),
    workflow_name: '',
    status: detail.status,
    trigger_source: detail.trigger_source,
    browser_id: Number(detail.browser_id ?? 0),
    started_at: startedAt,
    updated_at: detail.progress_updated_at ?? startedAt,
    finished_at: detail.finished_at ? toSeconds(detail.finished_at) : null,
    duration_ms: detail.duration_ms ?? 0,
    total_steps: detail.total ?? 0,
    completed_steps: detail.completed_steps ?? 0,
    current_step_index: detail.current_step_index ?? 0,
    current_step_name: detail.current_step_name ?? '',
    success_count: detail.success_count ?? 0,
    failed_count: detail.failed_count ?? 0,
    loop_action_name: detail.loop_action_name ?? '',
    loop_index: detail.loop_index ?? 0,
    loop_total: loopTotal,
    loop_total_known: loopTotal > 0,
    loop_body_completed: detail.loop_body_completed ?? 0,
    loop_body_total: detail.loop_body_total ?? 0,
    loop_body_step_name: detail.loop_body_step_name ?? '',
    resume_of: detail.resume_of ?? null,
    resume_count: detail.resume_count ?? 0,
    error_message: detail.error_message ?? null,
  }
}

/** SSE 首帧超时：超时即启用轮询兜底（代理不转发流时界面不会永久停在 00:00） */
const SSE_FIRST_FRAME_TIMEOUT = 3000
/** 轮询兜底间隔 */
const POLL_INTERVAL = 2000

/**
 * 运行刚启动时的占位快照（订阅尚未收到首帧）。
 *
 * 目的：计时从点击「立即运行」起就正常走，而不是停在 00:00；
 * 步骤/轮次等真实数据由首帧或轮询补齐。
 */
export function createPendingRunProgress(options: {
  runId: string
  workflowId: number | string
  workflowName?: string
  triggerSource?: string
  browserId?: number | string | null
}): WorkflowRunProgress {
  const nowSeconds = Math.floor(Date.now() / 1000)
  return {
    run_id: options.runId,
    workflow_id: Number(options.workflowId ?? 0),
    workflow_name: options.workflowName ?? '',
    status: 'running',
    trigger_source: options.triggerSource ?? 'manual',
    browser_id: Number(options.browserId ?? 0),
    started_at: nowSeconds,
    updated_at: nowSeconds,
    finished_at: null,
    duration_ms: 0,
    total_steps: 0,
    completed_steps: 0,
    current_step_index: 0,
    current_step_name: '',
    success_count: 0,
    failed_count: 0,
    loop_action_name: '',
    loop_index: 0,
    loop_total: 0,
    loop_total_known: true,
    loop_body_completed: 0,
    loop_body_total: 0,
    loop_body_step_name: '',
    resume_of: null,
    resume_count: 0,
    error_message: null,
  }
}

/**
 * 订阅某次运行的进度事件流。
 *
 * @returns 取消订阅函数（组件卸载 / 弹窗关闭 / 终态时必须调用，避免连接泄漏）
 */
export function subscribeWorkflowRunProgress(
  runId: string,
  headers: WorkflowRequestHeaders,
  handlers: RunProgressSubscriptionHandlers
): () => void {
  let controller: AbortController | null = null
  let closed = false
  let receivedFrame = false
  let pollErrorLogged = false
  let pollTimer: ReturnType<typeof setInterval> | null = null
  let firstFrameTimer: ReturnType<typeof setTimeout> | null = null
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null

  const stopPolling = () => {
    if (pollTimer !== null) {
      clearInterval(pollTimer)
      pollTimer = null
    }
  }

  const stopFirstFrameTimer = () => {
    if (firstFrameTimer !== null) {
      clearTimeout(firstFrameTimer)
      firstFrameTimer = null
    }
  }

  const close = () => {
    if (closed) return
    closed = true
    stopPolling()
    stopFirstFrameTimer()
    if (reconnectTimer !== null) {
      clearTimeout(reconnectTimer)
      reconnectTimer = null
    }
    controller?.abort()
  }

  /** SSE 有任意帧到达即视为连接健康（可停止首帧超时与轮询兜底） */
  const markSseAlive = () => {
    receivedFrame = true
    stopFirstFrameTimer()
    stopPolling()
  }

  /** 统一入口：SSE 帧与轮询结果都走这里，保证「有帧即停兜底」与终态关闭 */
  const handleFrame = (progress: WorkflowRunProgress) => {
    if (closed) return
    markSseAlive()
    handlers.onProgress(progress)
    if (isTerminalRunStatus(progress.status)) close()
  }

  const pollOnce = async () => {
    if (closed) return
    const result = await businessHandler<WorkflowRunLogDetailResponse>(
      工作流管理Service.getWorkflowRunApiV1RpaBrowserControlWorkflowsRunsGetPost({
        body: { run_id: runId },
        headers,
      }) as any,
      {
        successMessage: '',
        errorMessage: '获取运行进度失败',
        showSuccessToast: false,
        showErrorToast: false,
        autoHandleError: false,
      }
    )
    if (!result.success || !result.data) {
      if (!pollErrorLogged) {
        pollErrorLogged = true
        console.warn('[workflow-progress] 轮询运行进度失败:', result.msg)
      }
      return
    }
    handleFrame(detailToRunProgress(result.data))
  }

  const startPolling = () => {
    if (closed || pollTimer !== null) return
    // 立即拉一次，避免首帧超时后再等一个周期
    void pollOnce()
    pollTimer = setInterval(() => void pollOnce(), POLL_INTERVAL)
  }

  // SSE 迟迟没有首帧（代理缓冲 / 流被拦截）时启用轮询兜底
  firstFrameTimer = setTimeout(() => {
    if (!receivedFrame && !closed) startPolling()
  }, SSE_FIRST_FRAME_TIMEOUT)

  /**
   * 建立一次 SSE 连接。
   *
   * 关键：流「正常结束」也必须视为断线——网关 / 反向代理超时会直接关闭连接，
   * SDK 不抛错、for-await 正常退出。此时若不做处理，界面会永远停在最后一帧
   * （表现为「正在准备执行环境… + 超过 3 分钟未更新」，但后端其实仍在跑）。
   */
  const connect = async () => {
    if (closed) return
    controller = new AbortController()
    try {
      const { stream } = await 工作流管理Service.workflowRunEventsApiV1RpaBrowserControlWorkflowsRunsEventsGet({
        query: { run_id: runId },
        headers,
        signal: controller.signal,
        // SDK 内部最多重试 2 次；更长的中断交由下方兜底
        sseMaxRetryAttempts: 2,
        sseDefaultRetryDelay: 1500,
      })

      for await (const raw of stream) {
        if (closed) break
        // 同一连接两种事件：运行消息（增量）与进度快照（全量）
        const logEvent = toLogEvent(raw)
        if (logEvent) {
          markSseAlive()
          handlers.onLogEvent?.(logEvent)
          continue
        }
        const progress = toProgress(raw)
        if (!progress) continue
        handleFrame(progress)
      }
    } catch (error) {
      if (!closed) {
        console.warn('[workflow-progress] SSE 连接中断，回退轮询:', error)
      }
    }

    // 连接结束但运行未到终态（close 会置 closed）：轮询保底 + 5s 后重连
    if (closed) return
    startPolling()
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null
      void connect()
    }, 5000)
  }

  void connect()

  return close
}

export interface ResumeWorkflowRunResult {
  run_id: string
  resume_of: string
  status: string
}

/**
 * 继续运行一条被中断的运行（断点恢复）。
 *
 * 后端为「至少一次」语义：从检查点之后继续，当前步骤重跑；循环内已处理资源由
 * 处理记录去重跳过。同一浏览器已有运行时会返回业务错误。
 */
export function resumeWorkflowRun(
  runId: string,
  headers: WorkflowRequestHeaders
): Promise<BusinessHandlerResult<ResumeWorkflowRunResult>> {
  return businessHandler<ResumeWorkflowRunResult>(
    工作流管理Service.resumeWorkflowRunApiV1RpaBrowserControlWorkflowsRunsResumePost({
      body: { run_id: runId },
      headers,
      // 失败走非 2xx 响应（如 execute 审批拒绝 403），开启 throwOnError
      // 让 businessHandler 直接展示后端 msg
      throwOnError: true,
    }) as any,
    { successMessage: '已从断点继续运行', errorMessage: '继续运行失败' }
  )
}
