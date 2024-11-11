import { ref } from 'vue'
import { defineStore } from 'pinia'

export const useLotDataStore = defineStore(
  'lot-data-setting',
  () => {
    const max_col_num = ref(3)

    return { max_col_num }
  },
  {
    persist: {
      key: 'lot-data-setting',
      storage: localStorage
    }
  }
)
