<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { query } from '@/api/samsclub/gql.ts'
import { gql } from '@urql/vue'
import { ElCollapseTransition } from 'element-plus'
import {
  SortUp,
  SortDown,
  Search,
  RemoveFilled,
  Top,
  Bottom,
  ArrowDown,
  ArrowUp,
  Calendar,
  PriceTag,
  Box,
  Warning,
  Close,
  Clock,
  QuestionFilled
} from '@element-plus/icons-vue'
import type { QueryGetSpuInfosArgs } from '@/gql/samsclub/graphql.ts'
import { useSamsclubStore } from '@/stores/samsclub.ts'
const queryParams = defineModel<QueryGetSpuInfosArgs>('queryParams', { required: true })
const props = defineProps<{
  submitForm: () => void
}>()

interface ListItem {
  value: string
  label: string
}
const samsclubStore = useSamsclubStore()
const orderByOptions = [
  { key: 'price', label: '价格' },
  { key: 'priceDiffCur', label: '当前差价' },
  { key: 'priceDiffLatest', label: '最新差价' },
  { key: 'priceDiffMax', label: '最大差价' },
  { key: 'spuInfoUpdate', label: '更新时间' },
  { key: 'spuInfoCreate', label: '创建时间' }
]

const selectedSorts = ref<{ key: string; order: 'asc' | 'desc' }[]>([])
const orderByAsc = ref(true)
const spuInfoMaxPrice = ref(0)
const spuNewTagTagMarkSelectOptions = ref<ListItem[]>([])
const priceMin = ref()
const priceMax = ref()
const oderBySelect = ref<string>('')
const updateTimeRange = ref<[Date | string, Date | string] | undefined>(undefined)
const createTimeRange = ref<[Date | string, Date | string] | undefined>(undefined)
const showBackToTop = ref(false)
const showScrollToBottom = ref(false)
const showAdvancedSearch = ref(false) // 控制高级查询的显示/隐藏
// 监听滚动事件，控制按钮的显示
const handleScroll = () => {
  const scrollY = window.scrollY
  const windowHeight = window.innerHeight
  const documentHeight = document.documentElement.scrollHeight

  // 当滚动超过300px时显示回到顶部按钮
  showBackToTop.value = scrollY > 300

  // 当没有滚动到底部时显示一键到底按钮（距离底部100px以上）
  showScrollToBottom.value = documentHeight - (scrollY + windowHeight) > 100
}

// 回到顶部
const scrollToTop = () => {
  window.scrollTo({
    top: 0,
    behavior: 'smooth'
  })
}

// 滚动到底部
const scrollToBottom = () => {
  window.scrollTo({
    top: document.documentElement.scrollHeight,
    behavior: 'smooth'
  })
}

const handleResetForm = () => {
  Object.assign(queryParams.value, {
    pn: 1,
    priceAsc: undefined,
    priceDiffCurAsc: undefined,
    priceDiffLatestAsc: undefined,
    priceDiffMaxAsc: undefined,
    priceMax: undefined,
    priceMin: undefined,
    ps: 10,
    spuId: undefined,
    spuInfoTitle: undefined,
    spuInfoUpdateAsc: undefined,
    spuInfoCreateAsc: undefined,
    spuNewTagTagMarkList: [],
    lastUpdateAfterTss: undefined,
    lastUpdateBeforeTss: undefined,
    lastCreateAfterTss: undefined,
    lastCreateBeforeTss: undefined
  })
  selectedSorts.value = []
  updateTimeRange.value = undefined
  createTimeRange.value = undefined
}

// 处理更新时间范围变化
const handleUpdateTimeRangeChange = (val: [Date | string, Date | string] | undefined) => {
  if (val && val.length === 2) {
    // 将日期转换为时间戳（秒）
    const startDate = typeof val[0] === 'string' ? new Date(val[0]) : val[0]
    const endDate = typeof val[1] === 'string' ? new Date(val[1]) : val[1]

    queryParams.value.lastUpdateAfterTss = Math.floor(startDate.getTime() / 1000)
    queryParams.value.lastUpdateBeforeTss = Math.floor(endDate.getTime() / 1000)
  } else {
    queryParams.value.lastUpdateAfterTss = undefined
    queryParams.value.lastUpdateBeforeTss = undefined
  }
}

