<template>
  <FlexContainer class="bili-lottery-data-panel min-w-0 gap-6 pb-8">
    <section
      class="overflow-hidden rounded-lg border border-border-light p-px [background:var(--color-gradient-bili-data)]"
    >
      <div class="flex flex-col gap-6 rounded-lg bg-bg p-5 sm:p-6 xl:flex-row xl:items-end xl:justify-between">
        <div class="min-w-0 flex-1 space-y-4">
          <BiliPageHeader title="官方抽奖数据" description="B 站官方活动相关的抽奖数据" tag-text="官方抽奖" tag-type="success" />

          <dl class="grid grid-cols-2 gap-3">
            <div class="rounded-md border border-border-light bg-fill-lighter p-4">
              <dt class="text-xs text-text-secondary">当前收录</dt>
              <dd class="mt-2 text-2xl font-semibold text-text-primary">
                {{ official_lot_data_props.lot_data?.total ?? 0 }}
              </dd>
            </div>
            <div class="rounded-md border border-border-light bg-fill-lighter p-4">
              <dt class="text-xs text-text-secondary">当前页码</dt>
              <dd class="mt-2 text-2xl font-semibold text-text-primary">
                {{ official_lot_data_props.lot_page || 1 }}
              </dd>
            </div>
          </dl>
        </div>

        <div class="search-section w-full xl:max-w-md">
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
          </div>
        </div>
      </div>
    </section>

    <section
      class="bili-lottery-data-contents flex min-w-0 flex-1 rounded-lg border border-border-light bg-bg p-4 sm:p-5 lg:p-6"
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
              <LotteryDataTableToolbar :refresh_data="refresh_data">
              <template #submit-button>
                <SubmitDynamicLotteryModal />
              </template>
            </LotteryDataTableToolbar>
            </div>
          </div>
        </template>

        <template #contents>
          <BiliLotteryCardContainer
            :data="official_lot_data_props.lot_data?.items ?? []"
          />
        </template>
      </BiliPaginationDataView>
    </section>
  </FlexContainer>
</template>

<script setup lang="ts">
import { watch, onMounted, onUnmounted } from 'vue'
import { useLotteryData } from '@/utils/useLotteryData.ts'
import biliMessage from '@/utils/message'
import SubmitDynamicLotteryModal from './SubmitDynamicLotteryModal.vue'

const { page_size, lotteryDataProps: official_lot_data_props, getLotData: get_lot_data } = useLotteryData('GetOfficialLottery')

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
</script>
