<template>
  <section ref="rootEl" class="upcoming-lottery-marquee flex flex-col gap-2">
    <!-- 标题行：类型徽标 + 24 小时口径 + 最近一场倒计时 -->
    <div class="upcoming-lottery-marquee__header flex flex-wrap items-center gap-2">
      <el-text class="upcoming-lottery-marquee__title m-0 flex items-center gap-1.5 text-sm font-semibold text-text-primary" tag="h3">
        <el-icon><Timer /></el-icon>
        {{ displayTitle }}
      </el-text>
      <el-tag size="large" type="info" effect="plain" round>24 小时内开奖</el-tag>
      <span v-if="total" class="text-xs text-text-placeholder">
        共 {{ total }} 场 · 最近一场{{ remainText(soonestTime) }}
      </span>
    </div>

    <!-- 抽奖数据统计：与即将开奖复用同一次 getLotterySummary 查询，不额外请求 -->
    <div class="upcoming-lottery-marquee__summary grid grid-cols-2 gap-2">
      <div
        v-for="card in summaryCards"
        :key="card.key"
        class="upcoming-lottery-marquee__summary-card flex items-center gap-2 rounded-lg border border-border-light bg-primary-light-9 p-2"
      >
        <span class="upcoming-lottery-marquee__summary-icon flex h-8 w-8 shrink-0 items-center justify-center rounded-lg" :class="card.iconClass">
          <el-icon><component :is="card.icon" /></el-icon>
        </span>
        <div class="flex min-w-0 flex-col">
          <span class="upcoming-lottery-marquee__summary-label truncate text-xs text-text-secondary">{{ card.label }}</span>
          <span class="upcoming-lottery-marquee__summary-value text-base font-semibold text-text-primary">{{ summaryText(card.value) }}</span>
        </div>
      </div>
    </div>

    <!-- 通用分页数据视图：内置首屏骨架屏 / 翻页 v-loading 遮罩 / 空态 / 错误态（带重试）/ 分页器，
         与普通抽奖列表同一套外观；内容槽放小卡片列表（每页 = 列数 × 2 行，服务端分页）。 -->
    <BiliPaginationDataView
      class="upcoming-lottery-marquee__pager-area"
      :data="pageItems"
      :total="total"
      :page_size="pageSize"
      v-model:CurrentPage="currentPage"
      v-model:Loading="loading"
      v-model:Error="error"
      :EmptyMsg="`24 小时内暂无即将开奖的${typeLabelSuffix}`"
      :ErrorMsg="'即将开奖数据加载失败'"
      :show-mount-toast="false"
      @on-mounted="onViewMounted"
      @retry-on-error="loadPage(true)"
    >
      <template #contents>
        <BiliLotterySimpleList
          class="upcoming-lottery-marquee__page"
          :class="pageGridClass"
          :data="pageItems"
          :initial-status="statusMap"
        />
      </template>
    </BiliPaginationDataView>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch, type Component } from 'vue'
import { useRuntimeConfig } from 'nuxt/app'
import { Timer, DataAnalysis, Warning, Trophy } from '@element-plus/icons-vue'
import BiliLotterySimpleList from '@/components/lottery_data/bili_data/BiliLotterySimpleList.vue'
import lotteryDataBaseApi from '@/api/lottery_data/bili/lottery_database_bili_api'
import type { InteractionStatusItem } from '@/api/notify/moment-api'
import {
  fetchInteractionStatusMap,
  lotteryCardInteractionTargets,
} from '@/utils/lotteryInteractionStatus'

/** 抽奖类型标识：与后端 LotterySummaryRow.key / UpcomingLotteryItem.key 对齐 */
export type UpcomingLotteryType = 'official' | 'reserve' | 'charge' | 'topic' | 'others_dyn'

const props = withDefaults(
  defineProps<{
    /** 抽奖类型；不传则为通用组件（全部类型） */
    lotteryType?: UpcomingLotteryType
    /** 标题文案，默认按类型自动生成 */
    title?: string
  }>(),
  {}
)

/** 24 小时窗口（秒） */
const UPCOMING_WINDOW_SECONDS = 24 * 3600

// 布局：按**容器实际宽度**是否达到前端最小布局宽度（runtimeConfig.public.minLayoutWidth，
// 默认 690px，可用 NUXT_PUBLIC_MIN_LAYOUT_WIDTH 覆盖）切换 4 列 / 2 列；
// 每页 2 行卡片（张数 = 列数 × 2），分页翻阅 24h 内全部抽奖。
// 容器宽度由 ResizeObserver 实测（首页左栏 2/3 宽、管理页全宽不同）。
// 首帧统一按窄列渲染（columns 初始 2），挂载后实测更新，SSR 与客户端首帧一致。
const runtimeConfig = useRuntimeConfig()
const minLayoutWidth = computed(() => Number(runtimeConfig.public.minLayoutWidth) || 690)
const columns = ref(2)
/** 每页张数 = 列数 × 2 行（4 列 8 张 / 2 列 4 张） */
const pageSize = computed(() => columns.value * 2)
/** 网格列数 class（Tailwind 无法扫描动态拼接类名，这里预置两种） */
const pageGridClass = computed(() =>
  columns.value >= 4 ? '[&>div]:grid-cols-4' : '[&>div]:grid-cols-2'
)

