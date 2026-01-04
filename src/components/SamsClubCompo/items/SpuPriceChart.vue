<script setup lang="ts">
import VChart from 'vue-echarts'
import { computed, ref } from 'vue'
import type { SpuInfoType } from '@/gql/samsclub/graphql.ts'
import type { ComposeOption } from 'echarts/core'
import { use } from 'echarts/core'
import type { LineSeriesOption } from 'echarts/charts'
import { LineChart } from 'echarts/charts'
import type {
  DataZoomComponentOption,
  GridComponentOption,
  LegendComponentOption,
  TitleComponentOption
} from 'echarts/components'
import {
  DataZoomComponent,
  GridComponent,
  LegendComponent,
  MarkLineComponent,
  MarkPointComponent,
  TitleComponent,
  TooltipComponent
} from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import { useSamsclubStore } from '@/stores/samsclub.ts'
import { formatDate, generateChartColor } from '../utils'

const props = defineProps<{
  spuInfo: SpuInfoType
}>()

const samsclubStore = useSamsclubStore()

// 控制图表显示
const isShowPriceEcharts = computed(() => {
  return samsclubStore.isShowPriceEcharts
})

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

// 图表配置
use([
  TitleComponent,
  GridComponent,
  DataZoomComponent,
  LineChart,
  CanvasRenderer,
  TooltipComponent,
  LegendComponent,
  MarkLineComponent,
  MarkPointComponent
])

type EChartsOption = ComposeOption<
  | TitleComponentOption
  | GridComponentOption
  | DataZoomComponentOption
  | LineSeriesOption
  | LegendComponentOption
>

// 价格趋势图表配置
const echartsOption = computed<EChartsOption>(() => {
  return {
    tooltip: {
      trigger: 'axis',
      formatter: function (params: any) {
        const date = params[0].axisValue
        const price = params[0].data.toFixed(2)
        return `日期: ${date}<br/>价格: ¥${price}`
      }
    },
    aria: {
      show: true,
      decal: {
        show: true
      }
    },
    title: {
      text: '价格变化趋势',
      left: 'center',
      textStyle: {
        fontSize: 16,
        fontWeight: 'bold'
      }
    },
    legend: {
      data: ['价格'],
      bottom: 0
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '25%', // 增加底部间距，防止日期被拖动框遮挡
      top: '15%',
      outerBounds: {
        top: 0,
        bottom: 0,
        left: 0,
        right: 0
      }
    },
    xAxis: {
      type: 'category',
      name: '日期',
      nameLocation: 'middle',
      nameGap: 30,
      nameTextStyle: {
        fontWeight: 'bold'
      },
      data: priceHistory.value.map((el) => formatDate(el.updateTime)),
      boundaryGap: false,
      axisLabel: {
        fontSize: 10,
        alignMaxLabel: 'right',
        alignMinLabel: 'left'
      }
    },
    yAxis: {
      type: 'value',
      name: '价格(元)',
      nameTextStyle: {
        fontWeight: 'bold'
      },
      axisLabel: {
        formatter: '{value} 元'
      },
      splitLine: {
        lineStyle: {
          type: 'dashed'
        }
      }
    },
    dataZoom: [
      {
        type: 'slider',
        show: true,
        xAxisIndex: [0],
        filterMode: 'filter',
        height: 20,
        bottom: 50
      },
      {
        type: 'inside',
        xAxisIndex: [0],
        filterMode: 'filter'
      }
    ],
    series: [
      {
        name: '价格',
        data: priceHistory.value.map((el) => (el.price ?? 0) / 100),
        type: 'line',
        smooth: true,
        itemStyle: {
          color: '#409EFF'
        },
        areaStyle: {
          color: generateChartColor()
        },
        markPoint: {
          symbol: 'none',
          data: [
            { type: 'max', name: '最高价' },
            { type: 'min', name: '最低价' }
          ]
        },
        markLine: {
          data: [
            {
              type: 'average',
              name: '平均价',
              label: {
                position: 'insideEndBottom',
                formatter: '平均价: {c}元'
              }
            }
          ]
        }
      }
    ]
  }
})

const priceChartItem = useTemplateRef('priceChartItem')
</script>

<template>
  <el-collapse v-if="hasPriceData && isShowPriceEcharts" class="price-chart-collapse">
    <el-collapse-item name="priceChart" ref="priceChartItem">
      <template #title>
        <div class="collapse-title">
          <el-icon><TrendCharts /></el-icon>
          <span>价格趋势分析</span>
          <el-tag size="small" type="info" effect="plain" class="price-count-tag">
            {{ priceHistory.length }}条记录
          </el-tag>
        </div>
      </template>
      <template #default>
          <v-chart
            v-if="isShowPriceEcharts && priceChartItem?.isActive"
            class="chart-lines"
            :option="echartsOption"
            :autoresize="{ throttle: 300 }"
            style="height: 400px; width: 100%"
          ></v-chart>
      </template>
    </el-collapse-item>
  </el-collapse>
</template>

<style scoped>
@import '@/assets/components/samsclub/spu-item-tailwind.css';
</style>
