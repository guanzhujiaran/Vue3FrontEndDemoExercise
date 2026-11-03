import type { WorkflowRunLogEvent } from '@/api/browser/workflow_run_api'

/**
 * 运行消息文案的结构化解构 + 返回内容美化。
 *
 * 后端 `text` 是一整句拼好的中文（`开始步骤 3/12：点击元素，耗时 1.2s｜超时`），
 * 直接整行铺在面板里会「位置 / 名称 / 耗时 / 错误」四类信息糊成一团，失败原因
 * 尤其难扫。这里把它拆成独立字段，由组件分别渲染成徽标、主文案、耗时、错误块。
 *
 * **只做展示层解析**：解析失败（后端文案改版 / 未知事件）时 `structured = false`，
 * 组件整行退回原文，不会丢信息，也不会因为文案变化就渲染空白。
 *
 * 循环分组头已经展示了轮次，体内消息自带的「第 3 轮 · 」前缀属于重复信息，
 * 解析前一并去掉，避免每行都以同样的字样开头。
 */

/** 消息行解构结果 */
export interface RunMessageView {
  /** 是否成功解构；false 时用 `raw` 整行展示 */
  structured: boolean
  /** 位置徽标：`步骤 3/12` / `动作 2/9` / `运行结束`；无则空串 */
  badge: string
  /** 主文案：动作 / 步骤名（已去掉位置、耗时、错误） */
  title: string
  /** 耗时（`1.2s` / `320ms`）；无则空串 */
  cost: string
  /** 失败原因（独立成行展示）；无则空串 */
  reason: string
  /** 后端原文（未解构时整行展示） */
  raw: string
}

/** 返回内容里的一段（标签 + 内容），JSON 会被缩进展开 */
export interface RunDetailBlock {
  /** 行首标签（如「参数」）；无标签为空串 */
  label: string
  /** 已格式化的文本 */
  text: string
}

/** `第 3 轮 · ` / `第 3/40 轮 · `：循环分组头已展示轮次，行内不再重复 */
const ROUND_PREFIX = /^第\s*\d+(?:\s*\/\s*\d+)?\s*轮\s*[·・.]\s*/

/** `开始步骤 3/12：xx` / `动作 2/9 失败：xx` */
const ACTION_LINE = /^(开始步骤|完成步骤|步骤|动作)\s*(\d+(?:\s*\/\s*\d+)?)\s*(失败)?\s*[：:]\s*([\s\S]*)$/

/** 文案尾部的「，耗时 1.2s」 */
const COST_SUFFIX = /[，,]\s*耗时\s*([\d.]+)\s*s\s*$/

/** `运行结束：success（成功 10 / 失败 0 / 共 12 步）｜错误` */
const RUN_FINISHED_LINE =
  /^运行结束[：:]\s*([^（(]*)[（(]([^）)]*)[）)](?:\s*｜\s*([\s\S]*))?$/

/** 运行状态英文枚举 → 中文 */
const RUN_STATUS_TEXT: Record<string, string> = {
  success: '执行成功',
  failed: '执行失败',
  interrupted: '已中断',
  cancelled: '已取消',
  running: '运行中',
}

/** 返回内容里「参数: {json}」的标签前缀 */
const PARAM_PREFIX = /^参数[:：]\s*/

/** 毫秒 → `320ms` / `1.2s`；无耗时返回空串 */
export function formatCost(durationMs: number | null | undefined): string {
  if (typeof durationMs !== 'number' || !Number.isFinite(durationMs) || durationMs < 0) {
    return ''
  }
  if (durationMs < 1000) return `${Math.round(durationMs)}ms`
  return `${(durationMs / 1000).toFixed(1)}s`
}

/** 尝试把单行 JSON 缩进展开；不是 JSON 时返回 null */
function prettyJson(text: string): string | null {
  const trimmed = text.trim()
  if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) return null
  try {
    return JSON.stringify(JSON.parse(trimmed), null, 2)
  } catch {
    return null
  }
}

/** 「运行结束」行：状态 + 成败统计 + 错误原因 */
function formatRunFinished(event: WorkflowRunLogEvent, raw: string): RunMessageView {
  const matched = RUN_FINISHED_LINE.exec(raw.trim())
  if (!matched) {
    return {
      structured: false,
      badge: '运行结束',
      title: raw,
      cost: formatCost(event.duration_ms),
      reason: (event.error ?? '').trim(),
      raw,
    }
  }
  const status = (matched[1] ?? '').trim()
  const counts = (matched[2] ?? '').trim()
  return {
    structured: true,
    badge: '运行结束',
    title: `${RUN_STATUS_TEXT[status] ?? status}（${counts}）`,
    cost: formatCost(event.duration_ms),
    reason: (matched[3] ?? '').trim() || (event.error ?? '').trim(),
    raw,
  }
}

/** 单条运行消息 → 结构化视图 */
export function formatRunMessage(event: WorkflowRunLogEvent): RunMessageView {
  const raw = (event.text ?? '').trim()
  if (event.kind === 'run_finished') return formatRunFinished(event, raw)

  const line = raw.replace(ROUND_PREFIX, '').trim()
  const matched = ACTION_LINE.exec(line)
  if (!matched) {
    return {
      structured: false,
      badge: '',
      title: raw,
      cost: formatCost(event.duration_ms),
      reason: (event.error ?? '').trim(),
      raw,
    }
  }

  const verb = matched[1] ?? ''
  const position = (matched[2] ?? '').replace(/\s+/g, '')
  const tail = matched[4] ?? ''
  // 失败原因在 `｜` 之后；先切出来，剩下的头部再剥离耗时
  const [headText = '', ...reasonParts] = tail.split('｜')
  let title = headText.trim()
  let cost = formatCost(event.duration_ms)
  const costMatched = COST_SUFFIX.exec(title)
  if (costMatched) {
    title = title.slice(0, costMatched.index).trim()
    if (!cost) cost = `${costMatched[1]}s`
  }

  return {
    structured: true,
    badge: `${verb.endsWith('步骤') ? '步骤' : '动作'} ${position}`,
    title,
    cost,
    reason: reasonParts.join('｜').trim() || (event.error ?? '').trim(),
    raw,
  }
}

/**
 * 返回内容（`detail`）→ 展示块。
 *
 * 后端固定格式：`参数: {json}` + 返回数据（JSON）+ 过程日志（纯文本）。
 * JSON 行缩进展开、去掉 `参数: ` 前缀改为小标签，日志行原样保留。
 */
export function buildDetailBlocks(detail: string | null | undefined): RunDetailBlock[] {
  if (typeof detail !== 'string' || !detail) return []
  const blocks: RunDetailBlock[] = []
  for (const line of detail.split('\n')) {
    if (!line.trim()) continue
    const paramMatched = PARAM_PREFIX.exec(line.trim())
    const body = paramMatched ? line.trim().slice(paramMatched[0].length) : line
    const pretty = prettyJson(body)
    if (pretty !== null) {
      blocks.push({ label: paramMatched ? '参数' : '', text: pretty })
    } else if (paramMatched) {
      blocks.push({ label: '参数', text: body })
    } else {
      blocks.push({ label: '', text: line })
    }
  }
  return blocks
}