// 处理创建时间范围变化
const handleCreateTimeRangeChange = (val: [Date | string, Date | string] | undefined) => {
  if (val && val.length === 2) {
    // 将日期转换为时间戳（秒）
    const startDate = typeof val[0] === 'string' ? new Date(val[0]) : val[0]
    const endDate = typeof val[1] === 'string' ? new Date(val[1]) : val[1]

    queryParams.value.lastCreateAfterTss = Math.floor(startDate.getTime() / 1000)
    queryParams.value.lastCreateBeforeTss = Math.floor(endDate.getTime() / 1000)
  } else {
    queryParams.value.lastCreateAfterTss = undefined
    queryParams.value.lastCreateBeforeTss = undefined
  }
}
const handleRemoteTagGroup = () => {
  query(gql`
    query GetTagGroups {
      SpuNewTagInfoTagMarkGroup {
        tagMark
        title
      }
    }
  `).then((data) => {
    spuNewTagTagMarkSelectOptions.value = data.data?.SpuNewTagInfoTagMarkGroup.map((el: any) => {
      return { value: el.tagMark, label: el.title.replace(/\d+(?:\.\d+)?/g, ' xx ') }
    })
  })
}
const handleGetMaxPrice = () => {
  query(gql`
    query GetMaxPrice {
      getMaxPrice
    }
  `).then((data) => {
    spuInfoMaxPrice.value = Math.round(data.data?.getMaxPrice / 100) + 1
  })
}
const handlePriceLimit = () => {
  if (priceMin.value > priceMax.value) {
    queryParams.value.priceMin = undefined
    queryParams.value.priceMax = undefined
    return
  }
  queryParams.value.priceMin = priceMin.value * 100
  queryParams.value.priceMax = priceMax.value * 100
}
const handleQueryParamsOrderBy = () => {
  // 重置所有排序参数
  queryParams.value.priceAsc = undefined
  queryParams.value.priceDiffCurAsc = undefined
  queryParams.value.priceDiffLatestAsc = undefined
  queryParams.value.priceDiffMaxAsc = undefined
  queryParams.value.spuInfoUpdateAsc = undefined
  queryParams.value.spuInfoCreateAsc = undefined

  // 应用选中的排序条件
  selectedSorts.value.forEach((sort) => {
    switch (sort.key) {
      case 'price':
        queryParams.value.priceAsc = sort.order === 'asc'
        break
      case 'priceDiffCur':
        queryParams.value.priceDiffCurAsc = sort.order === 'asc'
        break
      case 'priceDiffLatest':
        queryParams.value.priceDiffLatestAsc = sort.order === 'asc'
        break
      case 'priceDiffMax':
        queryParams.value.priceDiffMaxAsc = sort.order === 'asc'
        break
      case 'spuInfoUpdate':
        queryParams.value.spuInfoUpdateAsc = sort.order === 'asc'
        break
      case 'spuInfoCreate':
        queryParams.value.spuInfoCreateAsc = sort.order === 'asc'
        break
    }
  })
}
const toggleSortOrder = (key: string) => {
  const index = selectedSorts.value.findIndex((s) => s.key === key)
  if (index >= 0) {
    const sort = selectedSorts.value[index]
    sort.order = sort.order === 'asc' ? 'desc' : 'asc'
  } else {
    selectedSorts.value.push({ key, order: 'asc' })
  }
  handleQueryParamsOrderBy()
}
const handleOrderBy = () => {
  handleQueryParamsOrderBy()
}

// 快捷查询方法
// 查询近x天新创建的商品
const queryRecentCreated = (days: number) => {
  // 重置表单
  handleResetForm()

  // 设置时间范围为近x天
  const endDate = new Date()
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)

  queryParams.value.lastCreateAfterTss = Math.floor(startDate.getTime() / 1000)
  queryParams.value.lastCreateBeforeTss = Math.floor(endDate.getTime() / 1000)

  // 更新时间范围显示
  createTimeRange.value = [startDate, endDate] as [Date | string, Date | string]

  // 按创建时间降序排列(最新创建的排前面)
  oderBySelect.value = 'spuInfoCreateAsc'
  orderByAsc.value = false
  queryParams.value.spuInfoCreateAsc = false

  // 提交查询
  props.submitForm()
}

