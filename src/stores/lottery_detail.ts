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
