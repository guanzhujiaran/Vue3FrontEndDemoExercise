/**
 * 抽奖互动组合式函数（2.20.0）：
 * 批量拉取互动状态 + 点赞（bizType=lottery）。
 *
 * 收藏统一由组件层 MomentFavoriteDialog（收藏夹选择弹窗）处理，本 composable 不再直接收藏。
 * 转发到动态由组件层 MomentPublishForm（attach 资源模式）处理（更复杂弹窗，不在 composable 内）。
 *
 * 用法：
 *   const { statusMap, statusOf, like, loadAll, loading } =
 *     useLotteryInteractions(() => ids)
 */

import { reactive, ref, onMounted } from 'vue'
import { fetchInteractionStatus, InteractionBizTypeEnum, thumbMoment } from '@/api/notify/moment-api'
import type { InteractionStatusItem } from '@/api/notify/moment-api'

export function useLotteryInteractions(
  getBizIds: () => string[]
) {
  const statusMap = reactive<Record<string, InteractionStatusItem>>({})
  const loading = ref(false)

  async function loadAll() {
    const ids = getBizIds()
    if (!ids.length) return
    try {
      const res = await fetchInteractionStatus(InteractionBizTypeEnum.LOTTERY, ids)
      for (const item of res?.items ?? []) {
        if (item?.bizId) statusMap[item.bizId] = item
      }
    } catch {
      // 弱依赖：失败不阻断展示
    }
  }
  onMounted(loadAll)

  function statusOf(bizId: string): InteractionStatusItem {
    return statusMap[bizId] ?? { bizId, bizType: InteractionBizTypeEnum.LOTTERY }
  }

  async function like(bizId: string) {
    if (loading.value) return
    loading.value = true
    const st = statusOf(bizId)
    const next = !Boolean(st.isLike)
    const res = await thumbMoment(bizId, next ? 1 : 2, {
      bizType: InteractionBizTypeEnum.LOTTERY,
      bizId,
    })
    loading.value = false
    if (res) {
      statusMap[bizId] = {
        ...st,
        isLike: next,
        likeCount: Math.max(0, Number(st.likeCount ?? 0) + (next ? 1 : -1)),
      }
    }
  }

  return { statusMap, statusOf, like, loadAll, loading }
}
