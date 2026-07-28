<script setup lang="ts">
import { computed } from 'vue'
import BiliLotteryCard from '@/components/lottery_data/bili_data/BiliLotteryCard.vue'
import type {
  DynamicLotteryData,
  ReservationLotteryData,
  ReserveInfoFlatData
} from '@/models/api/lottery/lottery_card.ts'

const lotteryDataArr = withDefaults(
  defineProps<{ data: (DynamicLotteryData | ReservationLotteryData | ReserveInfoFlatData)[] }>(),
  {
    data: () => []
  }
)
const parsedData = computed(() => {
  // 注意：extra_info 等附加信息放在响应对象的顶层，而非 raw 内部。
  // normalizeLotteryData 已自行处理 raw 解包，这里直接透传完整对象，
  // 避免 el.raw 解包把顶层 extra_info 丢掉导致卡片无法显示外观特效。
  return lotteryDataArr.data.map((el) => el)
})
</script>

<template>
  
  <div class="bili-lottery-card-arr-container">
    <div
      class="bili-lottery-card-wrapper p-0"
      v-for="(item, idx) in parsedData"
      :key="idx"
    >
      <BiliLotteryCard class="h-full" :lottery-data="item"></BiliLotteryCard>
    </div>
  </div>
</template>




