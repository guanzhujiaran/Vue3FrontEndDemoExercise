/**
 * 工作流运行结果展示口径（前端统一入口）。
 *
 * 运行不再展示「成功 / 失败」结论，只展示**可数结果**：
 * - 有资源记录（批量循环工作流）：`成功循环 N 轮`，N = `resource_success`
 *   （每轮通常处理一条资源，资源成功数即成功循环轮次）；
 * - 无资源记录（纯步骤工作流）：`成功 N 步`，N = `success_count`。
 *
 * 运行中 / 排队 / 已中断 / 已停止仍然展示状态词——它们是过程状态，不是成败结论。
 */
export interface RunDisplaySource {
  status?: string | null
  success_count?: number | null
  total_steps?: number | null
  resource_total?: number | null
  resource_success?: number | null
}

const STATE_TEXT: Record<string, string> = {
  queued: '排队中',
  running: '运行中',
  interrupted: '已中断',
  cancelled: '已停止',
}

/** 是否属于过程状态（这些状态不换算成计数） */
export function isRunStateStatus(status?: string | null): boolean {
  return !!status && status in STATE_TEXT
}

/**
 * 可数结果文案：`成功循环 N 轮` / `成功 N 步` / `成功 a/b 步`。
 *
 * 两者都为 0 时返回 `-`：迁移前的历史运行没有这份快照，不能伪造成「成功 0 步」。
 */
export function runResultText(source: RunDisplaySource): string {
  if ((source.resource_total ?? 0) > 0) {
    return `成功循环 ${source.resource_success ?? 0} 轮`
  }
  const total = source.total_steps ?? 0
  const success = source.success_count ?? 0
  if (total > 0) {
    return success === total ? `成功 ${total} 步` : `成功 ${success}/${total} 步`
  }
  return success > 0 ? `成功 ${success} 步` : '-'
}

/** 状态列 / 标签文案：过程状态直接展示状态词，终态展示可数结果 */
export function runStatusText(source: RunDisplaySource): string {
  const status = source.status ?? ''
  if (isRunStateStatus(status)) return STATE_TEXT[status] ?? status
  if (!status) return '-'
  return runResultText(source)
}

/** 标签配色：只区分进行中与已结束，不表达成败 */
export function runStatusTagType(status?: string | null): 'warning' | 'info' {
  return status === 'running' || status === 'queued' ? 'warning' : 'info'
}
