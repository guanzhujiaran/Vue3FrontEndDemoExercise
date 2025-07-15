import { defineStore } from 'pinia'

export const useBiliLotteryRecord = defineStore(
  'bili-lottery-record',
  () => {
    const max_record_lottery_num = ref(100)
    const lottery_id_ls_ref = ref<string[]>([])
    const lottery_id_set = computed(() => new Set<string>(lottery_id_ls_ref.value))
    const enqueue = (item: string) => {
      if (lottery_id_set.value.has(item)) {
        return // 如果元素已存在，则不添加
      }
      // 如果队列已满，移除最旧的元素
      while (lottery_id_ls_ref.value.length >= max_record_lottery_num.value) {
        lottery_id_ls_ref.value.shift() // 移除队列头部元素
      }
      lottery_id_ls_ref.value.push(item)
    }
    const remove = (item: string) => {
      if (!lottery_id_set.value.has(item)) {
        return false // 元素不存在，直接返回 false
      }

      // 从队列中移除该元素
      lottery_id_ls_ref.value = lottery_id_ls_ref.value.filter((x) => x !== item)
      return true
    }
    const contains = (item: string) => {
      return lottery_id_set.value.has(item) // 使用 Set 查找，时间复杂度 O(1)
    }
    return {
      max_record_lottery_num,
      lottery_id_set_ref: lottery_id_set,
      lottery_id_ls_ref,
      enqueue,
      remove,
      contains
    }
  },
  {
    persist: {
      key: 'bili-lottery-record',
      storage: localStorage
    }
  }
)
