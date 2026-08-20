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
            @avatar-click="openUserSpace(detail)"
            @thumb="handleThumb"
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
                  :oid="detail.dynIdStr"
                  :type="COMMENT_TYPE.DYNAMIC"
                  :up-mid="detail.mid"
                  :focus-rpid="focusRpid"
                  @count-change="handleCommentCountChange"
                />
              </section>
            </el-tab-pane>

            <!-- 赞与转发 tab（混合列表，按时间倒序，对标 B 站） -->
            <el-tab-pane :label="`赞与转发`" name="repost">
              <section
                v-if="activeTab === 'repost' && repostMounted"
                class="moment-detail__repost bg-bg-overlay rounded-lg border border-border-light p-4"
              >
                <ul class="moment-detail__repost-list m-0 p-0 list-none divide-y divide-border-light">
                  <li
                    v-for="entry in repostEntries"
                    :key="entry.key"
                    class="moment-detail__repost-item flex items-center gap-3 py-3"
                  >
                    <!-- 类型图标 -->
                    <div
                      class="moment-detail__repost-icon shrink-0 flex items-center justify-center w-8 h-8 rounded-full"
                      :class="entry.kind === 'like' ? 'bg-primary-light-3 text-primary' : 'bg-bg-page text-text-placeholder'"
                    >
                      <el-icon :size="16">
                        <LikeIcon v-if="entry.kind === 'like'" />
                        <ForwardIcon v-else />
                      </el-icon>
                    </div>

                    <el-avatar
                      class="moment-detail__repost-avatar shrink-0 cursor-pointer"
                      :size="40"
                      :src="entry.face || BiliImg.face.noface"
                      @click="openUserSpace({ mid: entry.mid })"
                    />

                    <div class="moment-detail__repost-info flex-1 min-w-0">
                      <el-text class="block truncate text-sm font-bold text-text-primary">
                        {{ entry.uname || '未知用户' }}
                        <el-text class="ml-1 text-xs text-text-placeholder">
                          {{ entry.kind === 'like' ? '赞了这条动态' : '转发了这条动态' }}
                        </el-text>
                      </el-text>
                      <el-text
                        v-if="entry.kind === 'forward' && entry.text"
                        class="block text-sm text-text-placeholder whitespace-pre-line break-all"
                      >
                        {{ entry.text }}
                      </el-text>
                      <el-text class="block text-xs text-text-placeholder mt-1">
                        {{ formatRelativeTime(entry.time) }}
                      </el-text>
                    </div>
                  </li>

                  <li v-if="!repostEntries.length" class="py-8 text-center">
                    <el-text class="text-sm text-text-placeholder">还没有人赞过或转发过</el-text>
                  </li>
                </ul>
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
      <div class="moment-detail__toolbar-item flex flex-col items-center gap-0.5 cursor-pointer" @click="handleThumb(detail.dynIdStr)">
        <el-icon :size="22" class="hover:text-primary" :class="{ 'text-primary': isLiked }">
          <LikeIcon />
        </el-icon>
        <span class="text-xs text-text-placeholder">{{ formatNum(statLikeCount) }}</span>
      </div>

      <!-- 收藏 -->
      <div class="moment-detail__toolbar-item flex flex-col items-center gap-0.5 cursor-pointer" @click="showFavoriteDialog = true">
        <el-icon :size="22" class="hover:text-primary"><FavoriteIcon /></el-icon>
        <span class="text-xs text-text-placeholder">{{ formatNum(statFavoriteCount) }}</span>
      </div>

      <!-- 转发 -->
      <div class="moment-detail__toolbar-item flex flex-col items-center gap-0.5 cursor-pointer" @click="showRepostDialog = true">
        <el-icon :size="22" class="hover:text-primary"><ForwardIcon /></el-icon>
        <span class="text-xs text-text-placeholder">{{ formatNum(statRepostCount) }}</span>
      </div>

      <!-- 评论 -->
      <div class="moment-detail__toolbar-item flex flex-col items-center gap-0.5 cursor-pointer" @click="switchToComment">
        <el-icon :size="22" class="hover:text-primary"><CommentIcon /></el-icon>
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
      :src-author-name="detailAuthor?.uname"
      :src-author-face="detailAuthor?.face"
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
    <ReportDialog v-model="reportDialogVisible" biz-type="dynamic" :biz-id="reportDynId" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { View } from '@element-plus/icons-vue'
