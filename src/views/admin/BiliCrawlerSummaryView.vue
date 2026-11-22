<template>
  <div class="bili-crawler-summary flex flex-col gap-4">
    <el-empty v-if="!isAdmin" description="无权限访问，仅管理员可见 crawler 数据汇总" />

    <template v-else>
      <!-- 头部：标题 + 刷新 + 数据新鲜度 -->
      <div class="bili-crawler-summary__header flex flex-wrap items-start justify-between gap-3">
        <div class="bili-crawler-summary__title-box space-y-1">
          <h2 class="bili-crawler-summary__title m-0 text-lg font-semibold text-text-primary">
            bili-crawler 数据汇总
          </h2>
          <p class="bili-crawler-summary__desc m-0 text-sm text-text-secondary">
            按抽奖类型统计<strong>还没到开奖时间</strong>的未开奖数据、昨日 / 本周 / 本月新增，
            并汇总累计总量、即将开奖、待抓结果积压、大奖数量、参与人数分布与近 14 天新增 / 开奖趋势。
          </p>
        </div>
        <div class="bili-crawler-summary__actions flex flex-wrap items-center gap-3">
          <span class="bili-crawler-summary__fresh text-xs text-text-placeholder">
            统计时间：{{ generatedAtText }}
          </span>
          <el-button :disabled="loading" @click="load">刷新</el-button>
        </div>
      </div>

      <el-alert
        v-if="freshness"
        class="bili-crawler-summary__fresh-alert"
        :type="freshness.type"
        :title="freshness.text"
        :closable="false"
        show-icon
      />

      <LoadingWrap :loading="loading" :rows="6">
        <!-- 核心指标卡片（仅统计 lotdata 的三类：官方/预约/充电） -->
        <div class="bili-crawler-summary__cards grid grid-cols-2 gap-3 md:grid-cols-4">
          <div
            v-for="card in kpiCards"
            :key="card.label"
            class="bili-crawler-summary__card rounded-lg border border-border p-3"
          >
            <div class="bili-crawler-summary__card-label text-xs text-text-secondary">
              {{ card.label }}
            </div>
            <div class="bili-crawler-summary__card-value text-xl font-semibold text-text-primary">
              {{ card.value }}
            </div>
            <div v-if="card.hint" class="bili-crawler-summary__card-hint text-xs text-text-placeholder">
              {{ card.hint }}
            </div>
          </div>
        </div>

        <!-- 分类型汇总表 -->
        <h3 class="bili-crawler-summary__section-title m-0 mt-4 text-base font-semibold text-text-primary">
          分抽奖类型统计
        </h3>
        <el-table class="bili-crawler-summary__table" :data="rows" border stripe>
          <el-table-column label="抽奖类型" min-width="120" fixed>
            <template #default="{ row }">
              <span class="font-medium text-text-primary">{{ row.type_name }}</span>
            </template>
          </el-table-column>
          <el-table-column label="数据源" min-width="120">
            <template #default="{ row }">
              <span class="text-text-placeholder">{{ row.source }}</span>
            </template>
          </el-table-column>
          <el-table-column label="累计总量" width="100" align="right">
            <template #default="{ row }">{{ fmtNum(row.total) }}</template>
          </el-table-column>
          <el-table-column label="未开奖" width="100" align="right">
            <template #default="{ row }">{{ fmtNum(row.not_drawn) }}</template>
          </el-table-column>
          <el-table-column label="24h内开奖" width="110" align="right">
            <template #default="{ row }">{{ fmtNum(row.drawing_soon_24h) }}</template>
          </el-table-column>
          <el-table-column label="待抓结果" width="100" align="right">
            <template #default="{ row }">
              <span :class="{ 'text-color-danger': isPositive(row.pending_result) }">
                {{ fmtNum(row.pending_result) }}
              </span>
            </template>
          </el-table-column>
          <el-table-column label="大奖" width="90" align="right">
            <template #default="{ row }">{{ fmtNum(row.grand_prize) }}</template>
          </el-table-column>
          <el-table-column label="昨日新增" width="110" align="right">
            <template #default="{ row }">
              {{ fmtNum(row.new_yesterday) }}
              <span v-if="row.new_prev_day !== null" class="text-text-placeholder">
                ({{ deltaText(row) }})
              </span>
            </template>
          </el-table-column>
          <el-table-column label="本周新增" width="100" align="right">
            <template #default="{ row }">{{ fmtNum(row.new_this_week) }}</template>
          </el-table-column>
          <el-table-column label="本月新增" width="100" align="right">
            <template #default="{ row }">{{ fmtNum(row.new_this_month) }}</template>
          </el-table-column>
          <el-table-column label="参与人数(均/最大)" min-width="150" align="right">
            <template #default="{ row }">
              <span v-if="row.participants_avg !== null">
                {{ fmtNum(row.participants_avg) }} / {{ fmtNum(row.participants_max) }}
              </span>
              <span v-else class="text-text-placeholder">—</span>
            </template>
          </el-table-column>
        </el-table>

        <!-- 近 14 天新增趋势 / 开奖趋势（纯 CSS 柱状图，共用趋势图组件） -->
        <div class="bili-crawler-summary__trends mt-4 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <LotteryTrendChart
            title="近 14 天新增趋势"
            :trend="trend"
            :legend="trendLegend"
          />
          <LotteryTrendChart
            title="近 14 天开奖趋势"
            :trend="drawTrend"
            :legend="drawTrendLegend"
          />
        </div>

        <!-- 即将开奖（24 小时内）：简略卡片跑马灯，全类型通用 -->
        <div class="bili-crawler-summary__upcoming-marquee mt-4">
          <UpcomingLotteryMarquee />
        </div>

        <!-- 爬虫健康度：复用既有的爬虫状态组件，避免重复实现 -->
        <h3 class="bili-crawler-summary__section-title m-0 mt-4 text-base font-semibold text-text-primary">
          爬虫健康度
        </h3>
        <ScrapyStatus show-admin-actions />
      </LoadingWrap>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useMessageAdminStore } from '@/stores/message_admin'
