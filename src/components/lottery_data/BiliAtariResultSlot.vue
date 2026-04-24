<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import {
  LotteryRankDateType,
  LotteryRankLotType,
  LotteryRankType,
  type LotteryResultResp
} from '@/models/api/lottery/lotdata.ts'
import lotteryDataStatisticApi from '@/api/lottery_data/bili/lottery_data_statistic_api.ts'
import biliMessage from '@/utils/message'
import type { PrizeResult } from '@/models/api/lottery/lottery_prize_result.ts'
import { BiliImg } from '@/assets/img/BiliImg.ts'
import { gotoOpusDynamic, getBiliLotteryResultUrl } from '@/utils/PageOpen/BiliJump.ts'
import { useDebounceFn } from '@vueuse/core'
import { useTourTipStore } from '@/stores/tour_tip.ts'
import BiliEmpty from '@/components/CommonCompo/Bili-Feedback-Compo/BiliEmpty.vue'
import BiliError from '@/components/CommonCompo/Bili-Feedback-Compo/BiliError.vue'

const props = defineProps<{
  uid: number | string
  date: LotteryRankDateType
  lot_type: LotteryRankLotType
  rank_type: LotteryRankType
  limit: number
}>()

const data = ref<LotteryResultResp>()
const offset = ref<number>(0)
const isLoading = defineModel('isLoading', { required: true })
const currentPage = ref(1)
const isError = ref(false)

const handle_lottery_result = useDebounceFn(() => {
  isLoading.value = true
  isError.value = false
  lotteryDataStatisticApi
    .handle_lottery_result({
      uid: props.uid,
      date: props.date,
      lot_type: props.lot_type,
      rank_type: props.rank_type,
      offset: offset.value,
      limit: props.limit
    })
    .then((res) => {
      if (res.code) {
        biliMessage.error(res.msg)
        isError.value = true
      } else {
        data.value = res.data
        isError.value = false
      }
      isLoading.value = false
    })
    .catch((error) => {
      console.error('加载抽奖结果失败:', error)
      isError.value = true
      isLoading.value = false
    })
}, 100) // 减少防抖时间到100ms

onMounted(() => {
  // 组件挂载时立即加载数据
  handle_lottery_result()
})


watch(currentPage, (newVal) => {
  offset.value = (newVal - 1) * props.limit
  handle_lottery_result()
})

// 监听每个 prop 的变化，并重置 offset 和重新获取数据
watch([() => props.uid, () => props.lot_type, () => props.rank_type], () => {
  offset.value = 0
  currentPage.value = 1
  handle_lottery_result()
})

const getFilteredPrizeItems = computed((): PrizeResult[] => {
  const filteredItems: PrizeResult[] = []

  if (!data.value?.prize_result) return filteredItems

  for (const prize of data.value.prize_result) {
    const firstPrizeItem = prize.lottery_result.first_prize_result.find(
      (item) => item.uid === Number(props.uid)
    )
    const secondPrizeItem = prize.lottery_result.second_prize_result?.find(
      (item) => item.uid === Number(props.uid)
    )
    const thirdPrizeItem = prize.lottery_result.third_prize_result?.find(
      (item) => item.uid === Number(props.uid)
    )

    if (firstPrizeItem || secondPrizeItem || thirdPrizeItem) {
      filteredItems.push(prize)
    }
  }

  return filteredItems
})

const getPrizeLevel = (prize: PrizeResult): string => {
  if (prize.lottery_result.first_prize_result.some((item) => item.uid === Number(props.uid))) {
    return '一等奖'
  } else if (
    prize.lottery_result.second_prize_result?.some((item) => item.uid === Number(props.uid))
  ) {
    return '二等奖'
  } else if (
    prize.lottery_result.third_prize_result?.some((item) => item.uid === Number(props.uid))
  ) {
    return '三等奖'
  }
  return ''
}

const getPrizeDescription = (prize: PrizeResult): string => {
  return prize.first_prize_cmt || prize.second_prize_cmt || prize.third_prize_cmt || '无描述'
}

const getPrizeImage = (prize: PrizeResult): string => {
  return (
    prize.first_prize_pic ||
    prize.second_prize_pic ||
    prize.third_prize_pic ||
    BiliImg.ranking.prize_default
  )
}
const getLotteryType = (prize: PrizeResult): string => {
  return prize.business_type === 1
    ? '官方抽奖'
    : prize.business_type === 10
      ? '预约抽奖'
      : '充电抽奖'
}
const gotoLotteryDetail = (prize: PrizeResult) => {
  const url = getBiliLotteryResultUrl(prize.business_id, prize.business_type)
  if (url) {
    window.open(url, '_blank', 'noopener=yes,noreferrer=yes')
  }
}
const biliRankUserAtariDetailTip = computed(
  () =>
    useTourTipStore().isBiliRankUserAtariDetailActive &&
    Boolean(data.value?.prize_result?.length ?? 0 > 0)
)
</script>

