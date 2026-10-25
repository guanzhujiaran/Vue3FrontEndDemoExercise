/**
 * 工作流「输入变量」展示/校验的纯逻辑
 *
 * 规格见 `docs/frontend_requirements/工作流输入变量展示.md`。
 * 定义来自被引用动作的变量契约（`input_vars` / `input_variables`），
 * 工作流只存值；这里负责「值 ↔ 编辑文本」的转换、控件选择与即时校验。
 */

export interface WorkflowVarField {
  name: string
  type: string
  required: boolean
  description: string
  defaultValue: unknown
}

/** 类型显示文案（面向用户，不直接暴露 schema 词） */
export function varTypeLabel(type: string): string {
  switch (type) {
    case 'string':
      return '文本'
    case 'number':
    case 'integer':
      return '数字'
    case 'boolean':
      return '布尔'
    case 'array':
      return '数组'
    case 'object':
      return '对象'
    default:
      return type || '文本'
  }
}

/** 复杂类型（以 JSON 文本编辑）：数组 / 对象 */
export function isJsonVarType(type: string): boolean {
  return type === 'array' || type === 'object'
}

/** 敏感变量：值默认掩码（api_key / secret / token / password 等） */
export function isSensitiveVarName(name: string): boolean {
  return /(api_?key|secret|token|password|passwd|credential)/i.test(name)
}

/**
 * 是否用多行文本域
 *
 * 判定顺序：JSON 类型必然多行；文本类型在「含换行」或「默认值较长」时多行，
 * 避免 system_prompt 这类长文本被塞进单行输入框（看不全也改不了）。
 */
export function shouldUseTextarea(field: WorkflowVarField, currentText = ''): boolean {
  if (isJsonVarType(field.type)) return true
  if (field.type !== 'string') return false
  const text = (currentText || '').trim()
    ? currentText
    : field.defaultValue === null || field.defaultValue === undefined
      ? ''
      : String(field.defaultValue)
  return text.includes('\n') || text.length > 60
}

/** 值 → 编辑框文本（array/object 用格式化 JSON，便于编辑与人工阅读） */
export function toVarInputText(value: unknown, type: string): string {
  if (value === null || value === undefined) return ''
  if (type === 'boolean') return value ? 'true' : 'false'
  if (isJsonVarType(type)) {
    try {
      return JSON.stringify(value, null, 2)
    } catch {
      return ''
    }
  }
  return String(value)
}

/** 编辑框文本 → 保存值（按类型解析；非法不抛错，由 validate 统一报） */
export function parseVarInputText(raw: string, type: string): unknown {
  const text = raw.trim()
  if (!text) return undefined
  if (type === 'number' || type === 'integer') return Number(text)
  if (type === 'boolean') return text === 'true'
  if (isJsonVarType(type)) return JSON.parse(text)
  return text
}

/** 单字段校验（返回空串表示通过） */
export function validateVarValue(field: WorkflowVarField, raw: string): string {
  const text = (raw ?? '').trim()
  if (!text) return field.required ? '必填变量未填写' : ''
  if (field.type === 'number' || field.type === 'integer') {
    return Number.isNaN(Number(text)) ? '需要数字' : ''
  }
  if (field.type === 'boolean') {
    return text === 'true' || text === 'false' ? '' : '需要 true / false'
  }
  if (isJsonVarType(field.type)) {
    try {
      const parsed = JSON.parse(text)
      if (field.type === 'array' && !Array.isArray(parsed)) return '需要 JSON 数组'
      if (field.type === 'object' && (Array.isArray(parsed) || typeof parsed !== 'object')) {
        return '需要 JSON 对象'
      }
      return ''
    } catch {
      return '不是合法 JSON'
    }
  }
  return ''
}

/** 格式化 JSON 文本（无效时返回 null，由调用方提示错误） */
export function formatJsonText(raw: string): string | null {
  try {
    return JSON.stringify(JSON.parse(raw), null, 2)
  } catch {
    return null
  }
}

/**
 * 生成保存用的增量补丁（见 docs/工作流变量增量更新计划书.md）
 *
 * - 只包含与初始快照不同的键；
 * - 初始有值、现在清空 → `null`（后端据此删除该键）；
 * - 无差异 / 无字段时返回 `undefined`（不产生空写入）。
 */
export function buildVariablesPatch(args: {
  fields: WorkflowVarField[]
  values: Record<string, string>
  initial: Record<string, string>
}): Record<string, unknown> | undefined {
  const { fields, values, initial } = args
  if (fields.length === 0) return undefined
  const patch: Record<string, unknown> = {}
  for (const field of fields) {
    const raw = values[field.name] ?? ''
    const hadValue = (initial[field.name] ?? '').trim() !== ''
    if (!raw.trim()) {
      if (hadValue) patch[field.name] = null
      continue
    }
    if (raw === (initial[field.name] ?? '')) continue
    try {
      const parsed = parseVarInputText(raw, field.type)
      if (parsed !== undefined) patch[field.name] = parsed
    } catch {
      // 非法 JSON：字段级校验会拦住保存，这里跳过避免抛错
      continue
    }
  }
  return Object.keys(patch).length > 0 ? patch : undefined
}
