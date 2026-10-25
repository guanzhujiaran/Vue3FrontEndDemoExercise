<template>
  <div class="moment-space-dynamic-tab max-w-2xl mx-auto">
    <!-- 工具条：只留条数。个人空间是「资料 / 关系」场所，不放发布动态入口（发动态去动态模块页 MomentLayout） -->
    <div class="moment-space-dynamic-tab__toolbar mb-4 flex items-center justify-between">
      <span class="moment-space-dynamic-tab__count text-sm text-text-placeholder">共 {{ items.length }} 条动态</span>
    </div>
    <LoadingWrap :loading="loading">
      <EmptyState v-if="!loading && items.length === 0" text="还没有发布过动态 ~" />
      <div v-else class="moment-space-dynamic-tab__list space-y-4">
        <MomentCard
          v-for="item in items"
          :key="item.dynId_str ?? ''"
          :item="item"
          :status="statusOf(item.dynId_str ?? '')"
          :show-more-actions="isOwnSpace"
          :can-remove="isOwnSpace"
          @click="openDetail"
          @avatar-click="onCardAvatarClick"
          @thumb="handleThumb"
          @remove="handleRemove"
          @status-change="onCardStatusChangeOf(item)"
        />
        <div v-if="hasMore" class="flex justify-center py-4">
          <el-button size="default" :loading="loadingMore" @click="loadMore">加载更多</el-button>
        </div>
        <div v-else-if="items.length > 0" class="text-center text-sm text-text-placeholder py-4">
          — 没有更多了 —
        </div>
      </div>
    </LoadingWrap>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { fetchSpaceFeed } from '@/api/notify/moment-api'
import type { MomentFeedItem } from '@/api/notify/moment-api'
import type { FavoriteChangedPayload } from '@/utils/interaction/favoriteSync'
import { useInteractionStatusMap } from '@/composables/useInteractionStatusMap'
import LoadingWrap from '@/components/message/LoadingWrap.vue'
import EmptyState from '@/components/message/EmptyState.vue'
import MomentCard from '@/components/moment/MomentCard.vue'
import { useMomentSpace } from '@/views/moment/tabs/spaceContext'

/**
 * 个人空间「动态」tab（`/app/space/:mid/dynamic`）。
 * 列表是本 tab 的私有状态：布局壳只提供空间资料，切空间 / 重载资料时通过 profileVersion 通知重拉。
 */
const { spaceMid, isOwnSpace, profileVersion, ensureProfileLoaded } = useMomentSpace()
const router = useRouter()

const items = ref<MomentFeedItem[]>([])
const loading = ref(false)
const loadingMore = ref(false)
const hasMore = ref(false)
let historyOffset: number | undefined

// 2.41.0：卡片统计统一走 /interaction/status 批量接口（收藏 / 点赞同步收敛到通用仓库）
const { statusOf, ensure: loadStatus, applyFavorite, toggleLike, clear: clearStatus } =
  useInteractionStatusMap()

/** 已加载的空间资料版本（-1 = 尚未加载）：版本变化才需要重新拉第一页 */
let loadedVersion = -1

async function loadFeed() {
  const mid = spaceMid.value
  if (!mid) return
  // 等布局壳把空间资料（mid / 受限态）拉完，避免用空 mid 发请求
  await ensureProfileLoaded()
  loadedVersion = profileVersion.value
  clearStatus()
  loading.value = true
  const res = await fetchSpaceFeed(mid, { page_size: 20 })
  items.value = res.items || []
  hasMore.value = res.hasMore ?? false
  historyOffset = res.historyOffset ?? undefined
  loading.value = false
  if (items.value.length) void loadStatus(items.value.map((i) => i.dynId_str ?? ''))
}

onMounted(() => {
  void loadFeed()
})

// 布局壳重载空间资料（切换空间 / 解除拉黑）→ 本 tab 数据已过期
watch(
  () => profileVersion.value,
  (v) => {
    if (v !== loadedVersion) void loadFeed()
  }
)

async function loadMore() {
  const mid = spaceMid.value
  if (loadingMore.value || !hasMore.value) return
  loadingMore.value = true
  const res = await fetchSpaceFeed(mid, { page_size: 20, history_offset: historyOffset })
  const newItems = res.items || []
  items.value.push(...newItems)
  hasMore.value = res.hasMore ?? false
  historyOffset = res.historyOffset ?? undefined
  loadingMore.value = false
  // 2.41.0：批量拉取本页卡片互动统计（统一 status 接口）
  if (newItems.length) void loadStatus(newItems.map((i) => i.dynId_str ?? ''))
}

function openDetail(item: MomentFeedItem) {
  router.push({ name: 'MOMENT_DETAIL', params: { momentId: item.dynId_str } })
}

function onCardAvatarClick(item: MomentFeedItem) {
  // item.mid 是 number，spaceMid 取自路由 params 是字符串，比较前先对齐类型
  if (String(item.mid) !== spaceMid.value) {
    // 跳该用户的空间主页（个人空间落地页），注意必须用子路由 name：
    // 父路由 name（MOMENT_USER_SPACE）只会匹配到壳路由，RouterView 渲染不出内容
    router.push({ name: 'MOMENT_USER_SPACE_HOME', params: { mid: String(item.mid) } })
  }
}

/** MomentCard 只回传 dynId_str，需要回写本地卡片时按 id 取回列表项 */
function handleThumb(dynId_str: string) {
  const item = items.value.find((i) => (i.dynId_str ?? '') === dynId_str)
  const interMod = item?.modules?.find((m) => m.moduleType === 'interaction')
  void toggleLike(dynId_str, (isLike) => {
    if (interMod) interMod.isLike = isLike
  })
}

/** 卡片内收藏态变化（收藏夹弹窗操作成功）：浅合并进互动态仓库，卡片按钮即时响应 */
function onCardStatusChangeOf(item: MomentFeedItem) {
  return (_dynId: string, payload: FavoriteChangedPayload) =>
    applyFavorite(item.dynId_str ?? '', payload)
}

/** 2.22.1：删除确认与 API 已下沉 MomentCard，本组件仅移除列表项 */
function handleRemove(dynId_str: string) {
  items.value = items.value.filter((i) => (i.dynId_str ?? '') !== dynId_str)
}
</script>
