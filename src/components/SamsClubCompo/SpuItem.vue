<script setup lang="ts">
import VChart from 'vue-echarts'
import { type PropType } from 'vue'
import { ElCard, ElImage, ElDescriptions, ElDescriptionsItem, ElTag, ElTooltip } from 'element-plus'
import type { SpuInfoType } from '@/gql/samsclub/graphql.ts'
import { Coin, QuestionFilled } from '@element-plus/icons-vue'
import VueJsonPretty from 'vue-json-pretty'
import 'vue-json-pretty/lib/styles.css'
import { use } from 'echarts/core'
import { LineChart } from 'echarts/charts'
import {
  TitleComponent,
  GridComponent,
  DataZoomComponent,
  TooltipComponent
} from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import type { ComposeOption } from 'echarts/core'
import type { LineSeriesOption } from 'echarts/charts'
import type {
  TitleComponentOption,
  GridComponentOption,
  DataZoomComponentOption
} from 'echarts/components'
import { useSamsclubStore } from '@/stores/samsclub.ts'

const samsclubStore = useSamsclubStore()

const props = defineProps({
  spuInfo: {
    type: Object as PropType<SpuInfoType>,
    required: true
  }
})
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
const dialogTableVisible = ref(false)
use([TitleComponent, GridComponent, DataZoomComponent, LineChart, CanvasRenderer, TooltipComponent])

type EChartsOption = ComposeOption<
  TitleComponentOption | GridComponentOption | DataZoomComponentOption | LineSeriesOption
>
const randColor = () => {
  return `rgb(${Math.floor(Math.random() * 255)}, ${Math.floor(Math.random() * 255)}, ${Math.floor(Math.random() * 255)})`
}
const echartsOption = ref<EChartsOption>({
  tooltip: { show: true },
  aria: {
    show: true
  },
  title: {
    text: '价格变化趋势',
    left: 'center'
  },
  xAxis: {
    position: 'top',
    axisLabel: {
      interval: 0,
      rotate: 0,
      fontSize: 10
    },
    type: 'category',
    name: '更新日期',
    nameLocation: 'middle',
    nameTextStyle: {
      lineHeight: 25
    },
    data: [...props.spuInfo?.allPriceInfos].reverse().map((el) => {
      let date = new Date(el.updateTime)
      return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
    }),
    boundaryGap: false,
    min: 'dataMin',
    max: 'dataMax'
  },
  yAxis: {
    axisLabel: {
      rotate: 45,
      fontSize: 10
    },
    type: 'value',
    alignTicks: true,
    name: '价格(元)'
  },
  dataZoom: [
    {
      type: 'slider',
      show: true,
      xAxisIndex: [0],
      filterMode: 'filter'
    },
    {
      type: 'slider',
      show: true,
      yAxisIndex: [0],
      filterMode: 'filter'
    },
    {
      type: 'inside',
      xAxisIndex: [0],
      filterMode: 'filter'
    },
    {
      type: 'inside',
      yAxisIndex: [0],
      filterMode: 'filter'
    }
  ],
  series: [
    {
      data: [...props.spuInfo?.allPriceInfos].reverse().map((el) => (el.price ?? 0) / 100),
      type: 'line',
      areaStyle: {
        color: randColor(),
        opacity: 0.5
      }
    }
  ]
})
</script>