import LikeIcon from '@/assets/svgs/dynamic/detail/side_toolbar/like.svg?component'
import FavoriteIcon from '@/assets/svgs/dynamic/detail/side_toolbar/favorite.svg?component'
import ForwardIcon from '@/assets/svgs/dynamic/detail/side_toolbar/forward.svg?component'
import CommentIcon from '@/assets/svgs/dynamic/detail/side_toolbar/comment.svg?component'
import {
  fetchMomentDetail,
  thumbMoment,
  fetchMomentLikers,
  fetchMomentForwards,
} from '@/api/notify/moment-api'
import type {
  MomentDetailResp,
  MomentFeedItem,
  MomentLikerListResp,
  MomentForwardListResp,
} from '@/api/notify/moment-api'
import { COMMENT_TYPE } from '@/api/lottery_comment'
import EmptyState from '@/components/message/EmptyState.vue'
import LotteryCommentSection from '@/components/lottery_data/LotteryCommentSection.vue'
import MomentCard from '@/components/moment/MomentCard.vue'
import MomentPublishForm from '@/components/moment/MomentPublishForm.vue'
import MomentFavoriteDialog from '@/components/moment/MomentFavoriteDialog.vue'
import ReportDialog from '@/components/moment/ReportDialog.vue'
import { BiliImg } from '@/assets/img/BiliImg'

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
/** 赞与转发 tab 是否已挂载过 */
const repostMounted = ref(false)

/** 转发弹窗显隐 */
const showRepostDialog = ref(false)
/** 收藏夹选择弹窗显隐 */
const showFavoriteDialog = ref(false)

/**
 * 点赞明细 / 转发列表（GET /api/v1/moment/{id}/likers 与 /forwards）
 */
const likers = ref<MomentLikerListResp['items']>([])
const forwards = ref<MomentForwardListResp['items']>([])

/** 评论 tab 标签后缀（如「评论 12」）；无评论时不带数字 */
const commentCountLabel = computed(() => {
  const n = detail.value?.stat?.commentCount
  return n ? ` ${n}` : ''
})

/** 悬浮工具栏统计 */
const statLikeCount = computed(() => detail.value?.stat?.likeCount || 0)
const statCommentCount = computed(() => detail.value?.stat?.commentCount || 0)
const statRepostCount = computed(() => detail.value?.stat?.repostCount || 0)
const statViewCount = computed(() => detail.value?.stat?.viewCount || 0)
const statFavoriteCount = computed(() => detail.value?.stat?.favoriteCount || 0)

/** 当前用户是否已赞（interaction 模块 isLike） */
const isLiked = computed(() =>
  Boolean(detail.value?.modules?.find((m) => m.moduleType === 'interaction')?.isLike)
)

/** 详情页作者 / 正文摘要（转发弹窗用） */
const detailAuthor = computed(() =>
  detail.value?.modules?.find((m) => m.moduleType === 'author')
)
const detailDescText = computed(() =>
  detail.value?.modules?.find((m) => m.moduleType === 'desc')?.text || ''
)

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
    await loadRepostData()
    // 默认激活「评论」tab：首次进入即挂载评论区（否则 commentMounted 恒为 false，
    // 且初始 tab 已是 comment 不会触发 tab-change 事件，评论区永不渲染）
    commentMounted.value = true
  }
})

// 同组件内切换不同 momentId 时重新加载
watch(
  () => route.params.momentId,
  async (newId) => {
    if (!newId) return
    loading.value = true
    detail.value = null
    likers.value = []
    forwards.value = []
    activeTab.value = 'comment'
    detail.value = await fetchMomentDetail(String(newId))
    loading.value = false
    if (detail.value) {
      await loadRepostData()
      commentMounted.value = true
    }
  }
)

