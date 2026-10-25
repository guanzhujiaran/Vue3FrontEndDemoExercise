import { computed, reactive } from 'vue'
import type { InteractionState } from '@/utils/interaction/interactionMachine'
import {
  createInteractionState,
  reduce,
  type InteractionEvent,
  type InteractionSnapshot,
} from '@/utils/interaction/interactionMachine'

/**
 * 点赞 / 收藏 互动态状态机的 Vue 封装。
 *
 * 组件侧只做三件事：
 * 1. 挂载时 `sync(...)` 灌入后端互动态；
 * 2. 点击时 `toggle(...)` 走乐观更新 + 状态机落定/回滚；
 * 3. 弹窗 / 父组件回传权威数据时 `apply(...)` 浅合并。
 *
 * 组件不再自行维护 `isLiked / isFavorite / likeCount / favoriteCount` 四组 ref，
 * 也就不会再出现「弹窗取消收藏后按钮不刷新」。
 */
export function useInteractionMachine(initial?: Partial<InteractionState>) {
  const state = reactive<InteractionState>(createInteractionState(initial))

  /** 派发事件：状态机未发生变化时返回 false，便于调用方跳过后续副作用 */
  function dispatch(event: InteractionEvent): boolean {
    const next = reduce(state, event)
    if (next === state) return false
    Object.assign(state, next)
    return true
  }

  /** 当前用户是否已赞 / 已收藏 */
  const active = computed(() => state.active)
  /** 赞数 / 收藏数 */
  const count = computed(() => state.count)
  /** 请求中（拉取中或变更中）：用于禁用按钮，避免并发点击 */
  const pending = computed(() => state.phase === 'syncing' || state.phase === 'mutating')
  /** 变更失败（已回滚），组件可据此提示 */
  const failed = computed(() => state.phase === 'error')

  /** 拉取互动态开始（配合 sync 使用，让按钮在请求期间置灰） */
  function syncStart(): void {
    dispatch({ type: 'SYNC' })
  }

  /** 灌入后端权威互动态 */
  function sync(nextActive: boolean, nextCount: number): void {
    dispatch({ type: 'SYNC_OK', active: nextActive, count: nextCount })
  }

  /** 拉取失败：静默复位，不影响已展示内容 */
  function syncFail(): void {
    dispatch({ type: 'SYNC_FAIL' })
  }

  /**
   * 乐观切换激活态。
   * @param nextActive 期望的下一状态；缺省为取反当前值
   * @returns 是否受理（并发点击 / 阶段不允许时返回 false，调用方应跳过接口）
   */
  function toggle(nextActive?: boolean): boolean {
    const target = nextActive ?? !state.active
    return dispatch({ type: 'TOGGLE', nextActive: target })
  }

  /** 变更成功落定：优先用后端回包计数，缺省沿用乐观值 */
  function toggleOk(count?: number, active?: boolean): void {
    dispatch({ type: 'TOGGLE_OK', count, active })
  }

  /** 变更失败：回滚到乐观更新前的快照 */
  function toggleFail(error?: string): void {
    dispatch({ type: 'TOGGLE_FAIL', error })
  }

  /** 外部权威数据浅合并（收藏夹弹窗 changed、父组件回传互动态） */
  function apply(nextActive?: boolean, nextCount?: number): void {
    dispatch({ type: 'APPLY', active: nextActive, count: nextCount })
  }

  /** 切换资源时复位 */
  function reset(): void {
    dispatch({ type: 'RESET' })
  }

  return {
    state,
    active,
    count,
    pending,
    failed,
    syncStart,
    sync,
    syncFail,
    toggle,
    toggleOk,
    toggleFail,
    apply,
    reset,
  }
}

/** composable 返回值类型，供组件 props / 事件签名引用 */
export type UseInteractionMachine = ReturnType<typeof useInteractionMachine>

/** 乐观更新快照类型（组件保存旧值时用） */
export type { InteractionSnapshot }