<script setup lang="ts">
import BiliLotteryCard from '@/components/lottery_data_statistic/bili_data/BiliLotteryCard.vue'
import type { DynamicLotteryData, ReservationLotteryData } from '@/models/lottery/lottery_card.ts'

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
  <div class="bili-lottery-card-arr-container">
    <div class="bili-lottery-card-wrapper" v-for="(item, idx) in parsedData" :key="idx">
      <BiliLotteryCard class="lottery-card" :lottery-data="item"></BiliLotteryCard>
    </div>
  </div>
</template>

<style scoped>
.bili-lottery-card-arr-container {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  white-space: nowrap;
}

.bili-lottery-card-wrapper {
  width: 20%;
  min-width: 380px;
  padding: 0.1rem;
  display: inline-block;
}
</style>
