
<template>
  <FlexContainer class="bili-lottery-data-panel gap-6 pb-8">
    <section
      class="overflow-hidden rounded-lg border border-border-light p-px [background:var(--color-gradient-bili-data)]"
    >
      <div class="flex flex-col gap-6 rounded-lg bg-bg p-5 sm:p-6">
        <div class="flex flex-1 space-y-4">
          <BiliPageHeader title="充电抽奖数据" description="B 站充电相关的抽奖数据" tag-text="充电抽奖" tag-type="warning" />
          <div class="grid grid-cols-2 gap-3 flex-1 pl-20 sm:pl-10 md:pl-15">
            <el-statistic
              class="stat-card"
              title="筛选结果"
              :value="charge_lot_data_props.lot_data?.total ?? 0"
              :value-style="statValueStyle"
            />
            <el-statistic
              class="stat-card"
              title="当前页码"
              :value="charge_lot_data_props.lot_page || 1"
              :value-style="statValueStyle"
            />
          </div>
        </div>

        <div class="search-section basis-full">
          <div class="rounded-lg border border-border-light bg-bg-page p-4">
            <div class="mb-3 flex flex-wrap items-center justify-between gap-3">
              <div class="space-y-1">
                <p class="text-sm font-semibold text-text-primary">快速搜索抽奖</p>
                <p class="text-xs leading-relaxed text-text-secondary">
                  支持关键字检索，方便先查再看，不影响当前列表数据。
                </p>
              </div>
              <el-tag type="info" effect="plain" round>独立搜索</el-tag>
            </div>
            <BiliLotteryDataSearchBox />
            <LotteryFilterBar
              v-if="filterParams.length > 0"
              class="mt-3"
              :filter-params="filterParams"
              :filter-values="filterValues"
              @update:filter-values="onFilterValuesUpdate"
              @apply="applyFilters"
            />
          </div>
        </div>
      </div>
    </section>

    <section
      class="bili-lottery-data-contents flex min-w-0 flex-1 rounded-lg border border-border-light bg-bg p-4 sm:p-5 lg:p-6"
    >
      <BiliPaginationDataView
        class="min-w-0"
        :data="charge_lot_data_props.lot_data?.items ?? []"
        :total="charge_lot_data_props.lot_data?.total ?? 0"
        :page_size="page_size"
        v-model:CurrentPage="charge_lot_data_props.lot_page"
        v-model:Loading="charge_lot_data_props.loading"
        v-model:Error="charge_lot_data_props.error"
        :ErrorMsg="charge_lot_data_props.error_msg || '网络异常，请检查网络连接'"
        @on-mounted="charge_lot_data_props.lot_page = 1"
        @retry-on-error="() => get_lot_data(charge_lot_data_props.lot_page, page_size)"
      >
        <template #toolbar>
          <div
            class="mb-5 flex flex-col gap-4 rounded-lg border border-border-light bg-fill-lighter p-4 lg:flex-row lg:items-center lg:justify-between"
          >
            <div class="space-y-1">
              <p class="text-sm font-semibold text-text-primary">列表操作</p>
              <p class="text-xs leading-relaxed text-text-secondary">
                可在这里刷新数据、提交新的充电抽奖信息。
              </p>
            </div>

            <div class="flex w-full justify-end xl:w-auto">
              <LotteryDataTableToolbar :refresh_data="refresh_data" v-model:view-mode="viewMode">
              <template #submit-button>
                <SubmitDynamicLotteryModal />
              </template>
            </LotteryDataTableToolbar>
            </div>
          </div>
        </template>

        <template #contents>
          <BiliLotteryCardContainer
            v-if="viewMode === 'card'"
            :data="charge_lot_data_props.lot_data?.items ?? []"
          />
          <BiliOfficialLotteryTable
            v-else
            :data="charge_lot_data_props.lot_data?.items ?? []"
          />
        </template>
      </BiliPaginationDataView>
    </section>
  </FlexContainer>
</template>

<script setup lang="ts">
import { watch, onMounted, onUnmounted, ref } from 'vue'
import { useLotteryData } from '@/utils/useLotteryData.ts'
import biliMessage from '@/utils/message'
import SubmitDynamicLotteryModal from './SubmitDynamicLotteryModal.vue'
import { useBiliLotteryRecord } from '@/stores/bili_lottery_record.ts'
import lotteryDataBaseApi, { type FilterParamMeta } from '@/api/lottery_data/bili/lottery_database_bili_api'
import LotteryFilterBar from './LotteryFilterBar.vue'

const { page_size, lotteryDataProps: charge_lot_data_props, getLotData: get_lot_data, extraFilters } = useLotteryData('GetChargeLottery')

const ClickedBiliLotteryId = useBiliLotteryRecord()
const viewMode = ref<'card' | 'table'>(ClickedBiliLotteryId.lottery_view_mode)

const statValueStyle = { fontSize: '34px', fontWeight: '800' }

const filterParams = ref<FilterParamMeta[]>([])
const filterValues = ref<Record<string, any>>({
  status: 'unfinished',
  sender_uid: null,
  start_ts: null,
  end_ts: null,
  min_participants: null,
  max_participants: null,
  keyword: null,
  created_at_preset: null,
  pub_time_preset: null,
})

async function loadFilterParams() {
  try {
    const resp = await lotteryDataBaseApi.getLotteryFilterParams()
    if (resp.code === 0 && resp.data) {
      const endpoint = resp.data.endpoints.find(e => e.endpoint_path === 'GetChargeLottery')
      if (endpoint) filterParams.value = endpoint.params
    }
  } catch (e) { console.error('加载筛选参数失败:', e) }
}

function onFilterValuesUpdate(values: Record<string, any>) {
  filterValues.value = values
}

function applyFilters() {
  extraFilters.value = { ...filterValues.value }
  charge_lot_data_props.value.lot_page = 1
  get_lot_data(1, page_size.value)
}

onMounted(async () => {
  await loadFilterParams()
  extraFilters.value = { ...filterValues.value }
  charge_lot_data_props.value.lot_page = 1
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

onUnmounted(() => {
  charge_lot_data_props.value.lot_data = { items: [], total: 0 }
  charge_lot_data_props.value.loading = true
  charge_lot_data_props.value.error = false
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
          biliMessage.error(resp.msg)
        }
      })
      .catch(() => {
        biliMessage.error('加载数据失败')
      })
  }
)

const refresh_data = () => {
  get_lot_data(charge_lot_data_props.value.lot_page, page_size.value)
}
</script>