// ============ 列数自适应 ============
// 分页布局是普通文档流，不再需要像以前给 el-carousel 显式算高度；只需实测容器宽度定列数。
const rootEl = ref<HTMLElement | null>(null)
let resizeObserver: ResizeObserver | null = null

function syncColumns() {
  if (!rootEl.value) return
  columns.value = rootEl.value.offsetWidth >= minLayoutWidth.value ? 4 : 2
}

const TYPE_LABELS: Record<UpcomingLotteryType, string> = {
  official: '官方抽奖',
  reserve: '预约抽奖',
  charge: '充电抽奖',
  topic: '话题抽奖',
  others_dyn: '第三方动态抽奖'
}

/** 明细加载态（交给通用分页视图：首屏骨架屏 → 翻页 v-loading 遮罩） */
const loading = ref(true)
/** 明细错误态（交给通用分页视图的错误态 + 重试） */
const error = ref(false)
/** 即将开奖统计（summary 只取统计行；明细走独立分页接口） */
const summaryCounts = ref<Record<string, number | null>>({})
/** 当前页卡片（服务端分页：一次只持有当前页，不再拉全量） */
const details = ref<any[]>([])
/** 窗口内总条数（分页接口返回的 total，驱动分页器） */
const total = ref(0)
/** 当前页码（页码变化只查当前页，与普通抽奖列表同一范式） */
const currentPage = ref(1)
/** 当前页卡片的互动态：一次批量拉取后注入卡片列表（不再每张卡片各发一次） */
const statusMap = ref<Record<string, InteractionStatusItem> | null>(null)
/** 每秒推进的“当前时间”，驱动剩余时间倒计时 / 已开奖项隐藏 */
const nowTs = ref(Math.floor(Date.now() / 1000))
let timer: ReturnType<typeof setInterval> | null = null

/**
 * 当前页可展示卡片：后端已按 24h 窗口 + 类型过滤，这里只兜底隐藏「已过开奖时间」的项
 * （倒计时跨过开奖时刻后即时从列表消失，无需重新请求）。
 */
const pageItems = computed(() =>
  details.value.filter((card) => {
    const ts = Number(card?.raw?.lottery_time ?? 0)
    return Number.isFinite(ts) && ts > nowTs.value && ts <= nowTs.value + UPCOMING_WINDOW_SECONDS
  })
)

/** 最近一场的开奖时间（倒计时展示用） */
const soonestTime = computed(() => Number(pageItems.value[0]?.raw?.lottery_time ?? 0))

/** 抽奖数据统计卡（复用 summary 查询结果，口径仅官方/预约/充电三类） */
interface SummaryCard {
  key: string
  label: string
  hint?: string
  icon: Component
  iconClass: string
  value: number | null
}
const SUMMARY_DOMAINS: Array<Omit<SummaryCard, 'value'>> = [
  { key: 'not_drawn', label: '未开奖', hint: '还没到开奖时间', icon: DataAnalysis, iconClass: 'bg-primary-light-9 text-primary' },
  { key: 'soon_24h', label: '24h 内即将开奖', icon: Timer, iconClass: 'bg-warning-light-9 text-warning' },
  { key: 'pending_result', label: '待抓结果积压', hint: '已过开奖时间未抓到结果', icon: Warning, iconClass: 'bg-danger-light-9 text-danger' },
  { key: 'grand_prize', label: '大奖数量', hint: '大模型判定为大奖', icon: Trophy, iconClass: 'bg-success-light-9 text-success' }
]
const summaryCards = computed<SummaryCard[]>(() =>
  SUMMARY_DOMAINS.map((domain) => ({ ...domain, value: summaryCounts.value[domain.key] ?? null }))
)

function summaryText(value: number | null): string {
  // 统计行未就绪（summary 未返回 / 失败）显示占位，不再借用明细 loading（翻页时会把统计卡刷成省略号）
  return value === null ? '—' : value.toLocaleString('zh-CN')
}

const displayTitle = computed(
  () => props.title ?? (props.lotteryType ? `${TYPE_LABELS[props.lotteryType]}·即将开奖` : '即将开奖')
)
const typeLabelSuffix = computed(() => (props.lotteryType ? TYPE_LABELS[props.lotteryType] : '抽奖'))

/** 剩余时间：x小时x分 / x分 */
function remainText(ts: number): string {
  if (!ts) return '—'
  const diff = ts - nowTs.value
  if (diff <= 0) return '已开奖'
  const hours = Math.floor(diff / 3600)
  const minutes = Math.floor((diff % 3600) / 60)
  if (hours > 0) return `还剩 ${hours}小时${minutes}分`
  return `还剩 ${minutes}分`
}

