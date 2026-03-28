<template>
  <LoadingMoreContainer
    class="rank-main bili-base-ranking"
    :handle-load="handleLoad"
    v-model:is-more="isMore"
    v-model:is-loading="isLoading"
    v-model:is-error="isError"
  >
    <template #content>
      <div class="rank-header-info">
        <div class="header-title">排行榜</div>
        
      </div>
      <div class="rank-header-panel">
        <div class="sync-time">
          <span class="sync-label">数据同步时间：</span>
          <span class="sync-value">{{ syncTimeText }}</span>
        </div>
        <HallAreaContent
          v-if="props.ranking_partitions.length"
          v-for="partition in props.ranking_partitions"
          :partition="partition"
          @handlePartitionChange="handlePartitionChange"
        >
        </HallAreaContent>
      </div>
      <el-divider></el-divider>
      <div class="top-rank-panel">
        <RankItem
          v-for="(item, index) in topItems"
          :key="index"
          :score_prefix="props.score_prefix"
          :score_suffix="props.score_suffix"
          :item="item"
          @score_click="handleScoreClick"
        >
        </RankItem>
      </div>
      <div class="rank-panel">
        <RankItemRow
          v-for="(item, index) in rankItems"
          :item="item"
          :score_prefix="props.score_prefix"
          :score_suffix="props.score_suffix"
          :animation="{
            duration: 200 * (((index + 3) % 10) + 1)
          }"
          :key="index"
          @score_click="handleScoreClick"
        />
      </div>
      <BiliEmpty v-if="!isError && !isLoading && topItems.length === 0 && rankItems.length === 0"></BiliEmpty>
      <BiliError class="rank-error" v-if="isError" @click-retry="handleLoad"></BiliError>
    </template>
  </LoadingMoreContainer>
  <slot name="DetailDrawer" :ActivedUserLotteryResult="ActivedUserLotteryResult" :activedParams="activedParams"></slot>
</template>

<script setup lang="ts">
import { computed, onMounted, type PropType, ref } from 'vue'
import type { BaseRankItem, BaseSimpleUserInfo } from '@/models/compo/ranking/Ranking.ts'
import RankItem from '@/components/CommonCompo/Bili-Ranking-Compo/items/RankItem.vue'
import type { RankingPartition } from '@/models/api/lottery/lotdata.ts'
import HallAreaContent from '@/components/CommonCompo/Bili-Ranking-Compo/items/HallAreaContent.vue'
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
const isLoading = ref(false)
const syncTimeText = computed(() => {
  if (!syncTs.value || syncTs.value === 0) {
    return '暂无同步记录'
  }
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
const handleLoad = () => {
  isLoading.value = true
  props
    .load_func(cur_offset.value, props.page_size, activedParams.value)
    .then((resp_rank_items) => {
      const isNewList = rankItems.value.length === 0 && topItems.value.length === 0
      
      if (isNewList) {
        // 首次加载：分割前 3 名和后续数据
        topItems.value = resp_rank_items.slice(0, 3)
        if (topItems.value.length >= 2) {
          ;[topItems.value[0], topItems.value[1]] = [topItems.value[1]!, topItems.value[0]!]
        }
        rankItems.value = resp_rank_items.slice(3)
      } else {
        // 加载更多：直接追加到列表末尾
        rankItems.value = [...rankItems.value, ...resp_rank_items]
      }
      
      isMore.value = resp_rank_items.length >= props.page_size
      cur_offset.value += resp_rank_items.length
      isError.value = false
    })
    .catch((error) => {
      console.error('加载排行榜数据失败:', error)
      isError.value = true
    })
    .finally(() => {
      isLoading.value = false
    })
}

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

// 组件挂载时自动加载数据
onMounted(() => {
  handleLoad()
})
</script>

<style scoped>
@import '@/assets/components/ranking/bili-base-ranking-tailwind.css';
</style>
