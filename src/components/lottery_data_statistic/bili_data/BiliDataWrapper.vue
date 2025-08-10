<template>
  <FlexContainer class="lot-data-panel">
    <BiliLotteryDataSearchBox></BiliLotteryDataSearchBox>
    <el-tabs
      class="lot-data-tabs"
      v-model="activeLotDataName"
      type="border-card"
      style="padding-bottom: 0.5rem"
      @tab-change="
        (name: TabPaneName) => {
          LotDataStore.last_show_bili_lot_data_tab = name as string
        }
      "
    >
      <el-tab-pane
        v-for="lot_data in lot_data_props_arr"
        :key="lot_data.id"
        :label="lot_data.label"
        :name="lot_data.props.lot_name"
        :id="lot_data.id"
        lazy
      >
        <BiliPaginationDataView
          :data="lot_data.props.lot_data?.items"
          :total="lot_data.props.lot_data?.total"
          :page_size="page_size"
          v-model:CurrentPage="lot_data.props.lot_page"
          v-model:Loading="lot_data.props.loading"
          @on-mounted="lot_data.props.lot_page = 1"
          @retry-on-error="() => get_lot_data(lot_data.props.lot_name)"
        />
      </el-tab-pane>
    </el-tabs>
  </FlexContainer>
</template>
<style scoped>
.lot-data-panel {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.search-box-wrapper {
  margin-bottom: 0.5rem;
}

:deep(.el-tabs__nav-scroll) {
  overflow-x: auto;
  scrollbar-width: none;
}

:deep(.el-tabs__nav-scroll::-webkit-scrollbar) {
  display: none;
}

:deep(.el-tab-pane) {
  height: 100%;
}
</style>
<script setup lang="ts">
import { ref, watch, type Ref } from 'vue'
import BiliPaginationDataView from '@/components/CommonCompo/Bili-DataTable-Compo/BiliPaginationDataView.vue'
import { type LotDataWrapperProps } from '@/models/lottery/lotdata'
import lotteryDataBaseApi from '@/api/lottery_data/bili/lottery_database_bili_api'
import emitter from '@/utils/mitt'
import { useLotDataStore } from '@/stores/lot_data.ts'
import type { TabPaneName } from 'element-plus'

const LotDataStore = useLotDataStore()
const page_size = ref(10)
const activeLotDataName = defineModel<any>('activeLotDataName')
const init_pg = -99
const official_lot_data_props = ref<LotDataWrapperProps>({
  lot_name: 'GetOfficialLottery',
  lot_data: {
    items: [],
    total: 0
  },
  lot_page: init_pg,
  loading: true,
  error: false
})
const charge_lot_data_props = ref<LotDataWrapperProps>({
  lot_name: 'GetChargeLottery',
  lot_data: {
    items: [],
    total: 0
  },
  lot_page: init_pg,
  loading: true,
  error: false
})
const reserve_lot_data_props = ref<LotDataWrapperProps>({
  lot_name: 'GetReserveLottery',
  lot_data: {
    items: [],
    total: 0
  },
  lot_page: init_pg,
  loading: true,
  error: false
})
const live_lot_data_props = ref<LotDataWrapperProps>({
  lot_name: 'GetLiveLottery',
  lot_data: {
    items: [],
    total: 0
  },
  lot_page: init_pg,
  loading: true,
  error: false
})
const topic_lot_data_props = ref<LotDataWrapperProps>({
  lot_name: 'GetTopicLottery',
  lot_data: {
    items: [],
    total: 0
  },
  lot_page: init_pg,
  loading: true,
  error: false
})
type LotDataWrapperPropsWrapper = {
  props: Ref<LotDataWrapperProps>
  id: string
  label: string
}
const lot_data_props_arr = ref<LotDataWrapperPropsWrapper[]>([
  {
    props: official_lot_data_props,
    id: 'data-official-lot',
    label: '官方抽奖'
  },
  {
    props: charge_lot_data_props,
    id: 'data-charge-lot',
    label: '充电抽奖'
  },
  {
    props: reserve_lot_data_props,
    id: 'data-reserve-lot',
    label: '预约抽奖'
  },
  {
    props: live_lot_data_props,
    id: 'data-live-lot',
    label: '直播抽奖'
  },
  {
    props: topic_lot_data_props,
    id: 'data-topic-lot',
    label: '话题抽奖'
  }
])

const get_lot_data_props_by_name = (name: string): Ref<LotDataWrapperProps> | undefined => {
  switch (name) {
    case 'GetOfficialLottery':
      return official_lot_data_props
    case 'GetChargeLottery':
      return charge_lot_data_props
    case 'GetReserveLottery':
      return reserve_lot_data_props
    case 'GetLiveLottery':
      return live_lot_data_props
    case 'GetTopicLottery':
      return topic_lot_data_props
  }
}
const get_lot_data = (
  data_type:
    | 'GetOfficialLottery'
    | 'GetReserveLottery'
    | 'GetChargeLottery'
    | 'GetLiveLottery'
    | 'GetTopicLottery'
    | string
) => {
  return async (page_num: number, page_size: number) => {
    let lot_data_props = get_lot_data_props_by_name(data_type)
    if (!lot_data_props) {
      emitter.emit('toast', { t: `未知的抽奖数据类型：${data_type}`, e: 'error' })
      return { is_succ: false, msg: '未知的抽奖数据类型' }
    }
    lot_data_props.value.loading = true

    return await lotteryDataBaseApi
      .handle_lottery_data({ page_num, page_size }, data_type)
      .then((resp) => {
        if (resp.code !== 0) {
          lot_data_props.value.loading = false
          lot_data_props.value.error = true
          emitter.emit('toast', { t: resp.msg, e: 'error' })
          return { is_succ: false, msg: resp.msg }
        }
        lot_data_props.value.lot_data = resp.data ?? { items: [], total: 0 }
        lot_data_props.value.loading = false
        lot_data_props.value.error = false
        return { is_succ: true, msg: resp.msg }
      })
  }
}
const handle_page_change = async (
  now_page: number,
  old_page: number,
  lot_data_props: LotDataWrapperProps
) => {
  if (old_page === 0 && now_page === 1) return
  if (!now_page) {
    now_page = 1
    lot_data_props.lot_page = 1
  }

  try {
    const resp = await get_lot_data(lot_data_props.lot_name)(now_page, page_size.value)

    if (!resp.is_succ) {
      emitter.emit('toast', { t: resp.msg, e: 'error' })
      // lot_data_props.value.lot_page = old_page
      lot_data_props.error = true
    }
  } catch (error) {
    emitter.emit('toast', { t: '加载数据失败', e: 'error' })
    // lot_data_props.value.lot_page = old_page
    lot_data_props.error = true
  } finally {
    lot_data_props.loading = false
  }
}

lot_data_props_arr.value.forEach(
  (lot_data_props: { props: LotDataWrapperProps; id: string; label: string }) => {
    watch(
      () => lot_data_props.props.lot_page,
      (now_page, old_page) => handle_page_change(now_page, old_page, lot_data_props.props)
    )
  }
)
</script>
