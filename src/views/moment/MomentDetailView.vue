<template>
  <div class="moment-detail h-full flex flex-col">
    <div class="moment-detail__content flex-1 min-h-0 overflow-y-auto">
      <!-- 骨架屏 -->
      <div
        v-if="loading"
        class="moment-detail__skeleton max-w-2xl mx-auto pt-6"
      >
        <div class="moment-detail__skeleton-card bg-bg-overlay rounded-lg border border-border-light p-4 shadow-sm animate-pulse">
          <div class="moment-detail__skeleton-header flex items-center gap-3 mb-4">
            <div class="moment-detail__skeleton-avatar h-10 w-10 shrink-0 rounded-full bg-text-placeholder/30"></div>
            <div class="moment-detail__skeleton-author flex-1 space-y-2">
              <div class="moment-detail__skeleton-line h-4 w-32 rounded bg-text-placeholder/30"></div>
              <div class="moment-detail__skeleton-line h-3 w-20 rounded bg-text-placeholder/20"></div>
            </div>
          </div>
          <div class="moment-detail__skeleton-body space-y-2 mb-4">
            <div class="moment-detail__skeleton-line h-4 w-full rounded bg-text-placeholder/20"></div>
            <div class="moment-detail__skeleton-line h-4 w-3/4 rounded bg-text-placeholder/20"></div>
            <div class="moment-detail__skeleton-line h-4 w-1/2 rounded bg-text-placeholder/20"></div>
          </div>
          <div class="moment-detail__skeleton-image h-32 max-w-sm rounded-lg bg-text-placeholder/20"></div>
          <div class="moment-detail__skeleton-actions flex items-center gap-6 mt-4 pt-3 border-t border-border-lighter">
            <div class="moment-detail__skeleton-action h-5 w-10 rounded bg-text-placeholder/20"></div>
            <div class="moment-detail__skeleton-action h-5 w-10 rounded bg-text-placeholder/20"></div>
            <div class="moment-detail__skeleton-action h-5 w-10 rounded bg-text-placeholder/20"></div>
          </div>
        </div>
      </div>

      <template v-else>
        <EmptyState v-if="!detail" text="动态不存在或已被删除" />
        <div v-else class="moment-detail__main max-w-2xl mx-auto pt-6">
          <!-- 动态卡片 -->
          <MomentCard
            :item="detail as any"
            :show-more-actions="true"
            :inline-comment="false"
            :status="status"
            @avatar-click="openUserSpace(detail)"
            @thumb="handleThumb"
            @status-change="handleCardFavoriteChange"
            @report="handleReport"
            @remove="handleRemove"
            @comment="switchToComment"
          />

          <!-- 评论 / 赞与转发 tab（对标 B 站） -->
          <el-tabs
            v-model="activeTab"
            class="moment-detail__tabs mt-6"
            @tab-change="handleTabChange"
          >
            <!-- 评论 tab -->
            <el-tab-pane :label="`评论${commentCountLabel}`" name="comment">
              <section
                v-if="activeTab === 'comment' && commentMounted"
                class="moment-detail__comment bg-bg-overlay rounded-lg border border-border-light p-4"
              >
                <LotteryCommentSection
          :oid="detail.dynId_str ?? ''"
                  :type="InteractionBizTypeEnum.DYNAMIC"
                  :up-mid="detail.mid"
                  :focus-rpid="focusRpid"
                  @count-change="handleCommentCountChange"
                />
              </section>
            </el-tab-pane>

            <!-- 赞与转发 tab（内部再分「赞」「转发」两个子 tab，各自独立懒加载 + 分页，对标 B 站） -->
            <el-tab-pane label="赞与转发" name="repost">
              <section
                v-if="activeTab === 'repost'"
                class="moment-detail__repost bg-bg-overlay rounded-lg border border-border-light p-4"
              >
                <el-tabs
                  v-model="repostSubTab"
                  class="moment-detail__repost-tabs"
                  @tab-change="handleRepostSubTabChange"
                >
                  <el-tab-pane :label="`赞${likeCountLabel}`" name="like" />
                  <el-tab-pane :label="`转发${repostCountLabel}`" name="forward" />
                </el-tabs>

                <div class="moment-detail__repost-body mt-2">
                  <!-- 首次加载骨架（未请求过数据时展示） -->
                  <ul
                    v-if="activeSubList.loading && !activeSubList.loaded"
                    class="moment-detail__repost-skeleton-list m-0 p-0 list-none divide-y divide-border-light"
                  >
                    <li
                      v-for="n in 3"
                      :key="n"
                      class="moment-detail__repost-skeleton flex items-center gap-3 py-3 animate-pulse"
                    >
                      <div class="moment-detail__repost-skeleton-avatar h-10 w-10 shrink-0 rounded-full bg-text-placeholder/30"></div>
                      <div class="moment-detail__repost-skeleton-info flex-1 space-y-2">
                        <div class="moment-detail__repost-skeleton-line h-4 w-32 rounded bg-text-placeholder/30"></div>
                        <div class="moment-detail__repost-skeleton-line h-3 w-20 rounded bg-text-placeholder/20"></div>
                      </div>
                    </li>
                  </ul>

                  <ul
                    v-else-if="activeSubList.items.length"
                    class="moment-detail__repost-list m-0 p-0 list-none divide-y divide-border-light"
                  >
                    <li
                      v-for="entry in activeSubList.items"
                      :key="entry.key"
                      class="moment-detail__repost-item flex items-center gap-3 py-3"
                    >
                      <el-avatar
                        class="moment-detail__repost-avatar shrink-0 cursor-pointer"
                        :size="40"
                        :src="entry.face || BiliImg.face.noface"
                        @click="openUserSpace({ mid: entry.mid })"
                      />

                      <div class="moment-detail__repost-info flex-1 min-w-0">
                        <el-text class="moment-detail__repost-name block truncate text-sm font-bold text-text-primary">
                          {{ entry.uname || '未知用户' }}
                        </el-text>
                        <el-text
                          v-if="entry.text"
                          class="moment-detail__repost-text block text-sm text-text-primary whitespace-pre-line break-all mt-0.5"
                        >
                          {{ entry.text }}
                        </el-text>
                        <el-text class="moment-detail__repost-time block text-xs text-text-placeholder mt-1">
                          {{ formatRelativeTime(entry.time) }}
                        </el-text>
                      </div>
                    </li>
                  </ul>

                  <div v-else class="moment-detail__repost-empty py-8 text-center">
                    <el-text class="text-sm text-text-placeholder">
                      {{ repostSubTab === 'like' ? '还没有人赞过' : '还没有人转发过' }}
                    </el-text>
                  </div>

                  <!-- 分页加载更多 -->
                  <div v-if="activeSubHasMore" class="moment-detail__repost-more flex justify-center pt-3">
                    <el-button size="default" :loading="activeSubList.loading" @click="loadMoreSubList">
                      加载更多
                    </el-button>
                  </div>
                  <div
                    v-else-if="activeSubList.loaded && activeSubList.items.length"
                    class="moment-detail__repost-end text-center text-xs text-text-placeholder pt-3"
                  >
                    — 没有更多了 —
                  </div>
                </div>
              </section>
            </el-tab-pane>
          </el-tabs>
        </div>
      </template>
    </div>

    <!-- 右侧悬浮工具栏（随窗口滚动，对标 B 站） -->
    <aside
      v-if="detail"
      class="moment-detail__toolbar fixed right-8 top-1/2 -translate-y-1/2 z-50 flex flex-col items-center gap-2 rounded-full bg-bg-overlay shadow-lg border border-border-light px-2 py-4"
    >
      <!-- 点赞 -->
      <div class="moment-detail__toolbar-item flex flex-col items-center gap-0.5 cursor-pointer" @click="handleThumb(detail.dynId_str ?? '')">
        <BiliIcon name="like" size="w-[22px] h-[22px]" class="hover:text-primary" :class="{ 'text-msg-pink': isLiked }" />
        <span class="text-xs text-text-placeholder">{{ formatNum(statLikeCount) }}</span>
      </div>

      <!-- 收藏 -->
      <div
        class="moment-detail__toolbar-item flex flex-col items-center gap-0.5 cursor-pointer"
        :class="{ 'text-warning': isFavorited }"
        :aria-pressed="isFavorited"
        @click="showFavoriteDialog = true"
      >
        <BiliIcon name="favorite" size="w-[22px] h-[22px]" class="hover:text-primary" />
        <span class="text-xs text-text-placeholder">{{ formatNum(statFavoriteCount) }}</span>
      </div>

      <!-- 转发 -->
      <div class="moment-detail__toolbar-item flex flex-col items-center gap-0.5 cursor-pointer" @click="showRepostDialog = true">
        <BiliIcon name="forward" size="w-[22px] h-[22px]" class="hover:text-primary" />
        <span class="text-xs text-text-placeholder">{{ formatNum(statRepostCount) }}</span>
      </div>

      <!-- 评论 -->
      <div class="moment-detail__toolbar-item flex flex-col items-center gap-0.5 cursor-pointer" @click="switchToComment">
        <BiliIcon name="comment" size="w-[22px] h-[22px]" class="hover:text-primary" />
        <span class="text-xs text-text-placeholder">{{ formatNum(statCommentCount) }}</span>
      </div>

      <!-- 浏览（仅展示 stat.viewCount，不可点击） -->
      <div class="moment-detail__toolbar-item flex flex-col items-center gap-0.5 select-none">
        <el-icon :size="22" class="text-text-placeholder"><View /></el-icon>
        <span class="text-xs text-text-placeholder">{{ formatNum(statViewCount) }}</span>
      </div>
    </aside>

    <!-- 转发弹窗：复用统一动态编辑器（转发模式） -->
    <MomentPublishForm
      v-model:visible="showRepostDialog"
      is-repost
      :src-dyn-id="momentId"
      :src-author-name="detailAuthor?.uname ?? undefined"
      :src-author-face="detailAuthor?.face ?? undefined"
      :src-summary="detailDescText"
      @success="handleRepostSuccess"
    />

    <!-- 收藏夹选择弹窗 -->
    <MomentFavoriteDialog
      v-model="showFavoriteDialog"
      :dyn-id="String(momentId)"
      @changed="handleFavoriteChanged"
    />

    <!-- 统一举报弹窗 -->
    <ReportDialog v-model="reportDialogVisible" :biz-type="InteractionBizTypeEnum.DYNAMIC" :biz-id="reportDynId" />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { View } from '@element-plus/icons-vue'