// 查询近x天更新的商品
const queryRecentUpdated = (days: number) => {
  // 重置表单
  handleResetForm()

  // 设置时间范围为近x天
  const endDate = new Date()
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)

  queryParams.value.lastUpdateAfterTss = Math.floor(startDate.getTime() / 1000)
  queryParams.value.lastUpdateBeforeTss = Math.floor(endDate.getTime() / 1000)

  // 更新时间范围显示
  updateTimeRange.value = [startDate, endDate] as [Date | string, Date | string]

  // 按更新时间降序排列(最新更新的排前面)
  oderBySelect.value = 'spuInfoUpdateAsc'
  orderByAsc.value = false
  queryParams.value.spuInfoUpdateAsc = false

  // 提交查询
  props.submitForm()
}

// 查询特定价格范围内折扣最大的有效商品(7天内更新的)
const queryMaxDiscountInPrice = (maxPrice: number) => {
  // 重置表单
  handleResetForm()

  // 设置价格范围
  queryParams.value.priceMax = maxPrice * 100
  priceMax.value = maxPrice

  // 限制为7天内更新的商品
  const endDate = new Date()
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - 7)
  queryParams.value.lastUpdateAfterTss = Math.floor(startDate.getTime() / 1000)
  updateTimeRange.value = [startDate, endDate] as [Date | string, Date | string]

  // 设置按最大差价降序排序
  oderBySelect.value = 'priceDiffMaxAsc'
  orderByAsc.value = false
  queryParams.value.priceDiffMaxAsc = false

  // 提交查询
  props.submitForm()
}

// 查询特定价格范围内当前差价最大的商品(7天内更新的)
const queryCurrentDiscountInPrice = (maxPrice: number) => {
  // 重置表单
  handleResetForm()

  // 设置价格范围
  queryParams.value.priceMax = maxPrice * 100
  priceMax.value = maxPrice

  // 限制为7天内更新的商品
  const endDate = new Date()
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - 7)
  queryParams.value.lastUpdateAfterTss = Math.floor(startDate.getTime() / 1000)
  updateTimeRange.value = [startDate, endDate] as [Date | string, Date | string]

  // 设置按当前差价降序排序
  oderBySelect.value = 'priceDiffCurAsc'
  orderByAsc.value = false
  queryParams.value.priceDiffCurAsc = false

  // 提交查询
  props.submitForm()
}

// 查询特定价格范围内最新差价最大的商品(7天内更新的)
const queryLatestDiscountInPrice = (maxPrice: number) => {
  // 重置表单
  handleResetForm()

  // 设置价格范围
  queryParams.value.priceMax = maxPrice * 100
  priceMax.value = maxPrice

  // 限制为7天内更新的商品
  const endDate = new Date()
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - 7)
  queryParams.value.lastUpdateAfterTss = Math.floor(startDate.getTime() / 1000)
  updateTimeRange.value = [startDate, endDate] as [Date | string, Date | string]

  // 设置按最新差价降序排序
  oderBySelect.value = 'priceDiffLatestAsc'
  orderByAsc.value = false
  queryParams.value.priceDiffLatestAsc = false

  // 提交查询
  props.submitForm()
}

// 查询可能下架的商品(3天未更新且价格范围内)
const queryLongTimeNoUpdate = (maxPrice?: number) => {
  // 重置表单
  handleResetForm()

  // 设置查询条件：最后更新时间在3天前
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - 3)
  queryParams.value.lastUpdateBeforeTss = Math.floor(cutoffDate.getTime() / 1000)
  updateTimeRange.value = ['', cutoffDate]

  // 设置价格上限(可选)
  if (maxPrice) {
    queryParams.value.priceMax = maxPrice * 100
    priceMax.value = maxPrice
  }

  // 按更新时间升序排列(最久未更新的排前面)
  oderBySelect.value = 'spuInfoUpdateAsc'
  orderByAsc.value = true
  queryParams.value.spuInfoUpdateAsc = true

  // 提交查询
  props.submitForm()
}

