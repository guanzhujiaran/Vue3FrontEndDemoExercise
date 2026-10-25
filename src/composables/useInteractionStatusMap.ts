import { ref } from 'vue'
import {
  fetchInteractionStatus,
  thumbMoment,
  InteractionBizTypeEnum,
} from '@/api/notify/moment-api'
import type { InteractionStatusItem } from '@/api/notify/moment-api'
import type { FavoriteChangedPayload } from '@/utils/interaction/favoriteSync'
import { stepInteractionCount } from '@/utils/interaction/interactionMachine'
import biliMessage from '@/utils/message'

/**
 * 列表页互动态（点赞 / 收藏）通用状态仓库。
 *
 * 此前 4 个列表页（推荐流 / 空间动态 / 话题流 / 空间时间线）各抄了一份
 * 「statusMap + loadStatus（过滤已缓存项）+ 点赞乐观更新」：
 * - 收藏变更后调`refreshStatus` 会被缓存过滤掉，等于**什么都没做**；
 * - 点赞取的是 `interaction` 模块的 `isLike`，与 `/interaction/status` 的 `isLike`
 *   不同源，可能出现按钮态与计数打架；
 * - 逻辑分散四处，改一处漏三处。
 *
 * 这里收敛为唯一入口：`ensure` 批量补齐、`statusOf` 读取、
 * `applyFavorite` 接收收藏夹弹窗载荷、`toggleLike` 走点赞乐观更新 + 失败回滚。
 */
export function useInteractionStatusMap(bizType: InteractionBizTypeEnum = InteractionBizTypeEnum.DYNAMIC) {
  /** bizId（字符串雪花 ID）→ 互动态 */
  const statusMap = ref<Record<string, InteractionStatusItem>>({})

  /** 读取某资源的互动态（未加载返回 null） */
  function statusOf(bizId: string): InteractionStatusItem | null {
    if (!bizId) return null
    return statusMap.value[bizId] ?? null
  }

  /**
   * 批量补齐互动态（弱依赖：失败不阻断列表展示）。
   * @param force true=忽略本地缓存强制重查
   */
  async function ensure(bizIds: string[], force = false): Promise<void> {
    const ids = [...new Set(bizIds.filter((id) => id !== ''))]
    const fresh = force ? ids : ids.filter((id) => !statusMap.value[id])
    if (!fresh.length) return
    try {
      const res = await fetchInteractionStatus(bizType, fresh)
      for (const it of res?.items ?? []) {
        if (it?.bizId) statusMap.value[it.bizId] = it
      }
    } catch {
      // 弱依赖：计数失败不阻断列表
    }
  }

  /**
   * 收藏夹弹窗操作成功后同步收藏态：浅合并进 statusMap，卡片按钮即刻响应，
   * 无需重查（`favoriteCount` 缺省时按 0/1 增减兜底）。
   */
  function applyFavorite(bizId: string, payload: FavoriteChangedPayload): void {
    if (!bizId) return
    const prev = statusMap.value[bizId]
    if (!prev) {
      // 互动态还没拉到手（首屏竞态），兜底重查一次
      void ensure([bizId], true)
      return
    }
    // 收藏态翻转才动计数（同态不动，避免重复点击把计数刷歪）
    const wasFavorite = Boolean(prev.isFavorite)
    const delta = wasFavorite === payload.isFavorite ? 0 : payload.isFavorite ? 1 : -1
    prev.isFavorite = payload.isFavorite
    prev.favoriteCount =
      payload.favoriteCount == null
        ? stepInteractionCount(prev.favoriteCount, delta)
        : payload.favoriteCount
  }

  /**
   * 点赞 / 取消点赞（乐观更新 + 失败回滚）。
   * @param onLocalLike 可选：同步修正卡片自身 interaction 模块的 isLike，保持双数据源一致
   * @returns 是否成功（失败已回滚并提示）
   */
  async function toggleLike(
    bizId: string,
    onLocalLike?: (isLike: boolean) => void
  ): Promise<boolean> {
    if (!bizId) return false
    const st = statusMap.value[bizId]
    const prevLiked = Boolean(st?.isLike)
    const up = prevLiked ? 2 : 1
    if (st) {
      st.isLike = up === 1
      st.likeCount = stepInteractionCount(st.likeCount, up === 1 ? 1 : -1)
    }
    onLocalLike?.(up === 1)
    try {
      const res = await thumbMoment(bizId, up, { bizType, bizId })
      if (st) {
        if (!res) {
          // 后端拒绝：回滚
          st.isLike = prevLiked
          st.likeCount = stepInteractionCount(st.likeCount, up === 1 ? -1 : 1)
          onLocalLike?.(prevLiked)
          return false
        }
        st.isLike = res.isLike ?? up === 1
        if (res.likeCount != null) st.likeCount = res.likeCount
      }
      return true
    } catch {
      if (st) {
        st.isLike = prevLiked
        st.likeCount = stepInteractionCount(st.likeCount, up === 1 ? -1 : 1)
      }
      onLocalLike?.(prevLiked)
      biliMessage.error('操作失败，请稍后重试')
      return false
    }
  }

  /** 清空（切换空间 / 切换话题等重置场景） */
  function clear(): void {
    statusMap.value = {}
  }

  return { statusMap, statusOf, ensure, applyFavorite, toggleLike, clear }
}