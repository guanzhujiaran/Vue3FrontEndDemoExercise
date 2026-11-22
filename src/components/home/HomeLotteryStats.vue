<template>
  <section
    class="home-lottery-stats mx-5 mt-6 rounded-3xl border border-border-lighter bg-bg-secondary px-4 py-8 lg:mx-10 lg:px-8"
  >
    <div class="mb-5 flex flex-wrap items-end justify-between gap-2">
      <div>
        <el-text class="m-0 block text-2xl font-semibold tracking-tight" tag="h2">
          抽奖数据概览
        </el-text>
        <el-text class="mt-1 block text-sm text-text-regular" tag="p">
          按抽奖类型统计累计与未开奖数据，并展示近 14 天新增 / 开奖趋势
        </el-text>
      </div>
      <span class="home-lottery-stats__fresh text-xs text-text-placeholder">
        统计时间：{{ generatedAtText }}
      </span>
    </div>

    <LoadingWrap :loading="loading" :rows="6">
      <el-alert
        v-if="error"
        class="home-lottery-stats__error mb-4"
        type="warning"
        title="抽奖数据概览加载失败"
        :closable="false"
        show-icon
      >
        <template #default>
          <el-button class="home-lottery-stats__retry" type="primary" link @click="load">
            重新加载
          </el-button>
        </template>
      </el-alert>

      <!-- 分抽奖类型统计 -->
      <h3 class="home-lottery-stats__section-title m-0 mb-2 text-base font-semibold text-text-primary">
        分抽奖类型统计
      </h3>
      <el-table
        class="home-lottery-stats__table"
        :data="rows"
        border
        stripe
        empty-text="暂无统计数据"
      >
        <el-table-column label="抽奖类型" min-width="120" fixed>
          <template #default="{ row }">
            <span class="font-medium text-text-primary">{{ row.type_name }}</span>
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
            <span :class="{ 'text-danger': isPositive(row.pending_result) }">
              {{ fmtNum(row.pending_result) }}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="大奖" width="90" align="right">
          <template #default="{ row }">{{ fmtNum(row.grand_prize) }}</template>
        </el-table-column>
        <el-table-column label="昨日新增" width="100" align="right">
          <template #default="{ row }">{{ fmtNum(row.new_yesterday) }}</template>
        </el-table-column>
        <el-table-column label="本周新增" width="100" align="right">
          <template #default="{ row }">{{ fmtNum(row.new_this_week) }}</template>
        </el-table-column>
        <el-table-column label="本月新增" width="100" align="right">
          <template #default="{ row }">{{ fmtNum(row.new_this_month) }}</template>
        </el-table-column>
      </el-table>

      <!-- 近 14 天新增 / 开奖趋势（与管理后台共用同一趋势图组件） -->
      <div class="home-lottery-stats__trends mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <LotteryTrendChart
          title="近 14 天新增趋势"
          :trend="trend"
          :legend="TREND_LEGEND"
        />
        <LotteryTrendChart
          title="近 14 天开奖趋势"
          :trend="drawTrend"
          :legend="DRAW_TREND_LEGEND"
        />
      </div>
    </LoadingWrap>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import lotteryDataBaseApi, {
  type LotterySummaryRow,
  type LotteryTrendPoint
} from '@/api/lottery_data/bili/lottery_database_bili_api'
import LoadingWrap from '@/components/message/LoadingWrap.vue'
import LotteryTrendChart from '@/components/lottery_data/bili_data/LotteryTrendChart.vue'

const TREND_LEGEND = [
  { key: 'official', label: '官方抽奖', color: '#f56c6c' },
  { key: 'reserve', label: '预约抽奖', color: '#409eff' },
  { key: 'charge', label: '充电抽奖', color: '#67c23a' },
  { key: 'others_dyn', label: '第三方动态抽奖', color: '#e6a23c' }
]

/** 开奖趋势只统计 lotdata 三类（与后端 draw_trend 口径一致） */
const DRAW_TREND_LEGEND = TREND_LEGEND.filter((item) => item.key !== 'others_dyn')

const loading = ref(true)
const error = ref(false)
const rows = ref<LotterySummaryRow[]>([])
const trend = ref<LotteryTrendPoint[]>([])
const drawTrend = ref<LotteryTrendPoint[]>([])
const generatedAt = ref<number | null>(null)

const generatedAtText = computed(() =>
  generatedAt.value
    ? new Date(generatedAt.value * 1000).toLocaleString('zh-CN', { hour12: false })
    : '—'
)

function fmtNum(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—'
  return value.toLocaleString('zh-CN')
}

function isPositive(value: number | null): boolean {
  return typeof value === 'number' && value > 0
}

async function load() {
  loading.value = true
  error.value = false
  try {
    const res = await lotteryDataBaseApi.getLotterySummary()
    if (res.code === 0 && res.data) {
      rows.value = res.data.rows || []
      trend.value = res.data.trend || []
      drawTrend.value = res.data.draw_trend || []
      generatedAt.value = res.data.generated_at ?? null
    } else {
      error.value = true
    }
  } catch {
    // 统计区块只是首页的旁路信息，失败不打断其它模块
    error.value = true
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>
