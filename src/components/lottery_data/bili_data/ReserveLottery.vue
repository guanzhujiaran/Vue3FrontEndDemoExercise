<template>
  <FlexContainer class="bili-lottery-data-panel">
    <BiliPageHeader 
      title="预约抽奖数据" 
      description="B 站预约活动相关的抽奖数据"
      tag-text="预约抽奖"
      tag-type="info"
    />

    <div class="search-section">
      <BiliLotteryDataSearchBox></BiliLotteryDataSearchBox>
    </div>

    <BiliPaginationDataView
      :data="reserve_lot_data_props.lot_data?.items"
      :total="reserve_lot_data_props.lot_data?.total"
      :page_size="page_size"
      v-model:CurrentPage="reserve_lot_data_props.lot_page"
      v-model:Loading="reserve_lot_data_props.loading"
      v-model:Error="reserve_lot_data_props.error"
      :ErrorMsg="reserve_lot_data_props.error_msg || '网络异常，请检查网络连接'"
      @on-mounted="reserve_lot_data_props.lot_page = 1"
      @retry-on-error="() => get_lot_data(reserve_lot_data_props.lot_page, page_size)"
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

// 刷新数据
const refresh_data = () => {
  get_lot_data(reserve_lot_data_props.value.lot_page, page_size.value)
}

// 提交成功后刷新数据
const handleSubmitSuccess = () => {
  reserve_lot_data_props.value.lot_page = 1
  get_lot_data(1, page_size.value)
}
</script>


