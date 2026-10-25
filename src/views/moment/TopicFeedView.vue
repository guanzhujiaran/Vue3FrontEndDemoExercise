<template>
  <div class="topic-feed h-full flex flex-col">
    <!-- 话题详情头部（对齐 B 站） -->
    <div
      v-if="detail"
      class="topic-feed__detail shrink-0 mb-4 rounded-lg bg-bg-overlay border border-border-light p-5"
    >
      <div class="topic-feed__detail-top flex items-start gap-4">
        <img
          v-if="topicItem.share_pic"
          class="topic-feed__detail-cover h-16 w-16 rounded-lg object-cover"
          :src="topicItem.share_pic"
          :referrerpolicy="IMG_REFERRER_POLICY"
          alt="topic cover"
        />
        <div class="topic-feed__detail-main min-w-0 flex-1">
          <h2 class="topic-feed__topic-name text-xl font-bold text-text-primary">#{{ topicName }}#</h2>
          <p v-if="topicItem.description" class="topic-feed__topic-desc mt-1 text-sm text-text-placeholder line-clamp-2">
            {{ topicItem.description }}
          </p>
          <p class="topic-feed__topic-stats mt-2 text-sm text-text-placeholder">
            <span v-if="topicItem.view">{{ formatCount(topicItem.view) }}浏览</span>
            <span v-if="topicItem.discuss" class="mx-2">·</span>
            <span v-if="topicItem.discuss">{{ formatCount(topicItem.discuss) }}讨论</span>
            <span v-if="topicItem.dynamics" class="mx-2">·</span>
            <span v-if="topicItem.dynamics">{{ formatCount(topicItem.dynamics) }}动态</span>
          </p>
        </div>
        <div class="topic-feed__detail-actions shrink-0 flex flex-col items-end gap-2">
          <el-button type="primary" size="default" round class="topic-feed__detail-join" @click="onJoinTopic">
            参与话题
          </el-button>
        </div>
      </div>
    </div>
    <div v-else class="topic-feed__banner bg-bg-overlay rounded-lg border border-border-light p-4 mb-4 shrink-0">
      <h2 class="topic-feed__topic-name text-xl font-bold text-text-primary">#{{ topicName }}#</h2>
    </div>

    <!-- 热门 / 最新排序 -->
    <div class="topic-feed__sort shrink-0 mb-3 flex items-center gap-2">
      <el-radio-group v-model="sort" size="default" class="topic-feed__sort-group" @change="onSortChange">
        <el-radio-button value="hot">热门</el-radio-button>
        <el-radio-button value="time">最新</el-radio-button>
      </el-radio-group>
    </div>

    <LoadingMoreContainer
      :handle-load="handleLoad"
      v-model:is-more="isMore"
      v-model:is-loading="isLoading"
      v-model:is-error="isError"
    >
      <template #content>
        <EmptyState v-if="!isLoading && !isError && items.length === 0" text="该话题下暂无动态" />
        <div v-else class="topic-feed__list space-y-4 max-w-2xl mx-auto py-4">
          <MomentCard
            v-for="item in items"
            :key="item.dynId_str ?? ''"
            :item="item"
            :status="statusOf(item.dynId_str ?? '')"
            :show-more-actions="true"
            @click="openDetail"
            @src-click="openDetail"
            @avatar-click="openUserSpace"
            @thumb="handleThumb(item)"
            @report="handleReport(item)"
            @remove="handleRemove(item)"
            @status-change="onCardStatusChangeOf(item)"
          />
        </div>
      </template>
    </LoadingMoreContainer>
    <ReportDialog v-model="reportDialogVisible" :biz-type="InteractionBizTypeEnum.DYNAMIC" :biz-id="reportDynId" />
  </div>
</template>

