
<template>
  <FlexContainer class="lot-data-panel">
    <div class="page-header">
      <h2 class="page-title">充电抽奖数据</h2>
      <div class="page-description">
        <el-tag type="warning" effect="plain">充电抽奖</el-tag>
        <span class="description-text">B站充电相关的抽奖数据</span>
      </div>
    </div>
    
    <div class="search-section">
      <BiliLotteryDataSearchBox></BiliLotteryDataSearchBox>
    </div>
    
    <BiliPaginationDataView
      :data="charge_lot_data_props.lot_data?.items"
      :total="charge_lot_data_props.lot_data?.total"
      :page_size="page_size"
      v-model:CurrentPage="charge_lot_data_props.lot_page"
      v-model:Loading="charge_lot_data_props.loading"
      @on-mounted="charge_lot_data_props.lot_page = 1"
      @retry-on-error="() => get_lot_data(charge_lot_data_props.lot_page, page_size)"
    />
  </FlexContainer>
</template>

<script setup lang="ts">import { watch, onMounted } from 'vue'
import { useLotteryData } from '@/utils/useLotteryData'
import emitter from '@/utils/mitt'

const {
  page_size,
  lotteryDataProps: charge_lot_data_props,
  getLotData: get_lot_data
} = useLotteryData('GetChargeLottery')

// 组件挂载时加载初始数据
onMounted(() => {
  charge_lot_data_props.value.lot_page = 1
  get_lot_data(1, page_size.value)
    .then((resp) => {
      if (!resp.is_succ) {
        emitter.emit('toast', { t: resp.msg, e: 'error' })
        charge_lot_data_props.value.error = true
      }
    })
    .catch(() => {
      emitter.emit('toast', { t: '加载数据失败', e: 'error' })
      charge_lot_data_props.value.error = true
    })
    .finally(() => {
      charge_lot_data_props.value.loading = false
    })
})

watch(
  () => charge_lot_data_props.value.lot_page,
  (now_page, old_page) => {
    if (old_page === 0 && now_page === 1) return
    if (!now_page) {
      now_page = 1
      charge_lot_data_props.value.lot_page = 1
    }

    get_lot_data(now_page, page_size.value)
      .then((resp) => {
        if (!resp.is_succ) {
          emitter.emit('toast', { t: resp.msg, e: 'error' })
          charge_lot_data_props.value.error = true
        }
      })
      .catch(() => {
        emitter.emit('toast', { t: '加载数据失败', e: 'error' })
        charge_lot_data_props.value.error = true
      })
      .finally(() => {
        charge_lot_data_props.value.loading = false
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