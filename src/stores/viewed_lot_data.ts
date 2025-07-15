import { ref } from 'vue'
import { defineStore } from 'pinia'

// 定义Store
export const useViewedLotDataStore = defineStore(
  'viewed-lot-data',
  () => {
    // 初始化两种不同类型的已浏览抽奖数据列表
    const viewed_official_charge_lot_data = ref<any[]>([]) // 官方和充电类型使用同一个list，因为它们都用lottery_id
    const viewed_reserve_lot_data = ref<any[]>([]) // 预约类型单独使用一个list

    /**
     * 统一的添加方法，type可以是'official_charge'或'reserve'.
     * @param type - 类型标识符，'official_charge' 或 'reserve'.
     * @param lot_data - 包含抽奖信息的对象，类型为 any.
     */
    const handleAddLotData = (type: 'official_charge' | 'reserve', lot_data: any) => {
      let list =
        type === 'official_charge' ? viewed_official_charge_lot_data : viewed_reserve_lot_data
      if (!isLotDataExisted(type, lot_data)) {
        if (list.value.length > 500) {
          list.value.shift() // 移除最早的记录以保持记录数量不超过500
        }
        list.value.push(lot_data)
      }
    }

    /**
     * 统一的存在性检查方法.
     * @param type - 类型标识符，'official_charge' 或 'reserve'.
     * @param lot_data - 包含抽奖信息的对象，类型为 any.
     * @returns 如果找到匹配项，则返回 true；否则返回 false.
     */
    const isLotDataExisted = (type: 'official_charge' | 'reserve', lot_data: any): boolean => {
      let list =
        type === 'official_charge' ? viewed_official_charge_lot_data : viewed_reserve_lot_data
      const identifier = type === 'official_charge' ? 'lottery_id' : 'reserve_sid'
      return list.value.some((item) => item[identifier] === lot_data[identifier])
    }

    return {
      add_lot_data: handleAddLotData,
      is_lot_data_existed: isLotDataExisted,
      viewed_official_charge_lot_data,
      viewed_reserve_lot_data
    }
  },
  {
    persist: {
      key: 'viewed-lot-data', // 确保这里的key与store的id一致或根据实际情况调整
      storage: localStorage
    }
  }
)
