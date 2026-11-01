<script setup lang="ts">
import { computed, reactive, watch } from 'vue'
import BiliLotteryCard from '@/components/lottery_data/bili_data/BiliLotteryCard.vue'
import type {
  AnyLotteryData,
  DynamicLotteryData,
  NormalizedLottery,
  ReservationLotteryData,
  ReserveInfoFlatData
} from '@/models/api/lottery/lottery_card.ts'
import { normalizeLotteryData } from '@/utils/lotteryNormalization'
import { interactionBizTypeOf } from '@/stores/lottery_detail.ts'
import { isNumericBizId, InteractionBizTypeEnum } from '@/api/notify/moment-api'
import type { InteractionStatusItem } from '@/api/notify/moment-api'
import { fetchInteractionStatusMap } from '@/utils/lotteryInteractionStatus'

const lotteryDataArr = withDefaults(
  defineProps<{ data: (DynamicLotteryData | ReservationLotteryData | ReserveInfoFlatData)[] }>(),
  {
    data: () => []
  }
)

// 批量互动状态：`{bizType}:{bizId}` -> InteractionStatusItem
// （容器层统一拉取，卡片不再各自查询；bizType 参与 key，避免 lottery / others_lot_dyn 混用）
const statusMap = reactive<Record<string, InteractionStatusItem>>({})

/** 当前页每条数据的归一化结果（渲染 + 状态拉取共用，避免重复归一化） */
const normalizedEntries = computed(() => {
  const out: Array<{ id: string; bizType: InteractionBizTypeEnum; raw: AnyLotteryData; normalized: NormalizedLottery }> = []
  for (const raw of lotteryDataArr.data) {
    try {
      // extra_info 等附加信息放在响应对象顶层（而非 raw 内部），normalizeLotteryData 自行处理 unwrap，
      // 这里透传完整对象，避免额外 unwrap 把顶层 extra_info 丢掉导致卡片无法显示外观特效。
      const normalized = normalizeLotteryData(raw as AnyLotteryData)
      out.push({
        id: String(normalized.id),
        bizType: interactionBizTypeOf(normalized.type),
        raw: raw as AnyLotteryData,
        normalized
      })
    } catch {
      // 忽略无法归一化 id 的项
    }
  }
  return out
})

/**
 * 按互动 bizType 分组的当前页资源 id（去重）。
 *
 * 第三方抽奖动态（THIRD_PARTY）走 `others_lot_dyn`（bizId = dynId），
 * 官方 / 预约 / 充电 / 话题等走 `lottery`（bizId = lottery_id）。
 * 两类必须分开发请求：bizType 决定后端读写的是哪个命名空间（计数 / 明细 / 评论区都按它挂），
 * 混用会把状态挂到错误资源上（写接口还会被后端判「资源不存在」而 400）。
 */
const idsByBizType = computed(() => {
  const groups = new Map<InteractionBizTypeEnum, string[]>()
  for (const entry of normalizedEntries.value) {
    // 非数字 ID（旧数据兜底 / 未知类型 'N/A'）不能进批量互动态请求：
    // 后端逐段 int() 校验，混入会整批 400「bizIds 不合法」
    if (!isNumericBizId(entry.id)) continue
    const arr = groups.get(entry.bizType) ?? []
    if (!arr.includes(entry.id)) arr.push(entry.id)
    groups.set(entry.bizType, arr)
  }
  return groups
})

/** 卡片 id → bizType（状态回写时补默认 bizType 用；同页同一 id 不会属于两个类型） */
const bizTypeById = computed(() => {
  const m = new Map<string, InteractionBizTypeEnum>()
  for (const entry of normalizedEntries.value) m.set(entry.id, entry.bizType)
  return m
})

const statusKeyOf = (entry: { id: string; bizType: InteractionBizTypeEnum }) =>
  `${entry.bizType}:${entry.id}`

// 切页（分页/翻页 data 变化）时重新拉取本页互动状态：
// watch 分组后的 key（内容不变去重跳过、空页清空）；
// 请求序号 guard 丢弃过期响应，避免快速切页时旧页结果覆盖新页。
let lastLoadedKey = ''
let loadSeq = 0
watch(
  computed(() =>
    [...idsByBizType.value.entries()]
      .map(([bt, ids]) => `${bt}:${ids.slice().sort().join(',')}`)
      .sort()
      .join('|')
  ),
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
      // 按 bizType 分组 + 按后端 50 上限分片统一在工具里处理（超出会被后端静默截断）；
      // 弱依赖：单个分片失败只丢该片数据，不影响其它卡片展示
      const fetched = await fetchInteractionStatusMap(
        [...idsByBizType.value.entries()].flatMap(([bizType, ids]) =>
          ids.map((bizId) => ({ bizType, bizId }))
        )
      )
      if (seq !== loadSeq) return // 过期响应（期间又切页）丢弃
      // 整页替换：清掉旧状态再写入新页
      for (const k of Object.keys(statusMap)) delete statusMap[k]
      Object.assign(statusMap, fetched)
    } catch {
      lastLoadedKey = '' // 拉取失败：允许下次（切页/内容变化）重试
      // 弱依赖：失败不清空已展示状态
    }
  },
  { immediate: true }
)

/** 卡片点赞/收藏变更后更新容器状态（供同页其它卡片 / 后续回显一致） */
function handleStatusChange(payload: { bizId: string; status: Partial<InteractionStatusItem> }) {
  const bizType = bizTypeById.value.get(payload.bizId) ?? InteractionBizTypeEnum.LOTTERY
  const key = `${bizType}:${payload.bizId}`
  const prev = statusMap[key] ?? { bizId: payload.bizId, bizType }
  statusMap[key] = { ...prev, ...payload.status }
}
</script>

<template>
  <div class="bili-lottery-card-arr-container">
    <div
      class="bili-lottery-card-wrapper p-0"
      v-for="entry in normalizedEntries"
      :key="statusKeyOf(entry)"
    >
      <BiliLotteryCard
        class="h-full"
        :lottery-data="entry.raw"
        :status="statusMap[statusKeyOf(entry)]"
        @update-status="handleStatusChange"
      ></BiliLotteryCard>
    </div>
  </div>
</template>
