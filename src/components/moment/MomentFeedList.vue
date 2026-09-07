<template>
  <div class="moment-feed-list h-full flex flex-col">
    <LoadingMoreContainer
      class="mb-0!"
      fill-parent
      :handle-load="handleLoad"
      v-model:is-more="isMore"
      v-model:is-loading="isLoading"
      v-model:is-error="isError"
      :show-end-text="items.length > 0"
    >
      <template #content>
        <EmptyState v-if="!isLoading && !isError && items.length === 0" text="还没有动态，快来发布第一条吧 ~" />
        <div v-else class="moment-feed-list__list space-y-4 max-w-2xl mx-auto py-4">
          <MomentCard
            v-for="item in items"
            :key="item.dynIdStr"
            :item="item"
            :status="statusOf(item.dynIdStr)"
            :show-more-actions="true"
            @click="openDetail"
            @src-click="openDetail"
            @avatar-click="openUserSpace"
            @thumb="handleThumb(item)"
            @report="handleReport(item)"
            @remove="handleRemove(item)"
          />
        </div>
      </template>
    </LoadingMoreContainer>
    <!-- 换一换（B 站 rcmd 风格：右侧固定，垂直"换一换"文字，刷新推荐流） -->
    <div
      v-if="items.length > 0"
      class="moment-feed-list__refresh fixed right-4 top-1/2 -translate-y-1/2 z-20 cursor-pointer select-none rounded-lg bg-bg-secondary border border-border-primary text-text-secondary hover:text-primary hover:bg-bg-overlay transition-colors duration-150 px-2 py-3 shadow-md text-sm font-medium opacity-80 hover:opacity-100 [writing-mode:vertical-rl] tracking-[0.25em]"
      :class="{ 'is-loading pointer-events-none opacity-60': isLoading }"
      role="button"
      tabindex="0"
      aria-label="换一换推荐内容"
      @click="handleRefresh"
      @keydown.enter="handleRefresh"
    >
      <span class="moment-feed-list__refresh-text">换一换</span>
    </div>
    <ReportDialog v-model="reportDialogVisible" :biz-type="InteractionBizTypeEnum.DYNAMIC" :biz-id="reportDynId" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import {
  fetchAllFeed,
  fetchInteractionStatus,
  InteractionBizTypeEnum,
  thumbMoment,
} from '@/api/notify/moment-api'
import type { MomentFeedItem, InteractionStatusItem } from '@/api/notify/moment-api'
import LoadingMoreContainer from '@/components/CommonCompo/Bili-Container-Compo/LoadingMoreContainer.vue'
import EmptyState from '@/components/message/EmptyState.vue'
import MomentCard from '@/components/moment/MomentCard.vue'
import ReportDialog from '@/components/moment/ReportDialog.vue'

const router = useRouter()

// 统一举报弹窗（P11-T6）
const reportDialogVisible = ref(false)
const reportDynId = ref<string>('')

const items = ref<MomentFeedItem[]>([])
const isLoading = ref(false)
const isMore = ref(true)
const isError = ref(false)

// 2.41.0：卡片统计统一走 /interaction/status 批量接口（卡片不再内置 stat 模块）
const statusMap = ref<Record<string, InteractionStatusItem>>({})
async function loadStatus(ids: string[]) {
  const fresh = ids.filter((id) => !statusMap.value[id])
  if (!fresh.length) return
  try {
    const res = await fetchInteractionStatus(InteractionBizTypeEnum.DYNAMIC, fresh)
    for (const it of res?.items ?? []) {
      if (it?.bizId) statusMap.value[it.bizId] = it
    }
  } catch {
    // 弱依赖：失败不阻断 feed 展示
  }
}
function statusOf(dynIdStr: string): InteractionStatusItem | null {
  return statusMap.value[dynIdStr] ?? null
}

// 推荐流（对齐 B 站 rcmd）：已展示 dynId 列表，随请求作为 last_showlist 交给
// 服务端去重——无 page/offset 游标，每次请求返回未展示的新推荐
const SHOWLIST_LIMIT = 100
let showlist: string[] = []

