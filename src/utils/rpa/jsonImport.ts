import type { DroppedItem, LoopConfig, ConditionRule } from '@/components/rpa-browser/debugbox-types'
import { genItemId, defaultLoopConfig } from '@/components/rpa-browser/debugbox-types'

/**
 * RPA 动作 / 工作流 JSON 相关工具。
 *
 * - `pickJsonFileText`：弹窗选择一个 .json 文件，返回**原始文本**（导入弹窗回填到可粘贴的编辑框）。
 * - `parseShareJsonText`：把粘贴 / 文件文本解析为可直接 POST 给导入接口的对象（含形状校验）。
 * - `pickJsonFile`：`pickJsonFileText` + 解析的组合用法，一次拿到解析结果。
 * - `stepsToDroppedItems`：后端 steps → 前端可编辑 DroppedItem[]（编辑动作时回填）。
 */

/** 分享对象类型：动作 / 工作流的导入请求体结构不同，校验规则也不同 */
export type ShareJsonKind = 'action' | 'workflow'

/** 错误信息转字符串 */
export function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : String(e)
}

/**
 * 弹窗选择一个 .json 文件，返回原始文本与文件名。
 * - 用户取消选择时 resolve(null)
 * - 读取失败时 reject（错误信息可直接提示给用户）
 */
export function pickJsonFileText(): Promise<{ text: string; name: string } | null> {
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
      try {
        const text = await file.text()
        resolve({ text, name: file.name })
      } catch (e) {
        reject(new Error(`读取文件失败：${errMsg(e)}`))
      }
    }

    document.body.appendChild(input)
    input.click()
  })
}

/** JSON 文本 → 顶层必须是对象；失败时抛错（错误信息可直接提示用户） */
function parseJsonObject(text: string): Record<string, unknown> {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch (e) {
    throw new Error(`JSON 解析失败：${errMsg(e)}`)
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('分享内容必须是 JSON 对象')
  }
  return parsed as Record<string, unknown>
}

/**
 * 解析分享 JSON 文本（用户粘贴 / 文件内容）。
 * - 顶层必须是对象；
 * - 动作分享必须带非空 `steps`，工作流分享必须带 `name`（与后端导入接口必填项一致，提前拦截给出友好提示）；
 * - 失败时抛错，错误信息可直接展示给用户。
 */
export function parseShareJsonText(text: string, kind: ShareJsonKind): Record<string, unknown> {
  if (!text.trim()) throw new Error('请先粘贴分享 JSON 或选择 .json 文件')
  const payload = parseJsonObject(text)
  if (kind === 'action') {
    if (!Array.isArray(payload.steps) || payload.steps.length === 0) {
      throw new Error('缺少 steps 步骤列表，这不是一份动作分享 JSON')
    }
  } else if (typeof payload.name !== 'string' || !payload.name.trim()) {
    throw new Error('缺少 name 名称字段，这不是一份工作流分享 JSON')
  }
  return payload
}

/**
 * 选文件并解析为普通对象（导入时原样 POST 给后端）。
 * - 用户取消选择时 resolve(null)
 * - 读取 / 解析失败时 reject（错误信息可直接提示给用户）
 */
export async function pickJsonFile(kind?: ShareJsonKind): Promise<Record<string, unknown> | null> {
  const picked = await pickJsonFileText()
  if (!picked) return null
  return kind ? parseShareJsonText(picked.text, kind) : parseJsonObject(picked.text)
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
