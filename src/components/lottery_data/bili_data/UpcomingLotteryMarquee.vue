<template>
  <section ref="rootEl" class="upcoming-lottery-marquee flex flex-col gap-2">
    <!-- 标题行：类型徽标 + 24 小时口径 + 最近一场倒计时 -->
    <div class="upcoming-lottery-marquee__header flex flex-wrap items-center gap-2">
      <el-text class="upcoming-lottery-marquee__title m-0 flex items-center gap-1.5 text-sm font-semibold text-text-primary" tag="h3">
        <el-icon><Timer /></el-icon>
        {{ displayTitle }}
      </el-text>
      <el-tag size="large" type="info" effect="plain" round>24 小时内开奖</el-tag>
      <span v-if="!loading && items.length" class="text-xs text-text-placeholder">
        共 {{ items.length }} 场 · 最近一场{{ remainText(soonestTime) }}
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

    <!-- 加载中 -->
    <el-text v-if="loading" class="upcoming-lottery-marquee__loading m-0 text-xs text-text-placeholder" tag="p">
      正在加载即将开奖数据…
    </el-text>

    <!-- 空态：当前类型 24 小时内没有即将开奖的抽奖 -->
    <el-text
      v-else-if="!items.length"
      class="upcoming-lottery-marquee__empty m-0 text-xs text-text-placeholder"
      tag="p"
    >
      24 小时内暂无即将开奖的{{ typeLabelSuffix }}
    </el-text>

    <!-- 轮播：每页 1 行小卡片（每页张数 = 列数，绝不换行），复用抽奖界面的 BiliLotterySimpleList，
         不限制数量与类型。高度实测自适应（见 syncCarouselHeight）。 -->
    <el-carousel
      v-else
      :key="contentHeight"
      class="upcoming-lottery-marquee__carousel"
      :autoplay="pages.length > 1"
      :interval="5000"
      arrow="hover"
      indicator-position="outside"
      :height="contentHeight"
    >
      <el-carousel-item v-for="(page, pageIndex) in pages" :key="pageIndex">
        <BiliLotterySimpleList
          class="upcoming-lottery-marquee__page"
          :class="pageGridClass"
          :data="page"
        />
      </el-carousel-item>
    </el-carousel>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, onUpdated, ref, watch, type Component } from 'vue'
import { Timer, DataAnalysis, Warning, Trophy } from '@element-plus/icons-vue'
import BiliLotterySimpleList from '@/components/lottery_data/bili_data/BiliLotterySimpleList.vue'
import lotteryDataBaseApi, { type UpcomingLotteryItem } from '@/api/lottery_data/bili/lottery_database_bili_api'

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

// 轮播布局：按**容器实际宽度**是否达到前端最小布局宽度（runtimeConfig.public.minLayoutWidth，
// 默认 690px，可用 NUXT_PUBLIC_MIN_LAYOUT_WIDTH 覆盖）切换 4 列 / 2 列；每页张数 = 列数，
// 保持 1 行不换行。容器宽度由 syncCarouselHeight 内实测（首页左栏 2/3 宽、管理页全宽不同）。
// 首帧统一按窄列渲染（columns 初始 2），挂载后实测更新，SSR 与客户端首帧一致。
const runtimeConfig = useRuntimeConfig()
const minLayoutWidth = computed(() => Number(runtimeConfig.public.minLayoutWidth) || 690)
const columns = ref(2)
/** 每页张数与列数一致，保持 1 行，高度才稳定 */
const pageSize = computed(() => columns.value)
/** 网格列数 class（Tailwind 无法扫描动态拼接类名，这里预置两种） */
const pageGridClass = computed(() =>
  columns.value >= 4 ? '[&>div]:grid-cols-4' : '[&>div]:grid-cols-2'
)

// ============ 轮播高度 / 列数自适应 ============
// el-carousel 的 item 是绝对定位，容器高度必须显式给出；写死高度会在卡片变高
// （倒计时行加入后卡片更高）或窄屏出现两行时把下面一排截断，卡片少时又会空悬一大片。
// 这里实测轮播内容高度与容器宽度：onUpdated 兜住数据到位 / 列数切换等渲染变化，
// ResizeObserver 兜住容器尺寸变化，两者都走同一 sync 函数，值不变即稳定、不会反复重建。
const rootEl = ref<HTMLElement | null>(null)
const contentHeight = ref('220px')
let resizeObserver: ResizeObserver | null = null

