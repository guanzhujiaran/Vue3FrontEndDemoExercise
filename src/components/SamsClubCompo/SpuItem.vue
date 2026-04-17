<script setup lang="ts">
import { computed, type PropType, ref, watch } from 'vue'
import type { SpuInfoType } from '@/gql/samsclub/graphql.ts'
import SpuBasicInfo from './items/SpuBasicInfo.vue'
import SpuPriceInfo from './items/SpuPriceInfo.vue'
import SpuHeaderInfo from './items/SpuHeaderInfo.vue'
import SpuAttributes from './items/SpuAttributes.vue'
import SpuTags from './items/SpuTags.vue'
import SpuSalesInfo from './items/SpuSalesInfo.vue'
import SpuOtherInfo from './items/SpuOtherInfo.vue'
import SpuPriceChart from './items/SpuPriceChart.vue'
import SpuRawData from './items/SpuRawData.vue'

const props = defineProps({
  spuInfo: {
    type: Object as PropType<SpuInfoType>,
    required: true
  }
})

// 活跃标签
const activeContentSections = ref(['info'])

// 价格图表折叠面板状态
const activePriceChartPanel = ref<string[]>([])

// 价格历史数据
const priceHistory = computed(() => {
  if (!props.spuInfo?.allPriceInfos || props.spuInfo.allPriceInfos.length === 0) {
    return []
  }
  return [...props.spuInfo.allPriceInfos].reverse()
})

// 添加数据检查
const hasPriceData = computed(() => {
  return priceHistory.value.length > 0
})

// 检查是否有销售信息
const hasSalesInfo = computed(() => {
  const unknowField = props.spuInfo.unknowField || {}
  return (
    unknowField.monthSales !== undefined ||
    unknowField.stockNum !== undefined ||
    unknowField.commentCount !== undefined ||
    unknowField.rebuyCount !== undefined
  )
})

// 监听价格数据变化，如果有数据则默认展开价格图表
watch(
  hasPriceData,
  (newValue) => {
    if (newValue && activePriceChartPanel.value.length === 0) {
      activePriceChartPanel.value = ['priceChart']
    }
  },
  { immediate: true }
)
</script>

<template>
  <el-card shadow="hover" class="spu-card-extended" body-style="flex-grow: 1; padding: 0;">
    <template #header>
      <div class="card-header">
        <el-badge
          :value="priceHistory.length > 0 ? priceHistory.length : ''"
          type="primary"
          class="price-history-badge"
          :offset="[0, -3]"
        >
          <el-text tag="b" class="spu-title" size="large" truncated>{{
            props.spuInfo.title
          }}</el-text>
        </el-badge>
        <el-link
          type="primary"
          underline="never"
          class="spu-id-link"
          title="点击跳转app"
          :href="`sams://goods_detail?spuId=${props.spuInfo.spuId}`"
          target="_self"
        >
          <el-tag size="small" effect="plain">SpuId: {{ props.spuInfo.spuId }}</el-tag>
        </el-link>
      </div>
    </template>
    <FlexContainer class="spu-container">
      <!-- 基本信息 -->
      <SpuBasicInfo :spu-info="props.spuInfo" />

      <!-- 价格信息 -->
      <SpuPriceInfo :spu-info="props.spuInfo" />

      <!-- 基本属性信息直接显示 -->
      <SpuHeaderInfo :spu-info="props.spuInfo" />

      <!-- 次要信息使用折叠面板 -->
      <el-collapse v-model="activeContentSections" class="content-collapse">
        <!-- 属性信息 -->
        <SpuAttributes :spu-info="props.spuInfo" />

        <!-- 标签信息 -->
        <SpuTags :spu-info="props.spuInfo" />

        <!-- 销售信息 -->
        <SpuSalesInfo :spu-info="props.spuInfo" />

        <!-- 其他信息 -->
        <SpuOtherInfo :spu-info="props.spuInfo" />
      </el-collapse>

      <div class="spu-item-footer">
        <!-- 图表部分 - 使用折叠面板 -->
        <SpuPriceChart :spu-info="props.spuInfo" />

        <!-- 原始数据 -->
        <SpuRawData :spu-info="props.spuInfo" />
      </div>
    </FlexContainer>
  </el-card>
</template>