/** 抽奖数据统计卡：复用 summary 的统计行（口径仅 lotdata 三类：official/reserve/charge） */
async function loadSummary() {
  try {
    const resp = await lotteryDataBaseApi.getLotterySummary()
    if (resp.code === 0 && resp.data) {
      const rows = (resp.data.rows ?? []).filter((row) =>
        ['official', 'reserve', 'charge'].includes(row.key)
      )
      const sumOf = (pick: (row: (typeof rows)[number]) => number | null) =>
        rows.reduce((acc, row) => acc + (pick(row) ?? 0), 0)
      summaryCounts.value = {
        not_drawn: sumOf((r) => r.not_drawn),
        soon_24h: sumOf((r) => r.drawing_soon_24h),
        pending_result: sumOf((r) => r.pending_result),
        grand_prize: sumOf((r) => r.grand_prize)
      }
    } else {
      summaryCounts.value = {}
    }
  } catch {
    // 静默：统计卡只是旁路信息，拉取失败不影响明细展示
    summaryCounts.value = {}
  }
}

/**
 * 请求签名：页码 + 每页张数 + 类型。挂载时列数实测会让 `pageSize` 从 2 列变 4 列，
 * watcher 与 onMounted 可能对同一份参数各触发一次（表现为明细 + 互动态各请求两次），
 * 因此按签名去重：同参数在途 / 已完成都不重复发。
 */
let inflightSignature = ''
let loadedSignature = ''

function requestSignature(): string {
  return `${currentPage.value}|${pageSize.value}|${props.lotteryType ?? ''}`
}

/**
 * 取当前页即将开奖明细（`GetUpcomingLottery`，与普通抽奖列表同一分页范式）。
 *
 * 每条明细自带卡片 `raw` + `extra_info`（2.67.0），首页不调用 detail 域接口；
 * 互动态只对当前页批量查（`/interaction/status`，只读，不累计浏览）。
 *
 * @param force 错误页「重试」时忽略签名去重，强制重发。
 */
async function loadPage(force = false) {
  const signature = requestSignature()
  if (!force && (signature === inflightSignature || signature === loadedSignature)) return
  inflightSignature = signature
  error.value = false
  loading.value = true
  try {
    const resp = await lotteryDataBaseApi.getUpcomingLottery({
      pageNum: currentPage.value,
      pageSize: pageSize.value,
      key: props.lotteryType,
      withinHours: UPCOMING_WINDOW_SECONDS / 3600
    })
    if (resp.code === 0 && resp.data) {
      total.value = resp.data.total ?? 0
      details.value = (resp.data.items ?? [])
        .filter((item) => item.raw)
        .map((item) => ({ raw: item.raw, extra_info: item.extra_info ?? null }))
      // 数据变少导致当前页越界（例如倒计时跨过边界后条数减少）→ 回到最后一页重查
      const maxPage = Math.max(1, Math.ceil(total.value / pageSize.value))
      if (currentPage.value > maxPage) {
        currentPage.value = maxPage
        return
      }
      loadedSignature = signature
      statusMap.value = details.value.length
        ? await fetchInteractionStatusMap(lotteryCardInteractionTargets(details.value))
        : {}
    } else {
      total.value = 0
      details.value = []
      statusMap.value = {}
    }
  } catch {
    // 交给通用分页视图的错误态（带重试），不打断首页其它模块
    error.value = true
    total.value = 0
    details.value = []
    statusMap.value = {}
  } finally {
    inflightSignature = ''
    loading.value = false
  }
}

/** 通用分页视图挂载：先实测列数（定每页张数）再首次取数，避免「4 张 → 8 张」各查一次 */
function onViewMounted() {
  syncColumns()
  void loadPage()
}

// 页码 / 每页张数（列数变化）/ 类型统一处理：先归一页码，再按参数查一次
// （签名去重会吞掉「归一页码」引发的二次触发，保证一次操作只发一次请求）
watch([currentPage, pageSize, () => props.lotteryType], () => {
  const maxPage = Math.max(1, Math.ceil(total.value / pageSize.value))
  if (currentPage.value > maxPage) currentPage.value = maxPage
  void loadPage()
})

onMounted(() => {
  // 列数实测（决定每页张数）+ 容器宽度变化跟随
  syncColumns()
  if (rootEl.value) {
    resizeObserver = new ResizeObserver(() => syncColumns())
    resizeObserver.observe(rootEl.value)
  }
  // 统计卡（summary）；明细由通用分页视图的 on-mounted 触发
  void loadSummary()
  timer = setInterval(() => {
    nowTs.value = Math.floor(Date.now() / 1000)
  }, 1000)
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
  resizeObserver?.disconnect()
  resizeObserver = null
})
</script>
