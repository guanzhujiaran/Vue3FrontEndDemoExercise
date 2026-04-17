<template>
  <FlexContainer class="bili-lottery-data-panel">
    <BiliPageHeader 
      title="话题抽奖数据" 
      description="B 站话题相关的抽奖数据"
      tag-text="话题抽奖"
      tag-type="info"
    />

    <div class="search-section">
      <BiliLotteryDataSearchBox></BiliLotteryDataSearchBox>
    </div>

    <BiliPaginationDataView
      :data="topic_lot_data_props.lot_data?.items"
      :total="topic_lot_data_props.lot_data?.total"
      :page_size="page_size"
      v-model:CurrentPage="topic_lot_data_props.lot_page"
      v-model:Loading="topic_lot_data_props.loading"
      v-model:Error="topic_lot_data_props.error"
      :ErrorMsg="topic_lot_data_props.error_msg || '网络异常，请检查网络连接'"
      @on-mounted="topic_lot_data_props.lot_page = 1"
      @retry-on-error="() => get_lot_data(topic_lot_data_props.lot_page, page_size)"
    >
      <template #toolbar>
        <LotteryDataTableToolbar :refresh_data="refresh_data">
          <template #submit-button>
            <SubmitTopicLotteryModal />
          </template>
        </LotteryDataTableToolbar>
      </template>
    </BiliPaginationDataView>
  </FlexContainer>
</template>

<script setup lang="ts">
import { watch, onMounted } from 'vue'
import { useLotteryData } from '@/utils/useLotteryData.ts'
import biliMessage from '@/utils/message'
import SubmitTopicLotteryModal from './SubmitTopicLotteryModal.vue'

const {
  page_size,
  lotteryDataProps: topic_lot_data_props,
  getLotData: get_lot_data
} = useLotteryData('GetTopicLottery')

// 组件挂载时加载初始数据
onMounted(() => {
  topic_lot_data_props.value.lot_page = 1
  get_lot_data(1, page_size.value)
    .then((resp) => {
      if (!resp.is_succ) {
        biliMessage.error(resp.msg)
        topic_lot_data_props.value.error = true
      }
    })
    .catch(() => {
      biliMessage.error('加载数据失败')
      topic_lot_data_props.value.error = true
    })
    .finally(() => {
      topic_lot_data_props.value.loading = false
    })
})

watch(
  () => topic_lot_data_props.value.lot_page,
  (now_page, old_page) => {
    if (old_page === 0 && now_page === 1) return
    if (!now_page) {
      now_page = 1
      topic_lot_data_props.value.lot_page = 1
    }

    get_lot_data(now_page, page_size.value)
      .then((resp) => {
        if (!resp.is_succ) {
          biliMessage.error(resp.msg)
          topic_lot_data_props.value.error = true
        }
      })
      .catch(() => {
        biliMessage.error('加载数据失败')
        topic_lot_data_props.value.error = true
      })
      .finally(() => {
        topic_lot_data_props.value.loading = false
      })
  }
)

// 刷新数据
const refresh_data = () => {
  get_lot_data(topic_lot_data_props.value.lot_page, page_size.value)
}

// 提交成功后刷新数据
const handleSubmitSuccess = () => {
  topic_lot_data_props.value.lot_page = 1
  get_lot_data(1, page_size.value)
}
</script>



