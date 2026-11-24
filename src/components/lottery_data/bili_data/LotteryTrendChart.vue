<template>
  <section class="lottery-trend-chart flex min-w-0 flex-col gap-2">
    <el-text class="lottery-trend-chart__title m-0 text-base font-semibold text-text-primary" tag="h3">
      {{ title }}
    </el-text>

    <div class="lottery-trend-chart__legend flex flex-wrap items-center gap-4 text-xs text-text-secondary">
      <span
        v-for="item in legend"
        :key="item.key"
        class="lottery-trend-chart__legend-item flex items-center gap-1"
      >
        <span
          class="lottery-trend-chart__legend-dot h-2 w-2 rounded-sm"
          :style="{ background: item.color }"
        />
        {{ item.label }}
      </span>
    </div>

    <div
      v-if="trend.length"
      class="lottery-trend-chart__chart flex w-full items-end gap-1 overflow-x-auto pb-1"
    >
      <div
        v-for="point in trend"
        :key="point.date"
        class="lottery-trend-chart__day flex min-w-[34px] flex-1 flex-col items-center"
        :title="trendTitle(point)"
      >
        <div class="lottery-trend-chart__bars flex h-32 w-full items-end justify-center gap-0.5">
          <span
            v-for="item in legend"
            :key="item.key"
            class="lottery-trend-chart__bar flex-1 rounded-t"
            :style="{
              height: barHeight(point.counts[item.key] || 0),
              background: item.color
            }"
          />
        </div>
        <span class="lottery-trend-chart__label whitespace-nowrap text-[10px] text-text-placeholder">
          {{ point.date.slice(5) }}
        </span>
      </div>
    </div>

    <el-text v-else class="lottery-trend-chart__empty m-0 text-xs text-text-placeholder" tag="p">
      暂无趋势数据
    </el-text>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { LotteryTrendPoint } from '@/api/lottery_data/bili/lottery_database_bili_api'

const props = defineProps<{
  /** 图表标题（如「近 14 天新增趋势」） */
  title: string
  /** 每日趋势点 */
  trend: LotteryTrendPoint[]
  /** 图例：counts 的 key、展示名与柱状颜色 */
  legend: Array<{ key: string; label: string; color: string }>
}>()

/** 所有图例项在全部日期上的最大值，用于统一柱高比例 */
const maxCount = computed(() =>
  Math.max(
    1,
    ...props.trend.flatMap((point) =>
      props.legend.map((item) => point.counts[item.key] || 0)
    )
  )
)

function barHeight(count: number): string {
  return `${Math.max(count > 0 ? 2 : 0, Math.round((count / maxCount.value) * 100))}%`
}

function trendTitle(point: LotteryTrendPoint): string {
  const parts = props.legend.map(
    (item) => `${item.label}: ${point.counts[item.key] || 0}`
  )
  return `${point.date}\n${parts.join('\n')}`
}
</script>
