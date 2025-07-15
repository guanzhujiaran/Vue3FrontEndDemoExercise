import { ref } from 'vue'
import { defineStore } from 'pinia'
import { type LotDataWrapperProps, ParentLotDataTab } from '@/models/lottery/lotdata.ts'

export const useSamsclubStore = defineStore(
  'samsclub',
  () => {
    const isShowPriceEcharts = ref(false)
    return {
      isShowPriceEcharts
    }
  },
  {
    persist: {
      key: 'samsclub',
      storage: localStorage
    }
  }
)
