import type { DroppedItem, LoopConfig, ConditionRule } from '@/components/rpa-browser/debugbox-types'
import { genItemId, defaultLoopConfig } from '@/components/rpa-browser/debugbox-types'

/**
 * RPA 动作 / 工作流 JSON 相关工具。
 *
 * - `pickJsonFile`：选一个 .json 文件并解析为普通对象（导入时原样 POST 给后端）。
 * - `stepsToDroppedItems`：后端 steps → 前端可编辑 DroppedItem[]（编辑动作时回填）。
 */

/** 错误信息转字符串 */
export function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : String(e)
}

/**
 * 弹窗选择一个 .json 文件并解析为普通对象。
 * - 用户取消选择时 resolve(null)
 * - 读取 / 解析失败或顶层不是对象时 reject（错误信息可直接提示给用户）
 */
export function pickJsonFile(): Promise<Record<string, unknown> | null> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json,application/json'
    input.style.display = 'none'

    input.oncancel = () => {
      input.remove()
      resolve(null)
    }

    input.onchange = async () => {
      const file = input.files?.[0]
      input.remove()
      if (!file) { resolve(null); return }
      let text: string
      try {
        text = await file.text()
      } catch (e) {
        reject(new Error(`读取文件失败：${errMsg(e)}`))
        return
      }
      let parsed: unknown
      try {
        parsed = JSON.parse(text)
      } catch (e) {
        reject(new Error(`JSON 解析失败：${errMsg(e)}`))
        return
      }
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        reject(new Error('文件内容必须是 JSON 对象'))
        return
      }
      resolve(parsed as Record<string, unknown>)
    }

    document.body.appendChild(input)
    input.click()
  })
}

function toNumber(v: unknown): number {
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(n) ? n : 0
}

/** 循环配置在 params 中占用的字段名（还原后需剔除，避免残留旧值被再次序列化） */
const LOOP_PARAM_KEYS = [
  'name', 'loop_source', 'count', 'loop_items_var', 'loop_item_var', 'loop_index_var',
  'param_mapping', 'break_condition', 'continue_condition', 'loop_items_json',
]

/** 把 params 中的循环配置还原为 LoopConfig（与 serializeLoopConfig 互为逆运算） */
function parseLoopConfig(params: Record<string, unknown>): LoopConfig {
  const cfg = defaultLoopConfig()
  const src = params.loop_source
  if (src === 'fixed_count' || src === 'variable' || src === 'expression' || src === 'json_list') {
    cfg.loopSource = src
  }
  const count = toNumber(params.count)
  if (count > 0) cfg.count = count
  if (typeof params.name === 'string') cfg.name = params.name
  if (typeof params.loop_items_var === 'string') cfg.loopItemsVar = params.loop_items_var
  if (typeof params.loop_item_var === 'string' && params.loop_item_var) cfg.loopItemVar = params.loop_item_var
  if (typeof params.loop_index_var === 'string' && params.loop_index_var) cfg.loopIndexVar = params.loop_index_var
  if (Array.isArray(params.loop_items_json)) cfg.loopItemsJson = JSON.stringify(params.loop_items_json, null, 2)
  const pm = params.param_mapping
  if (pm && typeof pm === 'object' && !Array.isArray(pm)) {
    cfg.paramMapping = Object.entries(pm as Record<string, unknown>)
      .filter(([k, v]) => !!k && typeof v === 'string')
      .map(([targetParam, sourcePath]) => ({ targetParam, sourcePath: sourcePath as string }))
  }
  if (params.break_condition) cfg.breakCondition = params.break_condition as ConditionRule
  if (params.continue_condition) cfg.continueCondition = params.continue_condition as ConditionRule
  return cfg
}

/**
 * 后端 steps → 前端可编辑 DroppedItem[]。
 * 递归处理 if_else 的 TrueBranch / FalseBranch 与 loop 的 loopBranch，
 * 并把循环配置（loop_source / count / break_condition …）还原为 `loopConfig`，
 * 否则保存时会被 serializeLoopConfig 用默认值覆盖。
 */
export function stepsToDroppedItems(steps: Record<string, unknown>[]): DroppedItem[] {
  return steps.map((step, i) => {
    const sp = { ...((step.params || {}) as Record<string, unknown>) }
    const actionType = (step.action_type as string) || (step.action_id as string) || ''
    const actionId = (step.action_id as string) || actionType

    let trueBranch: DroppedItem[] | undefined
    let falseBranch: DroppedItem[] | undefined
    let loopBody: DroppedItem[] | undefined
    if (Array.isArray(sp.TrueBranch)) {
      trueBranch = stepsToDroppedItems(sp.TrueBranch as Record<string, unknown>[])
      delete sp.TrueBranch
    }
    if (Array.isArray(sp.FalseBranch)) {
      falseBranch = stepsToDroppedItems(sp.FalseBranch as Record<string, unknown>[])
      delete sp.FalseBranch
    }
    if (Array.isArray(sp.loopBranch)) {
      loopBody = stepsToDroppedItems(sp.loopBranch as Record<string, unknown>[])
      delete sp.loopBranch
    }

    let loopConfig: LoopConfig | undefined
    if (actionType === 'loop' || actionId === 'loop') {
      loopConfig = parseLoopConfig(sp)
      for (const key of LOOP_PARAM_KEYS) delete sp[key]
    }

    const actionDetail = step.action_detail as Record<string, unknown> | undefined
    // 图标：内置操作由后端在 step 上直接下发 icon_series/icon_id，
    // 复合动作取 action_detail，两者取到即与编辑器工具箱显示一致
    const iconSeries =
      (step.icon_series as number | undefined) ?? (actionDetail?.icon_series as number | undefined)
    const iconId =
      (step.icon_id as number | undefined) ?? (actionDetail?.icon_id as number | undefined)
    return {
      id: genItemId(actionId || 'item'),
      name: (actionDetail?.name as string) || (step.name as string) || actionId || `步骤${i + 1}`,
      action_id: actionId,
      action_type: actionType || actionId,
      description: (actionDetail?.description as string) || (step.description as string) || '',
      icon_series: iconSeries,
      icon_id: iconId,
      type: 'action',
      formData: sp,
      input_vars: (step.input_vars || {}) as Record<string, unknown>,
      output_vars: (step.output_vars || []) as string[],
      config_params: {},
      trueBranch,
      falseBranch,
      loopBody,
      loopConfig,
      action_detail: actionDetail,
    }
  })
}
