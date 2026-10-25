/**
 * 点赞 / 收藏 通用互动态状态机（纯函数，无 Vue 依赖，可单测）。
 *
 * 背景：此前点赞/收藏态散落在各组件的 `isLiked / isFavorite / likeCount /
 * favoriteCount` 多个 ref 里，弹窗「取消收藏」后父组件常常忘记同步，
 * 表现为按钮样式与计数不响应式。这里把「加载 → 乐观变更 → 落定/回滚」
 * 显式建模为状态机，所有互动态组件共用同一套转移规则。
 *
 * 状态迁移：
 *
 *      idle ──SYNC──▶ syncing ──SYNC_OK──▶ synced
 *                         └────SYNC_FAIL──▶ synced
 *      synced ──TOGGLE──▶ mutating ──TOGGLE_OK──▶ synced
 *                           ├────TOGGLE_FAIL──▶ error(已回滚到快照) ──SYNC/TOGGLE──▶ synced
 *                           └────APPLY───────▶ synced（外部权威数据浅合并）
 */

/** 互动态阶段 */
export type InteractionPhase =
  /** 未加载（初始） */
  | 'idle'
  /** 拉取后端互动态中 */
  | 'syncing'
  /** 已与服务端一致 */
  | 'synced'
  /** 变更请求中（乐观更新已落地，等待落定或回滚） */
  | 'mutating'
  /** 变更失败（已回滚到快照，等下一次 SYNC/TOGGLE 复位） */
  | 'error'

/** 互动态状态（点赞 / 收藏 共用结构，count 语义由调用方决定） */
export interface InteractionState {
  phase: InteractionPhase
  /** 当前用户是否已激活（已赞 / 已收藏到任一收藏夹） */
  active: boolean
  /** 计数（赞数 / 收藏数） */
  count: number
  /** 乐观更新前的快照，仅 mutating 期间有效，用于失败回滚 */
  snapshot: InteractionSnapshot | null
  /** 失败信息（phase === 'error' 时有效） */
  error: string | null
}

/** 乐观更新快照 */
export interface InteractionSnapshot {
  active: boolean
  count: number
}

/** 状态机事件 */
export type InteractionEvent =
  /** 开始拉取互动态 */
  | { type: 'SYNC' }
  /** 拉取成功（active/count 为后端权威值） */
  | { type: 'SYNC_OK'; active: boolean; count: number }
  /** 拉取失败（保持既有值，phase 回到 synced / idle） */
  | { type: 'SYNC_FAIL' }
  /** 乐观变更：nextActive 为期望的激活态 */
  | { type: 'TOGGLE'; nextActive: boolean }
  /** 变更成功落定（缺省时沿用乐观值，仅复位 phase） */
  | { type: 'TOGGLE_OK'; active?: boolean; count?: number }
  /** 变更失败：回滚到快照 */
  | { type: 'TOGGLE_FAIL'; error?: string }
  /** 外部权威数据浅合并（弹窗 changed / 父组件回传），不经过乐观流程 */
  | { type: 'APPLY'; active?: boolean; count?: number }
  /** 复位（切换资源时调用） */
  | { type: 'RESET' }

/** 初始状态工厂（互动态均为「未赞 / 未收藏 / 计数 0」） */
export function createInteractionState(initial?: Partial<InteractionState>): InteractionState {
  return {
    phase: 'idle',
    active: false,
    count: 0,
    snapshot: null,
    error: null,
    ...initial,
  }
}

/** 变更中（mutating）是否可接受新的 TOGGLE：拒绝并发点击 */
function isToggleable(phase: InteractionPhase): boolean {
  return phase === 'idle' || phase === 'synced' || phase === 'error'
}

/**
 * 状态机 reducer：输入旧状态与事件，返回新状态（纯函数，不修改入参）。
 * 非法转移一律返回原引用，便于调用方用引用相等判断「状态未变化」。
 */
export function reduce(state: InteractionState, event: InteractionEvent): InteractionState {
  switch (event.type) {
    case 'SYNC':
      return { ...state, phase: 'syncing', error: null }

    case 'SYNC_OK':
      return { phase: 'synced', active: event.active, count: Math.max(0, event.count), snapshot: null, error: null }

    case 'SYNC_FAIL':
      // 静默失败：保留既有值，仅复位阶段（回到变更前状态，无快照则 idle）
      return { ...state, phase: state.snapshot ? 'mutating' : 'synced', error: null }

    case 'TOGGLE': {
      if (!isToggleable(state.phase)) return state
      const snapshot: InteractionSnapshot = { active: state.active, count: state.count }
      return {
        phase: 'mutating',
        active: event.nextActive,
        count: Math.max(0, state.count + (event.nextActive ? 1 : -1)),
        snapshot,
        error: null,
      }
    }

    case 'TOGGLE_OK':
      // 必须处于 mutating，否则视为无意义的回包，直接忽略
      if (state.phase !== 'mutating') return state
      return {
        phase: 'synced',
        active: event.active ?? state.active,
        count: event.count == null ? state.count : Math.max(0, event.count),
        snapshot: null,
        error: null,
      }

    case 'TOGGLE_FAIL':
      if (state.phase !== 'mutating' || !state.snapshot) return state
      return {
        phase: 'error',
        active: state.snapshot.active,
        count: state.snapshot.count,
        snapshot: null,
        error: event.error ?? null,
      }

    case 'APPLY':
      return {
        phase: 'synced',
        active: event.active ?? state.active,
        count: event.count == null ? state.count : Math.max(0, event.count),
        snapshot: null,
        error: null,
      }

    case 'RESET':
      return createInteractionState()

    default:
      return state
  }
}

/** 展示用计数格式化（1.2w / 345），互动态组件共用，避免各页面重复实现 */
export function formatInteractionCount(n: number | null | undefined): string {
  if (n == null) return '0'
  if (n >= 10000) return (n / 10000).toFixed(1) + 'w'
  return String(n)
}

/** 计数增减（乐观更新用），下限 0，避免取消点赞/收藏出现负数 */
export function stepInteractionCount(count: number | null | undefined, delta: number): number {
  return Math.max(0, Number(count ?? 0) + delta)
}