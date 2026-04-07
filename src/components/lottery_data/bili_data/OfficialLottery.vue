<template>
  <FlexContainer class="bili-lottery-data-panel">
    <BiliPageHeader 
      title="官方抽奖数据" 
      description="B 站官方活动相关的抽奖数据"
      tag-text="官方抽奖"
      tag-type="success"
    />

    <div class="search-section">
      <BiliLotteryDataSearchBox></BiliLotteryDataSearchBox>
    </div>

    <BiliPaginationDataView
      :data="official_lot_data_props.lot_data?.items"
      :total="official_lot_data_props.lot_data?.total"
      :page_size="page_size"
      v-model:CurrentPage="official_lot_data_props.lot_page"
      v-model:Loading="official_lot_data_props.loading"
      v-model:Error="official_lot_data_props.error"
      :ErrorMsg="official_lot_data_props.error_msg || '网络异常，请检查网络连接'"
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
import { watch, onMounted, onUnmounted } from 'vue'
import { useLotteryData } from '@/utils/useLotteryData.ts'
import biliMessage from '@/utils/message'
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
        biliMessage.error(resp.msg)
      }
    })
    .catch(() => {
      biliMessage.error('加载数据失败')
    })
})

// 组件卸载时清空数据
onUnmounted(() => {
  official_lot_data_props.value.lot_data = { items: [], total: 0 }
  official_lot_data_props.value.loading = true
  official_lot_data_props.value.error = false
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
          biliMessage.error(resp.msg)
        }
      })
      .catch(() => {
        biliMessage.error('加载数据失败')
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
