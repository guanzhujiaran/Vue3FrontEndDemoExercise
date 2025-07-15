<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import {
  LotteryRankDateType,
  LotteryRankLotType,
  LotteryRankType,
  type LotteryResultResp
} from '@/models/lottery/lotdata.ts'
import lotteryDataStatisticApi from '@/api/lottery_data/bili/lottery_data_statistic_api.ts'
import emitter from '@/utils/mitt.ts'
import type { PrizeResult } from '@/models/lottery/lottery_prize_result.ts'
import { BiliImg } from '@/assets/img/BiliImg.ts'
import { gotoOpusDynamic } from '@/utils/PageOpen/BiliJump.ts'
import { useDebounceFn } from '@vueuse/core'
import { useTourTipStore } from '@/stores/tour_tip.ts' // 导入默认图片

const props = defineProps<{
  uid: number | string
  date: LotteryRankDateType
  lot_type: LotteryRankLotType
  rank_type: LotteryRankType
  limit: number
}>()

const emit = defineEmits(['update:uid', 'update:lot_type', 'update:rank_type'])

const data = ref<LotteryResultResp>()
const offset = ref<number>(0)
const isLoading = defineModel('isLoading', { required: true })
const currentPage = ref(1)

const handle_lottery_result = useDebounceFn(() => {
  isLoading.value = true
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
        emitter.emit('toast', {
          e: 'error',
          t: res.msg
        })
      } else {
        data.value = res.data
      }
      isLoading.value = false
    })
}, 1e3)

onMounted(() => {
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

const getFilteredPrizeItems = (): PrizeResult[] => {
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
}

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
const biliRankUserAtariDetailTip = computed(
  () =>
    useTourTipStore().isBiliRankUserAtariDetailActive &&
    Boolean(data.value?.prize_result.length ?? 0 > 0)
)
</script>

<template>
  <div class="user-lottery-result-wrapper">
    <div class="user-lottery-result" v-if="data">
      <div v-for="(prize, index) in getFilteredPrizeItems()" :key="index" class="prize-item-row">
        <div
          :class="[
            'border-with-text',
            {
              'lot-type-official': getLotteryType(prize) === '官方抽奖',
              'lot-type-reserve': getLotteryType(prize) === '预约抽奖',
              'lot-type-charge': getLotteryType(prize) === '充电抽奖'
            }
          ]"
        >
          <div class="border-title">
            <span>{{ getLotteryType(prize) }} </span>
          </div>
          <div class="prize-info-wrapper">
            <div class="prize-link">
              <a
                :href="
                  Boolean(prize.lottery_detail_url)
                    ? prize.lottery_detail_url
                    : `https://www.bilibili.com/h5/lottery/result?business_id=${prize.business_id}&business_type=${prize.business_type}&lottery_id=${prize.lottery_id}`
                "
                referrerpolicy="no-referrer"
                target="_blank"
                title="点击前往抽奖详情页"
              >
                <img
                  :src="getPrizeImage(prize)"
                  alt="Prize Image"
                  class="prize-image"
                  referrerpolicy="no-referrer"
                />
              </a>
            </div>
            <div
              :class="[
                'prize-info',
                {
                  'first-prize': getPrizeLevel(prize) === '一等奖',
                  'second-prize': getPrizeLevel(prize) === '二等奖',
                  'third-prize': getPrizeLevel(prize) === '三等奖'
                }
              ]"
            >
              <p class="prize-name">{{ getPrizeDescription(prize) }}</p>
              <p>奖项: {{ getPrizeLevel(prize) }}</p>
              <p>开奖时间: {{ new Date(prize.lottery_time * 1000).toLocaleString() }}</p>
              <p
                class="jump-url"
                v-if="
                  prize.business_type !== 10 // 非预约抽奖
                "
                @click="gotoOpusDynamic(prize.business_id)"
              >
                动态ID：{{ prize.business_id }}
              </p>
              <p v-else>预约ID：{{ prize.business_id }}</p>
            </div>
          </div>
        </div>
      </div>
      <el-pagination
        hide-on-single-page
        class="prize-pagination"
        size="small"
        :total="data.total"
        :page-size="props.limit"
        v-model:current-page="currentPage"
        layout="prev, pager, next,total"
        :background="false"
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
      description="包含奖品名称，奖品等级，开奖时间，（动态|预约）ID信息。非预约抽奖点击动态ID可跳转对应动态。"
    ></el-tour-step>
  </el-tour>
