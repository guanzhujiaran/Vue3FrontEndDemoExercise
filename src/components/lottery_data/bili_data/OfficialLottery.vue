<template>
  <FlexContainer class="bili-lottery-data-panel">
    <div class="page-header">
      <h2 class="page-title">官方抽奖数据</h2>
      <div class="page-description">
        <el-tag type="success" effect="plain">官方抽奖</el-tag>
        <span class="description-text">B站官方活动相关的抽奖数据</span>
      </div>
    </div>

    <div class="search-section">
      <BiliLotteryDataSearchBox></BiliLotteryDataSearchBox>
    </div>

    <BiliPaginationDataView
      :data="official_lot_data_props.lot_data?.items"
      :total="official_lot_data_props.lot_data?.total"
      :page_size="page_size"
      v-model:CurrentPage="official_lot_data_props.lot_page"
      v-model:Loading="official_lot_data_props.loading"
      @on-mounted="official_lot_data_props.lot_page = 1"
      @retry-on-error="() => get_lot_data(official_lot_data_props.lot_page, page_size)"
    >
      <template #toolbar>
        <LotteryDataTableToolbar :refresh_data="refresh_data">
          <template #submit-button>
            <SubmitDynamicLotteryModal />
          </template>
        </LotteryDataTableToolbar>
      </template>
    </BiliPaginationDataView>
  </FlexContainer>
</template>

<script setup lang="ts">
import { watch, onMounted } from 'vue'
import { useLotteryData } from '@/utils/useLotteryData.ts'
import emitter from '@/utils/mitt.ts'
import SubmitDynamicLotteryModal from './SubmitDynamicLotteryModal.vue'

const {
  page_size,
  lotteryDataProps: official_lot_data_props,
  getLotData: get_lot_data
} = useLotteryData('GetOfficialLottery')

// 组件挂载时加载初始数据
onMounted(() => {
  official_lot_data_props.value.lot_page = 1
  get_lot_data(1, page_size.value)
    .then((resp) => {
      if (!resp.is_succ) {
        emitter.emit('toast', { t: resp.msg, e: 'error' })
        official_lot_data_props.value.error = true
      }
    })
    .catch(() => {
      emitter.emit('toast', { t: '加载数据失败', e: 'error' })
      official_lot_data_props.value.error = true
    })
    .finally(() => {
      official_lot_data_props.value.loading = false
    })
})

watch(
  () => official_lot_data_props.value.lot_page,
  (now_page, old_page) => {
    if (old_page === 0 && now_page === 1) return
    if (!now_page) {
      now_page = 1
      official_lot_data_props.value.lot_page = 1
    }

    get_lot_data(now_page, page_size.value)
      .then((resp) => {
        if (!resp.is_succ) {
          emitter.emit('toast', { t: resp.msg, e: 'error' })
          official_lot_data_props.value.error = true
        }
      })
      .catch(() => {
        emitter.emit('toast', { t: '加载数据失败', e: 'error' })
        official_lot_data_props.value.error = true
      })
      .finally(() => {
        official_lot_data_props.value.loading = false
      })
  }
)

// 刷新数据
const refresh_data = () => {
  get_lot_data(official_lot_data_props.value.lot_page, page_size.value)
}

// 提交成功后刷新数据
const handleSubmitSuccess = () => {
  official_lot_data_props.value.lot_page = 1
  get_lot_data(1, page_size.value)
}
</script>

<style>
@import '@/assets/components/lottery/bili-lottery-data-tailwind.css';
</style>