<template>
  <el-card
    shadow="hover"
    class="spu-card-extended"
    style="width: 400px; display: flex; flex-direction: column"
    body-style="flex-grow: 1;"
  >
    <template #header>
      <el-text tag="b" class="spu-title" size="large">{{ props.spuInfo.title }}</el-text>
      <el-link
        type="primary"
        underline="never"
        style="float: right"
        title="点击跳转app"
        :href="`sams://goods_detail?spuId=${props.spuInfo.spuId}`"
        target="_self"
        >SpuId: {{ props.spuInfo.spuId }}
      </el-link>
    </template>

    <el-space fill :size="25">
      <div class="spu-image">
        <el-image
          v-if="props.spuInfo.image"
          :src="props.spuInfo.image"
          referrerpolicy="no-referrer"
          lazy
          fit="cover"
          style="width: 100px; height: 100px"
          :preview-src-list="[props.spuInfo.image]"
        />
        <div v-else class="no-image">暂无图片</div>
      </div>
      <el-row>
        <el-col>
          <el-statistic :precision="2" :value="(props.spuInfo.latestPriceInfo?.price || 0) / 100">
            <template #title>
              <el-text type="primary">当前价格</el-text>
              <el-tooltip
                placement="top"
                :content="`当前价格 更新时间:${new Date(props.spuInfo.latestPriceInfo!.updateTime).toLocaleString()}`"
              >
                <el-icon>
                  <QuestionFilled />
                </el-icon>
              </el-tooltip>
            </template>
            <template #suffix>
              <el-icon>
                <Coin></Coin>
              </el-icon>
            </template>
          </el-statistic>
        </el-col>
        <el-space :size="30">
          <el-statistic
            :value-style="{ color: handlePriceValueTextColor(props.spuInfo.curPriceDiff ?? 0) }"
            :precision="2"
            :value="(props.spuInfo.curPriceDiff || 0) / 100"
          >
            <template #title>
              <el-text :type="handlePriceTitleTextColor(props.spuInfo.curPriceDiff ?? 0)"
                >当前差价
              </el-text>
              <el-tooltip placement="top" content="历史最高价格 - 当前价格 ">
                <el-icon>
                  <QuestionFilled />
                </el-icon>
              </el-tooltip>
            </template>
            <template #suffix>
              <el-icon>
                <Coin></Coin>
              </el-icon>
            </template>
          </el-statistic>
          <el-statistic
            :value-style="{ color: handlePriceValueTextColor(props.spuInfo.latestPriceDiff ?? 0) }"
            :precision="2"
            :value="(props.spuInfo.latestPriceDiff || 0) / 100"
          >
            <template #title>
              <el-text :type="handlePriceTitleTextColor(props.spuInfo.latestPriceDiff ?? 0)"
                >最新差价
              </el-text>
              <el-tooltip placement="top" content="当前价格 - 上一次价格 (负数是涨价)">
                <el-icon>
                  <QuestionFilled />
                </el-icon>
              </el-tooltip>
            </template>
            <template #suffix>
              <el-icon>
                <Coin></Coin>
              </el-icon>
            </template>
          </el-statistic>
          <el-statistic
            :value-style="{ color: handlePriceValueTextColor(props.spuInfo.maxPriceDiff ?? 0) }"
            :precision="2"
            :value="(props.spuInfo.maxPriceDiff || 0) / 100"
          >
            <template #title>
              <el-text :type="handlePriceTitleTextColor(props.spuInfo.maxPriceDiff ?? 0)"
                >最大差价
              </el-text>
              <el-tooltip placement="top" content="历史最高价 - 历史最低价">
                <el-icon>
                  <QuestionFilled />
                </el-icon>
              </el-tooltip>
            </template>
            <template #suffix>
              <el-icon>
                <Coin></Coin>
              </el-icon>
            </template>
          </el-statistic>
        </el-space>
      </el-row>
      <el-descriptions :column="1" border size="small" label-class-name="label-bold">
        <el-descriptions-item label="更新时间"
          >{{ new Date(props.spuInfo.updateTime).toLocaleString() }}
        </el-descriptions-item>
        <!-- 属性信息 -->
        <el-descriptions-item label="重要属性">
          <ul>
            <li v-for="attr in props.spuInfo.unknowField.attrInfo" :key="attr.attrId">
              {{ attr.title }}:
              <span v-for="(value, index) in attr.attrValueList" :key="index">
                {{ value.value }}
              </span>
            </li>
          </ul>
        </el-descriptions-item>
        <!-- 标签信息 -->
        <el-descriptions-item label="标签">
          <el-tooltip v-for="tag in props.spuInfo.newTagInfos" :key="tag.title!" placement="top">
            <template #content>
              <el-descriptions size="small" border>
                <el-descriptions-item label="有效时间段" v-if="tag.beginTime">
                  {{ new Date(tag.beginTime).toLocaleString() }} ~
                  {{ new Date(tag.endTime).toLocaleString() }}
                </el-descriptions-item>
                <el-descriptions-item label="标签更新时间">
                  {{ new Date(tag.updateTime).toLocaleString() }}
                </el-descriptions-item>
                <el-descriptions-item label="标签代码">
                  {{ tag.tagMark }}
                </el-descriptions-item>
              </el-descriptions>
            </template>
            <el-tag
              :type="handleSpuInfoTagType(tag.tagMark!)"
              effect="plain"
              style="margin-right: 5px"
            >
              {{ tag.title }}
            </el-tag>
          </el-tooltip>
        </el-descriptions-item>
      </el-descriptions>
      <el-button @click="dialogTableVisible = true">查看原始数据</el-button>
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
    </el-space>
    <template #footer>
      <v-chart
        v-if="samsclubStore.isShowPriceEcharts"
        class="chart-lines"
        :option="echartsOption"
        style="height: 300px; width: 100%"
      ></v-chart>
    </template>
  </el-card>
</template>

<style scoped>
.spu-image {
  flex-shrink: 0;
  width: 100px;
  height: 100px;
  display: flex;
  justify-content: center;
  align-items: center;
  border: 1px solid #ebeef5;
  border-radius: 4px;
  overflow: hidden;
}

.no-image {
  font-size: 12px;
  color: #999;
  text-align: center;
}

.label-bold {
  font-weight: bold;
}
</style>
