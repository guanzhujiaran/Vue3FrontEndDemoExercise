<script setup lang="ts">
import { computed, reactive, watch } from 'vue'
import BiliLotteryCard from '@/components/lottery_data/bili_data/BiliLotteryCard.vue'
import type {
  DynamicLotteryData,
  ReservationLotteryData,
  ReserveInfoFlatData
} from '@/models/api/lottery/lottery_card.ts'
import { normalizeLotteryData } from '@/utils/lotteryNormalization'
import { fetchInteractionStatus, InteractionBizTypeEnum } from '@/api/notify/moment-api'
import type { InteractionStatusItem } from '@/api/notify/moment-api'

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

// 切页（分页/翻页 data 变化）时重新拉取本页互动状态：
// watch bizKey（bizIds 排序后拼接），内容不变去重跳过、空页清空；
// 请求序号 guard 丢弃过期响应，避免快速切页时旧页结果覆盖新页。
let lastLoadedKey = ''
let loadSeq = 0
watch(
  computed(() => bizIds.value.slice().sort().join(',')),
  async (key) => {
    const seq = ++loadSeq
    if (!key) {
      lastLoadedKey = ''
      for (const k of Object.keys(statusMap)) delete statusMap[k]
      return
    }
    if (key === lastLoadedKey) return
    lastLoadedKey = key
    try {
      const res = await fetchInteractionStatus(InteractionBizTypeEnum.LOTTERY, bizIds.value)
      if (seq !== loadSeq) return // 过期响应（期间又切页）丢弃
      // 整页替换：清掉旧状态再写入新页
      for (const k of Object.keys(statusMap)) delete statusMap[k]
      for (const item of res?.items ?? []) {
        if (item?.bizId) statusMap[item.bizId] = item
      }
    } catch {
      lastLoadedKey = '' // 拉取失败：允许下次（切页/内容变化）重试
      // 弱依赖：失败不清空已展示状态
    }
  },
  { immediate: true }
)

/** 卡片点赞/收藏变更后更新容器状态（供同页其它卡片 / 后续回显一致） */
function handleStatusChange(payload: { bizId: string; status: Partial<InteractionStatusItem> }) {
  const prev = statusMap[payload.bizId] ?? { bizId: payload.bizId, bizType: InteractionBizTypeEnum.LOTTERY }
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