/** 加载赞 / 转发数据（GET /moment/{id}/likers 与 /forwards） */
async function loadRepostData() {
  const [likerResp, forwardResp] = await Promise.all([
    fetchMomentLikers(momentId, { page_num: 1, page_size: 50 }),
    fetchMomentForwards(momentId, { page_num: 1, page_size: 50 }),
  ])
  likers.value = likerResp.items || []
  forwards.value = forwardResp.items || []
}

/** 赞与转发混合列表（对标 B 站）：赞 + 转发按时间倒序合并，带类型标识 */
const repostEntries = computed(() => {
  const likeEntries = likers.value.map((it) => ({
    key: `like-${it.mid}`,
    kind: 'like' as const,
    mid: it.mid,
    uname: it.uname,
    face: it.face,
    text: '',
    time: it.like_time,
  }))
  const forwardEntries = forwards.value.map((it) => ({
    key: `forward-${it.dynId}`,
    kind: 'forward' as const,
    mid: it.mid,
    uname: it.uname,
    face: it.face,
    text: it.text,
    time: it.pubTime,
  }))
  return [...likeEntries, ...forwardEntries]
    .filter((e) => e.time)
    .sort((a, b) => new Date(b.time!).getTime() - new Date(a.time!).getTime())
})

/** 相对时间格式化（对标 B 站：刚刚 / N分钟前 / N小时前 / 昨天 / 日期） */
function formatRelativeTime(t?: string | null) {
  if (!t) return ''
  const ts = new Date(t).getTime()
  if (Number.isNaN(ts)) return ''
  const diff = Date.now() - ts
  const minute = 60 * 1000
  const hour = 60 * minute
  const day = 24 * hour
  if (diff < minute) return '刚刚'
  if (diff < hour) return `${Math.floor(diff / minute)}分钟前`
  if (diff < day) return `${Math.floor(diff / hour)}小时前`
  if (diff < 2 * day) return '昨天'
  const d = new Date(ts)
  const now = new Date()
  if (d.getFullYear() === now.getFullYear()) {
    return `${d.getMonth() + 1}月${d.getDate()}日`
  }
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`
}

function openUserSpace(item: { mid?: number | null }) {
  if (item.mid) {
    router.push({ name: 'MOMENT_USER_SPACE', params: { mid: String(item.mid) } })
  }
}

async function handleThumb(dynIdStr: string) {
  if (!detail.value) return
  const up = isLiked.value ? 2 : 1
  const res = await thumbMoment(dynIdStr, up)
  if (res) {
    const interMod = detail.value.modules?.find((m) => m.moduleType === 'interaction')
    if (interMod) interMod.isLike = up === 1
    if (detail.value.stat) {
      detail.value.stat.likeCount = Math.max(0, (detail.value.stat.likeCount || 0) + (up === 1 ? 1 : -1))
    }
    // 已赞时从 likers 列表加入当前用户（简化）
    if (up === 1 && likers.value) {
      // TODO：接入真实接口后重新拉取或本地乐观更新
    }
  }
}

/** 统一举报弹窗（P11-T6） */
const reportDialogVisible = ref(false)
const reportDynId = ref<number>(0)

function handleReport(dynIdStr: string) {
  reportDynId.value = Number(dynIdStr)
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

/** tab 切换：切到评论/赞与转发时懒加载 */
function handleTabChange(name: string | number) {
  if (name === 'comment') commentMounted.value = true
  if (name === 'repost') {
    repostMounted.value = true
  }
}

/** 评论区总数变化：联动更新动态卡片的 commentCount 与评论 tab 标签 */
function handleCommentCountChange(count: number) {
  if (detail.value) {
    detail.value.stat = { ...(detail.value.stat || {}), commentCount: count }
  }
}

/** 转发成功：乐观更新转发数 */
function handleRepostSuccess() {
  if (detail.value?.stat) {
    detail.value.stat.repostCount = (detail.value.stat.repostCount || 0) + 1
  }
}

/** 收藏变更：刷新详情以更新收藏数 */
async function handleFavoriteChanged() {
  try {
    const fresh = await fetchMomentDetail(momentId)
    if (fresh?.stat) {
      detail.value = { ...detail.value, stat: fresh.stat }
    }
  } catch {
    // 忽略刷新失败，不打断用户操作
  }
}
</script>
