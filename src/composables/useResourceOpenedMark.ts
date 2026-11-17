import { ref, watch } from 'vue'

/**
 * 已处理数据的「打开过」标记（纯前端配置，按工作流分别保存）。
 *
 * 业务主键旁提供「打开」入口后，人工核对时很难记住哪些已经点开过；
 * 这里只做本地标记：不请求后端、不随账号同步、也不写入数据库。
 *
 * 存储：localStorage，结构为 `{ [workflow_id]: 业务主键[] }`；
 * 数组按点击顺序排列（最新在末尾），超出上限时淘汰最早点击的标记，
 * 避免长期使用把浏览器本地存储撑大。
 */

const STORAGE_KEY = 'rpa:workflow:resource-opened'

/** 单个工作流最多保留的标记条数（超出后淘汰最早的，纯前端标记无需无限保留） */
export const OPENED_MARK_LIMIT_PER_WORKFLOW = 500

/** workflow_id → 已打开的业务主键（按点击顺序，最新在末尾） */
export type ResourceOpenedMarkMap = Record<string, string[]>

function normalizeIds(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  const ids = value.filter((item): item is string => typeof item === 'string' && item.length > 0)
  // 去重后按上限截断：越界数据（手改 / 旧版本）不至于继续膨胀
  return Array.from(new Set(ids)).slice(-OPENED_MARK_LIMIT_PER_WORKFLOW)
}

function loadFromStorage(): ResourceOpenedMarkMap {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {}
    const result: ResourceOpenedMarkMap = {}
    for (const [workflowId, value] of Object.entries(parsed as Record<string, unknown>)) {
      const ids = normalizeIds(value)
      if (ids.length > 0) result[workflowId] = ids
    }
    return result
  } catch {
    // 隐私模式 / 脏数据：按「没有任何标记」处理，不能阻断页面渲染
    return {}
  }
}

// 单例：同一页面内多个表格实例共享同一份响应式数据
const openedMarks = ref<ResourceOpenedMarkMap>(loadFromStorage())

watch(
  openedMarks,
  (value) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(value))
    } catch {
      // 忽略写入失败（如隐私模式 / 配额不足）
    }
  },
  { deep: true }
)

export function useResourceOpenedMark() {
  /** 某工作流已打开的业务主键（在 computed 中调用可跟随标记更新） */
  function getOpenedIds(workflowId: string): string[] {
    if (!workflowId) return []
    return openedMarks.value[workflowId] ?? []
  }

  /**
   * 记录一次打开：已存在则移到末尾（按最近点击淘汰最早的），
   * 超出上限从头部丢弃，保证单个工作流的标记数量恒定可控。
   */
  function markOpened(workflowId: string, resourceId: string): void {
    if (!workflowId || !resourceId) return
    const next = getOpenedIds(workflowId).filter(id => id !== resourceId)
    next.push(resourceId)
    if (next.length > OPENED_MARK_LIMIT_PER_WORKFLOW) {
      next.splice(0, next.length - OPENED_MARK_LIMIT_PER_WORKFLOW)
    }
    openedMarks.value = { ...openedMarks.value, [workflowId]: next }
  }

  return { getOpenedIds, markOpened }
}
