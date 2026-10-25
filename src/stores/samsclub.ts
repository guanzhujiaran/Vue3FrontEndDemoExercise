import { ref } from 'vue'
import { defineStore } from 'pinia'
import { browserPersistStorage } from '@/utils/persistStorage'
export const useSamsclubStore = defineStore(
  'samsclub',
  () => {
    const isShowPriceEcharts = ref(true)

    // 切换价格图表显示状态
    const togglePriceEcharts = () => {
      isShowPriceEcharts.value = !isShowPriceEcharts.value
    }

    return {
      isShowPriceEcharts,
      togglePriceEcharts
    }
  },
  {
    persist: {
      key: 'samsclub',
      storage: browserPersistStorage
    }
  }
)
