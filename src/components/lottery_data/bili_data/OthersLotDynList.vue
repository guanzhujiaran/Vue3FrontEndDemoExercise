<template>
  <!-- 未登录时显示未授权提示页，倒计时自动返回首页 -->
  <OthersLotDynLoginRequired v-if="!isLoggedIn" />
  <FlexContainer v-else class="bili-lottery-data-panel gap-6 pb-8">
    <section
      class="overflow-hidden rounded-lg border border-border-light p-px [background:var(--color-gradient-bili-data)]"
    >
      <div class="flex flex-col gap-6 rounded-lg bg-bg p-5 sm:p-6">
        <div class="flex flex-1 space-y-4">
          <BiliPageHeader title="第三方抽奖动态" description="B 站第三方（非官方号）发布的抽奖动态列表" tag-text="第三方抽奖" tag-type="" />

          <div class="grid grid-cols-3 gap-3 flex-1 pl-20 sm:pl-10 md:pl-15">
            <el-statistic
              class="stat-card"
              title="筛选结果"
              :value="lotDataProps.lot_data?.total ?? 0"
              :value-style="statValueStyle"
            />
            <el-statistic
              class="stat-card"
              title="当前页码"
              :value="lotDataProps.lot_page || 1"
              :value-style="statValueStyle"
            />
            <el-statistic
              class="stat-card"
              title="排序方式"
              :value-style="statTextValueStyle"
            >
              <template #default>
                {{ sortLabel }}
              </template>
            </el-statistic>
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
        :data="lotDataProps.lot_data?.items ?? []"
        :total="lotDataProps.lot_data?.total ?? 0"
        :page_size="page_size"
        v-model:CurrentPage="lotDataProps.lot_page"
        v-model:Loading="lotDataProps.loading"
        v-model:Error="lotDataProps.error"
        :ErrorMsg="lotDataProps.error_msg || '网络异常，请检查网络连接'"
        @on-mounted="lotDataProps.lot_page = 1"
        @retry-on-error="() => getLotData(lotDataProps.lot_page, page_size)"
      >
        <template #toolbar>
          <div
            class="mb-5 flex flex-col gap-4 rounded-lg border border-border-light bg-fill-lighter p-4 lg:flex-row lg:items-center lg:justify-between"
          >
            <div class="space-y-1">
              <p class="text-sm font-semibold text-text-primary">列表操作</p>
              <p class="text-xs leading-relaxed text-text-secondary">
                可在这里刷新数据、切换视图模式。默认按收录时间降序，支持按发布时间、是否抽奖等条件筛选。
              </p>
            </div>

            <div class="flex w-full justify-end xl:w-auto">
              <LotteryDataTableToolbar :refresh_data="refresh_data" v-model:view-mode="viewMode">
                <template #submit-button>
                  <SubmitOthersLotDynModal />
                </template>
              </LotteryDataTableToolbar>
            </div>
          </div>
        </template>

        <template #contents>
          <BiliLotteryCardContainer
            v-if="viewMode === 'card'"
            :data="lotDataProps.lot_data?.items ?? []"
          />
          <BiliOfficialLotteryTable
            v-else
            :data="lotDataProps.lot_data?.items ?? []"
          />
        </template>
      </BiliPaginationDataView>
    </section>
  </FlexContainer>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, type Ref } from 'vue'
import { useLotteryData } from '@/utils/useLotteryData.ts'
import { useBiliLotteryRecord } from '@/stores/bili_lottery_record.ts'
import lotteryDataBaseApi, { type FilterParamMeta } from '@/api/lottery_data/bili/lottery_database_bili_api'
import { useInject, KeysEnum } from '@/models/base/provide_model.ts'
import type { UserNavModel } from '@/models/user/user_model.ts'
import LotteryFilterBar from './LotteryFilterBar.vue'
import SubmitOthersLotDynModal from './SubmitOthersLotDynModal.vue'

const { page_size, lotteryDataProps: lotDataProps, getLotData, extraFilters } = useLotteryData('GetOthersLotDynList')

const ClickedBiliLotteryId = useBiliLotteryRecord()
const viewMode = ref<'card' | 'table'>(ClickedBiliLotteryId.lottery_view_mode)

const statValueStyle = { fontSize: '34px', fontWeight: '800' }
const statTextValueStyle = { fontSize: '16px', fontWeight: '600' }

const biliUser = useInject(KeysEnum.BiliUser) as Ref<UserNavModel>
const isLoggedIn = computed(() => !!biliUser.value.uid)

// 筛选参数元数据
const filterParams = ref<FilterParamMeta[]>([])
const filterValues = ref<Record<string, any>>({
  sort_by: 'created_at',
  sort_order: 'desc',
  is_lot: true,
  created_at_preset: '14d',
  pub_time_preset: null,
  pub_time_start: null,
  pub_time_end: null,
  created_at_start: null,
  created_at_end: null,
})

// 排序标签
const sortLabel = computed(() => {
  const by = filterValues.value.sort_by === 'pubTime' ? '发布时间' : '收录时间'
  const order = filterValues.value.sort_order === 'desc' ? '↓降序' : '↑升序'
  const preset = filterValues.value.created_at_preset
    ? ` · ${filterValues.value.created_at_preset}`
    : ''
  return `${by} ${order}${preset}`
})

// 加载筛选参数元数据
async function loadFilterParams() {
  try {
    const resp = await lotteryDataBaseApi.getLotteryFilterParams()
    if (resp.code === 0 && resp.data) {
      const endpoint = resp.data.endpoints.find(
        (e) => e.endpoint_path === 'GetOthersLotDynList'
      )
      if (endpoint) {
        filterParams.value = endpoint.params
      }
    }
  } catch (e) {
    console.error('加载筛选参数失败:', e)
  }
}

function onFilterValuesUpdate(values: Record<string, any>) {
  filterValues.value = values
}

function applyFilters() {
  // 同步筛选参数到 extraFilters
  extraFilters.value = { ...filterValues.value }
  lotDataProps.value.lot_page = 1
  getLotData(1, page_size.value)
}

onMounted(async () => {
  await loadFilterParams()
  // 初始化 extraFilters
  extraFilters.value = { ...filterValues.value }
  lotDataProps.value.lot_page = 1
  getLotData(1, page_size.value)
})

onUnmounted(() => {
  lotDataProps.value.lot_data = { items: [], total: 0 }
  lotDataProps.value.loading = true
  lotDataProps.value.error = false
})

watch(
  () => lotDataProps.value.lot_page,
  (now_page, old_page) => {
    if (old_page === 0 && now_page === 1) return
    if (!now_page) {
      now_page = 1
      lotDataProps.value.lot_page = 1
    }
    getLotData(now_page, page_size.value)
  }
)

const refresh_data = () => {
  getLotData(lotDataProps.value.lot_page, page_size.value)
}
</script>