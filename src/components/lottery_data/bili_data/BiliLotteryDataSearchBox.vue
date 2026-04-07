<script setup lang="ts">
import BiliSearchBox from '@/components/CommonCompo/Bili-Search-Compo/BiliSearchBox.vue'
import { ref, computed } from 'vue'
import type { SearchBoxProps } from '@/models/compo/searchbox/SearchBox.ts'
import lotteryDataBaseApi, { type LotterySearchPaginationParams } from '@/api/lottery_data/bili/lottery_database_bili_api.ts'
import biliMessage from '@/utils/message'

const search_box_prop = ref<SearchBoxProps>({
  placeholder: '转发、预约、充电',
  historyKey: 'BiliLotDataSearch',
  maxHistoryCount: 30
})

// 搜索数据状态
const data = ref<any[]>([])
const total = ref(0)
const currentPage = ref(1)
const pageSize = ref(10) // 每页显示 10 条数据
const loading = ref(false)

const prev_query_str = ref('')
const cur_query_str = ref('')

// 计算分页信息
const totalPages = computed(() => Math.ceil(total.value / pageSize.value))
const startIndex = computed(() => (currentPage.value - 1) * pageSize.value + 1)
const endIndex = computed(() => Math.min(currentPage.value * pageSize.value, total.value))

// 执行搜索
const performSearch = async (keyword: string, page_num: number = 1) => {
  loading.value = true
  try {
    const params: LotterySearchPaginationParams = {
      keyword,
      page_num,
      page_size: pageSize.value
    }
    
    const res = await lotteryDataBaseApi.searchLotteryByKeyword(params)
    
    if (res.code !== 0) {
      biliMessage.error(res.msg || '搜索失败')
      data.value = []
      total.value = 0
      return
    }
    
    // 处理响应数据
    if (res.data) {
      data.value = res.data.items || []
      total.value = res.data.total || 0
      prev_query_str.value = keyword
    } else {
      data.value = []
      total.value = 0
    }
  } catch (error) {
    console.error('搜索出错:', error)
    biliMessage.error('搜索失败，请稍后重试')
    data.value = []
    total.value = 0
  } finally {
    loading.value = false
  }
}

// 处理搜索事件
const handleSearch = (query_string: string | number) => {
  isOpenDrawer.value = true
  cur_query_str.value = String(query_string)
  
  // 重置页码并执行搜索
  currentPage.value = 1
  performSearch(String(query_string), 1)
}

// 处理分页变化
const handlePageChange = (newPage: number) => {
  currentPage.value = newPage
  performSearch(cur_query_str.value, newPage)
  
  // 滚动到顶部
  const drawerBody = document.querySelector('.el-drawer__body')
  if (drawerBody) {
    drawerBody.scrollTop = 0
  }
}

const isOpenDrawer = ref(false)

// 关闭抽屉时重置状态
const handleCloseDrawer = () => {
  isOpenDrawer.value = false
  setTimeout(() => {
    data.value = []
    total.value = 0
    currentPage.value = 1
    cur_query_str.value = ''
  }, 300)
}
</script>

<template>
  <div class="search-box-wrapper">
    <BiliSearchBox
      @search="handleSearch"
      :placeholder="search_box_prop.placeholder"
      :history-key="search_box_prop.historyKey"
      :max-history-count="search_box_prop.maxHistoryCount"
    ></BiliSearchBox>
    <el-drawer
      style="overflow-x: scroll"
      :close-on-click-modal="true"
      v-model="isOpenDrawer"
      direction="btt"
      size="80%"
      :modal="true"
      :title="`\&quot;${cur_query_str}\&quot; 的搜索结果`"
      @close="handleCloseDrawer"
    >
      <div class="search-results-container" v-loading="loading">
        <!-- 搜索结果统计 -->
        <div class="search-summary" v-if="total > 0 && !loading">
          <span>找到 {{ total }} 条结果</span>
          <span class="page-info">
            显示 {{ startIndex }} - {{ endIndex }} 条
          </span>
        </div>
        
        <!-- 搜索结果为空 -->
        <el-empty v-else-if="!loading && total === 0 && cur_query_str" description="未找到相关结果" />
        
        <!-- 搜索结果列表 -->
        <BiliLotteryCardContainer :data="data" />
        
        <!-- 分页控件 -->
        <div class="pagination-wrapper" v-if="total > pageSize && !loading">
          <el-pagination
            v-model:current-page="currentPage"
            :page-size="pageSize"
            :total="total"
            :pager-count="5"
            layout="prev, pager, next, jumper, total"
            @current-change="handlePageChange"
          />
        </div>
        
        <el-divider></el-divider>
      </div>
    </el-drawer>
  </div>
</template>

<style scoped>
:deep(.el-drawer__body) {
  padding: 0;
  min-width: 100%;
}

.search-box-wrapper {
  width: 100%;
  margin-bottom: calc(var(--component-spacing) * 2);
  position: relative;
}

:deep(.el-input__wrapper) {
  border-radius: calc(var(--component-size) * 0.625);
  box-shadow: 0 calc(var(--component-size) * 0.0625) calc(var(--component-size) * 0.25) rgba(0, 0, 0, 0.08);
  transition: all 0.3s ease;
}

:deep(.el-input__wrapper:hover) {
  box-shadow: 0 calc(var(--component-size) * 0.125) calc(var(--component-size) * 0.375) rgba(0, 161, 214, 0.15);
}

:deep(.el-input__wrapper.is-focus) {
  box-shadow: 0 0 0 calc(var(--component-size) * 0.03125) #00a1d6 inset;
}

:deep(.el-drawer__header) {
  margin-bottom: 0;
  padding: calc(var(--component-spacing) * 3.2) calc(var(--component-spacing) * 4);
  border-bottom: 1px solid var(--el-border-color-lighter);
  color: var(--el-color-primary);
  font-weight: bold;
}

:deep(.el-drawer) {
  border-radius: calc(var(--component-size) * 0.5) calc(var(--component-size) * 0.5) 0 0;
}

/* 搜索结果容器 */
.search-results-container {
  padding: calc(var(--component-spacing) * 3);
  min-height: 400px;
}

/* 搜索统计信息 */
.search-summary {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: calc(var(--component-spacing) * 2) 0;
  margin-bottom: calc(var(--component-spacing) * 2);
  color: var(--el-text-color-secondary);
  font-size: 14px;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.page-info {
  color: var(--el-color-primary);
  font-weight: 500;
}

/* 分页容器 */
.pagination-wrapper {
  display: flex;
  justify-content: center;
  padding: calc(var(--component-spacing) * 4) 0;
  margin-top: calc(var(--component-spacing) * 2);
  border-top: 1px solid var(--el-border-color-lighter);
}

:deep(.el-pagination) {
  white-space: nowrap;
}

/* 加载状态 */
:deep(.el-loading-spinner) {
  color: var(--el-color-primary);
}

:deep(.el-loading-spinner .path) {
  stroke: var(--el-color-primary);
}
</style>
