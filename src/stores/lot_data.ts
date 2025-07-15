import { ref } from 'vue'
import { defineStore } from 'pinia'
import { type LotDataWrapperProps, ParentLotDataTab } from '@/models/lottery/lotdata.ts'

export const useLotDataStore = defineStore(
  'lot-data-setting',
  () => {
    const max_col_num = ref(3)
    const last_show_lot_data_genre_tab = ref<ParentLotDataTab>(ParentLotDataTab.ScrapyStat)
    const last_show_bili_lot_data_tab = ref<LotDataWrapperProps['lot_name']>('GetLiveLottery')
    return {
      max_col_num,
      last_show_lot_data_genre_tab,
      last_show_bili_lot_data_tab
    }
  },
  {
    persist: {
      key: 'lot-data-setting',
      storage: localStorage
    }
  }
)