<template>
  <div class="user-lottery-result-wrapper place-items-center">
    <div v-if="isLoading" class="skeleton-container w-full max-w-6xl px-4 sm:px-6">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div v-for="i in 4" :key="i" class="rounded-xl bg-bg/50 backdrop-blur-sm p-5 border border-border-light/30">
          <el-skeleton :rows="3" animated></el-skeleton>
        </div>
      </div>
    </div>
    <BiliEmpty v-else-if="!isError && (!getFilteredPrizeItems || getFilteredPrizeItems.length === 0)"></BiliEmpty>
    <BiliError v-else-if="isError" @click-retry="handle_lottery_result"></BiliError>
    <div v-else class="user-lottery-result grid grid-cols-1 md:grid-cols-2 gap-6 text-[var(--el-color-white)] text-base mb-8 justify-center w-full max-w-6xl px-4 sm:px-6" v-if="getFilteredPrizeItems && getFilteredPrizeItems.length > 0">
      <div v-for="(prize, index) in getFilteredPrizeItems" :key="index" class="prize-item-row flex w-full flex-col">
        <div
          :class="[
            'border-with-text relative rounded-xl bg-bg backdrop-blur-sm p-5 border border-border-light/30 shadow-lg hover:shadow-xl transition-all duration-300',
            {
              'lot-type-official': getLotteryType(prize) === '官方抽奖',
              'lot-type-reserve': getLotteryType(prize) === '预约抽奖',
              'lot-type-charge': getLotteryType(prize) === '充电抽奖'
            }
          ]"
        >
          <div class="-mt-8 ml-5 border-title relative z-[2] text-center w-fit px-3 py-1 rounded-full bg-bg border border-border-light/50">
            <span :class="{
              'text-gradient-official': getLotteryType(prize) === '官方抽奖',
              'text-gradient-reserve': getLotteryType(prize) === '预约抽奖',
              'text-gradient-charge': getLotteryType(prize) === '充电抽奖'
            }" class="text-sm font-semibold">
              {{ getLotteryType(prize) }} 
            </span>
          </div>
          <div class="prize-info-wrapper flex flex-col md:flex-row gap-4 p-[0.1rem] relative z-[1]">
            <div class="prize-link flex items-center no-underline text-inherit shrink-0">
              <a
                :href="
                  Boolean(prize.lottery_detail_url)
                    ? prize.lottery_detail_url
                    : `https://www.bilibili.com/h5/lottery/result?business_id=${prize.business_id}&business_type=${prize.business_type}&lottery_id=${prize.lottery_id}`
                "
                referrerpolicy="no-referrer"
                target="_blank"
                title="点击前往抽奖详情页"
                class="flex flex-col rounded-xl overflow-hidden shadow-md hover:shadow-lg transition-all duration-200"
              >
                <img
                  :src="getPrizeImage(prize)"
                  alt="Prize Image"
                  class="h-24 w-24 object-cover bg-[var(--el-color-white)] transition-transform duration-300 hover:scale-105"
                  referrerpolicy="no-referrer"
                />
              </a>
            </div>
            <div
              :class="[
                'prize-info flex flex-col text-base leading-7 text-[var(--el-text-color-primary)] flex-1',
                {
                  'first-prize': getPrizeLevel(prize) === '一等奖',
                  'second-prize': getPrizeLevel(prize) === '二等奖',
                  'third-prize': getPrizeLevel(prize) === '三等奖'
                }
              ]"
            >
              <p class="prize-name text-2xl font-bold mb-1">{{ getPrizeDescription(prize) }}</p>
              <p :class="['prize-rank font-medium', { 'text-[var(--el-color-danger)]': getPrizeLevel(prize) === '一等奖', 'text-[var(--el-color-primary)]': getPrizeLevel(prize) === '二等奖', 'text-[var(--el-color-warning)]': getPrizeLevel(prize) === '三等奖' }]">奖项: {{ getPrizeLevel(prize) }}</p>
              <p class="text-text-secondary text-sm">开奖时间: {{ new Date(prize.lottery_time * 1000).toLocaleString() }}</p>
              <p
                class="jump-url cursor-pointer text-primary hover:underline text-sm mt-1"
                v-if="
                  prize.business_type !== 10 // 非预约抽奖
                "
                @click="gotoOpusDynamic(prize.business_id)"
              >
                动态ID：{{ prize.business_id }}
              </p>
              <p
                class="jump-url cursor-pointer text-primary hover:underline text-sm mt-1"
                v-else
                @click="gotoLotteryDetail(prize)"
              >
                预约ID：{{ prize.business_id }}
              </p>
            </div>
          </div>
        </div>
      </div>
      <el-pagination
        hide-on-single-page
        class="prize-pagination flex mx-auto items-center mb-4 p-3 rounded-lg bg-bg/50 backdrop-blur-sm border border-border-light/30"
        size="small"
        :total="data.total"
        :page-size="props.limit"
        v-model:current-page="currentPage"
        layout="prev, pager, next,total"
        :background="false"
        v-if="data && data.total > 0"
      ></el-pagination>
    </div>
  </div>

  <el-tour
    v-model="biliRankUserAtariDetailTip"
    @close="useTourTipStore().isBiliRankUserAtariDetailActive = false"
  >
    <el-tour-step
      target=".prize-link a"
      title="中奖图片"
      description="中奖奖品的图片，点击跳转抽奖链接（注意，非动态链接，是h5的链接，https://www.bilibili.com/h5/lottery/result。）"
    ></el-tour-step>
    <el-tour-step
      target=".prize-info"
      title="中奖信息"
      description="包含奖品名称，奖品等级，开奖时间，（动态|预约）ID信息。点击动态ID可跳转对应动态，点击预约ID可跳转抽奖详情页。"
    ></el-tour-step>
  </el-tour>
</template>
