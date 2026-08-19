<script setup lang="ts">
import { computed, onMounted, reactive } from 'vue'
import BiliLotteryCard from '@/components/lottery_data/bili_data/BiliLotteryCard.vue'
import type {
  DynamicLotteryData,
  ReservationLotteryData,
  ReserveInfoFlatData
} from '@/models/api/lottery/lottery_card.ts'
import { normalizeLotteryData } from '@/utils/lotteryNormalization'
import { fetchInteractionStatus } from '@/api/notify/moment-api'
import type { InteractionStatusItemView as InteractionStatusItem } from '@/api/notify/moment-api'

const lotteryDataArr = withDefaults(
  defineProps<{ data: (DynamicLotteryData | ReservationLotteryData | ReserveInfoFlatData)[] }>(),
  {
    data: () => []
  }
)

// 批量互动状态：lotteryId -> InteractionStatusItem（容器层统一拉取，卡片不再各自查询）
const statusMap = reactive<Record<string, InteractionStatusItem>>({})

const parsedData = computed(() => {
  // 注意：extra_info 等附加信息放在响应对象的顶层，而非 raw 内部。
  // normalizeLotteryData 已自行处理 raw 解包，这里直接透传完整对象，
  // 避免 el.raw 解包把顶层 extra_info 丢掉导致卡片无法显示外观特效。
  return lotteryDataArr.data.map((el) => el)
})

/** 当前页所有 lotteryId（去重） */
const bizIds = computed(() => {
  const ids = new Set<string>()
  for (const d of parsedData.value) {
    try {
      ids.add(String(normalizeLotteryData(d as any).id))
    } catch {
      // 忽略无法归一化 id 的项
    }
  }
  return [...ids]
})

onMounted(async () => {
  if (bizIds.value.length === 0) return
  try {
    const res = await fetchInteractionStatus('lottery' as any, bizIds.value)
    for (const item of res?.items ?? []) {
      if (item?.bizId) statusMap[item.bizId] = item
    }
  } catch {
    // 弱依赖：批量拉取失败，卡片显示默认未互动状态
  }
})

/** 卡片点赞/收藏变更后更新容器状态（供同页其它卡片 / 后续回显一致） */
function handleStatusChange(payload: { bizId: string; status: Partial<InteractionStatusItem> }) {
  const prev = statusMap[payload.bizId] ?? { bizId: payload.bizId, bizType: 'lottery' } as InteractionStatusItem
  statusMap[payload.bizId] = { ...prev, ...payload.status }
}
</script>

<template>
  
  <div class="bili-lottery-card-arr-container">
    <div
      class="bili-lottery-card-wrapper p-0"
      v-for="(item, idx) in parsedData"
      :key="idx"
    >
      <BiliLotteryCard
        class="h-full"
        :lottery-data="item"
        :status="statusMap[String(normalizeLotteryData(item as any).id)]"
        @update-status="handleStatusChange"
      ></BiliLotteryCard>
    </div>
  </div>
</template>