// 查询低价好物(价格低于指定值且有折扣)
const queryLowPriceWithDiscount = (maxPrice: number) => {
  // 重置表单
  handleResetForm()

  // 设置价格上限
  queryParams.value.priceMax = maxPrice * 100
  priceMax.value = maxPrice

  // 限制为30天内更新的商品(确保是有效商品)
  const endDate = new Date()
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - 30)
  queryParams.value.lastUpdateAfterTss = Math.floor(startDate.getTime() / 1000)
  updateTimeRange.value = [startDate, endDate] as [Date | string, Date | string]

  // 按价格升序排列(最便宜的排前面)
  oderBySelect.value = 'priceAsc'
  orderByAsc.value = true
  queryParams.value.priceAsc = true

  // 提交查询
  props.submitForm()
}

// 切换高级查询显示/隐藏
const toggleAdvancedSearch = () => {
  showAdvancedSearch.value = !showAdvancedSearch.value
}
onMounted(() => {
  handleRemoteTagGroup()
  handleGetMaxPrice()

  // 初始化更新时间范围
  if (queryParams.value.lastUpdateAfterTss && queryParams.value.lastUpdateBeforeTss) {
    updateTimeRange.value = [
      new Date(queryParams.value.lastUpdateAfterTss * 1000),
      new Date(queryParams.value.lastUpdateBeforeTss * 1000)
    ] as [Date | string, Date | string]
  }

  // 初始化创建时间范围
  if (queryParams.value.lastCreateAfterTss && queryParams.value.lastCreateBeforeTss) {
    createTimeRange.value = [
      new Date(queryParams.value.lastCreateAfterTss * 1000),
      new Date(queryParams.value.lastCreateBeforeTss * 1000)
    ] as [Date | string, Date | string]
  }

  // 添加滚动事件监听
  window.addEventListener('scroll', handleScroll)
})

onUnmounted(() => {
  // 移除滚动事件监听
  window.removeEventListener('scroll', handleScroll)
})

// 暴露方法给父组件
defineExpose({
  scrollToTop,
  scrollToBottom
})
</script>

