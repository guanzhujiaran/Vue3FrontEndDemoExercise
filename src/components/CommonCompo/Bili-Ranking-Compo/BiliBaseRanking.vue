<template>
  <div class="rank-main" v-loading="isLoading">
    <LoadingMoreContainer :handle-load="handleLoad" v-model:is-more="isMore">
      <template #content>
        <div class="hall-rank-container">
          <div class="rank-header-info">
            <div class="sync-time">数据库数据同步到redis时间：{{ syncTimeText }}</div>
          </div>
          <div class="rank-header-panel">
            <HallAreaContent
              v-if="props.ranking_partitions.length"
              v-for="partition in ranking_partitions"
              :partition="partition"
              @handlePartitionChange="handlePartitionChange"
            >
            </HallAreaContent>
          </div>
          <div class="top-rank-panel">
            <RankItem
              v-for="(_, index) in topItems"
              :score_prefix="props.score_prefix"
              :score_suffix="props.score_suffix"
              v-model:item="topItems[index]"
              @score_click="handleScoreClick"
            >
            </RankItem>
          </div>
          <div class="rank-panel">
            <RankItemRow
              v-for="(_, index) in rankItems"
              :item="rankItems[index]"
              :score_prefix="props.score_prefix"
              :score_suffix="props.score_suffix"
              @score_click="handleScoreClick"
            />
            <div v-if="!isMore" style="text-align: center">没有更多的了</div>
          </div>
          <div class="rank-empty" v-if="rankItems.length === 0 && !isError">
            <BiliEmpty />
          </div>

          <BiliError class="rank-error" v-if="isError" @click-retry="handleLoad"></BiliError>
        </div>
      </template>
    </LoadingMoreContainer>
    <slot
      name="DetailDrawer"
      :ActivedUserLotteryResult="ActivedUserLotteryResult"
      :activedParams="activedParams"
    ></slot>
  </div>
</template>

<script setup lang="ts">
import { computed, type PropType, ref } from 'vue'
import type { BaseRankItem, BaseSimpleUserInfo } from '@/models/compo/ranking/Ranking.ts'
import RankItem from '@/components/CommonCompo/Bili-Ranking-Compo/items/RankItem.vue'
import type { RankingPartition } from '@/models/lottery/lotdata.ts'
import HallAreaContent from '@/components/CommonCompo/Bili-Ranking-Compo/items/HallAreaContent.vue'
import { useDebounceFn } from '@vueuse/core'
import RankItemRow from '@/components/CommonCompo/Bili-Ranking-Compo/items/RankItemRow.vue'
import LoadingMoreContainer from '@/components/CommonCompo/Bili-Container-Compo/LoadingMoreContainer.vue'
import BiliEmpty from '@/components/CommonCompo/Bili-Feedback-Compo/BiliEmpty.vue'
import BiliError from '@/components/CommonCompo/Bili-Feedback-Compo/BiliError.vue'

const isError = defineModel<boolean>('isError', { required: true })
const syncTs = defineModel<number>('syncTs', { required: true })
const ActivedUserLotteryResult = ref<{
  user_info: BaseSimpleUserInfo
  isOpenDrawer: boolean
}>({
  user_info: { uid: 0, name: '' },
  isOpenDrawer: false
})
const isLoading = ref(true)
const syncTimeText = computed(() => {
  const date = new Date(syncTs.value * 1e3)
  return date.toLocaleString() // 根据需要调整日期格式
})
const props = defineProps({
  page_size: {
    type: Number,
    default: 10
  },
  load_func: {
    type: Function as PropType<
      (
        cur_offset: number,
        page_size: number,
        filter_params: Record<RankingPartition['partitionValue'], RankingPartition['activeValue']>
      ) => Promise<BaseRankItem[]>
    >,
    required: true
  },
  score_prefix: {
    type: String,
    default: 'score'
  },
  score_suffix: {
    type: String,
    default: ''
  },
  ranking_partitions: {
    type: Array as PropType<RankingPartition[]>,
    default: () => []
  }
})
const cur_offset = ref(0)
const rankItems = ref<BaseRankItem[]>([])
const topItems = ref<BaseRankItem[]>([])
const isMore = ref(true)
const activedParams = computed(() => {
  let filter_params: Record<string, string> = {}
  props.ranking_partitions.map((el) => {
    filter_params[el.partitionValue] = el.activeValue
  })
  return filter_params
})
const handleLoad = useDebounceFn(async () => {
  isLoading.value = true
  let resp_rank_items = await props.load_func(
    cur_offset.value,
    props.page_size,
    activedParams.value
  )
  let i: any[]
  ;(rankItems.value.length
    ? (i = resp_rank_items)
    : ((topItems.value = resp_rank_items.slice(0, 3)), (i = resp_rank_items.slice(3))),
    (rankItems.value = [...rankItems.value, ...i]))
  resp_rank_items.length <= 0 && (isMore.value = !1)
  cur_offset.value += resp_rank_items.length
  isLoading.value = false
}, 300)
const handlePartitionChange = () => {
  cur_offset.value = 0
  rankItems.value = []
  topItems.value = []
  isMore.value = !0
  handleLoad()
}
const handleScoreClick = (item: BaseRankItem) => {
  ActivedUserLotteryResult.value.user_info = item.user
  ActivedUserLotteryResult.value.isOpenDrawer = true
}
</script>

<style scoped>
.top-rank-panel :deep(.number),
.rank-panel :deep(.score) {
  cursor: pointer;
}

.rank-header-panel {
  height: 1.226667rem;
  padding: 0 0.32rem;
  box-sizing: border-box;
  display: flex;
  align-items: center;
}

.top-rank-panel {
  width: 100%;
  padding: 0 0.5rem;
  margin-bottom: 1.5rem;
  display: flex;
  justify-content: space-evenly;
  box-sizing: border-box;
}

.hall-rank-container {
  width: 100%;
  height: 100%;
  min-height: 13.333333rem;
  overflow-y: hidden;
  padding: 0 0.226667rem;
  border-radius: 0;
  border: 0;
  margin: 0 auto;
  box-sizing: border-box;
  display: block;
  unicode-bidi: isolate;
}

.rank-main :deep(.with-loading-more) {
  height: 100%;
  overflow-x: hidden;
  position: static;
}

.rank-main {
  height: 21.6rem;
  padding-bottom: 0.906667rem;
  border: 1px solid #42485e;
  background:
    linear-gradient(180deg, rgba(24, 25, 38, 0.95), rgba(17, 17, 28, 0.95) 96.22%),
    linear-gradient(0, rgba(66, 72, 94, 0.5), rgba(66, 72, 94, 0.5));
  position: relative;
}

.rank-empty {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding-bottom: 0.8rem;
}

.rank-empty :deep(.pic) {
  margin-bottom: 0.16rem;
}

.rank-empty :deep(.txt) {
  height: 0.533333rem;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #9499a0;
  font-size: 0.32rem;
  font-weight: 400;
}

.rank-header-info {
  padding: 0.1rem;
  background-color: rgba(64, 64, 64, 0.5); /* 半透明背景 */
  border-bottom: 1px solid #333; /* 底部细线 */
}

.sync-time {
  font-size: 0.5rem; /* 字体大小 */
  color: #ffffff; /* 字体颜色 */
  text-align: center; /* 文本居中 */
  margin: 0 auto; /* 居中 */
  border-radius: 4px; /* 圆角 */
  line-height: normal;
}
</style>
