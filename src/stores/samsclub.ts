import { ref } from 'vue'
import { defineStore } from 'pinia'
export const useSamsclubStore = defineStore(
  'samsclub',
  () => {
    const isShowPriceEcharts = ref(false)
    
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
      storage: localStorage
    }
  }
)