import lotteryDataBaseApi, {
  type LotterySummaryRow,
  type LotteryTrendPoint
} from '@/api/lottery_data/bili/lottery_database_bili_api'
import biliMessage from '@/utils/message'
import LoadingWrap from '@/components/message/LoadingWrap.vue'
import ScrapyStatus from '@/components/lottery_data/bili_data/ScrapyStatus.vue'
import UpcomingLotteryMarquee from '@/components/lottery_data/bili_data/UpcomingLotteryMarquee.vue'
import LotteryTrendChart from '@/components/lottery_data/bili_data/LotteryTrendChart.vue'

/** lotdata 三类抽奖（官方/预约/充电），用于合计与环比口径 */
const LOTDATA_KEYS = ['official', 'reserve', 'charge'] as const

const TREND_LEGEND = [
  { key: 'official', label: '官方抽奖', color: '#f56c6c' },
  { key: 'reserve', label: '预约抽奖', color: '#409eff' },
  { key: 'charge', label: '充电抽奖', color: '#67c23a' },
  { key: 'others_dyn', label: '第三方动态抽奖', color: '#e6a23c' }
]

/** 开奖趋势只统计 lotdata 三类（与后端 draw_trend 口径一致） */
const DRAW_TREND_LEGEND = TREND_LEGEND.filter((item) => item.key !== 'others_dyn')

const adminStore = useMessageAdminStore()

const isAdmin = computed(() => Boolean(adminStore.status?.is_admin || adminStore.status?.is_root))

const loading = ref(false)
const rows = ref<LotterySummaryRow[]>([])
const trend = ref<LotteryTrendPoint[]>([])
const drawTrend = ref<LotteryTrendPoint[]>([])
const generatedAt = ref<number | null>(null)
const latestCreatedAt = ref<number | null>(null)

const trendLegend = TREND_LEGEND
const drawTrendLegend = DRAW_TREND_LEGEND

/** 仅 lotdata 的三类行（合计与环比只算这几类，避免把其它数据源混进来） */
const lotdataRows = computed(() => rows.value.filter((row) => LOTDATA_KEYS.includes(row.key as any)))

