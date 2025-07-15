<template>
  <FlexContainer class="lot-data-panel">
    <BiliLotteryDataSearchBox></BiliLotteryDataSearchBox>
    <el-tabs
      class="lot-data-tabs"
      v-model="activeLotDataName"
      type="border-card"
      @tab-change="
        (name: TabPaneName) => {
          LotDataStore.last_show_bili_lot_data_tab = name as string
        }
      "
    >
      <el-tab-pane
        label="官方转发抽奖"
        :name="official_lot_data_props.lot_name"
        id="data-official-lot"
        lazy
      >
        <BiliPaginationDataView
          :data="official_lot_data_props.lot_data?.items"
          :total="official_lot_data_props.lot_data?.total"
          :page_size="page_size"
          v-model:CurrentPage="official_lot_data_props.lot_page"
          v-model:Loading="official_lot_data_props.loading"
        />
      </el-tab-pane>
      <el-tab-pane
        label="充电抽奖"
        :name="charge_lot_data_props.lot_name"
        id="data-charge-lot"
        lazy
      >
        <BiliPaginationDataView
          :data="charge_lot_data_props.lot_data?.items"
          :total="charge_lot_data_props.lot_data?.total"
          :page_size="page_size"
          v-model:CurrentPage="charge_lot_data_props.lot_page"
          v-model:Loading="charge_lot_data_props.loading"
        />
      </el-tab-pane>
      <el-tab-pane
        label="预约抽奖"
        :name="reserve_lot_data_props.lot_name"
        id="data-reserve-lot"
        lazy
      >
        <BiliPaginationDataView
          :data="reserve_lot_data_props.lot_data?.items"
          :total="reserve_lot_data_props.lot_data?.total"
          :page_size="page_size"
          v-model:CurrentPage="reserve_lot_data_props.lot_page"
          v-model:Loading="reserve_lot_data_props.loading"
        />
      </el-tab-pane>
      <el-tab-pane
        label="话题活动抽奖"
        :name="topic_lot_data_props.lot_name"
        id="data-topic-lot"
        lazy
      >
        <BiliPaginationDataView
          :data="topic_lot_data_props.lot_data?.items"
          :total="topic_lot_data_props.lot_data?.total"
          :page_size="page_size"
          v-model:CurrentPage="topic_lot_data_props.lot_page"
          v-model:Loading="topic_lot_data_props.loading"
        />
      </el-tab-pane>
      <el-tab-pane label="直播抽奖" :name="live_lot_data_props.lot_name" id="data-live-lot" lazy>
        <BiliPaginationDataView
          :data="live_lot_data_props.lot_data.items"
          :total="live_lot_data_props.lot_data.total"
          :page_size="page_size"
          v-model:CurrentPage="live_lot_data_props.lot_page"
          v-model:Loading="live_lot_data_props.loading"
        />
      </el-tab-pane>
    </el-tabs>
  </FlexContainer>
</template>
<style scoped>
.search-box-wrapper {
  margin-bottom: 0.3rem;
}

:deep(.el-tabs__nav-scroll) {
  overflow-x: scroll !important;
}

:deep(.el-tabs__nav-scroll::-webkit-scrollbar) {
  display: none !important;
}

.lot-data-panel :deep(.el-tabs__content) {
  position: relative;
  padding: 0.4rem 0.1rem 3rem;
}
</style>
<script setup lang="ts">
import { ref, watch, type Ref } from 'vue'
import BiliPaginationDataView from '@/components/CommonCompo/Bili-DataTable-Compo/BiliPaginationDataView.vue'
import { type LotDataView, type LotDataWrapperProps } from '@/models/lottery/lotdata'
import lotteryDataBaseApi from '@/api/lottery_data/bili/lottery_database_bili_api'
import emitter from '@/utils/mitt'
import { useLotDataStore } from '@/stores/lot_data.ts'
import type { TabPaneName } from 'element-plus'

