<template>
  <!-- 空间行为时间线列表：概览模式（limit）与完整模式共用同一个组件。
       分页 / 触底加载统一走 LoadingMoreContainer（内部 BiliScrollbar + 触底回调），
       不再手写「加载更多」按钮：
       - 概览模式（主页 5 条）：isMore 恒false + fill-parent，容器按内容自然高度展开、
         底部提示整块隐藏，滚动仍由页面承担，不会多出一层内部滚动条；
       - 完整模式（时间线 tab）：容器自身滚动（0.7 窗口高），滚到底自动拉下一页。 -->
  <LoadingMoreContainer
    class="space-timeline-list-more mb-0!"
    :class="{ '[&_.loading-more-txt]:hidden': isPreview }"
    :handle-load="loadMore"
    :is-more="showEndEntry"
    :fill-parent="isPreview"
    v-model:is-loading="loading"
    v-model:is-error="loadError"
    :show-end-text="!isPreview && items.length > 0"
  >
    <template #content>
      <EmptyState v-if="!loading && !loadError && items.length === 0" :text="emptyText" />
      <ul v-else-if="items.length > 0" class="space-timeline-list flex flex-col gap-4">
        <SpaceTimelineItem
          v-for="(item, idx) in items"
          :key="keyOf(item, idx)"
          :item="item"
          :status="statusOf(dynamicBizIdOf(item))"
          @open-user="openUser(item)"
          @open-resource="openResource(item)"
          @status-change="(payload) => onCardStatusChange(dynamicBizIdOf(item), payload)"
        />
      </ul>
      <!-- 触底加载失败：LoadingMoreContainer 正向模式没有重试入口，这里自己给一行（点击重试整页） -->
      <p
        v-if="loadError"
        class="space-timeline-list__retry mt-3 cursor-pointer text-center text-sm text-text-placeholder"
        @click="retryLoad"
      >
        加载失败，点击重试
      </p>
    </template>
  </LoadingMoreContainer>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { fetchSpaceTimeline } from '@/api/notify/moment-api'
// SDK 里「一条时间线记录」的类型名与本目录组件同名，类型侧统一取别名避免标识符冲突
import type { SpaceTimelineItem as TimelineRecord } from '@/api/community/hey-api'
import type { FavoriteChangedPayload } from '@/utils/interaction/favoriteSync'
import { useInteractionStatusMap } from '@/composables/useInteractionStatusMap'
import LoadingMoreContainer from '@/components/CommonCompo/Bili-Container-Compo/LoadingMoreContainer.vue'
import EmptyState from '@/components/message/EmptyState.vue'
import SpaceTimelineItem from '@/components/moment/SpaceTimelineItem.vue'

/**
 * 空间行为时间线（我的主页 / TA 的主页 / 时间线 tab 共用，计划书 §3.3 / §3.3.1 / §0.2）。
 *
 * 分工：本组件只管「拉数据 + 分页 + 跳转」，单条记录的展示与数据加工全部在
 * `SpaceTimelineItem.vue`（操作文案三分支、资源类型映射、两种资源卡、摘要截断都在那边）。
 *
 * 唯一入参 `mid`：传自己 = 我的主页（后端不过滤），传 TA = TA 主页（后端按隐私
 * 开关整类过滤，关闭的类型根本不返回）。本组件不做任何可见性判断，只负责拉取与渲染。
 */

/** 该条是否为 dynamic 资源（只有 dynamic 需要查互动统计并挂MomentCard） */
function dynamicBizIdOf(item: TimelineRecord): string {
  const r = item.target_resource
  return r?.biz_type === 'dynamic' ? (r.biz_id_str ?? '') : ''
}

/** v-for key：同一资源被多次操作时用下标兜底保证唯一 */
function keyOf(item: TimelineRecord, idx: number): string {
  return `${item.act_type}-${item.target_resource?.biz_id_str ?? item.target_mid_str ?? ''}-${idx}`
}

const props = withDefaults(
  defineProps<{
    mid: string | number
    emptyText?: string
    pageSize?: number
    /** 只看前 N 条（主页概览用）：只拉一页、不显示「查看更多」入口；不传 = 完整游标分页（时间线 tab 用） */
    limit?: number
  }>(),
  {
    emptyText: '最近还没有行为记录~',
    pageSize: 20
  }
)

