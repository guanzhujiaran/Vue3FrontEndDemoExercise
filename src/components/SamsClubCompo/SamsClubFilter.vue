<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { query } from '@/api/samsclub/gql.ts'
import { ElCollapseTransition } from 'element-plus'
import { useQuery } from '@urql/vue'
import { ArrowUp, ArrowDown, RemoveFilled, Search } from '@element-plus/icons-vue'

import type { QueryGetSpuInfosArgs } from '@/gql/samsclub/graphql.ts'
import { useSamsclubStore } from '@/stores/samsclub.ts'
import UniversalSearchBox from '@/components/CommonCompo/Bili-Search-Compo/UniversalSearchBox.vue'
import { GET_MAX_PRICE, GET_TAG_GROUPS } from '@/gql/samsclub/queries.ts'
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
const priceMin = ref()
const priceMax = ref()
const oderBySelect = ref<string>('')
const updateTimeRange = ref()
const createTimeRange = ref()
const showAdvancedSearch = ref(false) // 控制高级查询的显示/隐藏

// SPU标题搜索引用
const spuTitleSearchRef = ref<InstanceType<typeof UniversalSearchBox> | null>(null)
const spuTitleInput = ref('') // 用于绑定SPU标题输入框的值
const get_tag_groups_result = useQuery({
  query: GET_TAG_GROUPS
})
const get_max_price_result = useQuery({
  query: GET_MAX_PRICE
})

const spuInfoMaxPrice = computed<number>(() => {
  return Math.round(get_max_price_result.data.value.getMaxPrice / 100) + 1
})
const spuNewTagTagMarkSelectOptions = computed<ListItem[]>(() => {
  return get_tag_groups_result.data.value
    ? get_tag_groups_result.data.value.SpuNewTagInfoTagMarkGroup.map((el: any) => {
        return { value: el.tagMark, label: el.title.replace(/\d+(?:\.\d+)?/g, ' xx ') }
      })
    : []
})
// 初始化时加载搜索历史
onMounted(async () => {
  // 初始化更新时间范围
  if (queryParams.value.lastUpdateAfterTss && queryParams.value.lastUpdateBeforeTss) {
    updateTimeRange.value = [
      new Date(queryParams.value.lastUpdateAfterTss * 1000),
      new Date(queryParams.value.lastUpdateBeforeTss * 1000)
    ]
  }

  // 初始化创建时间范围
  if (queryParams.value.lastCreateAfterTss && queryParams.value.lastCreateBeforeTss) {
    createTimeRange.value = [
      new Date(queryParams.value.lastCreateAfterTss * 1000),
      new Date(queryParams.value.lastCreateBeforeTss * 1000)
    ]
  }

  // 初始化SPU标题输入框的值
  spuTitleInput.value = queryParams.value.spuInfoTitle || ''

  // 等待标签数据加载完成并初始化
  await new Promise<void>((resolve) => {
    const unwatch = watch(
      () => get_tag_groups_result.data.value,
      (data) => {
        if (data && data.SpuNewTagInfoTagMarkGroup) {
          unwatch()
          // 如果 queryParams 中已经有标签数据，保持不变
          // 如果没有标签数据，初始化为空数组
          if (!queryParams.value.spuNewTagTagMarkList) {
            queryParams.value.spuNewTagTagMarkList = []
          }
          resolve()
        }
      },
      { immediate: true }
    )
  })
})

/**
 * 处理SPU标题搜索
 * @param query - 搜索关键字
 */
const handleSpuTitleSearch = (query: string | number): void => {
  if (!String(query).trim()) return
  handleResetForm() // 单独查询SPU标题时不需要其他参数
  // 更新查询参数
  queryParams.value.spuInfoTitle = String(query)
  props.submitForm() // 触发查询
}

/**
 * 处理SPU ID搜索
 * @param query - 搜索spu_id
 */
const handleSpuIdSearch = (query: string | number): void => {
  if (!query) {
    queryParams.value.spuId = undefined
  } else {
    queryParams.value.spuId = Number(query)
  }
  handleResetForm() //单独查询SPU ID时不需要其他参数
  props.submitForm() // 触发查询
}

// 重置表单
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
  spuTitleInput.value = '' // 重置SPU标题输入框

  // 重置搜索框
  if (spuTitleSearchRef.value) {
    spuTitleSearchRef.value.loadHistory()
  }
}

