/**
 * JSON Schema 相关的窄化工具
 *
 * 背景：后端下发的 schema 字段（如动作参数 `params_schema`、变量声明 `items_schema`）
 * 在 SDK 里是宽松类型（`{[key: string]: unknown}` 或 `unknown`），模板/脚本里
 * 到处写 `as JsonSchemaNode` 既啰嗦又容易漏判。这里集中做一次安全检查。
 */
import type { JsonSchemaNode } from '@/components/rpa-browser/debugbox-types'

/** 是否是「看起来像 JSON Schema 节点」的对象（排除 null / 数组 / 原始值） */
export function isJsonSchemaNode(value: unknown): value is JsonSchemaNode {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** 宽松值 → JsonSchemaNode；不是对象时返回 undefined（调用方走降级分支） */
export function toJsonSchemaNode(value: unknown): JsonSchemaNode | undefined {
  return isJsonSchemaNode(value) ? value : undefined
}

/** 取 schema 的 `properties`（缺失时返回空对象） */
export function schemaProperties(schema: unknown): Record<string, JsonSchemaNode> {
  return toJsonSchemaNode(schema)?.properties || {}
}

/** 取 schema 的 `required` 列表（缺失时返回空数组；返回副本，避免外部改到源对象） */
export function schemaRequired(schema: unknown): string[] {
  const required = toJsonSchemaNode(schema)?.required
  return Array.isArray(required) ? [...required] : []
}