import BiliIcon from '@/components/CommonCompo/BiliIcon.vue'
import {
  fetchMomentDetail,
  fetchInteractionStatusOne,
  InteractionBizTypeEnum,
  thumbMoment,
  fetchMomentLikers,
  fetchMomentForwards,
} from '@/api/notify/moment-api'
import type {
  InteractionStatusItem,
  MomentDetailResp,
  MomentFeedItem,
} from '@/api/notify/moment-api'
import EmptyState from '@/components/message/EmptyState.vue'
import LotteryCommentSection from '@/components/lottery_data/LotteryCommentSection.vue'
import MomentCard from '@/components/moment/MomentCard.vue'
import MomentPublishForm from '@/components/moment/MomentPublishForm.vue'
import MomentFavoriteDialog from '@/components/moment/MomentFavoriteDialog.vue'
import ReportDialog from '@/components/moment/ReportDialog.vue'
import { BiliImg } from '@/assets/img/BiliImg'
import { usePageSeo } from '@/composables/usePageSeo.ts'
import { useInteractionMachine } from '@/composables/useInteractionMachine'
import type { FavoriteChangedPayload } from '@/utils/interaction/favoriteSync'
import biliMessage from '@/utils/message'
import { SITE_URL } from '@/config/seo.ts'
// 2.58.0：相对时间抽到公共工具（原先是本页私有函数，个人空间主页也要用）
import { formatRelativeTime } from '@/utils/dateFormat.ts'

