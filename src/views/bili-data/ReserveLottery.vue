
<template>
  <FlexContainer class="lot-data-panel">
    <div class="page-header">
      <h2 class="page-title">预约抽奖数据</h2>
      <div class="page-description">
        <el-tag type="info" effect="plain">预约抽奖</el-tag>
        <span class="description-text">B站预约活动相关的抽奖数据</span>
      </div>
    </div>
    
    <div class="search-section">
      <BiliLotteryDataSearchBox></BiliLotteryDataSearchBox>
    </div>
    
    <BiliPaginationDataView
      :data="reserve_lot_data_props.lot_data?.items"
      :total="reserve_lot_data_props.lot_data?.total"
      :page_size="page_size"
      v-model:CurrentPage="reserve_lot_data_props.lot_page"
      v-model:Loading="reserve_lot_data_props.loading"
      @on-mounted="reserve_lot_data_props.lot_page = 1"
      @retry-on-error="() => get_lot_data(reserve_lot_data_props.lot_page, page_size)"
    />
  </FlexContainer>
</template>

<script setup lang="ts">import { watch, onMounted } from 'vue'
import { useLotteryData } from '@/utils/useLotteryData'
import emitter from '@/utils/mitt'

const { 
  page_size, 
  lotteryDataProps: reserve_lot_data_props, 
  getLotData: get_lot_data 
} = useLotteryData('GetReserveLottery')

// 组件挂载时加载初始数据
onMounted(() => {
  reserve_lot_data_props.value.lot_page = 1
  get_lot_data(1, page_size.value)
    .then((resp) => {
      if (!resp.is_succ) {
        emitter.emit('toast', { t: resp.msg, e: 'error' })
        reserve_lot_data_props.value.error = true
      }
    })
    .catch(() => {
      emitter.emit('toast', { t: '加载数据失败', e: 'error' })
      reserve_lot_data_props.value.error = true
    })
    .finally(() => {
      reserve_lot_data_props.value.loading = false
    })
})

watch(
  () => reserve_lot_data_props.value.lot_page,
  (now_page, old_page) => {
    if (old_page === 0 && now_page === 1) return
    if (!now_page) {
      now_page = 1
      reserve_lot_data_props.value.lot_page = 1
    }

    get_lot_data(now_page, page_size.value)
      .then((resp) => {
        if (!resp.is_succ) {
          emitter.emit('toast', { t: resp.msg, e: 'error' })
          reserve_lot_data_props.value.error = true
        }
      })
      .catch(() => {
        emitter.emit('toast', { t: '加载数据失败', e: 'error' })
        reserve_lot_data_props.value.error = true
      })
      .finally(() => {
        reserve_lot_data_props.value.loading = false
      })
  }
)
</script>

<style scoped>
.lot-data-panel {
  height: auto;
  display: flex;
  flex-direction: column;
  padding: 1rem;
  border-radius: 8px;
  overflow: auto;
}

.page-header {
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid #eaeaea;
}

.page-title {
  font-size: 1.8rem;
  color: #00a1d6;
  margin: 0 0 0.5rem 0;
}

.page-description {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0.5rem;
}

.description-text {
  color: #666;
  font-size: 0.9rem;
}

.search-section {
  margin-bottom: 1rem;
  padding: 1rem;
  border-radius: 8px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.05);
}

/* 响应式调整 */
@media (max-width: 768px) {
  .lot-data-panel {
    padding: 0.5rem;
  }
  
  .page-title {
    font-size: 1.5rem;
  }
  
  .search-section {
    padding: 0.5rem;
  }
}
</style>