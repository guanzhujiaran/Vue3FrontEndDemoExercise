/**
 * 抽奖互动组合式函数（2.20.0，2.61.0 支持多 bizType）：
 * 批量拉取互动状态 + 点赞。
 *
 * 互动目标按 `bizType` 分流：
 * - 官方 / 预约 / 充电 / 话题等抽奖卡片走 `lottery`（bizId = lotdata.lottery_id）；
 * - 第三方抽奖动态走 `others_lot_dyn`（bizId = t_lotdyninfo.dynId）。
 * 两者是两个独立命名空间（计数 / 明细 / 评论区都按 bizType 挂），必须分别请求，
 * 否则状态会挂到错误资源上（写接口还会被后端判「资源不存在」而 400）。
 *
 * 收藏统一由组件层 MomentFavoriteDialog（收藏夹选择弹窗）处理，本 composable 不再直接收藏。
 * 转发到动态由组件层 MomentPublishForm（attach 资源模式）处理（更复杂弹窗，不在 composable 内）。
 *
 * 用法：
 *   const { statusMap, statusOf, like, loadAll, loading } =
 *     useLotteryInteractions(() => targets)   // targets: { bizType, bizId }[]
 */

import { reactive, ref, onMounted } from 'vue'
import { fetchInteractionStatus, InteractionBizTypeEnum, thumbMoment } from '@/api/notify/moment-api'
import type { InteractionStatusItem } from '@/api/notify/moment-api'

/** 一次互动的目标资源（bizType + bizId 唯一确定内容） */
export interface InteractionTarget {
  bizType: InteractionBizTypeEnum
  bizId: string
}

export function useLotteryInteractions(
  getTargets: () => InteractionTarget[]
) {
  // key = `${bizType}:${bizId}`（bizType 参与 key，避免两个命名空间互相覆盖）
  const statusMap = reactive<Record<string, InteractionStatusItem>>({})
  const loading = ref(false)

  const keyOf = (bizType: InteractionBizTypeEnum, bizId: string) => `${bizType}:${bizId}`

  async function loadAll() {
    const targets = (getTargets() ?? []).filter((t) => t?.bizId)
    if (!targets.length) return
    // 按 bizType 分组，每组一次批量接口
    const groups = new Map<InteractionBizTypeEnum, string[]>()
    for (const t of targets) {
      const arr = groups.get(t.bizType) ?? []
      if (!arr.includes(t.bizId)) arr.push(t.bizId)
      groups.set(t.bizType, arr)
    }
    try {
      const results = await Promise.all(
        [...groups.entries()].map(async ([bizType, ids]) => ({
          bizType,
          res: await fetchInteractionStatus(bizType, ids).catch(() => null)
        }))
      )
      for (const { bizType, res } of results) {
        for (const item of res?.items ?? []) {
          if (item?.bizId) statusMap[keyOf(bizType, item.bizId)] = item
        }
      }
    } catch {
      // 弱依赖：失败不阻断展示
    }
  }
  onMounted(loadAll)

  function statusOf(
    bizId: string,
    bizType: InteractionBizTypeEnum = InteractionBizTypeEnum.LOTTERY
  ): InteractionStatusItem {
    return statusMap[keyOf(bizType, bizId)] ?? { bizId, bizType }
  }

  async function like(
    bizId: string,
    bizType: InteractionBizTypeEnum = InteractionBizTypeEnum.LOTTERY
  ) {
    if (loading.value) return
    loading.value = true
    const st = statusOf(bizId, bizType)
    const next = !Boolean(st.isLike)
    const res = await thumbMoment(bizId, next ? 1 : 2, { bizType, bizId })
    loading.value = false
    if (res) {
      statusMap[keyOf(bizType, bizId)] = {
        ...st,
        isLike: next,
        likeCount: Math.max(0, Number(st.likeCount ?? 0) + (next ? 1 : -1))
      }
    }
  }

  return { statusMap, statusOf, like, loadAll, loading }
}