<template>
  <!-- 基本查询部分 -->
  <el-descriptions :column="2" border>
    <el-descriptions-item label="SPU ID">
      <el-input v-model.number="queryParams.spuId" placeholder="请输入SPU ID" />
    </el-descriptions-item>
    <el-descriptions-item label="SPU标题">
      <el-input v-model="queryParams.spuInfoTitle" placeholder="请输入SPU标题" />
    </el-descriptions-item>

    <!-- 快捷查询按钮组和高级查询切换按钮 -->
    <el-descriptions-item :span="2" label="快捷查询">
      <div class="quick-search-row">
        <div class="quick-search-area">
          <div class="quick-search-grid">
            <!-- 第一列 -->
            <div class="quick-search-column">
              <!-- 最近创建快捷查询 -->
              <div class="quick-search-group">
                <div class="group-title">
                  最近创建
                  <el-tooltip content="查询最近创建的商品，按创建时间降序排列" placement="top">
                    <el-icon><QuestionFilled /></el-icon>
                  </el-tooltip>
                </div>
                <el-button-group>
                  <el-button size="small" @click="queryRecentCreated(7)" type="primary" plain>
                    <el-icon><Calendar /></el-icon>近7天新品
                  </el-button>
                  <el-button size="small" @click="queryRecentCreated(15)" type="primary" plain>
                    <el-icon><Calendar /></el-icon>近15天新品
                  </el-button>
                  <el-button size="small" @click="queryRecentCreated(30)" type="primary" plain>
                    <el-icon><Calendar /></el-icon>近30天新品
                  </el-button>
                </el-button-group>
              </div>

              <!-- 最近更新快捷查询 -->
              <div class="quick-search-group">
                <div class="group-title">
                  最近更新
                  <el-tooltip content="查询最近更新的商品，按更新时间降序排列" placement="top">
                    <el-icon><QuestionFilled /></el-icon>
                  </el-tooltip>
                </div>
                <el-button-group>
                  <el-button size="small" @click="queryRecentUpdated(3)" type="warning" plain>
                    <el-icon><Clock /></el-icon>近3天更新
                  </el-button>
                  <el-button size="small" @click="queryRecentUpdated(7)" type="warning" plain>
                    <el-icon><Clock /></el-icon>近7天更新
                  </el-button>
                  <el-button size="small" @click="queryRecentUpdated(15)" type="warning" plain>
                    <el-icon><Clock /></el-icon>近15天更新
                  </el-button>
                </el-button-group>
              </div>
            </div>

            <!-- 第二列 -->
            <div class="quick-search-column">
              <!-- 最大历史折扣快捷查询 -->
              <div class="quick-search-group">
                <div class="group-title">
                  最大历史折扣
                  <el-tooltip
                    content="查询7天内更新的商品中，指定价格范围内历史折扣最大的商品，按最大差价降序排列"
                    placement="top"
                  >
                    <el-icon><QuestionFilled /></el-icon>
                  </el-tooltip>
                </div>
                <el-button-group>
                  <el-button size="small" @click="queryMaxDiscountInPrice(30)" type="success" plain>
                    <el-icon><PriceTag /></el-icon>30元内
                  </el-button>
                  <el-button size="small" @click="queryMaxDiscountInPrice(50)" type="success" plain>
                    <el-icon><PriceTag /></el-icon>50元内
                  </el-button>
                  <el-button
                    size="small"
                    @click="queryMaxDiscountInPrice(100)"
                    type="success"
                    plain
                  >
                    <el-icon><PriceTag /></el-icon>100元内
                  </el-button>
                </el-button-group>
              </div>

              <!-- 当前折扣快捷查询 -->
              <div class="quick-search-group">
                <div class="group-title">
                  当前折扣
                  <el-tooltip
                    content="查询7天内更新的商品中，指定价格范围内当前折扣最大的商品，按当前差价降序排列"
                    placement="top"
                  >
                    <el-icon><QuestionFilled /></el-icon>
                  </el-tooltip>
                </div>
                <el-button-group>
                  <el-button
                    size="small"
                    @click="queryCurrentDiscountInPrice(30)"
                    type="danger"
                    plain
                  >
                    <el-icon><PriceTag /></el-icon>30元内
                  </el-button>
                  <el-button
                    size="small"
                    @click="queryCurrentDiscountInPrice(50)"
                    type="danger"
                    plain
                  >
                    <el-icon><PriceTag /></el-icon>50元内
                  </el-button>
                  <el-button
                    size="small"
                    @click="queryCurrentDiscountInPrice(100)"
                    type="danger"
                    plain
                  >
                    <el-icon><PriceTag /></el-icon>100元内
                  </el-button>
                </el-button-group>
              </div>
            </div>

            <!-- 第三列 -->
            <div class="quick-search-column">
              <!-- 最新折扣快捷查询 -->
              <div class="quick-search-group">
                <div class="group-title">
                  最新折扣
                  <el-tooltip
                    content="查询7天内更新的商品中，指定价格范围内最新折扣最大的商品，按最新差价降序排列"
                    placement="top"
                  >
                    <el-icon><QuestionFilled /></el-icon>
                  </el-tooltip>
                </div>
                <el-button-group>
                  <el-button
                    size="small"
                    @click="queryLatestDiscountInPrice(30)"
                    type="success"
                    plain
                  >
                    <el-icon><PriceTag /></el-icon>30元内
                  </el-button>
                  <el-button
                    size="small"
                    @click="queryLatestDiscountInPrice(50)"
                    type="success"
                    plain
                  >
                    <el-icon><PriceTag /></el-icon>50元内
                  </el-button>
                  <el-button
                    size="small"
                    @click="queryLatestDiscountInPrice(100)"
                    type="success"
                    plain
                  >
                    <el-icon><PriceTag /></el-icon>100元内
                  </el-button>
                </el-button-group>
              </div>

              <!-- 低价好物快捷查询 -->
              <div class="quick-search-group">
                <div class="group-title">
                  低价好物
                  <el-tooltip
                    content="查询指定价格范围内的低价商品，按价格升序排列"
                    placement="top"
                  >
                    <el-icon><QuestionFilled /></el-icon>
                  </el-tooltip>
                </div>
                <el-button-group>
                  <el-button
                    size="small"
                    @click="queryLowPriceWithDiscount(10)"
                    type="danger"
                    plain
                  >
                    <el-icon><PriceTag /></el-icon>10元内
                  </el-button>
                  <el-button
                    size="small"
                    @click="queryLowPriceWithDiscount(20)"
                    type="danger"
                    plain
                  >
                    <el-icon><PriceTag /></el-icon>20元内
                  </el-button>
                  <el-button
                    size="small"
                    @click="queryLowPriceWithDiscount(30)"
                    type="danger"
                    plain
                  >
                    <el-icon><PriceTag /></el-icon>30元内
                  </el-button>
                </el-button-group>
              </div>
            </div>

            <!-- 第四列 -->
            <div class="quick-search-column">
              <!-- 可能下架商品查询 -->
              <div class="quick-search-group">
                <div class="group-title">
                  可能下架商品
                  <el-tooltip
                    content="查询可能下架的商品（3天未更新），按更新时间升序排列"
                    placement="top"
                  >
                    <el-icon><QuestionFilled /></el-icon>
                  </el-tooltip>
                </div>
                <el-button-group>
                  <el-button size="small" @click="queryLongTimeNoUpdate()" type="info" plain>
                    <el-icon><Warning /></el-icon>全部
                  </el-button>
                  <el-button size="small" @click="queryLongTimeNoUpdate(30)" type="info" plain>
                    <el-icon><Warning /></el-icon>30元内
                  </el-button>
                  <el-button size="small" @click="queryLongTimeNoUpdate(50)" type="info" plain>
                    <el-icon><Warning /></el-icon>50元内
                  </el-button>
                </el-button-group>
              </div>
            </div>
          </div>
        </div>

        <div class="advanced-search-toggle">
          <el-tooltip
            :content="showAdvancedSearch ? '收起更多信息' : '展开更多信息'"
            placement="top"
          >
            <el-button
              type="primary"
              circle
              @click="toggleAdvancedSearch"
              :icon="showAdvancedSearch ? ArrowUp : ArrowDown"
              size="small"
            />
          </el-tooltip>
        </div>
      </div>

      <!-- 更多信息部分 - 直接在按钮下方展开 -->
      <el-collapse-transition>
        <div v-show="showAdvancedSearch" class="advanced-search">
          <div class="more-info-header">更多筛选条件</div>

          <!-- 商品标签和属性筛选 -->
          <el-table
            :data="[{}]"
            border
            style="width: 100%; margin-bottom: 10px"
            :show-header="false"
          >
            <el-table-column prop="productTags" label="商品标签">
              <template #default>
                <div class="table-cell-content">
                  <div class="cell-label">商品标签：</div>
                  <div class="cell-content">
                    <el-select
                      v-model="queryParams.spuNewTagTagMarkList!"
                      multiple
                      placeholder="请选择商品标签"
                      clearable
                      style="width: 100%"
                    >
                      <el-option
                        v-for="(tag, idx) in spuNewTagTagMarkSelectOptions"
                        :key="idx"
                        :label="tag.label"
                        :value="tag.value"
                      >
                        <span style="float: left">{{ tag.label }}</span>
                        <span
                          style="
                            float: right;
                            color: var(--el-text-color-secondary);
                            font-size: 13px;
                          "
                        >
                          {{ tag.value }}
                        </span>
                      </el-option>
                    </el-select>
                  </div>
                </div>
              </template>
            </el-table-column>
          </el-table>

          <!-- 高级筛选条件 -->
          <el-table :data="[{}]" border style="width: 100%" :show-header="false">
            <el-table-column prop="sortSelect" label="排序选择">
              <template #default>
                <div class="table-cell-content">
                  <div class="cell-label">排序选择：</div>
                  <div class="cell-content">
                    <div class="sort-options">
                      <div v-for="option in orderByOptions" :key="option.key" class="sort-option">
                        <el-checkbox
                          :model-value="selectedSorts.some((s) => s.key === option.key)"
                          :label="option.key"
                          @change="
                            (val) => {
                              if (val) {
                                selectedSorts.push({ key: option.key, order: 'asc' })
                              } else {
                                const index = selectedSorts.findIndex((s) => s.key === option.key)
                                if (index >= 0) selectedSorts.splice(index, 1)
                              }
                              handleQueryParamsOrderBy()
                            }
                          "
                        >
                          {{ option.label }}
                        </el-checkbox>
                        <el-button
                          v-if="selectedSorts.some((s) => s.key === option.key)"
                          @click="toggleSortOrder(option.key)"
                          size="small"
                          :type="
                            selectedSorts.find((s) => s.key === option.key)?.order === 'asc'
                              ? 'primary'
                              : 'warning'
                          "
                        >
                          <el-icon>
                            <SortUp
                              v-if="
                                selectedSorts.find((s) => s.key === option.key)?.order === 'asc'
                              "
                            />
                            <SortDown v-else />
                          </el-icon>
                        </el-button>
                      </div>
                    </div>
                  </div>
                </div>
              </template>
            </el-table-column>
          </el-table>

          <el-table :data="[{}]" border style="width: 100%; margin-top: 10px" :show-header="false">
            <el-table-column prop="priceMin" label="最低价格限制">
              <template #default>
                <div class="table-cell-content">
                  <div class="cell-label">最低价格限制：</div>
                  <div class="cell-content">
                    <el-slider
                      v-model="priceMin"
                      @change="handlePriceLimit"
                      :max="spuInfoMaxPrice"
                      show-input
                      show-input-controls
                    />
                  </div>
                </div>
              </template>
            </el-table-column>
          </el-table>

          <el-table :data="[{}]" border style="width: 100%; margin-top: 10px" :show-header="false">
            <el-table-column prop="priceMax" label="最高价格限制">
              <template #default>
                <div class="table-cell-content">
                  <div class="cell-label">最高价格限制：</div>
                  <div class="cell-content">
                    <el-slider
                      v-model="priceMax"
                      @change="handlePriceLimit"
                      :max="spuInfoMaxPrice"
                      show-input
                      show-input-controls
                    />
                  </div>
                </div>
              </template>
            </el-table-column>
          </el-table>

          <el-table :data="[{}]" border style="width: 100%; margin-top: 10px" :show-header="false">
            <el-table-column prop="updateTimeRange" label="更新时间范围">
              <template #default>
                <div class="table-cell-content">
                  <div class="cell-label">更新时间范围：</div>
                  <div class="cell-content">
                    <el-date-picker
                      v-model="updateTimeRange"
                      type="datetimerange"
                      range-separator="至"
                      start-placeholder="开始日期"
                      end-placeholder="结束日期"
                      format="YYYY-MM-DD HH:mm:ss"
                      value-format="YYYY-MM-DD HH:mm:ss"
                      @change="handleUpdateTimeRangeChange"
                      style="width: 100%"
                      class="update-time-picker"
                    />
                  </div>
                </div>
              </template>
            </el-table-column>
          </el-table>

          <el-table :data="[{}]" border style="width: 100%; margin-top: 10px" :show-header="false">
            <el-table-column prop="createTimeRange" label="创建时间范围">
              <template #default>
                <div class="table-cell-content">
                  <div class="cell-label">创建时间范围：</div>
                  <div class="cell-content">
                    <el-date-picker
                      v-model="createTimeRange"
                      type="datetimerange"
                      range-separator="至"
                      start-placeholder="开始日期"
                      end-placeholder="结束日期"
                      format="YYYY-MM-DD HH:mm:ss"
                      value-format="YYYY-MM-DD HH:mm:ss"
                      @change="handleCreateTimeRangeChange"
                      style="width: 100%"
                      class="create-time-picker"
                    />
                  </div>
                </div>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </el-collapse-transition>
    </el-descriptions-item>

    <!-- 操作按钮 -->
    <el-descriptions-item align="center">
      <div class="op-area">
        <el-switch
          v-model="samsclubStore.isShowPriceEcharts"
          class="op"
          inline-prompt
          active-text="展示价格图"
          inactive-text="隐藏价格图"
          style="
            --el-switch-on-color: var(--el-color-success-light-5);
            --el-switch-off-color: var(--el-color-danger-light-7);
          "
        ></el-switch>
        <el-button class="op" size="large" @click="handleResetForm" :icon="RemoveFilled"
          >重置
        </el-button>
        <el-button
          class="op"
          size="large"
          type="primary"
          @click="props.submitForm()"
          :autofocus="true"
          :icon="Search"
          @keydown.enter="props.submitForm()"
          >查询
        </el-button>
      </div>
    </el-descriptions-item>
  </el-descriptions>

  <!-- 高级查询部分已移至按钮下方 -->

  <!-- 回到顶部按钮 -->
  <div v-show="showBackToTop" class="back-to-top" @click="scrollToTop">
    <el-button type="primary" circle :icon="Top" size="large" />
  </div>

  <!-- 一键到底按钮 -->
  <div v-show="showScrollToBottom" class="scroll-to-bottom" @click="scrollToBottom">
    <el-button type="success" circle :icon="Bottom" size="large" />
  </div>
