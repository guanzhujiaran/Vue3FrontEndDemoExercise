import { ref } from 'vue'
import { defineStore } from 'pinia'
import type { AnyLotteryData } from '@/models/api/lottery/lottery_card.ts'
import { InteractionBizTypeEnum, type CommentType } from '@/api/lottery_comment.ts'

/**
 * 抽奖评论区在新评论系统 (/api/v1/comment/*) 中使用的 type 值。
 * 直接使用 SDK 生成的 InteractionBizTypeEnum.LOTTERY（=2），不自行硬编码。
 */
export const LOTTERY_COMMENT_TYPE: CommentType = InteractionBizTypeEnum.LOTTERY

/**
 * 第三方抽奖动态评论区 type（=15，`others_lot_dyn`）。
 *
 * 第三方抽奖动态的 bizId 是 B 站动态 `dynId`，没有 `lotdata.lottery_id`，
 * 与抽奖卡片的 `LOTTERY` 是两个独立命名空间（后端评论、点赞、收藏、
 * 资源存在性校验与跳转均按 bizType 分流），故评论区 type 必须分开传。
 */
export const OTHERS_LOT_DYN_COMMENT_TYPE: CommentType = InteractionBizTypeEnum.OTHERS_LOT_DYN

/** 卡片归一化类型 → 互动 / 评论区 bizType（第三方抽奖动态单开命名空间，其余按 LOTTERY）。 */
export function interactionBizTypeOf(
  lotteryType: string | null | undefined
): InteractionBizTypeEnum {
  return lotteryType === 'THIRD_PARTY'
    ? InteractionBizTypeEnum.OTHERS_LOT_DYN
    : InteractionBizTypeEnum.LOTTERY
}

/**
 * 抽奖卡片详情页共享 store。
 * 列表页点击卡片时写入完整 lotteryData，便于详情页直接渲染卡片；
 * 同时通过 persist 落地 localStorage，支持刷新 / 直接通过 URL 进入。
 */
export const useLotteryDetailStore = defineStore(
  'lottery-detail',
  () => {
    const detailData = ref<AnyLotteryData | null>(null)

    const setDetail = (data: AnyLotteryData | null) => {
      detailData.value = data
    }

    return { detailData, setDetail }
  },
  {
    persist: {
      key: 'lottery-detail',
      storage: localStorage
    }
  }
)
