import { ref } from 'vue'
import { defineStore } from 'pinia'
import { Device, Theme } from '@/models/store/device_system.ts'

export const useTourTipStore = defineStore(
  'tour-tip',
  () => {
    const isBiliRankTourActivated = ref(true) // 是否需要激活中奖排行榜的tour引导
    const isBiliRankUserAtariDetailActive = ref(true) // 是否需要激活中奖排行榜的用户中奖详情引导
    return { isBiliRankTourActivated, isBiliRankUserAtariDetailActive }
  },
  {
    persist: {
      key: 'device-system',
      storage: localStorage
    }
  }
)
