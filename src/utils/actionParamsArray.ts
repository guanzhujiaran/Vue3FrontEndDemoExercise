/**
 * 动作参数「对象数组」列表元素的纯逻辑工具
 *
 * 规格见 `docs/frontend_requirements/动作参数数组编辑器.md`。
 * 这里只放不依赖 Vue / DOM 的纯函数，便于 vitest 覆盖（组件级交互仍走 e2e）。
 */

export interface ArrayItemFieldSchema {
  type?: string
  title?: string
  description?: string
  default?: unknown
  enum?: unknown[]
  maxLength?: number
  format?: string
}

/** 空值判定：null / undefined / 全空白字符串都算空 */
export function isBlankValue(value: unknown): boolean {
  if (value === null || value === undefined) return true
  return String(value).trim() === ''
}

/**
 * 单步移动数组元素（上移 delta=-1 / 下移 delta=1）
 *
 * - 越界返回原数组的副本（不抛错，便于按钮 disabled 之外的兜底）；
 * - 返回新数组，不修改入参（Vue 里直接赋回 `formData[key]` 触发更新）。
 */
export function moveItem<T>(list: readonly T[], index: number, delta: number): T[] {
  const next = [...list]
  const target = index + delta
  if (index < 0 || index >= next.length) return next
  if (target < 0 || target >= next.length) return next
  const [item] = next.splice(index, 1)
  next.splice(target, 0, item)
  return next
}

/** 新建一项：按子字段的 default / 类型给初值（字符串空、数字 null、枚举 null、布尔 false） */
export function buildDefaultItem(
  fields: Record<string, ArrayItemFieldSchema>,
): Record<string, unknown> {
  const item: Record<string, unknown> = {}
  for (const [key, field] of Object.entries(fields || {})) {
    if (field?.default !== undefined) {
      item[key] = field.default
    } else if (field?.type === 'number' || field?.type === 'integer') {
      item[key] = null
    } else if (Array.isArray(field?.enum) && field.enum.length > 0) {
      item[key] = null
    } else if (field?.type === 'boolean') {
      item[key] = false
    } else {
      item[key] = ''
    }
  }
  return item
}

const URI_RE = /^https?:\/\/\S+$/i

/**
 * 单个子字段的即时校验（仅提示，强校验由后端 pydantic 兜底）
 *
 * 规则顺序（命中即返回，互不覆盖）：
 * 1. 必填为空 → 「该字段必填」
 * 2. 非必填且为空 → 不校验
 * 3. `format === 'uri'` → 必须以 http(s):// 开头
 * 4. `maxLength` 超限 → 「最多 N 个字符」
 */
export function validateFieldValue(args: {
  value: unknown
  required?: boolean
  format?: string
  maxLength?: number
}): string {
  const { value, required = false, format = '', maxLength } = args
  const text = value === null || value === undefined ? '' : String(value).trim()
  if (!text) return required ? '该字段必填' : ''
  if (format === 'uri' && !URI_RE.test(text)) return '请填写 http(s) 开头的地址'
  if (typeof maxLength === 'number' && text.length > maxLength) {
    return `最多 ${maxLength} 个字符`
  }
  return ''
}