const router = useRouter()
const items = ref<TimelineRecord[]>([])
const cursor = ref<string | null>(null)
const hasMore = ref(false)
const loading = ref(false)
/** 触底加载失败（LoadingMoreContainer 的错误态：置false 才能重新触发下一次触底） */
const loadError = ref(false)
/** 是否是概览模式（limit 传入） */
const isPreview = computed(() => props.limit != null)
/** 底部「查看更多」入口：仅完整模式且后端还有下一页时出现 */
const showEndEntry = computed(() => !isPreview.value && hasMore.value)
/** dynamic 资源的互动计数（2.41.0 起详情不返回统计，统一走批量 status 接口） */
const { statusOf, ensure, applyFavorite, clear: clearStatus } = useInteractionStatusMap()

async function loadFirst() {
  if (!props.mid) return
  // SSR 不请求：未登录态下在 SSR 阶段发请求只会拿到 -101「账号未登录」并刷无意义错误日志，
  // 时间线不是 SEO 内容，交给客户端挂载后拉即可（下面的 watch immediate 在 SSR 也会跑）。
  if (import.meta.server) return
  cursor.value = null
  items.value = []
  clearStatus()
  await loadPage()
}

async function loadPage() {
  if (loading.value) return
  loading.value = true
  loadError.value = false
  try {
    const size = props.limit ?? props.pageSize
    const res = await fetchSpaceTimeline(props.mid, { cursor: cursor.value, page_size: size })
    const page = props.limit ? (res.items ?? []).slice(0, props.limit) : (res.items ?? [])
    items.value = [...items.value, ...page]
    // limit 模式只拉一页：has_more 仍如实记录，父组件可判断「查看全部」入口
    hasMore.value = Boolean(res.has_more)
    cursor.value = props.limit ? null : (res.cursor ?? null)
    void loadStatus(page)
  } catch {
    loadError.value = true
  } finally {
    loading.value = false
  }
}

/** 批量补本页 dynamic 的互动计数（弱依赖：失败不影响卡片展示） */
async function loadStatus(page: TimelineRecord[]) {
  const ids = page.map(dynamicBizIdOf).filter((id) => id !== '')
  if (!ids.length) return
  await ensure(ids)
}

/** 触底加载（LoadingMoreContainer 回调，组件内部已做 2s 节流 + isMore/isError 守卫） */
function loadMore() {
  if (!hasMore.value || loading.value) return
  void loadPage()
}

/** 加载失败后手动重试：清错误态后按当前游标继续拉（游标未推进，等价于重试这一页） */
function retryLoad() {
  if (loading.value) return
  loadError.value = false
  void loadPage()
}

function openUser(item: TimelineRecord) {
  const midStr = item.target_mid_str ?? (item.target_mid != null ? String(item.target_mid) : '')
  if (midStr) router.push({ name: 'MOMENT_USER_SPACE_HOME', params: { mid: midStr } })
}

/** 点击资源名：dynamic 进详情，其余交给 SpaceTimelineItem 内部的资源卡自己按类型跳转 */
function openResource(item: TimelineRecord) {
  const r = item.target_resource
  if (r?.biz_type === 'dynamic') {
    if (r.biz_id_str) router.push({ name: 'MOMENT_DETAIL', params: { momentId: r.biz_id_str } })
    return
  }
  if (!r?.biz_type) {
    const dynId = item.target_dyn_id_str
    if (dynId) router.push({ name: 'MOMENT_DETAIL', params: { momentId: dynId } })
  }
}

/** 卡片内收藏态变化（收藏夹弹窗操作成功）：浅合并进互动态仓库，卡片按钮即时响应 */
function onCardStatusChange(bizIdStr: string, payload: FavoriteChangedPayload) {
  if (!bizIdStr) return
  applyFavorite(bizIdStr, payload)
}

watch(
  () => props.mid,
  () => {
    void loadFirst()
  },
  { immediate: true }
)

defineExpose({
  reload: loadFirst,
  /** limit 模式下供父组件判断是否显示「查看全部」入口（读的是后端 has_more） */
  hasMore: () => hasMore.value
})
</script>