function syncCarouselLayout() {
  // 高度：实测轮播内首个小卡片列表的内容高度
  const list = rootEl.value?.querySelector('.bili-lottery-simple-list') as HTMLElement | null
  if (list) {
    const height = list.offsetHeight
    if (height > 0) contentHeight.value = `${height}px`
  }
  // 列数：实测轮播容器宽度是否达到最小布局宽度
  const carousel = rootEl.value?.querySelector('.el-carousel') as HTMLElement | null
  if (carousel) {
    columns.value = carousel.offsetWidth >= minLayoutWidth.value ? 4 : 2
  }
}

onMounted(() => {
  syncCarouselLayout()
  if (rootEl.value) {
    resizeObserver = new ResizeObserver(() => syncCarouselLayout())
    resizeObserver.observe(rootEl.value)
  }
})

// 组件重新渲染后（详情数据到位、列数/每页张数变化、轮播因 key 重建）同步实测
onUpdated(() => {
  syncCarouselLayout()
})

const TYPE_LABELS: Record<UpcomingLotteryType, string> = {
  official: '官方抽奖',
  reserve: '预约抽奖',
  charge: '充电抽奖',
  topic: '话题抽奖',
  others_dyn: '第三方动态抽奖'
}

const loading = ref(true)
const rawItems = ref<UpcomingLotteryItem[]>([])
/** 抽奖数据统计（与 upcoming 同一次 summary 查询，null=加载中/失败） */
const summaryCounts = ref<Record<string, number | null>>({})
/** 每张卡的抽奖详情（与抽奖界面一致的数据形态，直接喂给小卡片组件） */
const details = ref<any[]>([])
/** 每秒推进的“当前时间”，驱动剩余时间倒计时 */
const nowTs = ref(Math.floor(Date.now() / 1000))
let timer: ReturnType<typeof setInterval> | null = null

/** 即将开奖：后端已按 24h 窗口返回，这里只做类型兜底过滤，不限制数量 */
const items = computed(() => {
  const now = nowTs.value
  const filtered = rawItems.value.filter((item) => {
    // 后端已按 24h 窗口过滤，这里再兜底一次，避免缓存/脏数据越过窗口
    const ts = Number(item.lottery_time)
    if (!Number.isFinite(ts) || ts <= now) return false
    if (ts > now + UPCOMING_WINDOW_SECONDS) return false
    // 类型过滤：未指定类型时展示全部
    if (props.lotteryType && item.key !== props.lotteryType) return false
    return true
  })
  // 按开奖时间升序（最近的在前），全部展示不截断
  return filtered.slice().sort((a, b) => Number(a.lottery_time) - Number(b.lottery_time))
})

/** 最近一场的开奖时间（倒计时展示用） */
const soonestTime = computed(() => items.value[0]?.lottery_time ?? 0)

/** 按页切分详情数据（每页卡片数与列数一致，1 行展示） */
const pages = computed(() => {
  const out: any[][] = []
  for (let i = 0; i < details.value.length; i += pageSize.value) {
    out.push(details.value.slice(i, i + pageSize.value))
  }
  return out
})

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
  if (value === null) return loading.value ? '…' : '—'
  return value.toLocaleString('zh-CN')
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

async function load() {
  loading.value = true
  try {
    const resp = await lotteryDataBaseApi.getLotterySummary()
    if (resp.code === 0 && resp.data) {
      rawItems.value = resp.data.upcoming ?? []
      // 抽奖数据统计：仅 lotdata 三类（official/reserve/charge），与数据汇总页口径一致
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
      rawItems.value = []
      summaryCounts.value = {}
    }
  } catch {
    // 静默：即将开奖只是旁路信息，拉取失败不影响主页面
    rawItems.value = []
    summaryCounts.value = {}
  } finally {
    loading.value = false
  }
}

/** 按 upcoming 的 lottery_id 回捞抽奖详情（弱依赖：单个失败只丢该卡） */
async function loadDetails() {
  const settled = await Promise.allSettled(
    items.value.map((item) => lotteryDataBaseApi.getLotteryDetailById(String(item.lottery_id)))
  )
  details.value = settled
    .filter(
      (r): r is PromiseFulfilledResult<{ code: number; data: unknown }> =>
        r.status === 'fulfilled' && r.value.code === 0 && !!r.value.data
    )
    .map((r) => r.value.data)
}

// upcoming 列表就绪后回捞详情；items 变化（倒计时跨过 24h 边界被过滤）时同步刷新
let lastDetailKey = ''
watch(
  () => items.value.map((i) => String(i.lottery_id)).join(','),
  async (key) => {
    if (key === lastDetailKey) return
    lastDetailKey = key
    await loadDetails()
  },
  { immediate: true }
)

onMounted(() => {
  void load()
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
