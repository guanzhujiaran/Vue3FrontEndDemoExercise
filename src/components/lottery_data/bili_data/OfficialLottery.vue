<template>
  <FlexContainer class="bili-lottery-data-panel gap-6 pb-8">
    <section
      class="overflow-hidden rounded-lg border border-border-light p-px bg-gradient-bili-data"
    >
      <div class="flex flex-col gap-6 rounded-lg bg-bg p-5 sm:p-6">
        <div class="flex flex-1 space-y-4">
          <BiliPageHeader title="官方抽奖数据" description="B 站官方活动相关的抽奖数据" tag-text="官方抽奖" tag-type="success" />

          <div class="grid grid-cols-2 gap-3 flex-1 pl-20 sm:pl-10 md:pl-15">
            <el-statistic
              class="stat-card"
              title="筛选结果"
              :value="official_lot_data_props.lot_data?.total ?? 0"
              :value-style="statValueStyle"
            />
            <el-statistic
              class="stat-card"
              title="当前页码"
              :value="official_lot_data_props.lot_page || 1"
              :value-style="statValueStyle"
            />
          </div>
        </div>

        <BiliScrapyStatusMini crawler-key="official" class="w-full" />

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
      class="bili-lottery-data-contents"
    >
      <BiliPaginationDataView
        class="min-w-0"
        :data="official_lot_data_props.lot_data?.items ?? []"
        :total="official_lot_data_props.lot_data?.total ?? 0"
        :page_size="page_size"
        v-model:CurrentPage="official_lot_data_props.lot_page"
        v-model:Loading="official_lot_data_props.loading"
        v-model:Error="official_lot_data_props.error"
        :ErrorMsg="official_lot_data_props.error_msg || '网络异常，请检查网络连接'"
        @on-mounted="official_lot_data_props.lot_page = 1"
        @retry-on-error="() => get_lot_data(official_lot_data_props.lot_page, page_size)"
      >
        <template #toolbar>
          <div
            class="mb-5 flex flex-col gap-4 rounded-lg border border-border-light bg-fill-lighter p-4 lg:flex-row lg:items-center lg:justify-between"
          >
            <div class="space-y-1">
              <p class="text-sm font-semibold text-text-primary">列表操作</p>
              <p class="text-xs leading-relaxed text-text-secondary">
                可在这里刷新数据、提交新的官方抽奖信息。
              </p>
            </div>

            <div class="flex w-full justify-end xl:w-auto">
              <LotteryDataTableToolbar
                :feedback-source="FEEDBACK_SOURCE.OFFICIAL_LOTTERY"
                :refresh_data="refresh_data"
                v-model:view-mode="viewMode"
              >
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
            :data="official_lot_data_props.lot_data?.items ?? []"
          />
          <BiliLotterySimpleList
            v-else-if="viewMode === 'simple'"
            :data="official_lot_data_props.lot_data?.items ?? []"
          />
          <BiliOfficialLotteryTable
            v-else
            :data="official_lot_data_props.lot_data?.items ?? []"
            storage-key="official-lottery-table:fixed-columns"
          />
        </template>
      </BiliPaginationDataView>
    </section>
  </FlexContainer>
</template>

<script setup lang="ts">
import { watch, onActivated, onUnmounted, ref } from 'vue'
import { usePageSeo } from '@/composables/usePageSeo.ts'
import { useRefreshAfterMount } from '@/composables/useRefreshAfterMount.ts'
import { buildItemListJsonLd } from '@/config/seo.ts'
import { collectSsrData, getSsrData } from '@/app/ssrData'
import { ssrDataKeyOf, ssrFilterKeyOf, useLotteryData } from '@/utils/useLotteryData.ts'
import BiliScrapyStatusMini from './BiliScrapyStatusMini.vue'
import BiliLotterySimpleList from './BiliLotterySimpleList.vue'
import biliMessage from '@/utils/message'
import SubmitDynamicLotteryModal from './SubmitDynamicLotteryModal.vue'
import { useBiliLotteryRecord } from '@/stores/bili_lottery_record.ts'
import lotteryDataBaseApi, { type FilterParamMeta } from '@/api/lottery_data/bili/lottery_database_bili_api'
import LotteryFilterBar from './LotteryFilterBar.vue'
import { FEEDBACK_SOURCE } from '@/api/notify/message_feedback'

