<template>
  <CommContainer class="rank-main" v-loading="isLoading">
    <LoadingMoreContainer :handle-load="handleLoad" v-model:is-more="isMore">
      <template #content>
        <div class="rank-header-info">
          <div class="header-title">排行榜</div>
          <div class="sync-time">
            <span class="sync-label">数据同步时间：</span>
            <span class="sync-value">{{ syncTimeText }}</span>
          </div>
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
            :animation="{
              duration: 200 * (((index + 3) % 10) + 1)
            }"
            :key="index"
            @score_click="handleScoreClick"
          />
        </div>
        <BiliEmpty v-if="!isMore && !isError && !isLoading && rankItems.length === 0"></BiliEmpty>
        <BiliError class="rank-error" v-if="isError" @click-retry="handleLoad"></BiliError>
      </template>
    </LoadingMoreContainer>
    <slot
      name="DetailDrawer"
      :ActivedUserLotteryResult="ActivedUserLotteryResult"
      :activedParams="activedParams"
    ></slot>
  </CommContainer>
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
const handleLoad = () => {
  isLoading.value = true
  props
    .load_func(cur_offset.value, props.page_size, activedParams.value)
    .then((resp_rank_items) => {
      if (rankItems.value.length) {
        // 非首次加载
        rankItems.value = [...rankItems.value, ...resp_rank_items]
      } else {
        // 首次加载，分割前3项作为topItems
        topItems.value = resp_rank_items.slice(0, 3)
        if (topItems.value.length >= 2) {
          ;[topItems.value[0], topItems.value[1]] = [topItems.value[1], topItems.value[0]]
        }
        rankItems.value = resp_rank_items.slice(3)
      }
      if (resp_rank_items.length < props.page_size) {
        isMore.value = false
      }
      cur_offset.value += resp_rank_items.length
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
</script>

<style scoped>
.top-rank-panel :deep(.number),
.rank-panel :deep(.score) {
  cursor: pointer;
  font-size: 18px; /* 增加分数文字大小 */
}

/* 增加排名项的文字大小和间距 */
.top-rank-panel :deep(.name),
.rank-panel :deep(.name) {
  font-size: 16px;
  margin: 8px 0;
  line-height: 1.4;
}

.top-rank-panel :deep(.info),
.rank-panel :deep(.info) {
  font-size: 14px;
  line-height: 1.4;
  margin-top: 5px;
}

.rank-header-panel {
  min-height: 1.5rem; /* 增加最小高度 */
  padding: 0.5rem 1rem; /* 增加内边距 */
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: center; /* 居中对齐 */
  flex-wrap: wrap; /* 允许换行 */
  gap: 12px; /* 添加间距 */
  background-color: rgba(30, 34, 58, 0.4); /* 轻微背景色 */
  border-radius: 0 0 8px 8px; /* 底部圆角 */
  margin-bottom: 1rem; /* 增加底部间距 */
}

.top-rank-panel {
  width: -webkit-fill-available;
  padding: 0 0.5rem;
  margin-bottom: 1.5rem;
  display: flex;
  justify-content: space-evenly;
  box-sizing: border-box;
  gap: 15px; /* 增加项目之间的间距 */
}

.rank-main :deep(.with-loading-more) {
  height: -webkit-fill-available;
  overflow-x: hidden;
  position: static;
}

.rank-main {
  padding-bottom: 0.906667rem;
  background:
    linear-gradient(180deg, rgba(24, 25, 38, 0.95), rgba(17, 17, 28, 0.95) 96.22%),
    linear-gradient(0, rgba(66, 72, 94, 0.5), rgba(66, 72, 94, 0.5));
  position: relative;
  font-size: 16px; /* 增加基础字体大小 */
  line-height: 1.5; /* 增加行高，防止文字重叠 */
}

.rank-empty :deep(.pic) {
  margin-bottom: 0.16rem;
}
@keyframes slideInFromRight {
  0% {
    right: -100px;
    transform: translateX(100%);
  }
  100% {
    right: 0;
    transform: translateX(0%);
  }
}
.rank-empty :deep(.txt) {
  height: 0.533333rem;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #9499a0;
  font-weight: 400;
}

.rank-header-info {
  padding: 0.5rem 1rem;
  background-color: rgba(40, 44, 68, 0.7); /* 更深的半透明背景 */
  border-bottom: 1px solid #42485e; /* 更亮的底部细线 */
  margin-bottom: 0.5rem; /* 增加底部间距 */
  border-radius: 32px 32px 0 0; /* 顶部圆角 */
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2); /* 添加阴影效果 */
  position: relative; /* 相对定位 */
}

.header-title {
  font-size: 24px;
  font-weight: bold;
  color: #ffffff;
  margin-bottom: 12px;
  text-align: center;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
  letter-spacing: 2px;
}

.sync-time {
  color: #e2e5ff; /* 更亮的字体颜色 */
  text-align: center; /* 文本居中 */
  margin: 0 auto; /* 居中 */
  border-radius: 6px; /* 增加圆角 */
  line-height: 1.6;
  font-size: 14px; /* 稍微减小同步时间文字大小 */
  padding: 6px 12px; /* 调整内边距 */
  background-color: rgba(30, 34, 58, 0.6); /* 添加背景色 */
  display: inline-block; /* 内联块级元素 */
  font-weight: 400; /* 正常字重 */
  letter-spacing: 0.5px; /* 增加字间距 */
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2); /* 轻微阴影 */
  border: 1px solid rgba(66, 72, 94, 0.8); /* 添加边框 */
}

.sync-label {
  color: #a0a6ff;
  font-weight: 500;
}

.sync-value {
  color: #ffffff;
}

/* 添加排名面板样式 */
.rank-panel {
  width: -webkit-fill-available;
  padding: 0.5rem;
  box-sizing: border-box;
  font-size: 16px;
}

.rank-panel > * {
  margin-bottom: 12px; /* 增加每个排名项之间的间距 */
}
</style>