// 处理更新时间范围变化
const handleUpdateTimeRangeChange = (val: any) => {
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
const handleCreateTimeRangeChange = (val: any) => {
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
    const sort = selectedSorts.value[index]!
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
  queryParams.value.pn = 1
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
  queryParams.value.pn = 1

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
  queryParams.value.pn = 1

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
  queryParams.value.pn = 1

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
  queryParams.value.pn = 1

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
  queryParams.value.pn = 1

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
  queryParams.value.pn = 1

  // 提交查询
  props.submitForm()
}

// 切换高级查询显示/隐藏
const toggleAdvancedSearch = () => {
  showAdvancedSearch.value = !showAdvancedSearch.value
}
const handleSearchBtnClick = () => {
  queryParams.value.pn = 1
  props.submitForm()
}
onMounted(() => {
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
})
</script>

<template>
  <!-- 基本查询部分 -->
  <el-descriptions :column="2" border>
    <el-descriptions-item label-class-name="samsclub-filter-label" label="SPU ID">
      <UniversalSearchBox
        v-model="queryParams.spuId as number"
        mode="numeric"
        placeholder="请输入SPU ID"
        @search="handleSpuIdSearch"
        :show-search-button="false"
        :max-length="20"
        history-key="spuIdSearchHistory"
      />
    </el-descriptions-item>
    <el-descriptions-item label-class-name="samsclub-filter-label" label="SPU标题">
      <UniversalSearchBox
        ref="spuTitleSearchRef"
        v-model="spuTitleInput"
        history-key="spuTitleSearchHistory"
        placeholder="请输入SPU标题"
        @search="handleSpuTitleSearch"
        :max-length="50"
      />
    </el-descriptions-item>

    <!-- 快捷查询按钮组和高级查询切换按钮 -->
    <el-descriptions-item :span="2" label-class-name="samsclub-filter-label" label="快捷查询">
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
                  <el-button size="small" @click="queryRecentCreated(7)" type="primary" text bg>
                    近7天新品
                  </el-button>
                  <el-button size="small" @click="queryRecentCreated(15)" type="primary" text bg>
                    近15天新品
                  </el-button>
                  <el-button size="small" @click="queryRecentCreated(30)" type="primary" text bg>
                    近30天新品
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
                  <el-button size="small" @click="queryRecentUpdated(3)" type="warning" text bg>
                    近3天更新
                  </el-button>
                  <el-button size="small" @click="queryRecentUpdated(7)" type="warning" text bg>
                    近7天更新
                  </el-button>
                  <el-button size="small" @click="queryRecentUpdated(15)" type="warning" text bg>
                    近15天更新
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
                  <el-button
                    size="small"
                    @click="queryMaxDiscountInPrice(30)"
                    type="default"
                    text
                    bg
                  >
                    30元内
                  </el-button>
                  <el-button
                    size="small"
                    @click="queryMaxDiscountInPrice(50)"
                    type="default"
                    text
                    bg
                  >
                    50元内
                  </el-button>
                  <el-button
                    size="small"
                    @click="queryMaxDiscountInPrice(100)"
                    type="default"
                    text
                    bg
                  >
                    100元内
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
                    text
                    bg
                  >
                    30元内
                  </el-button>
                  <el-button
                    size="small"
                    @click="queryCurrentDiscountInPrice(50)"
                    type="danger"
                    text
                    bg
                  >
                    50元内
                  </el-button>
                  <el-button
                    size="small"
                    @click="queryCurrentDiscountInPrice(100)"
                    type="danger"
                    text
                    bg
                  >
                    100元内
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
                    type="primary"
                    text
                    bg
                  >
                    30元内
                  </el-button>
                  <el-button
                    size="small"
                    @click="queryLatestDiscountInPrice(50)"
                    type="primary"
                    text
                    bg
                  >
                    50元内
                  </el-button>
                  <el-button
                    size="small"
                    @click="queryLatestDiscountInPrice(100)"
                    type="primary"
                    text
                    bg
                  >
                    100元内
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
                    text
                    bg
                  >
                    10元内
                  </el-button>
                  <el-button
                    size="small"
                    @click="queryLowPriceWithDiscount(20)"
                    type="danger"
                    text
                    bg
                  >
                    20元内
                  </el-button>
                  <el-button
                    size="small"
                    @click="queryLowPriceWithDiscount(30)"
                    type="danger"
                    text
                    bg
                  >
                    30元内
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
                <el-button-group type="info">
                  <el-button size="small" @click="queryLongTimeNoUpdate()" text bg>
                    全部
                  </el-button>
                  <el-button size="small" @click="queryLongTimeNoUpdate(30)" text bg>
                    30元内
                  </el-button>
                  <el-button size="small" @click="queryLongTimeNoUpdate(50)" text bg>
                    50元内
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
                      v-model="queryParams.spuNewTagTagMarkList"
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
                      class="update-time-picker"
                      :clearable="true"
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
                      class="create-time-picker"
                      :clearable="true"
                    >
                    </el-date-picker>
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
            --el-switch-on-color: var(--el-color-success);
            --el-switch-off-color: var(--el-color-danger);
          "
        ></el-switch>
        <el-button class="op" size="large" @click="handleResetForm" :icon="RemoveFilled"
          >重置
        </el-button>
        <el-button
          class="op"
          size="large"
          type="primary"
          @click="handleSearchBtnClick"
          :autofocus="true"
          :icon="Search"
          @keydown.enter="handleSearchBtnClick"
          >查询
        </el-button>
      </div>
    </el-descriptions-item>
  </el-descriptions>
</template>

<style scoped>
@import '@/assets/components/samsclub/samsclub-filter-tailwind.css';
</style>