</template>

<style scoped>
.user-lottery-result-wrapper {
  place-items: center;
}

.user-lottery-result {
  display: grid;
  gap: 0.5rem;
  color: #fff;
  font-size: larger;
  margin-bottom: 1rem;
  justify-content: center;
  width: fit-content;
}

.prize-info-wrapper {
  display: flex;
  padding: 0.1rem;
  position: relative;
  z-index: 1; /* 介于伪元素和标题之间 */
}

.prize-pagination {
  display: flex;
  margin: 0 auto;
  align-items: center;
}

.prize-pagination {
  margin-bottom: 1rem;
}

.prize-link {
  display: flex;
  align-items: center;
  text-decoration: none;
  color: inherit;
  flex-shrink: 0;

  padding-right: 20px;
}

.prize-link a {
  border-radius: 12px; /* 正方形图标 */
}

.prize-image {
  width: 64px;
  height: 64px;
  object-fit: cover;
  background-color: #fff;
}

.prize-info {
  display: flex;
  flex-direction: column;
}

.prize-info p {
  font-size: 1em;
  color: #9499a0;
  white-space: nowrap; /* 防止文本换行 */
  text-overflow: ellipsis; /* 当文本超出容器宽度时显示省略号 */
  line-height: normal;
}

.prize-info .prize-name {
  font-size: 1.1em;
  color: inherit;
}

.prize-info p.jump-url {
  cursor: pointer;
}

.prize-info.first-prize {
  color: #ff6744;
}

.prize-info.second-prize {
  color: #44d6ff;
}

.prize-info.third-prize {
  color: #ffb200;
}

.border-title {
  position: relative; /* 必须设置定位属性 */
  z-index: 2; /* 高于伪元素的 0 */
  background: linear-gradient(rgba(24, 25, 38, 0.95), rgba(17, 17, 28, 0.95) 96.22%),
    linear-gradient(0deg, rgba(66, 72, 94, 0.5), rgba(66, 72, 94, 0.5));
  text-align: center;
  margin-top: -0.3rem;
  margin-left: 1rem;
  width: fit-content;
  padding: 0 0.2rem;
}

.border-title span {
  line-height: normal;
}

.prize-item-row {
  display: flex; /* 确保内部内容按需排列 */
  width: 100%;
  flex-direction: column;
}

@keyframes hueRotate {
  100% {
    filter: hue-rotate(360deg);
  }
}

.border-with-text {
  position: relative;
  background: transparent;
  padding: 0.2rem;
}

/* 通过伪元素实现渐变边框 */
.border-with-text::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  border: 5px solid transparent; /* 边框厚度 */
  border-radius: 8px; /* 圆角 */
  z-index: 0;
  animation: hueRotate 3s infinite alternate;
  pointer-events: none; /* 防止遮挡点击事件 */
  border-image-slice: 1;
  border-image-repeat: stretch;
}

/* 不同类型对应的渐变色 */
.border-with-text.lot-type-official::before {
  border-image-source: linear-gradient(45deg, rgba(106, 17, 203, 0.95), rgba(37, 117, 252, 0.8));
}

.border-with-text.lot-type-official .border-title span {
  background-image: linear-gradient(45deg, rgba(106, 17, 203, 0.95), rgba(37, 117, 252, 0.8));
  -webkit-text-fill-color: transparent;
  background-clip: text;
  font-weight: bolder;
}

.border-with-text.lot-type-reserve::before {
  border-image-source: linear-gradient(45deg, rgba(61, 153, 112, 0.95), rgba(120, 204, 109, 0.8));
}

.border-with-text.lot-type-reserve .border-title span {
  background-image: linear-gradient(45deg, rgba(61, 153, 112, 0.95), rgba(120, 204, 109, 0.8));
  -webkit-text-fill-color: transparent;
  background-clip: text;
  font-weight: bolder;
}

.border-with-text.lot-type-charge::before {
  border-image-source: linear-gradient(45deg, rgba(255, 107, 107, 0.95), rgba(255, 204, 76, 0.8));
}

.border-with-text.lot-type-charge .border-title span {
  background-image: linear-gradient(45deg, rgba(255, 107, 107, 0.95), rgba(255, 204, 76, 0.8));
  -webkit-text-fill-color: transparent;
  background-clip: text;
  font-weight: bolder;
}
</style>