defineOptions({ name: 'MomentDetailView' })

const route = useRoute()
const router = useRouter()
// 动态 ID 为 19 位雪花 ID，超出 JS Number 安全范围，必须全程以字符串传递，否则精度丢失
const momentId = String(route.params.momentId)
// 定位直达的评论 rpid（来自互动通知跳转 query），传给评论区滚动定位
const focusRpid = computed(() => String(route.query.rpid ?? '') || null)

const detail = ref<MomentDetailResp | null>(null)
const loading = ref(false)

/** 当前激活的 tab：comment（评论）/ repost（赞与转发） */
const activeTab = ref<'comment' | 'repost'>('comment')
/** 评论 tab 是否已挂载过（懒加载评论区组件） */
const commentMounted = ref(false)
/** 「赞与转发」下的子 tab：like（赞）/ forward（转发） */
const repostSubTab = ref<SubListKind>('like')

/** 转发弹窗显隐 */
const showRepostDialog = ref(false)
/** 收藏夹选择弹窗显隐 */
const showFavoriteDialog = ref(false)

/**
 * 点赞明细 / 转发列表（GET /api/v1/moment/{id}/likers 与 /forwards）
 * 两个子列表相互独立：各自维护「是否已加载 / 分页游标 / 总数」，
 * 只有在用户切到对应子 tab 时才发起首次请求（懒加载）。
 */
