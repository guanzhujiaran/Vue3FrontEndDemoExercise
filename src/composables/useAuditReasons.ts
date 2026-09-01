import { ref, watch } from 'vue'

/**
 * 审核默认原因（前端本地存储）。
 *
 * 审核评论 / 私信时，可在弹窗内通过 el-autocomplete 快速选择历史填过的默认原因。
 * 这些默认原因仅保存在浏览器 localStorage，不随账号 / 后端同步。
 */

// 评论 / 私信两类审核共用同一份默认原因，简单起见使用一个 key
const STORAGE_KEY = 'bili:audit:default-reasons'

// 初始化时写入的示例选项，用户可自行增删
const DEFAULT_PRESETS = [
  '内容含违规信息',
  '广告 / 引流',
  '人身攻击 / 引战',
  '色情低俗',
  '与主题无关',
  '重复刷屏'
]

function loadFromStorage(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return [...DEFAULT_PRESETS]
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) {
      return parsed.filter((v): v is string => typeof v === 'string' && v.trim().length > 0)
    }
  } catch {
    // 解析失败时回退到预设
  }
  return [...DEFAULT_PRESETS]
}

// 单例：保证多个组件间共享同一份响应式数据
const reasons = ref<string[]>(loadFromStorage())

watch(
  reasons,
  (val) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(val))
    } catch {
      // 忽略写入失败（如隐私模式）
    }
  },
  { deep: true }
)

export function useAuditReasons() {
  /** 添加一个默认原因（去重，空值忽略） */
  function addReason(text: string) {
    const value = text.trim()
    if (!value) return
    if (!reasons.value.includes(value)) {
      reasons.value = [...reasons.value, value]
    }
  }

  /** 删除一个默认原因 */
  function removeReason(text: string) {
    reasons.value = reasons.value.filter((r) => r !== text)
  }

  /** 把当前输入的原因同步进默认列表（用户勾选「保存为默认」时调用） */
  function ensureSaved(text: string) {
    addReason(text)
  }

  return { reasons, addReason, removeReason, ensureSaved }
}