const LotDataStore = useLotDataStore()
const page_size = ref(10)
const activeLotDataName = defineModel<any>('activeLotDataName')
const init_pg = -1
const official_lot_data_props = ref<LotDataWrapperProps>({
  lot_name: 'GetOfficialLottery',
  lot_data: {
    items: [],
    total: 0
  },
  lot_page: init_pg,
  loading: true
})
const charge_lot_data_props = ref<LotDataWrapperProps>({
  lot_name: 'GetChargeLottery',
  lot_data: {
    items: [],
    total: 0
  },
  lot_page: init_pg,
  loading: true
})
const reserve_lot_data_props = ref<LotDataWrapperProps>({
  lot_name: 'GetReserveLottery',
  lot_data: {
    items: [],
    total: 0
  },
  lot_page: init_pg,
  loading: true
})
const live_lot_data_props = ref<LotDataWrapperProps>({
  lot_name: 'GetLiveLottery',
  lot_data: {
    items: [],
    total: 0
  },
  lot_page: init_pg,
  loading: true
})
const topic_lot_data_props = ref<LotDataWrapperProps>({
  lot_name: 'GetTopicLottery',
  lot_data: {
    items: [],
    total: 0
  },
  lot_page: init_pg,
  loading: true
})

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
    return await lotteryDataBaseApi
      .handle_lottery_data({ page_num, page_size }, data_type)
      .then((resp) => {
        switch (data_type) {
          case 'GetOfficialLottery':
            official_lot_data_props.value.lot_data = resp.data ?? {
              items: [],
              total: 0
            }
            break
          case 'GetReserveLottery':
            reserve_lot_data_props.value.lot_data = resp.data ?? {
              items: [],
              total: 0
            }
            break
          case 'GetChargeLottery':
            charge_lot_data_props.value.lot_data = resp.data ?? {
              items: [],
              total: 0
            }
            break
          case 'GetLiveLottery':
            live_lot_data_props.value.lot_data = resp.data ?? {
              items: [],
              total: 0
            }
            break
          case 'GetTopicLottery':
            topic_lot_data_props.value.lot_data = resp.data ?? {
              items: [],
              total: 0
            }
            break
        }
        if (resp.code !== 0) return { is_succ: false, msg: resp.msg }
        return { is_succ: true, msg: resp.msg }
      })
  }
}

watch(
  () => official_lot_data_props.value.lot_page,
  (now_page, old_page) => handle_page_change(now_page, old_page, official_lot_data_props)
)
watch(
  () => reserve_lot_data_props.value.lot_page,
  (now_page, old_page) => handle_page_change(now_page, old_page, reserve_lot_data_props)
)
watch(
  () => charge_lot_data_props.value.lot_page,
  (now_page, old_page) => handle_page_change(now_page, old_page, charge_lot_data_props)
)
watch(
  () => live_lot_data_props.value.lot_page,
  (now_page, old_page) => handle_page_change(now_page, old_page, live_lot_data_props)
)
watch(
  () => topic_lot_data_props.value.lot_page,
  (now_page, old_page) => handle_page_change(now_page, old_page, topic_lot_data_props)
)
const handle_page_change = (
  now_page: number,
  old_page: number,
  lot_data_props: Ref<
    {
      lot_name:
        | 'GetOfficialLottery'
        | 'GetReserveLottery'
        | 'GetChargeLottery'
        | 'GetLiveLottery'
        | string
      lot_data: { items: any[]; total: number }
      lot_page: number
      loading: boolean
    },
    | LotDataWrapperProps
    | {
        lot_name:
          | 'GetOfficialLottery'
          | 'GetReserveLottery'
          | 'GetChargeLottery'
          | 'GetLiveLottery'
          | string
        lot_data: { items: any[]; total: number }
        lot_page: number
        loading: boolean
      }
  >
) => {
  if (old_page === 0 && now_page === 1) return
  if (!now_page) {
    now_page = 1
    lot_data_props.value.lot_page = 1
  }
  lot_data_props.value.loading = true
  get_lot_data(lot_data_props.value.lot_name)(now_page, page_size.value).then((resp) => {
    if (!resp.is_succ) {
      emitter.emit('toast', { t: resp.msg, e: 'error' })
      now_page = old_page
    }
    lot_data_props.value.loading = false
  })
}
</script>