type SubListKind = 'like' | 'forward'

/** 统一条目结构，便于「赞」「转发」两个子列表共用一套渲染 */
interface SubListEntry {
  key: string
  kind: SubListKind
  mid: number
  uname?: string | null
  face?: string | null
  /** 转发语（点赞列表为空） */
  text?: string | null
  time?: string | null
}

interface SubListState {
  items: SubListEntry[]
  total: number
  pageNum: number
  loading: boolean
  /** 是否已成功请求过（懒加载开关，避免重复请求） */
  loaded: boolean
  /** 是否已被取空（本次返回不足一页，说明没有下一页了） */
  exhausted: boolean
}

/** 子列表单页条数（后端上限 50） */
const SUB_LIST_PAGE_SIZE = 20

function createSubListState(): SubListState {
  return { items: [], total: 0, pageNum: 0, loading: false, loaded: false, exhausted: false }
}

const subLists = reactive<Record<SubListKind, SubListState>>({
  like: createSubListState(),
  forward: createSubListState(),
})

/** 当前子 tab 对应的列表状态 */
const activeSubList = computed(() => subLists[repostSubTab.value])
/** 当前子列表是否还有下一页（总数 + 末页双重判定，避免总数与明细不一致时空翻页） */
const activeSubHasMore = computed(() => {
  const s = activeSubList.value
  return s.loaded && !s.exhausted && s.items.length < s.total
})

// 互动状态（2.41.0：详情不返回 stat，统一走 /interaction/status 查询）
// 点赞 / 收藏各自跑一台状态机（见 utils/interaction/interactionMachine.ts），
// 状态机是唯一可写入口，status 对象只作为「向子组件透传」的展示载体。
const status = ref<InteractionStatusItem | null>(null)

/** 点赞状态机（active=我是否已赞，count=赞数） */
const likeMachine = useInteractionMachine()
/** 收藏状态机（active=我是否已收藏，count=收藏数） */
const favMachine = useInteractionMachine()

/** 把状态机的最新值回写到 status（保持子组件 / 计数展示与状态机一致） */
function syncStatusFromMachines() {
  if (!status.value) return
  status.value.isLike = likeMachine.active.value
  status.value.likeCount = likeMachine.count.value
  status.value.isFavorite = favMachine.active.value
  status.value.favoriteCount = favMachine.count.value
}

async function loadStatus(id: string = momentId) {
  likeMachine.syncStart()
  favMachine.syncStart()
  try {
    const item = await fetchInteractionStatusOne(InteractionBizTypeEnum.DYNAMIC, id)
    if (!item) {
      likeMachine.syncFail()
      favMachine.syncFail()
      return
    }
    status.value = item
    likeMachine.sync(Boolean(item.isLike), item.likeCount ?? 0)
    favMachine.sync(Boolean(item.isFavorite), item.favoriteCount ?? 0)
    syncStatusFromMachines()
  } catch {
    likeMachine.syncFail()
    favMachine.syncFail()
  }
}

/** 评论 tab 标签后缀（如「评论 12」）；无评论时不带数字 */
const commentCountLabel = computed(() => {
  const n = status.value?.commentCount
  return n ? ` ${n}` : ''
})

/** 子 tab 标签后缀：「赞 12」/「转发 3」；为 0 时不带数字 */
const likeCountLabel = computed(() => (statLikeCount.value ? ` ${statLikeCount.value}` : ''))
const repostCountLabel = computed(() => (statRepostCount.value ? ` ${statRepostCount.value}` : ''))

/** 悬浮工具栏统计（来自统一 status 接口 + 点赞/收藏状态机） */
const statLikeCount = computed(() => likeMachine.count.value)
const statCommentCount = computed(() => status.value?.commentCount || 0)
const statRepostCount = computed(() => status.value?.repostCount || 0)
const statViewCount = computed(() => status.value?.viewCount || 0)
const statFavoriteCount = computed(() => favMachine.count.value)

/** 当前用户是否已赞（点赞状态机） */
const isLiked = computed(() => likeMachine.active.value)
/** 当前用户是否已收藏（收藏状态机；激活态用颜色区分，仓库暂无 favorite_active.svg） */
const isFavorited = computed(() => favMachine.active.value)

