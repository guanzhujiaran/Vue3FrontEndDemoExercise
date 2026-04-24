<script setup lang="ts">
import { computed } from 'vue'
import BiliLotteryCard from '@/components/lottery_data/bili_data/BiliLotteryCard.vue'
import type {
  DynamicLotteryData,
  ReservationLotteryData
} from '@/models/api/lottery/lottery_card.ts'

const lotteryDataArr = withDefaults(
  defineProps<{ data: (DynamicLotteryData | ReservationLotteryData)[] }>(),
  {
    data: () => []
  }
)
const parsedData = computed(() => {
  return lotteryDataArr.data.map((el) => el?.raw ?? el)
})
</script>

<template>
  
  <div class="bili-lottery-card-arr-container grid grid-cols-[repeat(auto-fit,minmax(min(100%,22rem),1fr))] gap-5 lg:gap-6">
    <div
      class="bili-lottery-card-wrapper rounded-xl bg-fill-light p-1"
      v-for="(item, idx) in parsedData"
      :key="idx"
      :style="{ '--card-index': idx }"
    >
      <BiliLotteryCard class="h-full" :lottery-data="item"></BiliLotteryCard>
    </div>
  </div>
</template>




