<script setup lang="ts">
import { query } from '@/api/samsclub/gql.ts'
import { gql } from '@urql/vue'
import { ElCollapseTransition } from 'element-plus'
import { watch } from 'vue'
import {
  SortUp,
  SortDown,
  Search,
  RemoveFilled,
  Top,
  Bottom,
  ArrowDown,
  ArrowUp
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
const orderByMap = {
  // 这个是不变的固定字段
  priceAsc: '价格',
  priceDiffCurAsc: '当前差价',
  priceDiffLatestAsc: '最新差价',
  priceDiffMaxAsc: '最大差价',
  spuInfoUpdateAsc: '更新时间',
  spuInfoCreateAsc: '创建时间'
}
const orderByAsc = ref(true)
const spuInfoMaxPrice = ref(0)
const spuNewTagTagMarkSelectOptions = ref<ListItem[]>([])
const priceMin = ref()
const priceMax = ref()
const oderBySelect = ref<string>('')
const updateTimeRange = ref<[Date | string, Date | string] | undefined>(undefined)
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
    lastUpdateBeforeTss: undefined
  })
  oderBySelect.value = ''
  updateTimeRange.value = undefined
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
  switch (oderBySelect.value) {
    case 'priceAsc':
      queryParams.value.priceAsc = orderByAsc.value
      break
    case 'priceDiffCurAsc':
      queryParams.value.priceDiffCurAsc = orderByAsc.value
      break
    case 'priceDiffLatestAsc':
      queryParams.value.priceDiffLatestAsc = orderByAsc.value
      break
    case 'priceDiffMaxAsc':
      queryParams.value.priceDiffMaxAsc = orderByAsc.value
      break
    case 'spuInfoUpdateAsc':
      queryParams.value.spuInfoUpdateAsc = orderByAsc.value
      break
    case 'spuInfoCreateAsc':
      queryParams.value.spuInfoCreateAsc = orderByAsc.value
      break
  }
}
const handleOrderByClick = () => {
  orderByAsc.value = !orderByAsc.value
  handleQueryParamsOrderBy()
}
const handleOrderBy = (_: any) => {
  Object.assign(queryParams.value, {
    priceAsc: undefined,
    priceDiffCurAsc: undefined,
    priceDiffLatestAsc: undefined,
    priceDiffMaxAsc: undefined,
    spuInfoUpdateAsc: undefined
  })
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

  queryParams.value.lastUpdateAfterTss = Math.floor(startDate.getTime() / 1000)
  queryParams.value.lastUpdateBeforeTss = Math.floor(endDate.getTime() / 1000)

  // 更新时间范围显示
  updateTimeRange.value = [startDate, endDate] as [Date | string, Date | string]

  // 提交查询
  props.submitForm()
}

// 查询特定价格范围内折扣最大的商品
const queryMaxDiscountInPrice = (maxPrice: number) => {
  // 重置表单
  handleResetForm()

  // 设置价格范围
  queryParams.value.priceMax = maxPrice * 100
  priceMax.value = maxPrice

  // 设置按最大差价降序排序
  oderBySelect.value = 'priceDiffMaxAsc'
  orderByAsc.value = false
  queryParams.value.priceDiffMaxAsc = false

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
          <div class="quick-search-buttons">
            <!-- 近x天新创建商品 -->
            <el-button size="small" @click="queryRecentCreated(7)">近7天新增</el-button>
            <el-button size="small" @click="queryRecentCreated(15)">近15天新增</el-button>
            <el-button size="small" @click="queryRecentCreated(30)">近30天新增</el-button>

            <!-- 特定价格内折扣最大商品 -->
            <el-button size="small" @click="queryMaxDiscountInPrice(30)">30元内最大折扣</el-button>
            <el-button size="small" @click="queryMaxDiscountInPrice(50)">50元内最大折扣</el-button>
            <el-button size="small" @click="queryMaxDiscountInPrice(100)"
              >100元内最大折扣</el-button
            >
            <el-button size="small" @click="queryMaxDiscountInPrice(200)"
              >200元内最大折扣</el-button
            >
            <el-button size="small" @click="queryMaxDiscountInPrice(300)"
              >300元内最大折扣</el-button
            >
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
                    <el-select
                      v-model="oderBySelect"
                      placeholder="请选择排序方式"
                      clearable
                      @change="handleOrderBy"
                      style="width: 100%"
                    >
                      <el-option
                        v-for="(tag, idx) in Object.entries(orderByMap)"
                        :key="idx"
                        :label="tag[1]"
                        :value="tag[0]"
                      />
                      <template #label="{ label, value }">
                        <span>{{ label }} </span>
                        <el-tag :type="orderByAsc ? 'primary' : 'warning'"
                          >{{ orderByAsc ? '升序' : '降序' }}
                        </el-tag>
                      </template>
                      <template #footer>
                        <el-button @click="handleOrderByClick" size="large">
                          {{ orderByAsc ? '升序' : '降序' }}
                          <el-icon>
                            <SortUp v-if="orderByAsc" />
                            <SortDown v-else />
                          </el-icon>
                        </el-button>
                      </template>
                    </el-select>
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
          style="--el-switch-on-color: #13ce66; --el-switch-off-color: #ff4949"
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

.quick-search-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
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
</style>
