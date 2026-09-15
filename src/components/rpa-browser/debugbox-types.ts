import type { ActionPreviewResponse, ActionValidateResponse } from '@/api/browser/hey-api'

/** 前端 ConditionRule 类型（与后端 ConditionRule 对齐） */
export type ConditionValueType = 'BOOLEAN' | 'NULL' | 'STRING'

export interface ParamsCondition {
  field: string
  condition_value_type: ConditionValueType
  condition_value: boolean | null | string
  description?: string | null
}

export interface ConditionRule {
  logic: string
  condition?: ParamsCondition | null
  rules?: ConditionRule[] | null
  description?: string | null
}

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
  loopSource: 'fixed_count' | 'variable' | 'expression' | 'json_list'
  /** 固定次数 */
  count: number
  /** 变量引用路径（loop_source=variable 时） */
  loopItemsVar: string
  /** 表达式（loop_source=expression 时） */
  loopItemsExpr: string
  /** 直接传入的 JSON 列表（loop_source=json_list 时），存储为 JSON 字符串 */
  loopItemsJson: string
  /** 循环项变量名（默认 'loop_item'） */
  loopItemVar: string
  /** 循环索引变量名（默认 'loop_index'） */
  loopIndexVar: string
  /** break 条件规则（结构化条件），每次迭代开始前评估，为真时跳出整个循环 */
  breakCondition: ConditionRule | null
  /** continue 条件规则（结构化条件），每次迭代开始前评估，为真时跳过当前迭代 */
  continueCondition: ConditionRule | null
  /** 参数映射列表 */
  paramMapping: LoopParamMapping[]
}

/** 条目 id 自增序号：保证同一毫秒内创建的多个条目 id 也不撞车 */
let itemIdSeq = 0

/**
 * 生成全局唯一的条目 id。
 *
 * v-for 用 item.id 作为 :key，重复或缺失的 key 会让 Vue 在 patch 时找不到正确的
 * DOM 锚点，典型报错就是 `Cannot read properties of null (reading 'nextSibling')`。
 * 因此这里用「时间戳 + 自增序号 + 随机串」替代单纯的 Date.now()。
 */
export function genItemId(baseId = 'item'): string {
  itemIdSeq += 1
  return `${baseId}-${Date.now().toString(36)}-${itemIdSeq}-${Math.random().toString(36).slice(2, 6)}`
}

export function defaultLoopConfig(): LoopConfig {
  return {
    loopSource: 'fixed_count',
    count: 1,
    loopItemsVar: '',
    loopItemsExpr: '',
    loopItemsJson: '',
    loopItemVar: 'loop_item',
    loopIndexVar: 'loop_index',
    breakCondition: null,
    continueCondition: null,
    paramMapping: [],
  }
}

/** JSON Schema 节点（动作参数表单按此结构渲染） */
export interface JsonSchemaNode {
  type?: string
  title?: string
  description?: string
  default?: unknown
  properties?: Record<string, JsonSchemaNode>
  required?: string[]
  $ref?: string
  $defs?: Record<string, JsonSchemaNode>
  anyOf?: JsonSchemaNode[]
  allOf?: JsonSchemaNode[]
  enum?: Array<string | number>
  maxLength?: number
  minimum?: number
  maximum?: number
  additionalProperties?: JsonSchemaNode | boolean
  [key: string]: unknown
}

/** 动作参数 JSON Schema 顶层结构 */
export interface JsonSchema {
  title?: string
  description?: string
  properties?: Record<string, JsonSchemaNode>
  required?: string[]
  $defs?: Record<string, JsonSchemaNode>
  [key: string]: unknown
}

export interface DroppedItem {
  id: string
  name: string
  action_id: string
  action_type: string
  description?: string
  type: string
  json_schema?: JsonSchema
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
  /** 展示图标：系列编号（内置操作由后端分配；自定义操作取 action_detail） */
  icon_series?: number
  /** 展示图标：系列内编号 */
  icon_id?: number
  /** 后端 action_detail：从数据库实时查询的自定义操作完整信息 */
  action_detail?: Record<string, unknown>
  [key: string]: unknown
}

/** action_detail 的类型结构（后端 get_validated_action_details 返回） */
export interface ActionDetail {
  action_id: string
  name: string
  version: string
  action_type: string
  description: string
  /** 动作展示图标：系列编号（0 = 默认图标） */
  icon_series?: number
  /** 动作展示图标：系列内编号（0 = 默认图标） */
  icon_id?: number
  mid: string
  tags: string[]
  input_vars: Record<string, unknown>[]
  output_vars: string[]
  is_enabled: boolean
  is_public: boolean
  timeout: number
  retry_on_error: boolean
  retry_times: number
  retry_delay: number
  likes_count: number
  is_verified: boolean
  forks_count: number
  forked_from_id: number | null
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
