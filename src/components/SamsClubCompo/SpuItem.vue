<script setup lang="ts">
import VChart from 'vue-echarts'
import { computed, type PropType, ref, watch } from 'vue'
import type { SpuInfoType } from '@/gql/samsclub/graphql.ts'
import { useTimeAgo } from '@vueuse/core'
import {
  Calendar,
  Coin,
  InfoFilled,
  PriceTag,
  QuestionFilled,
  TrendCharts
} from '@element-plus/icons-vue'
import VueJsonPretty from 'vue-json-pretty'
import 'vue-json-pretty/lib/styles.css'
import type { ComposeOption } from 'echarts/core'
import { use } from 'echarts/core'
import type { BarSeriesOption, LineSeriesOption } from 'echarts/charts'
import { BarChart, LineChart } from 'echarts/charts'
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

const samsclubStore = useSamsclubStore()

const props = defineProps({
  spuInfo: {
    type: Object as PropType<SpuInfoType>,
    required: true
  }
})

// 活跃标签
const activeContentSections = ref(['info'])

// 对话框控制
const dialogTableVisible = ref(false)

// 控制图表显示
const isShowPriceEcharts = computed(() => {
  return samsclubStore.isShowPriceEcharts
})

// 价格相关处理函数
const handlePriceTitleTextColor = (
  price: number
): 'primary' | 'success' | 'warning' | 'danger' | 'info' => {
  return price > 0 ? 'success' : price < 0 ? 'danger' : 'info'
}

const handlePriceValueTextColor = (price: number) => {
  return price > 0
    ? 'var(--el-color-success)'
    : price < 0
      ? 'var(--el-color-danger)'
      : 'var(--el-color-info)'
}

// 价格位置相关函数
const getPricePositionText = (percentile: number): string => {
  if (percentile <= 25) return '极低价'
  if (percentile <= 50) return '低价位'
  if (percentile <= 75) return '中价位'
  return '高价位'
}

const getPricePositionColor = (percentile: number): string => {
  if (percentile <= 25) return 'var(--el-color-success)'
  if (percentile <= 50) return 'var(--el-color-success-light-3)'
  if (percentile <= 75) return 'var(--el-color-warning)'
  return 'var(--el-color-danger)'
}

const getPricePositionType = (
  percentile: number
): 'primary' | 'success' | 'warning' | 'danger' | 'info' => {
  if (percentile <= 25) return 'success'
  if (percentile <= 50) return 'info'
  if (percentile <= 75) return 'warning'
  return 'danger'
}

// 标签类型处理
const handleSpuInfoTagType = (tagMark: string | undefined) => {
  switch (tagMark) {
    case 'GLOBAL_SHOPPING':
    case 'IMPORTED':
    case 'PURCHASE_LIMIT':
    case 'FAST_DELIVERY':
    case 'SPU_GOODS_COMMENT_COUNT':
    case 'SPU_GOODS_COMMENT_WORD_COUNT':
    case 'SPU_MONTHLY_SALES_COUNT':
    case 'SPU_YEARS_REBUY_COUNT':
    case 'STOCK_NUM':
    case 'SPU_SHARE_QUANTITY_COUNT':
    case 'ONLY_STORE_SALE':
    case 'SPU_MEMBER_RECOMMEND_COUNT':
    case 'SELF_TAKE':
    case 'PURCHASE_MIN':
      return 'info'
    case 'NEW':
    case 'MG':
      return 'primary'
    case 'STATIC':
      return 'success'
    case 'CUSTOM':
    case 'YELLOW_PRICE':
    case 'MJJ':
    case 'MJZ':
      return 'warning'
    default:
      return 'danger'
  }
}

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

// 检查是否有其他信息
const hasOtherInfo = computed(() => {
  const unknowField = props.spuInfo.unknowField || {}
  return (
    unknowField.purchaseLimit !== undefined ||
    unknowField.purchaseMin !== undefined ||
    unknowField.shareCount !== undefined ||
    unknowField.memberRecommendCount !== undefined
  )
})

// 价格图表折叠面板状态
const activePriceChartPanel = ref<string[]>([])

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

