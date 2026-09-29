<template>
  <FlexContainer class="bili-ranking-container w-full bg-gradient-to-br from-[rgba(30,30,60,0.8)] to-[rgba(15,15,30,0.9)] rounded-lg
  shadow-[0_8px_32px_rgba(0,0,0,0.3)] text-white">
    <div class="text-center mt-6">
      <div class="text-2xl font-bold bg-gradient-to-r from-primary to-info bg-clip-text text-transparent mb-4">排行榜
      </div>
    </div>
    <div
      class="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 p-4 bg-gray-900/50 rounded-lg border border-gray-800">
      <div class="text-primary flex items-center">
        <el-icon class="mr-2 text-gray-500">
          <Timer />
        </el-icon>
        <span class="mr-2">数据同步时间：</span>
        <span class="text-secondary font-medium">{{ syncTimeText }}</span>
      </div>
      <div class="flex flex-wrap gap-3">
        <HallAreaContent v-if="localPartitions.length" v-for="partition in localPartitions"
          :key="partition.partitionValue" :partition="partition" @handlePartitionChange="handlePartitionChange">
        </HallAreaContent>
      </div>
    </div>
    <div class="flex justify-center items-end gap-8 mb-8 min-h-50">
      <RankItem v-for="(item, index) in topItems" :key="index" :score_prefix="props.score_prefix"
        :score_suffix="props.score_suffix" :item="item" @score_click="handleScoreClick">
      </RankItem>
    </div>
    <LoadingMoreContainer :handle-load="handleLoad"
      v-model:is-more="isMore" v-model:is-loading="isLoading" v-model:is-error="isError">
      <template #content>
        <div class="bili-ranking-content px-4 md:px-8 pt-6 mx-auto max-w-6xl">
          <div class="rounded-lg p-2 md:p-4">
            <RankItemRow v-for="(item, index) in rankItems" :item="item" :score_prefix="props.score_prefix"
              :score_suffix="props.score_suffix" :animation="{
                duration: 200 * (((index + 3) % 10) + 1)
              }" :key="index" @score_click="handleScoreClick" />
          </div>
          <BiliEmpty v-if="!isError && !isLoading && topItems.length === 0 && rankItems.length === 0">
          </BiliEmpty>
          <BiliError class="mt-6" v-if="isError" @click-retry="handleLoad"></BiliError>
        </div>
      </template>
    </LoadingMoreContainer>
    <slot name="DetailDrawer" :ActivedUserLotteryResult="ActivedUserLotteryResult" :activedParams="activedParams">
    </slot>

  </FlexContainer>
</template>

<script setup lang="ts">
import { computed, onMounted, watch, type PropType, ref } from 'vue'
import type { BaseRankItem, BaseSimpleUserInfo } from '@/models/compo/ranking/Ranking.ts'
import RankItem from '@/components/CommonCompo/Bili-Ranking-Compo/items/RankItem.vue'
import type { RankingPartition } from '@/models/api/lottery/lotdata.ts'
import HallAreaContent from '@/components/CommonCompo/Bili-Ranking-Compo/items/HallAreaContent.vue'
import RankItemRow from '@/components/CommonCompo/Bili-Ranking-Compo/items/RankItemRow.vue'
import LoadingMoreContainer from '@/components/CommonCompo/Bili-Container-Compo/LoadingMoreContainer.vue'
import { formatDateTime } from '@/utils/dateFormat.ts'
import BiliEmpty from '@/components/CommonCompo/Bili-Feedback-Compo/BiliEmpty.vue'
import BiliError from '@/components/CommonCompo/Bili-Feedback-Compo/BiliError.vue'
import { Timer, ArrowDown } from '@element-plus/icons-vue'
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
  // 必须用固定时区/locale 格式化：本页数据在服务端渲染，直接 toLocaleString() 会因
  // 构建机（en-US）与用户浏览器（zh-CN）语言不同而渲染出不同字符串 → hydration mismatch
  return formatDateTime(syncTs.value * 1e3)
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
  },
  /**
   * 预渲染数据键：传入时首次加载会在 setup 阶段执行（SSR 需要），数据随之进入 HTML。
   * 不传则维持「客户端挂载后加载」的原行为，避免影响其它复用本组件的页面。
   */
  ssr_key: {
    type: String,
    default: ''
  }
})
const cur_offset = ref(0)
const rankItems = ref<BaseRankItem[]>([])
const topItems = ref<BaseRankItem[]>([])
const isMore = ref(true)

// 本地维护的可变分区状态（从 props 初始化，子组件变更时更新）
const localPartitions = ref<RankingPartition[]>([])
watch(
  () => props.ranking_partitions,
  (val) => {
    localPartitions.value = val.map((p) => ({ ...p }))
  },
  { immediate: true }
)

const activedParams = computed(() => {
  let filter_params: Record<string, string> = {}
  localPartitions.value.map((el) => {
    filter_params[el.partitionValue] = el.activeValue
  })
  return filter_params
})
const handleLoad = () => {
  isLoading.value = true
  // 返回 Promise：SSR 时需要 await 首次加载（见下方 ssr_key 分支）
  return props
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

/**
 * 重置到第一页再加载（切换分区、刷新预渲染快照都走这里）。
 *
 * 必须先清空已有列表：`handleLoad` 在列表非空时走的是「加载更多」分支（追加），
 * 不清空会把第一页重复追加一遍。
 */
const reload = () => {
  cur_offset.value = 0
  rankItems.value = []
  topItems.value = []
  isMore.value = true
  return handleLoad()
}

const handlePartitionChange = (updatedPartition: RankingPartition) => {
  const index = localPartitions.value.findIndex(
    (p) => p.partitionValue === updatedPartition.partitionValue
  )
  if (index !== -1) {
    localPartitions.value[index] = updatedPartition
  }
  reload()
}

const handleScoreClick = (item: BaseRankItem) => {
  ActivedUserLotteryResult.value.user_info = item.user
  ActivedUserLotteryResult.value.isOpenDrawer = true
}

/**
 * 预渲染：`ssr_key` 存在时，首次加载必须在 **setup 阶段**完成 —— `onMounted` 只在客户端执行，
 * 放在那里预渲染出的 HTML 就是空壳。数据同时进入 Nuxt payload，客户端 hydration 直接复用。
 */
if (props.ssr_key) {
  const { data: ssrData } = await useAsyncData(props.ssr_key, async () => {
    await handleLoad()
    return {
      top: topItems.value,
      list: rankItems.value,
      offset: cur_offset.value,
      more: isMore.value
    }
  })
  // 客户端 hydration：payload 命中时上面的 fn 不会执行，必须把数据写回组件状态，
  // 否则「SSR 有内容、客户端渲染成空列表」（排行榜一开始就踩了这个坑）。
  if (ssrData.value && !topItems.value.length && !rankItems.value.length) {
    topItems.value = ssrData.value.top
    rankItems.value = ssrData.value.list
    cur_offset.value = ssrData.value.offset
    isMore.value = ssrData.value.more
  }
}

// 组件挂载时取数：
// - 没有 ssr_key 的页面：维持原行为（挂载后首次加载）
// - 有 ssr_key 的预渲染页：上面的 useAsyncData 在 hydration 时会命中 payload 而不请求，
//   首屏数据即「构建时快照」——挂载后重置到第一页重新拉取，保证展示当前数据
onMounted(() => {
  if (!props.ssr_key) {
    handleLoad()
    return
  }
  reload()
})
</script>
