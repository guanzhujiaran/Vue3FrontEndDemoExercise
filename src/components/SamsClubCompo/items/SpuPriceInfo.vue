<script setup lang="ts">
import type { SpuInfoType } from '@/gql/samsclub/graphql.ts'
import { computed } from 'vue'
import { Coin, PriceTag, QuestionFilled } from '@element-plus/icons-vue'
import { formatDateTime, getTimeAgo, handlePriceTitleTextColor, handlePriceValueTextColor, getPricePositionColor, getPricePositionType } from '../utils'

const props = defineProps<{
  spuInfo: SpuInfoType
}>()

// 价格历史数据
const priceHistory = computed(() => {
  if (!props.spuInfo?.allPriceInfos || props.spuInfo.allPriceInfos.length === 0) {
    return []
  }
  return [...props.spuInfo.allPriceInfos].reverse()
})

// 价格统计数据
const priceStats = computed(() => {
  const prices = priceHistory.value.map((item) => (item.price ?? 0) / 100)
  const avg = prices.reduce((sum, price) => sum + price, 0) / prices.length
  const max = Math.max(...prices)
  const min = Math.min(...prices)
  const current = (props.spuInfo.latestPriceInfo?.price || 0) / 100

  // 计算当前价格在历史价格中的百分比位置
  const percentile =
    prices.length > 1 ? (((current - min) / (max - min)) * 100).toFixed(1) : '100.0'

  return { avg, max, min, current, percentile }
})
</script>

<template>
  <div class="price-info">
    <el-statistic
      :precision="2"
      :value="(props.spuInfo.latestPriceInfo?.price || 0) / 100"
      class="current-price"
    >
      <template #title>
        <div class="price-title">
          <el-icon><PriceTag /></el-icon>
          <el-text type="primary">当前价格</el-text>
          <el-tooltip
            placement="top"
            :content="`更新时间: ${formatDateTime(props.spuInfo.latestPriceInfo!.updateTime)}`"
          >
            <el-text type="info" size="small" style="margin-left: 5px">
              ({{ getTimeAgo(props.spuInfo.latestPriceInfo!.updateTime) }} 更新)
            </el-text>
            <el-icon><QuestionFilled /></el-icon>
          </el-tooltip>
        </div>
      </template>
      <template #suffix>
        <el-icon><Coin /></el-icon>
      </template>
    </el-statistic>
    <div class="price-stats">
      <el-statistic
        :value-style="{ color: handlePriceValueTextColor(props.spuInfo.curPriceDiff ?? 0) }"
        :precision="2"
        :value="(props.spuInfo.curPriceDiff || 0) / 100"
        class="price-stat-item"
      >
        <template #title>
          <div class="price-title">
            <el-text :type="handlePriceTitleTextColor(props.spuInfo.curPriceDiff ?? 0)"
              >当前差价</el-text
            >
            <el-tooltip placement="top" content="历史最高价格 - 当前价格">
              <el-icon><QuestionFilled /></el-icon>
            </el-tooltip>
          </div>
        </template>
      </el-statistic>

      <el-statistic
        :value-style="{
          color: handlePriceValueTextColor(props.spuInfo.latestPriceDiff ?? 0)
        }"
        :precision="2"
        :value="(props.spuInfo.latestPriceDiff || 0) / 100"
        class="price-stat-item"
      >
        <template #title>
          <div class="price-title">
            <el-text :type="handlePriceTitleTextColor(props.spuInfo.latestPriceDiff ?? 0)"
              >最新差价</el-text
            >
            <el-tooltip placement="top" content="当前价格 - 上一次价格 (负数是涨价)">
              <el-icon><QuestionFilled /></el-icon>
            </el-tooltip>
          </div>
        </template>
      </el-statistic>

      <el-statistic
        :value-style="{ color: handlePriceValueTextColor(props.spuInfo.maxPriceDiff ?? 0) }"
        :precision="2"
        :value="(props.spuInfo.maxPriceDiff || 0) / 100"
        class="price-stat-item"
      >
        <template #title>
          <div class="price-title">
            <el-text :type="handlePriceTitleTextColor(props.spuInfo.maxPriceDiff ?? 0)"
              >最大差价</el-text
            >
            <el-tooltip placement="top" content="历史最高价 - 历史最低价">
              <el-icon><QuestionFilled /></el-icon>
            </el-tooltip>
          </div>
        </template>
      </el-statistic>

      <el-statistic
        class="price-stat-item"
        :value="parseFloat(priceStats.percentile)"
        :value-style="{ color: getPricePositionColor(parseFloat(priceStats.percentile)) }"
      >
        <template #suffix>
          <el-text :type="getPricePositionType(parseFloat(priceStats.percentile))">%</el-text>
        </template>
        <template #title>
          <div class="price-title">
            <el-text :type="getPricePositionType(parseFloat(priceStats.percentile))"
              >价格位置</el-text
            >
            <el-tooltip
              placement="top"
              :content="`当前价格在历史价格中的位置: ${priceStats.percentile}%`"
            >
              <el-icon><QuestionFilled /></el-icon>
            </el-tooltip>
          </div>
        </template>
      </el-statistic>
    </div>
  </div>
</template>

<style scoped>
@import '@/assets/components/samsclub/spu-item-tailwind.css';
</style>