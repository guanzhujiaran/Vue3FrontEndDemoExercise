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
  <grid-container class="bili-lottery-card-arr-container" item-width="400px">
    <div
      class="bili-lottery-card-wrapper"
      v-for="(item, idx) in parsedData"
      :key="idx"
      :style="{ '--card-index': idx }"
    >
      <BiliLotteryCard class="lottery-card" :lottery-data="item"></BiliLotteryCard>
      <el-divider></el-divider>
    </div>
  </grid-container>
</template>

<style scoped>
@import '@/assets/components/lottery/bili-lottery-card-container-tailwind.css';
</style>
