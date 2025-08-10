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
      <el-divider></el-divider>
    </div>
  </div>
</template>

<style scoped>
.bili-lottery-card-arr-container {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  justify-content: center;
}

.bili-lottery-card-wrapper {
  flex: 0 1 320px; /* 改为0，防止拉伸 */
  max-width: calc(50% - 0.5rem);
  min-height: 200px; /* 添加最小高度确保一致性 */
}

@media (max-width: 768px) {
  .bili-lottery-card-wrapper {
    max-width: 100%;
  }
}

.bili-lottery-card-wrapper {
  display: flex;
  flex-direction: column;
  transition: all 0.3s ease;
}

.lottery-card {
  flex-grow: 1;
}

.bili-lottery-card-wrapper:hover {
  transform: translateY(-10px);
  box-shadow: 0 10px 20px rgba(0, 0, 0, 0.1);
}
</style>
