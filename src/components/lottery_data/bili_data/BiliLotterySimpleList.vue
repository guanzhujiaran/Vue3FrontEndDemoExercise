<template>
  <div class="bili-lottery-simple-list">
    <div
      class="grid gap-3 grid-cols-[repeat(auto-fill,minmax(220px,1fr))]"
    >
      <div
        v-for="(item, idx) in parsedData"
        :key="getKey(item, idx)"
        class="simple-card group cursor-pointer rounded-lg border border-border-light bg-bg-page p-3 min-h-[110px] transition-colors hover:border-primary hover:bg-fill-lighter"
        :class="{ 'simple-card-grand-prize': item.normalized.extraInfo?.is_grand_prize }"
        @click="openDetail(item)"
      >
        <!-- 类型 + 状态 小标识 -->
        <div class="mb-2 flex flex-wrap items-center gap-2">
          <span class="inline-flex items-center gap-1 bg-fill-lighter px-2 py-0.5 border border-border-light rounded-full font-medium text-text-secondary text-xs">
            <BiliStatusIcon :icon="item.normalized.statusType" :popover_text="item.normalized.statusText" />
            {{ item.normalized.displayType }}
          </span>
          <span
            class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-medium text-xs border"
            :class="item.participated
              ? 'bg-success-light-9 border-success text-success'
              : 'bg-fill-lighter border-border-light text-text-secondary'"
          >
            <span
              class="inline-block h-1.5 w-1.5 rounded-full"
              :class="item.participated ? 'bg-success' : 'bg-text-placeholder'"
            ></span>
            {{ item.participated ? '已参加' : '未参加' }}
          </span>
          <span
            v-if="item.normalized.extraInfo?.is_grand_prize"
            class="ml-auto inline-flex items-center bg-amber-50 px-2 py-0.5 border border-amber-400 rounded-full font-medium text-amber-700 text-xs"
          >
            大奖
          </span>
        </div>

        <!-- 抽奖名称 -->
        <p
          class="line-clamp-2 font-medium text-text-primary text-sm leading-relaxed wrap-break-word"
          :title="item.normalized.title"
        >
          {{ item.normalized.title }}
        </p>

        <div class="mt-2 text-xs text-text-placeholder">ID: {{ item.normalized.id }}</div>

        <!-- 跳转连接（点击链接不触发卡片弹窗） -->
        <div class="mt-3 flex flex-wrap items-center gap-3" @click.stop>
          <el-link
            v-if="item.normalized.sourceLink"
            type="primary"
            :href="item.normalized.sourceLink"
            target="_blank"
            rel="noreferrer"
            underline="never"
            icon="link"
            class="text-xs!"
            @click="handleLinkClick(item.normalized)"
          >
            查看源动态
          </el-link>
          <el-link
            v-if="item.normalized.resultLink"
            type="primary"
            :href="item.normalized.resultLink"
            target="_blank"
            rel="noreferrer"
            underline="never"
            icon="link"
            class="text-xs!"
            @click="handleLinkClick(item.normalized)"
          >
            抽奖详情
          </el-link>
        </div>
      </div>
    </div>

    <el-dialog
      v-model="detailVisible"
      align-center
      width="680px"
      class="lottery-detail-dialog"
      :title="selectedNormalized?.title"
      append-to-body
    >
      <BiliLotteryCard v-if="selectedRaw" :lottery-data="selectedRaw" />
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import BiliLotteryCard from '@/components/lottery_data/bili_data/BiliLotteryCard.vue'
import BiliStatusIcon from '@/components/CommonCompo/Bili-Status-Compo/BiliStatusIcon.vue'
import { normalizeLotteryData } from '@/utils/lotteryNormalization.ts'
import { handleLotteryLinkClick, isLotteryParticipated } from '@/utils/lotteryParticipation'

interface SimpleListItem {
  raw: any
  normalized: ReturnType<typeof normalizeLotteryData>
  participated: boolean
}

const props = withDefaults(
  defineProps<{ data: any[] }>(),
  { data: () => [] }
)

const parsedData = computed<SimpleListItem[]>(() =>
  props.data.map((el) => {
    // 透传完整对象：extra_info 等附加信息在响应顶层，normalizeLotteryData 内部会自行处理 raw 解包
    const raw = el
    const normalized = normalizeLotteryData(raw)
    return { raw, normalized, participated: isLotteryParticipated(String(normalized.id)) }
  })
)

const getKey = (item: SimpleListItem, idx: number): string =>
  `${item.normalized.id ?? 'noid'}-${idx}`

const detailVisible = ref(false)
const selectedRaw = ref<any>(null)
const selectedNormalized = computed(() =>
  selectedRaw.value ? normalizeLotteryData(selectedRaw.value) : null
)

const openDetail = (item: SimpleListItem) => {
  selectedRaw.value = item.raw
  detailVisible.value = true
}

const handleLinkClick = (normalized: SimpleListItem['normalized']) => {
  handleLotteryLinkClick(String(normalized.id))
}
</script>
