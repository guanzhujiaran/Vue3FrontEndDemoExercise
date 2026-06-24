import type { ActionPreviewResponse, ActionValidateResponse } from '@/api/browser/hey-api'

/** 嵌套分支路径中的一步：在 items[parentIndex].branch 数组中 */
export interface BranchPathStep {
  parentIndex: number
  branch: 'true' | 'false' | 'loop'
}

/** 后端 StandardResponse[ActionResultResponse] 中 data 的实际类型（auto-gen 缺失，手动补齐） */
export interface ActionResultResponse {
  success: boolean
  data?: unknown | null
  error?: string | null
  execution_time?: number
  action_id?: string
  action_name?: string
  variables?: Record<string, unknown>
  replaced_params?: Record<string, unknown>
}

/** 循环参数映射条目 */
export interface LoopParamMapping {
  /** 目标参数名（循环体内步骤的参数 key） */
  targetParam: string
  /** 源字段路径（基于循环项，如 'loop_item.name'） */
  sourcePath: string
}

/** 循环配置 */
export interface LoopConfig {
  /** 循环来源 */
  loopSource: 'fixed_count' | 'variable' | 'expression'
  /** 固定次数 */
  count: number
  /** 变量引用路径（loop_source=variable 时） */
  loopItemsVar: string
  /** 表达式（loop_source=expression 时） */
  loopItemsExpr: string
  /** 循环项变量名（默认 'loop_item'） */
  loopItemVar: string
  /** 循环索引变量名（默认 'loop_index'） */
  loopIndexVar: string
  /** 参数映射列表 */
  paramMapping: LoopParamMapping[]
}

export function defaultLoopConfig(): LoopConfig {
  return {
    loopSource: 'fixed_count',
    count: 1,
    loopItemsVar: '',
    loopItemsExpr: '',
    loopItemVar: 'loop_item',
    loopIndexVar: 'loop_index',
    paramMapping: [],
  }
}

export interface DroppedItem {
  id: string
  name: string
  action_id: string
  action_type: string
  description?: string
  type: string
  json_schema?: {
    title?: string
    description?: string
    properties?: Record<string, unknown>
    required?: string[]
  }
  formData?: Record<string, unknown>
  config_params?: Record<string, unknown>
  input_vars?: Record<string, unknown>
  output_vars?: string[]
  /** if-else 真分支 */
  trueBranch?: DroppedItem[]
  /** if-else 假分支 */
  falseBranch?: DroppedItem[]
  /** loop 循环体 */
  loopBody?: DroppedItem[]
  /** 循环配置 */
  loopConfig?: LoopConfig
  step_children?: Record<string, unknown>[]
  label?: string
  [key: string]: unknown
}

export type OperationKind = 'validate' | 'preview' | 'execute'

export interface OperationFeedback {
  kind: OperationKind
  success: boolean
  summary: string
  detail: ActionValidateResponse | ActionPreviewResponse | ActionResultResponse | Record<string, unknown>
  at: number
}

export interface StepResultItem {
  key: string
  success: boolean
  action_name?: string
  execution_time?: number
}

export interface NestedPreviewNode {
  type: 'step' | 'label'
  level: number
  action_id?: string
  variables: { key: string; value: unknown }[]
  branchLabel?: string
}