const {
  page_size,
  lotteryDataProps: official_lot_data_props,
  getLotData: get_lot_data,
  extraFilters,
} = useLotteryData('GetOfficialLottery')

const ClickedBiliLotteryId = useBiliLotteryRecord()
const viewMode = ref<'card' | 'table' | 'simple'>(ClickedBiliLotteryId.lottery_view_mode)

const statValueStyle = { fontSize: '34px', fontWeight: '800' }

// 复用 SSR 取到的筛选参数：两端首屏一致，避免筛选栏水合不匹配
const filterParams = ref<FilterParamMeta[]>(
  getSsrData<FilterParamMeta[]>(ssrFilterKeyOf('GetOfficialLottery')) ?? []
)
const filterValues = ref<Record<string, any>>({})

/** 从 API 返回的 FilterParamMeta 中提取 default_value 构建初始 filterValues */
function buildDefaultFilterValues(params: FilterParamMeta[]): Record<string, any> {
  const defaults: Record<string, any> = {}
  for (const param of params) {
    defaults[param.param_name] = param.default_value ?? null
  }
  return defaults
}

async function loadFilterParams() {
  try {
    const resp = await lotteryDataBaseApi.getLotteryFilterParams()
    if (resp.code === 0 && resp.data) {
      const endpoint = resp.data.endpoints.find(e => e.endpoint_path === 'GetOfficialLottery')
      if (endpoint) {
        filterParams.value = endpoint.params
        filterValues.value = buildDefaultFilterValues(endpoint.params)
        // 预渲染采集：把筛选参数一并注入静态 HTML
        collectSsrData(ssrFilterKeyOf('GetOfficialLottery'), filterParams.value)
      }
    }
  } catch (e) { console.error('加载筛选参数失败:', e) }
}

function onFilterValuesUpdate(values: Record<string, any>) {
  filterValues.value = values
}

function applyFilters() {
  extraFilters.value = { ...filterValues.value }
  official_lot_data_props.value.lot_page = 1
  get_lot_data(1, page_size.value)
}

// ============ 首屏数据：必须在 setup 阶段取，SSR / 预渲染的 HTML 才有列表内容 ============
/**
 * SSR / 预渲染时执行本函数：数据既写进 `official_lot_data_props`（供本次渲染出 HTML），
 * 也作为返回值进入 Nuxt payload；客户端 hydration 直接复用 payload（不重复请求），
 * 客户端路由首次进入该页时同样会自动执行。
 */
const { data: firstPageData } = await useAsyncData(
  'lot:GetOfficialLottery:firstPage',
  async () => {
    await loadFilterParams()
    extraFilters.value = { ...filterValues.value }
    official_lot_data_props.value.lot_page = 1
    const resp = await get_lot_data(1, page_size.value)
    if (!resp.is_succ) throw new Error(resp.msg || '加载数据失败')
    return official_lot_data_props.value.lot_data
  }
)

/**
 * 把 payload 里的首屏数据写回组件状态。
 * 只在「当前列表为空」时补写 —— 翻页 / 刷新会更新 `lot_data`，不能被这里覆盖；
 * `onActivated` 覆盖 keep-alive 场景（组件被缓存且 onUnmounted 已清空数据）。
 */
const restoreFirstPage = () => {
  if (!official_lot_data_props.value.lot_data?.items?.length && firstPageData.value) {
    official_lot_data_props.value.lot_data = firstPageData.value
  }
}
restoreFirstPage()
onActivated(restoreFirstPage)

// ============ 页面级 SEO：列表页输出 ItemList，描述带实时收录条数 ============
usePageSeo(() => {
  const lot = official_lot_data_props.value.lot_data
  const items = lot?.items ?? []
  const jsonLd = buildItemListJsonLd('B站官方抽奖汇总', items, lot?.total)
  // 首屏尚无数据时不覆盖：回落到 ROUTE_SEO 的路由级文案
  if (!jsonLd) return null
  return {
    description: `B站官方抽奖汇总：当前收录 ${lot?.total ?? items.length} 条官方账号发起的转发抽奖，含开奖时间、奖品、参与条件与一键跳转原动态。`,
    jsonLd
  }
})

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

const refresh_data = () => {
  get_lot_data(official_lot_data_props.value.lot_page, page_size.value)
}

// 预渲染页首屏吃的是构建期快照，挂载后再拉一次最新数据（见 composable 内注释）
useRefreshAfterMount(refresh_data)
</script>

