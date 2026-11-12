/**
 * 管理端 LLM 配置：**按模型**的运行状态展示逻辑（组件与单测共用）。
 *
 * 关键口径：
 * - crawler 的实例池是按 `base_url + model_name` 逐个建槽位、逐个冷却 / 摘除的，
 *   状态**只属于某个模型**；管理页的卡片只是把同地址、同密钥的多个模型合并在一起编辑，
 *   卡片本身不是状态主体 —— 一旦按地址取「最差状态」，就看不出到底是哪个模型被移除；
 * - `removed` 是终态：crawler 只在运行时摘除、不落盘，所以配置里仍然存在，
 *   必须由人工取消勾选（或删掉卡片）后保存，才会真正从实例池里消失；
 * - 还没进池的模型（刚配置 / 刚保存还没被加载）没有统计，不能当成「健康」展示。
 */
import { normalizeBaseUrl } from '@/utils/llmConfigPayload'

/** el-tag 的 type 取值（与 Element Plus 对齐） */
export type LlmTagType = 'success' | 'warning' | 'danger' | 'info'

/** 读取态的一条实例统计（只取状态展示需要的字段，兼容 hey-api 生成的类型） */
export interface LlmStatsLike {
  base_url: string
  model_name: string
  /** healthy / cooling / quota_wait / suspended / removed */
  state: string
  /** 是否因不可恢复错误被移出池（removed） */
  disabled?: boolean | null
  /** 服务端给的状态原因；`removed` 时即「移除原因」 */
  disabled_reason?: string | null
  /** 最近一次失败的错误信息，`disabled_reason` 缺失时兜底 */
  last_error?: string | null
  /** 自动恢复时间（秒级时间戳）；null = 不会自动恢复 */
  resume_at?: string | number | null
}

/** 单个模型的状态视图（状态 / 原因 / 恢复时间都不做跨模型聚合） */
export interface LlmModelStateView {
  /** 该模型是否已在 crawler 实例池里建过槽位（false = 还没被加载） */
  tracked: boolean
  /** crawler 状态机的 state（`tracked` 为 false 时为空串） */
  state: string
  /** 状态中文文案 */
  label: string
  /** 标签配色 */
  tagType: LlmTagType
  /** 是否已被移出池（终态，只能人工删配置） */
  removed: boolean
  /** 状态原因：移除原因 / 冷却原因…；空串表示服务端没给 */
  reason: string
  /** 自动恢复时间（秒级时间戳）；null = 不会自动恢复 */
  resumeAt: number | null
}

/** crawler 状态机（`Service/llm_service/health.py::LLMState`）→ 展示文案 */
const STATE_VIEW: Record<string, { label: string; tagType: LlmTagType }> = {
  healthy: { label: '健康', tagType: 'success' },
  cooling: { label: '冷却中', tagType: 'warning' },
  quota_wait: { label: '额度等待', tagType: 'warning' },
  suspended: { label: '已暂停', tagType: 'danger' },
  removed: { label: '已被移除', tagType: 'danger' },
}

/** 统计表的键：`归一化 base_url + model_name`（服务端就按这两个字段配对） */
export function llmStatsKey(baseUrl: string, model: string): string {
  return `${normalizeBaseUrl(baseUrl)}||${model}`
}

/** `state` → 展示文案；未知状态原样回显，配色降级为 info，避免把新状态误显示成健康 */
export function llmStateView(state: string): { label: string; tagType: LlmTagType } {
  return STATE_VIEW[state] ?? { label: state || '未知', tagType: 'info' }
}

/**
 * 一条模型统计 → 该模型的状态视图。
 *
 * `stat` 为空表示该模型还没进池，此时状态未知（`tracked=false`），不能显示为健康。
 */
export function describeLlmModelState(stat?: LlmStatsLike | null): LlmModelStateView {
  if (!stat) {
    return {
      tracked: false,
      state: '',
      label: '无统计',
      tagType: 'info',
      removed: false,
      reason: '',
      resumeAt: null,
    }
  }
  const view = llmStateView(stat.state)
  const removed = stat.disabled === true || stat.state === 'removed'
  const rawReason = (stat.disabled_reason || stat.last_error || '').trim()
  // 健康模型的 reason 可能还留着上一次失败的文案，展示出来会让人误以为还有问题
  const reason = stat.state === 'healthy' ? '' : rawReason
  const resumeAtRaw = Number(stat.resume_at)
  const resumeAt = Number.isFinite(resumeAtRaw) && resumeAtRaw > 0 ? resumeAtRaw : null
  return {
    tracked: true,
    state: stat.state,
    label: view.label,
    tagType: view.tagType,
    removed,
    // 被移除却拿不到原因时也要写明，不能留空白让运营猜
    reason: removed && !reason ? '服务端未给出移除原因' : reason,
    // 移除是终态，服务端即使带着 resume_at 也不会自愈，不展示「预计恢复」
    resumeAt: removed ? null : resumeAt,
  }
}