// 客户端唯一 ID（对齐 B 站 uniq_id）：未登录用户服务端据此派生随机权重，
// 同一浏览器稳定、不同浏览器看到不同 feed；登录用户由 mid 决定个性化
const UNIQ_ID_KEY = 'moment_feed_uniq_id'
function getUniqId(): string {
  let id = localStorage.getItem(UNIQ_ID_KEY)
  if (!id) {
    id = Math.random().toString(36).slice(2) + Date.now().toString(36)
    localStorage.setItem(UNIQ_ID_KEY, id)
  }
  return id
}

/** 首屏加载 / 触底加载统一入口（LoadingMoreContainer 触底回调） */
const handleLoad = async () => {
  isError.value = false
  isLoading.value = true
  try {
    const isFirst = items.value.length === 0
    const res = await fetchAllFeed({
      ps: 20,
      last_showlist: showlist.length ? showlist.slice(-SHOWLIST_LIMIT).join(',') : undefined,
      uniq_id: getUniqId(),
    })
    const newItems = res.items || []
    // 兜底去重（推荐序漂移/候选变化时防同一卡片重复渲染）
    const seen = new Set(items.value.map((i) => i.dynIdStr))
    const fresh = newItems.filter((i) => !seen.has(i.dynIdStr))
    if (isFirst) {
      items.value = fresh
    } else {
      items.value.push(...fresh)
    }
    // 记录本次已展示项（含首屏），供下次请求去重；只保留最近 100 个
    for (const it of fresh) showlist.push(it.dynIdStr)
    if (showlist.length > SHOWLIST_LIMIT) {
      showlist = showlist.slice(-SHOWLIST_LIMIT)
    }
    // 2.41.0：批量拉取本页卡片互动统计（统一 status 接口）
    if (fresh.length) void loadStatus(fresh.map((i) => i.dynIdStr))
    isMore.value = res.hasMore ?? false
    // 无新增内容（候选耗尽/漂移导致后端无未展示项）：停止加载，避免死循环
    if (!isFirst && fresh.length === 0) {
      isMore.value = false
    }
  } catch (e) {
    console.error('加载动态失败:', e)
    isError.value = true
  } finally {
    isLoading.value = false
  }
}

onMounted(handleLoad)

function openDetail(item: MomentFeedItem) {
  router.push({ name: 'MOMENT_DETAIL', params: { momentId: item.dynIdStr } })
}

function openUserSpace(item: MomentFeedItem) {
  router.push({ name: 'MOMENT_USER_SPACE', params: { mid: String(item.mid) } })
}

async function handleThumb(item: MomentFeedItem) {
  const up = item.modules?.find((m) => m.moduleType === 'interaction')?.isLike ? 2 : 1
  const res = await thumbMoment(item.dynIdStr, up)
  if (res) {
    // 乐观更新：interaction 模块点赞态 + status 计数
    const interMod = item.modules?.find((m) => m.moduleType === 'interaction')
    if (interMod) interMod.isLike = up === 1
    const st = statusMap.value[item.dynIdStr]
    if (st) {
      st.isLike = up === 1
      st.likeCount = Math.max(0, Number(st.likeCount ?? 0) + (up === 1 ? 1 : -1))
    }
  }
}

function handleReport(item: MomentFeedItem) {
  // 打开统一举报弹窗（bizType=dynamic，bizId=dynIdStr 直接传 str，避免雪花 ID 精度丢失）
  reportDynId.value = item.dynIdStr
  reportDialogVisible.value = true
}

/** 2.22.1：删除确认与 API 已下沉 MomentCard，父组件仅移除列表项 */
function handleRemove(item: MomentFeedItem) {
  items.value = items.value.filter((i) => i.dynIdStr !== item.dynIdStr)
}

/** 换一换：清空已展示列表 + 重置加载状态，按 B 站 rcmd 风格重新拉取推荐（保留 uniq_id） */
async function handleRefresh() {
  if (isLoading.value) return
  items.value = []
  showlist = []
  isMore.value = true
  isError.value = false
  await handleLoad()
}

defineExpose({ refresh: handleLoad })
</script>