<script setup lang="ts">
import { IMG_REFERRER_POLICY } from '@/utils/PageOpen/linkPolicy'
import { ref, watch, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { fetchTopicFeed, fetchTopicDetail, InteractionBizTypeEnum } from '@/api/notify/moment-api'
import type { MomentFeedItem, MomentTopicDetailResp } from '@/api/notify/moment-api'
import type { FavoriteChangedPayload } from '@/utils/interaction/favoriteSync'
import { useInteractionStatusMap } from '@/composables/useInteractionStatusMap'
import LoadingMoreContainer from '@/components/CommonCompo/Bili-Container-Compo/LoadingMoreContainer.vue'
import EmptyState from '@/components/message/EmptyState.vue'
import MomentCard from '@/components/moment/MomentCard.vue'
import ReportDialog from '@/components/moment/ReportDialog.vue'
import biliMessage from '@/utils/message'

defineOptions({ name: 'TopicFeedView' })

const route = useRoute()
const router = useRouter()

const topicId = String(route.params.topicId)
const topicName = (route.query.topicName as string) || `话题 ${topicId}`

const items = ref<MomentFeedItem[]>([])
const isLoading = ref(false)
const isMore = ref(true)
const isError = ref(false)
let historyOffset: number | undefined

// 2.41.0：卡片统计统一走 /interaction/status 批量接口（收藏 / 点赞同步收敛到通用仓库）
const { statusOf, ensure: loadStatus, applyFavorite, toggleLike, clear: clearStatus } =
  useInteractionStatusMap()

/** 话题详情（对齐 B 站 top_details） */
const detail = ref<MomentTopicDetailResp | null>(null)
const topicItem = ref<Record<string, any>>({})
const sort = ref<'hot' | 'time'>('hot')

/** 数字格式化：4.5亿 / 94万 / 1234 */
function formatCount(n: unknown): string {
  const v = Number(n || 0)
  if (v >= 100000000) return (v / 100000000).toFixed(1).replace(/\.0$/, '') + '亿'
  if (v >= 10000) return (v / 10000).toFixed(1).replace(/\.0$/, '') + '万'
  return String(v)
}

async function loadDetail() {
  try {
    const res = await fetchTopicDetail(topicId)
    if (res?.top_details) {
      detail.value = res
      topicItem.value = (res.top_details.topic_item || {}) as Record<string, any>
    }
  } catch {
    // 详情加载失败不阻塞列表
  }
}

/** 首屏加载 / 触底加载统一入口（LoadingMoreContainer 触底回调） */
const handleLoad = async () => {
  isError.value = false
  isLoading.value = true
  try {
    const isFirst = items.value.length === 0
    const res = await fetchTopicFeed(
      topicId,
      {
        page_size: 20,
        sort: sort.value,
        ...(!isFirst && historyOffset != null ? { history_offset: historyOffset } : {})
      }
    )
    const newItems = res.items || []
    if (isFirst) {
      items.value = newItems
    } else {
      items.value.push(...newItems)
    }
    // 2.41.0：批量拉取本页卡片互动统计（统一 status 接口）
    if (newItems.length) void loadStatus(newItems.map((i) => i.dynId_str ?? ''))
    isMore.value = res.hasMore ?? false
    historyOffset = res.historyOffset ?? undefined
  } catch (e) {
    console.error('加载话题动态失败:', e)
    isError.value = true
  } finally {
    isLoading.value = false
  }
}

function onSortChange() {
  items.value = []
  clearStatus()
  isMore.value = true
  isError.value = false
  historyOffset = undefined
  handleLoad()
}

function onJoinTopic() {
  router.push({ name: 'MOMENT_TOPIC_SQUARE' })
}

onMounted(() => {
  loadDetail()
  handleLoad()
})

// keep-alive 复用组件时，话题切换需重新加载
watch(
  () => route.params.topicId,
  () => {
    items.value = []
    clearStatus()
    isMore.value = true
    isError.value = false
    historyOffset = undefined
    topicItem.value = {}
    detail.value = null
    loadDetail()
    handleLoad()
  }
)

function openDetail(item: MomentFeedItem) {
  router.push({ name: 'MOMENT_DETAIL', params: { momentId: item.dynId_str } })
}

function openUserSpace(item: MomentFeedItem) {
  router.push({ name: 'MOMENT_USER_SPACE_HOME', params: { mid: String(item.mid) } })
}

function handleThumb(item: MomentFeedItem) {
  const interMod = item.modules?.find((m) => m.moduleType === 'interaction')
  void toggleLike(item.dynId_str ?? '', (isLike) => {
    if (interMod) interMod.isLike = isLike
  })
}

/** 卡片内收藏态变化（收藏夹弹窗操作成功）：浅合并进互动态仓库，卡片按钮即时响应 */
function onCardStatusChangeOf(item: MomentFeedItem) {
  return (_dynId: string, payload: FavoriteChangedPayload) =>
    applyFavorite(item.dynId_str ?? '', payload)
}

/** 统一举报弹窗（P11-T6） */
const reportDialogVisible = ref(false)
const reportDynId = ref<string>('')

function handleReport(item: MomentFeedItem) {
  reportDynId.value = item.dynId_str ?? '' // str 直接传递，避免雪花 ID 精度丢失
  reportDialogVisible.value = true
}

/** 2.22.1：删除确认与 API 已下沉 MomentCard，父组件仅移除列表项 */
function handleRemove(item: MomentFeedItem) {
  items.value = items.value.filter((i) => i.dynId_str !== item.dynId_str)
}
</script>