/** 详情页作者 / 正文摘要（转发弹窗用） */
const detailAuthor = computed(() =>
  detail.value?.modules?.find((m) => m.moduleType === 'author')
)
const detailDescText = computed(() =>
  detail.value?.modules?.find((m) => m.moduleType === 'desc')?.text || ''
)

// ============ 页面级 SEO：用动态正文覆盖分享卡片与搜索结果 ============
usePageSeo(() => {
  if (!detail.value) return null
  const authorName =
    (detailAuthor.value as unknown as { uname?: string } | undefined)?.uname?.trim() || 'B站用户'
  const text = detailDescText.value.replace(/\s+/g, ' ').trim()
  const url = `${SITE_URL}/app/moment-detail/${momentId}`
  return {
    title: `${authorName}的动态`,
    description: text
      ? `${authorName}的动态：${text.slice(0, 110)}`
      : `${authorName} 在B站发布的动态，查看正文、图片与评论区互动。`,
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'SocialMediaPosting',
      headline: `${authorName}的动态`,
      articleSection: 'B站动态',
      inLanguage: 'zh-CN',
      url,
      author: { '@type': 'Person', name: authorName }
    }
  }
})

function formatNum(n?: number) {
  if (!n) return '0'
  if (n >= 10000) return `${(n / 10000).toFixed(1)}万`
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`
  return String(n)
}

onMounted(async () => {
  loading.value = true
  detail.value = await fetchMomentDetail(momentId)
  loading.value = false
  if (detail.value) {
    await loadStatus()
    // 默认激活「评论」tab：首次进入即挂载评论区（否则 commentMounted 恒为 false，
    // 且初始 tab 已是 comment 不会触发 tab-change 事件，评论区永不渲染）
    commentMounted.value = true
    // 注：「赞与转发」的两个子列表不在首屏请求，等用户切到对应子 tab 时再懒加载
  }
})

// 同组件内切换不同 momentId 时重新加载
watch(
  () => route.params.momentId,
  async (newId) => {
    if (!newId) return
    loading.value = true
    detail.value = null
    status.value = null
    // 切换资源：复位两台状态机，避免上一条动态的赞/收藏态闪回
    likeMachine.reset()
    favMachine.reset()
    resetSubLists()
    activeTab.value = 'comment'
    detail.value = await fetchMomentDetail(String(newId))
    loading.value = false
    if (detail.value) {
      await loadStatus(String(newId))
      commentMounted.value = true
    }
  }
)

/** 重置赞 / 转发两个子列表（切换动态后重新回到未加载状态，等待用户切 tab 再请求） */
function resetSubLists() {
  subLists.like = createSubListState()
  subLists.forward = createSubListState()
  repostSubTab.value = 'like'
}

/**
 * 加载单个子列表（GET /moment/{id}/likers 或 /forwards）
 * - reset=true：从第 1 页重新拉取（首次加载 / 切换动态 / 数据变更后刷新）
 * - reset=false：追加下一页（加载更多）
 */
async function loadSubList(kind: SubListKind, id: string = momentId, reset = true) {
  const state = subLists[kind]
  if (state.loading) return
  const nextPage = reset ? 1 : state.pageNum + 1
  state.loading = true
  try {
    let rows: SubListEntry[]
    let total: number
    if (kind === 'like') {
      const resp = await fetchMomentLikers(id, {
        page_num: nextPage,
        page_size: SUB_LIST_PAGE_SIZE,
      })
      rows = (resp.items || []).map((it) => ({
        key: `like-${it.mid}`,
        kind: 'like' as const,
        mid: it.mid,
        uname: it.uname,
        face: it.face,
        text: '',
        time: it.like_time,
      }))
      total = resp.total ?? state.total
    } else {
      const resp = await fetchMomentForwards(id, {
        page_num: nextPage,
        page_size: SUB_LIST_PAGE_SIZE,
      })
      rows = (resp.items || []).map((it) => ({
        key: `forward-${it.dynId}`,
        kind: 'forward' as const,
        mid: it.mid,
        uname: it.uname,
        face: it.face,
        text: it.text,
        time: it.pubTime,
      }))
      total = resp.total ?? state.total
    }
    state.items = reset ? rows : [...state.items, ...rows]
    state.total = total
    state.pageNum = nextPage
    state.exhausted = rows.length < SUB_LIST_PAGE_SIZE
    state.loaded = true
  } catch {
    // 请求失败也标记为已加载，避免一直转圈
    state.loaded = true
  } finally {
    state.loading = false
  }
}

/** 懒加载入口：只有该子列表从未加载过时才发请求 */
function ensureSubListLoaded(kind: SubListKind, id: string = momentId) {
  if (subLists[kind].loaded) return
  void loadSubList(kind, id, true)
}

/** 当前子列表「加载更多」 */
function loadMoreSubList() {
  void loadSubList(repostSubTab.value, momentId, false)
}

/** 相对时间格式化（对标 B 站：刚刚 / N分钟前 / N小时前 / 昨天 / 日期） */
function openUserSpace(item: { mid?: number | null }) {
  if (item.mid) {
    router.push({ name: 'MOMENT_USER_SPACE_HOME', params: { mid: String(item.mid) } })
  }
}

/** 点赞：走状态机乐观更新，失败自动回滚 */
async function handleThumb(dynId_str: string) {
  if (!detail.value) return
  if (!likeMachine.toggle()) return // 阶段不允许（如上一请求在途），忽略本次点击
  syncStatusFromMachines()
  const up = likeMachine.active.value ? 1 : 2
  try {
    const res = await thumbMoment(dynId_str, up)
    if (!res) {
      likeMachine.toggleFail('点赞失败')
      syncStatusFromMachines()
      return
    }
    likeMachine.toggleOk(res.likeCount, res.isLike)
    syncStatusFromMachines()
    // 赞列表已加载过则刷新（让自己的赞即时出现/消失），未加载过保持懒加载
    if (subLists.like.loaded) void loadSubList('like', momentId, true)
  } catch {
    likeMachine.toggleFail('点赞失败')
    syncStatusFromMachines()
    biliMessage.error('操作失败，请稍后重试')
  }
}

/** 统一举报弹窗（P11-T6） */
const reportDialogVisible = ref(false)
const reportDynId = ref<string>('')

function handleReport(dynId_str: string) {
  reportDynId.value = dynId_str // str 直接传递，避免雪花 ID 精度丢失
  reportDialogVisible.value = true
}

/** 2.22.1：删除确认与 API 已下沉 MomentCard，删除成功提示由 MomentCard 统一弹出（避免重复提示），详情页仅返回上一页 */
function handleRemove(_dynIdStr: string) {
  if (window.history.length > 1) {
    router.back()
  } else {
    router.push({ name: 'MOMENT' })
  }
}

/** 点击卡片/悬浮栏评论按钮：切换到评论 tab（并懒加载评论区） */
function switchToComment() {
  commentMounted.value = true
  activeTab.value = 'comment'
}

/** 主 tab 切换：切到评论时挂载评论区；切到赞与转发时懒加载当前子 tab 列表 */
function handleTabChange(name: string | number) {
  if (name === 'comment') commentMounted.value = true
  if (name === 'repost') ensureSubListLoaded(repostSubTab.value)
}

/** 子 tab 切换（赞 / 转发）：仅首次切到该子 tab 时才请求（懒加载） */
function handleRepostSubTabChange(name: string | number) {
  ensureSubListLoaded(name as SubListKind)
}

/** 评论区总数变化：联动更新统一 status 的 commentCount 与评论 tab 标签 */
function handleCommentCountChange(count: number) {
  if (status.value) status.value.commentCount = count
}

/** 转发成功：乐观更新转发数 */
function handleRepostSuccess() {
  if (status.value) status.value.repostCount = (status.value.repostCount || 0) + 1
  // 转发列表已加载过则刷新，未加载过保持懒加载
  if (subLists.forward.loaded) void loadSubList('forward', momentId, true)
}

/**
 * 收藏变更（悬浮工具栏弹窗触发）：弹窗已带回最新收藏态，直接写状态机，
 * 无需整页重查互动态接口——这正是此前「取消收藏后按钮不刷新」的根因。
 */
function handleFavoriteChanged(payload: FavoriteChangedPayload) {
  applyFavoritePayload(payload)
}

/** 卡片内 MomentCard 的收藏夹弹窗变更：与悬浮工具栏走同一套同步逻辑 */
function handleCardFavoriteChange(_dynId_str: string, payload: FavoriteChangedPayload) {
  applyFavoritePayload(payload)
}

/** 把弹窗上抛的收藏态写入收藏状态机，并回写 status 供卡片内按钮同步高亮 */
function applyFavoritePayload(payload: FavoriteChangedPayload) {
  favMachine.apply(payload.isFavorite, payload.favoriteCount)
  syncStatusFromMachines()
}
</script>
