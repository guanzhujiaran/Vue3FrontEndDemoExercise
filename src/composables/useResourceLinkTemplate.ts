import { ref, watch } from 'vue'

/**
 * 已处理数据的「前端跳转链接格式」（纯前端配置，按工作流分别保存）。
 *
 * 为某个工作流配置一条 URL 模板，例如：
 *   https://www.bilibili.com/video/{resource_id}
 * 表格里用该行记录的业务主键替换占位符后，即可直接打开对应站点页面。
 *
 * 存储：localStorage，结构为 `{ [workflow_id]: 模板字符串 }`；
 * 仅保存在当前浏览器，不随账号同步、也不写入后端。
 */

const STORAGE_KEY = 'rpa:workflow:resource-link-template'

/** 业务主键占位符（替换为记录里的 resource_id） */
export const RESOURCE_ID_PLACEHOLDER = '{resource_id}'

/** 记录主键占位符（替换为去重表自增 id） */
export const RECORD_ID_PLACEHOLDER = '{record_id}'

/** 资源类型占位符（替换为 resource_type） */
export const RESOURCE_TYPE_PLACEHOLDER = '{resource_type}'

/** workflow_id → 链接模板 */
export type ResourceLinkTemplateMap = Record<string, string>

/** 模板替换所需的取值 */
export interface ResourceLinkTemplateValues {
  /** 业务主键（必填） */
  resource_id: string
  /** 记录主键 */
  record_id?: string | number
  /** 资源类型命名空间 */
  resource_type?: string
}

function loadFromStorage(): ResourceLinkTemplateMap {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {}
    const result: ResourceLinkTemplateMap = {}
    for (const [workflowId, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof value === 'string' && value.trim()) result[workflowId] = value.trim()
    }
    return result
  } catch {
    // 解析失败按「未配置」处理，避免脏数据阻断页面
    return {}
  }
}

// 单例：页面（配置弹窗）、表格共享同一份响应式数据
const templates = ref<ResourceLinkTemplateMap>(loadFromStorage())

watch(
  templates,
  (value) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(value))
    } catch {
      // 忽略写入失败（如隐私模式 / 配额不足）
    }
  },
  { deep: true }
)

/** 用记录字段替换模板里的占位符；未配置模板时返回空串 */
export function buildLinkUrl(
  template: string,
  values: ResourceLinkTemplateValues
): string {
  if (!template) return ''
  const resourceId = encodeURIComponent(values.resource_id ?? '')
  const replacements: Array<[string, string]> = [
    [RESOURCE_ID_PLACEHOLDER, resourceId],
  ]
  if (values.record_id !== undefined && values.record_id !== null) {
    replacements.push([RECORD_ID_PLACEHOLDER, encodeURIComponent(String(values.record_id))])
  }
  if (values.resource_type) {
    replacements.push([RESOURCE_TYPE_PLACEHOLDER, encodeURIComponent(values.resource_type)])
  }
  return replacements.reduce(
    (url, [placeholder, value]) => url.split(placeholder).join(value),
    template
  )
}

export function useResourceLinkTemplate() {
  /** 读取某工作流的链接模板（未配置返回空串，可直接用于 v-if / 按钮文案） */
  function getTemplate(workflowId: string): string {
    if (!workflowId) return ''
    return templates.value[workflowId] ?? ''
  }

  /** 保存某工作流的链接模板；传空串等价于清除 */
  function setTemplate(workflowId: string, template: string): void {
    if (!workflowId) return
    const value = template.trim()
    if (!value) {
      removeTemplate(workflowId)
      return
    }
    templates.value = { ...templates.value, [workflowId]: value }
  }

  /** 清除某工作流的链接模板 */
  function removeTemplate(workflowId: string): void {
    if (!workflowId || !(workflowId in templates.value)) return
    const next: ResourceLinkTemplateMap = { ...templates.value }
    delete next[workflowId]
    templates.value = next
  }

  return { templates, getTemplate, setTemplate, removeTemplate }
}