// 格式化日期
const formatDate = (timestamp: any) => {
  const date = new Date(timestamp)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

// 格式化日期和时间
const formatDateTime = (timestamp: any) => {
  const date = new Date(timestamp)
  return date.toLocaleString()
}

// 使用VueUse的useTimeAgo获取相对时间
const getTimeAgo = (timestamp: any) => {
  if (!timestamp) return '未知时间'
  return useTimeAgo(new Date(timestamp), {
    showSecond: false,
    messages: {
      justNow: '刚刚',
      past: (n: string) => n.match(/\d/) ? `${n}前` : n,
      future: (n: string) => n.match(/\d/) ? `${n}后` : n,
      month: (n: number, past: boolean) => n === 1 ? past ? '上个月' : '下个月' : `${n} 个月`,
      year: (n: number, past: boolean) => n === 1 ? past ? '去年' : '明年' : `${n} 年`,
      day: (n: number, past: boolean) => n === 1 ? past ? '昨天' : '明天' : `${n} 天`,
      week: (n: number, past: boolean) => n === 1 ? past ? '上周' : '下周' : `${n} 周`,
      hour: (n: number) => `${n} 小时`,
      minute: (n: number) => `${n} 分钟`,
      second: (n: number) => `${n} 秒`,
    } as any
  }).value
}

// 图表配置
use([
  TitleComponent,
  GridComponent,
  DataZoomComponent,
  LineChart,
  BarChart,
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
  | BarSeriesOption
  | LegendComponentOption
>

// 生成随机颜色但保持一定的美观度
const generateChartColor = () => {
  // 使用固定的颜色方案而不是完全随机
  const colors = [
    'rgba(55, 162, 255, 0.6)',
    'rgba(255, 120, 120, 0.6)',
    'rgba(50, 205, 50, 0.6)',
    'rgba(255, 192, 0, 0.6)'
  ]
  return colors[Math.floor(Math.random() * colors.length)]
}

// 价格趋势图表配置
const echartsOption = ref<EChartsOption>({
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
    containLabel: true
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
})
</script>

<template>
  <el-card
    shadow="hover"
    class="spu-card-extended"
    style="width: 450px; display: flex; flex-direction: column"
    body-style="flex-grow: 1; padding: 15px;"
  >
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

    <!-- 重要信息直接显示 -->
    <div class="info-container">
      <div class="left-column">
        <div class="spu-image-container">
          <el-image
            v-if="props.spuInfo.image"
            :src="props.spuInfo.image"
            referrerpolicy="no-referrer"
            lazy
            fit="cover"
            class="spu-image"
            :preview-src-list="[props.spuInfo.image]"
          />
          <div v-else class="no-image">暂无图片</div>
        </div>
        <!-- 添加商品副标题显示 -->
        <div v-if="props.spuInfo?.subTitle" class="spu-subtitle">
          <el-text type="info" size="small">{{ props.spuInfo?.subTitle }}</el-text>
        </div>
      </div>

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
                <el-text type="info" size="small" style="margin-left: 5px;">
                  ({{ getTimeAgo(props.spuInfo.latestPriceInfo!.updateTime) }})
                </el-text>
                <el-icon><QuestionFilled /></el-icon>
              </el-tooltip>
            </div>
          </template>
          <template #suffix>
            <el-icon><Coin /></el-icon>
          </template>
        </el-statistic>

        <el-divider content-position="center">价格分析</el-divider>

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
            :value-style="{ color: handlePriceValueTextColor(props.spuInfo.latestPriceDiff ?? 0) }"
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
    </div>

    <!-- 基本属性信息直接显示 -->
    <el-descriptions
      :column="1"
      border
      size="small"
      label-class-name="label-bold"
      class="attributes-descriptions"
    >
      <el-descriptions-item label="创建时间">
        <el-tooltip
          placement="top"
          :content="formatDateTime(props.spuInfo.createTime)"
          effect="light"
        >
          <el-tag size="small" type="info">
            <el-icon><Calendar /></el-icon>
            {{ getTimeAgo(props.spuInfo.createTime) }}
          </el-tag>
        </el-tooltip>
      </el-descriptions-item>

      <el-descriptions-item label="更新时间">
        <el-tooltip
          placement="top"
          :content="formatDateTime(props.spuInfo.updateTime)"
          effect="light"
        >
          <el-tag size="small" type="info">
            <el-icon><Calendar /></el-icon>
            {{ getTimeAgo(props.spuInfo.updateTime) }}
          </el-tag>
        </el-tooltip>
      </el-descriptions-item>

      <el-descriptions-item v-if="props.spuInfo?.categories?.length" label="商品分类">
        <el-tag
          size="small"
          type="success"
          v-for="(cate, idx) in props.spuInfo.categories"
          :key="idx"
          >{{ cate.categoryId }}</el-tag
        >
      </el-descriptions-item>

      <el-descriptions-item v-if="props.spuInfo.unknowField?.brandInfo" label="品牌">
        <el-tag size="small" type="warning">{{ props.spuInfo.unknowField.brandInfo.name }}</el-tag>
      </el-descriptions-item>
    </el-descriptions>

    <!-- 次要信息使用折叠面板 -->
    <el-collapse v-model="activeContentSections" class="content-collapse">
      <!-- 属性信息 -->
      <el-collapse-item
        v-if="props.spuInfo.unknowField?.attrInfo?.length"
        title="商品属性"
        name="attributes"
      >
        <div class="attributes-list">
          <el-tag
            v-for="attr in props.spuInfo.unknowField?.attrInfo"
            :key="attr.attrId"
            class="attribute-tag"
            effect="light"
            size="small"
          >
            <b>{{ attr.title }}:</b>
            <span v-for="(value, index) in attr.attrValueList" :key="index">
              {{ value.value }}{{ index < attr.attrValueList.length - 1 ? ',' : '' }}
            </span>
          </el-tag>
        </div>
      </el-collapse-item>

      <!-- 标签信息 -->
      <el-collapse-item v-if="props.spuInfo.newTagInfos?.length" title="商品标签" name="tags">
        <div class="tags-container">
          <el-tooltip
            v-for="tag in props.spuInfo.newTagInfos"
            :key="tag.pk"
            placement="top"
            :effect="handleSpuInfoTagType(tag?.tagMark ?? '') === 'danger' ? 'light' : 'dark'"
          >
            <template #content>
              <el-descriptions size="small" border>
                <el-descriptions-item label="有效时间段" v-if="tag.beginTime && tag.endTime">
                  <el-tooltip :content="formatDateTime(tag.beginTime)" placement="top">
                    <span>{{ getTimeAgo(tag.beginTime) }}</span>
                  </el-tooltip>
                  ~
                  <el-tooltip :content="formatDateTime(tag.endTime)" placement="top">
                    <span>{{ getTimeAgo(tag.endTime) }}</span>
                  </el-tooltip>
                </el-descriptions-item>
                <el-descriptions-item label="标签更新时间">
                  <el-tooltip :content="formatDateTime(tag.updateTime)" placement="top">
                    <span>{{ getTimeAgo(tag.updateTime) }}</span>
                  </el-tooltip>
                </el-descriptions-item>
                <el-descriptions-item label="标签代码">
                  {{ tag.tagMark }}
                </el-descriptions-item>
              </el-descriptions>
            </template>
            <el-tag :type="handleSpuInfoTagType(tag.tagMark!)" effect="dark" class="info-tag">
              {{ tag.title }}
            </el-tag>
          </el-tooltip>
        </div>
      </el-collapse-item>

      <!-- 销售信息 -->
      <el-collapse-item v-if="hasSalesInfo" title="销售信息" name="sales">
        <el-descriptions :column="1" border size="small">
          <el-descriptions-item
            v-if="props.spuInfo.unknowField?.monthSales !== undefined"
            label="月销量"
          >
            {{ props.spuInfo.unknowField.monthSales }}
          </el-descriptions-item>
          <el-descriptions-item
            v-if="props.spuInfo.unknowField?.stockNum !== undefined"
            label="库存"
          >
            {{ props.spuInfo.unknowField.stockNum }}
          </el-descriptions-item>
          <el-descriptions-item
            v-if="props.spuInfo.unknowField?.commentCount !== undefined"
            label="评论数"
          >
            {{ props.spuInfo.unknowField.commentCount }}
          </el-descriptions-item>
          <el-descriptions-item
            v-if="props.spuInfo.unknowField?.rebuyCount !== undefined"
            label="复购次数"
          >
            {{ props.spuInfo.unknowField.rebuyCount }}
          </el-descriptions-item>
        </el-descriptions>
      </el-collapse-item>

      <!-- 其他信息 -->
      <el-collapse-item v-if="hasOtherInfo" title="其他信息" name="others">
        <el-descriptions :column="1" border size="small">
          <el-descriptions-item
            v-if="props.spuInfo.unknowField?.purchaseLimit !== undefined"
            label="购买限制"
          >
            {{ props.spuInfo.unknowField.purchaseLimit }}
          </el-descriptions-item>
          <el-descriptions-item
            v-if="props.spuInfo.unknowField?.purchaseMin !== undefined"
            label="最小购买量"
          >
            {{ props.spuInfo.unknowField.purchaseMin }}
          </el-descriptions-item>
          <el-descriptions-item
            v-if="props.spuInfo.unknowField?.shareCount !== undefined"
            label="分享次数"
          >
            {{ props.spuInfo.unknowField.shareCount }}
          </el-descriptions-item>
          <el-descriptions-item
            v-if="props.spuInfo.unknowField?.memberRecommendCount !== undefined"
            label="会员推荐数"
          >
            {{ props.spuInfo.unknowField.memberRecommendCount }}
          </el-descriptions-item>
        </el-descriptions>
      </el-collapse-item>
    </el-collapse>

    <!-- 图表部分 - 使用折叠面板 -->
    <el-collapse v-if="hasPriceData" v-model="activePriceChartPanel" class="price-chart-collapse">
      <el-collapse-item name="priceChart">
        <template #title>
          <div class="collapse-title">
            <el-icon><TrendCharts /></el-icon>
            <span>价格趋势分析</span>
            <el-tag size="small" type="info" effect="plain" class="price-count-tag">
              {{ priceHistory.length }}条记录
            </el-tag>
          </div>
        </template>
        <v-chart
          v-if="isShowPriceEcharts"
          class="chart-lines"
          :option="echartsOption"
          style="height: 300px; width: 100%"
        ></v-chart>
      </el-collapse-item>
    </el-collapse>

    <div class="action-buttons">
      <el-button @click="dialogTableVisible = true" type="info" size="small">
        <el-icon><InfoFilled /></el-icon>查看原始数据
      </el-button>
      <el-dialog v-model="dialogTableVisible" :title="props.spuInfo.title" width="75%" draggable>
        <VueJsonPretty
          :showDoubleQuotes="false"
          :data="props.spuInfo"
          :indent="2"
          :deep="3"
          showIcon
          showLineNumber
          showLength
        ></VueJsonPretty>
      </el-dialog>
    </div>
  </el-card>
</template>

<style scoped>
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.spu-title {
  max-width: 300px;
  display: inline-block;
}

.spu-id-link {
  margin-left: auto;
}

.price-history-badge {
  margin-right: 8px;
}

.info-container {
  display: flex;
  flex-direction: row;
  gap: 20px;
  margin-bottom: 15px;
}

.left-column {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 120px;
  flex-shrink: 0;
}

.spu-image-container {
  width: 120px;
  height: 120px;
  display: flex;
  justify-content: center;
  align-items: center;
  border: 1px solid #ebeef5;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.spu-image {
  width: 120px;
  height: 120px;
  object-fit: cover;
  transition: transform 0.3s;
}

.spu-image:hover {
  transform: scale(1.05);
}

.no-image {
  font-size: 12px;
  color: #999;
  text-align: center;
}

.spu-subtitle {
  margin-top: 10px;
  padding: 0 5px;
  text-align: center;
  width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  font-size: 12px;
  color: #606266;
}

.price-info {
  flex: 1;
  min-width: 250px;
}

.current-price {
  margin-bottom: 15px;
}

.price-title {
  display: flex;
  align-items: center;
  gap: 5px;
}

.price-stats {
  display: flex;
  flex-wrap: wrap;
  gap: 15px;
  margin-bottom: 15px;
}

.price-stat-item {
  flex: 1;
  min-width: 100px;
}

.attributes-descriptions {
  margin-top: 10px;
}

.attributes-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.attribute-tag {
  margin-bottom: 5px;
}

.tags-container {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.info-tag {
  margin-bottom: 5px;
}

.action-buttons {
  display: flex;
  justify-content: flex-end;
  margin-top: 15px;
}

.chart-tabs {
  width: 100%;
}

.chart-tabs :deep(.el-tabs__item.is-active) {
  color: var(--el-color-primary);
}

.chart-lines,
.chart-bars {
  margin-top: 10px;
}

.charts-container {
  margin-top: 20px;
  padding: 10px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 8px;
  background-color: var(--el-bg-color-page);
}

.label-bold {
  font-weight: bold;
}

.spu-tabs {
  width: 100%;
}

/* 属性与标签样式 */
.attribute-collapse {
  margin-top: 15px;
  border-radius: 4px;
  overflow: hidden;
}

.attributes-descriptions {
  margin-bottom: 15px;
}

/* 价格图表折叠面板样式 */
.price-chart-collapse {
  margin-top: 20px;
  border-radius: 4px;
  overflow: hidden;
}
.collapse-title {
  display: flex;
  align-items: center;
  gap: 8px;
}

.price-count-tag {
  margin-left: 10px;
}

/* 响应式设计 */
@media (max-width: 500px) {
  .info-container {
    flex-direction: column;
    align-items: center;
  }

  .left-column {
    margin-bottom: 15px;
  }

  .price-info {
    width: 100%;
  }

  .price-stats {
    flex-direction: column;
  }
}
</style>