function sumOf(pick: (row: LotterySummaryRow) => number | null): number {
  return lotdataRows.value.reduce((acc, row) => acc + (pick(row) ?? 0), 0)
}

/** 环比文本：昨日相对前日的变化百分比（row 来自 el-table 插槽，故用宽松类型） */
function deltaText(row: any): string {
  const prev = row.new_prev_day as number | null
  const cur = row.new_yesterday as number | null
  if (prev === null || cur === null || prev === 0) return prev === 0 && cur ? '新增' : ''
  const rate = ((cur - prev) / prev) * 100
  return `${rate >= 0 ? '+' : ''}${rate.toFixed(0)}%`
}

const kpiCards = computed(() => {
  const yesterday = sumOf((r) => r.new_yesterday)
  const prevDay = sumOf((r) => r.new_prev_day)
  let yesterdayHint = ''
  if (prevDay > 0) {
    const rate = ((yesterday - prevDay) / prevDay) * 100
    yesterdayHint = `环比前日 ${rate >= 0 ? '+' : ''}${rate.toFixed(0)}%（前日 ${prevDay}）`
  }
  return [
    { label: '未开奖（还没到开奖时间）', value: fmtNum(sumOf((r) => r.not_drawn)), hint: '' },
    { label: '24 小时内即将开奖', value: fmtNum(sumOf((r) => r.drawing_soon_24h)), hint: '' },
    {
      label: '待抓开奖结果（积压）',
      value: fmtNum(sumOf((r) => r.pending_result)),
      hint: '已过开奖时间但仍未抓到结果'
    },
    { label: '大奖数量', value: fmtNum(sumOf((r) => r.grand_prize)), hint: '大模型判定为大奖' },
    { label: '昨日新增', value: fmtNum(yesterday), hint: yesterdayHint },
    { label: '本周新增', value: fmtNum(sumOf((r) => r.new_this_week)), hint: '' },
    { label: '本月新增', value: fmtNum(sumOf((r) => r.new_this_month)), hint: '' },
    { label: '累计总量', value: fmtNum(sumOf((r) => r.total)), hint: '仅官方/预约/充电三类' }
  ]
})

/** 数据新鲜度提示：最新收录时间距今多久 */
const freshness = computed(() => {
  if (latestCreatedAt.value === null) return null
  const lagHours = (Date.now() / 1000 - latestCreatedAt.value) / 3600
  if (lagHours <= 1) {
    return { type: 'success' as const, text: `数据新鲜：最新收录于 ${fmtTime(latestCreatedAt.value)}` }
  }
  if (lagHours <= 6) {
    return { type: 'warning' as const, text: `数据可能滞后：最新收录于 ${fmtTime(latestCreatedAt.value)}（约 ${lagHours.toFixed(1)} 小时前）` }
  }
  return {
    type: 'error' as const,
    text: `数据疑似停更：最新收录于 ${fmtTime(latestCreatedAt.value)}（约 ${lagHours.toFixed(1)} 小时前），请检查爬虫`
  }
})

const generatedAtText = computed(() => (generatedAt.value ? fmtTime(generatedAt.value) : '—'))

function fmtNum(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—'
  return value.toLocaleString('zh-CN')
}

function isPositive(value: number | null): boolean {
  return typeof value === 'number' && value > 0
}

function fmtTime(ts: number | null): string {
  if (!ts) return '—'
  return new Date(ts * 1000).toLocaleString('zh-CN', { hour12: false })
}

async function load() {
  loading.value = true
  try {
    const res = await lotteryDataBaseApi.getLotterySummary()
    if (res.code === 0 && res.data) {
      rows.value = res.data.rows || []
      trend.value = res.data.trend || []
      drawTrend.value = res.data.draw_trend || []
      generatedAt.value = res.data.generated_at ?? null
      latestCreatedAt.value = res.data.latest_created_at ?? null
    } else {
      biliMessage.error(res.msg || '获取数据汇总失败')
    }
  } catch (e) {
    biliMessage.error('获取数据汇总失败，请稍后重试')
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  await adminStore.fetchStatus()
  if (isAdmin.value) await load()
})
</script>