</template>

<style scoped>
.back-to-top {
  position: fixed;
  right: 40px;
  bottom: 40px;
  cursor: pointer;
  z-index: 999;
  transition: opacity 0.3s;
}

.scroll-to-bottom {
  position: fixed;
  right: 40px;
  bottom: 100px; /* 放在回到顶部按钮上方 */
  cursor: pointer;
  z-index: 999;
  transition: opacity 0.3s;
}

.op-area .op + .op {
  margin-left: 15px;
}

/* 快捷查询行样式 */
.quick-search-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

/* 快捷查询区域样式 */
.quick-search-area {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  flex: 1;
}

.quick-search-title {
  font-weight: bold;
  margin-right: 10px;
}

.quick-search-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  width: 100%;
}

.quick-search-column {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.quick-search-group {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.group-title {
  font-size: 14px;
  font-weight: bold;
  color: #606266;
  margin-bottom: 2px;
  display: flex;
  align-items: center;
  gap: 4px;
}

.group-title .el-icon {
  color: #909399;
  cursor: help;
}

.group-title .el-icon:hover {
  color: #409eff;
}

/* 高级查询切换按钮样式 */
.advanced-search-toggle {
  display: flex;
  justify-content: flex-end;
  margin-left: 15px;
}

/* 高级查询区域样式 */
.advanced-search {
  margin-top: 15px;
  border-top: 1px dashed #dcdfe6;
  padding-top: 15px;
  width: 100%;
}

/* 更多信息标题样式 */
.more-info-header {
  font-size: 16px;
  font-weight: bold;
  margin-bottom: 15px;
  color: #409eff;
}

/* 表格单元格内容样式 */
.table-cell-content {
  display: flex;
  align-items: flex-start;
  width: 100%;
}

.cell-label {
  width: 120px;
  font-weight: bold;
  padding: 8px 0;
}

.cell-content {
  flex: 1;
  padding: 5px 0;
}

/* 过渡动画 */
.el-collapse-transition {
  transition: all 0.3s ease-in-out;
}

/* 创建时间和更新时间的配色 */
:deep(.update-time-picker) {
  --el-datepicker-border-color: #409eff;
  --el-datepicker-text-color: #409eff;
  --el-datepicker-inner-border-color: #409eff;
  --el-datepicker-active-color: #409eff;
}

:deep(.create-time-picker) {
  --el-datepicker-border-color: #67c23a;
  --el-datepicker-text-color: #67c23a;
  --el-datepicker-inner-border-color: #67c23a;
  --el-datepicker-active-color: #67c23a;
}
</style>
