import type { ActionPreviewResponse, ActionValidateResponse } from '@/api/browser/hey-api'

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
