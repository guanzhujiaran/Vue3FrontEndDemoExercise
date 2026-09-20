<script setup lang="ts">
import { inject, ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { Pointer, ChatDotRound, Delete, Bottom, ArrowDown } from '@element-plus/icons-vue'
import MoreIcon from '@/assets/svgs/more.svg?component'
import { LINK_REL, LINK_REFERRER_POLICY } from '@/utils/PageOpen/linkPolicy'
import type { CommentItem } from '@/api/lottery_comment.ts'
import { CommentHandlersKey, ResourceAuditStatusEnum } from '@/api/lottery_comment.ts'
import { BiliImg } from '@/assets/img/BiliImg.ts'
import { blockUser, InteractionBizTypeEnum } from '@/api/notify/moment-api'
import ReportDialog from '@/components/moment/ReportDialog.vue'
import LotteryCommentMention from '@/components/lottery_data/LotteryCommentMention.vue'
import UserBriefCell from '@/components/message/UserBriefCell.vue'
import biliMessage from '@/utils/message'

const props = defineProps<{
  item: CommentItem
  upMid?: number | string
  currentMid?: number | string
  depth?: number
  /** 是否为「定位直达」目标评论，命中时高亮（由父级在一级评论层直接指定） */
  focused?: boolean
  /** 需要定位的评论 rpid，递归下发用于子评论高亮比对 */
  focusedRpid?: string | null
}>()

const handlers = inject(CommentHandlersKey)!

// 子评论被删除后通知父级（持有 subItems 的组件）从楼中楼列表同步移除
const emit = defineEmits<{ (e: 'deleted', rpid: string): void }>()

const showReply = ref(false)
const replyContent = ref('')
const subLoading = ref(false)
/** 楼中楼分页：subItems 渲染当前页；subCurrentPage 当前页码；subTotal 总数；subPageSize 每页条数 */
const subItems = ref<CommentItem[]>([])
const subExpanded = ref(false)
const subCurrentPage = ref(1)
const subTotal = ref(0)
const subPageSize = 10

const isOwn = computed(
  () => !!props.currentMid && String(props.currentMid) === String(props.item.mid)
)
const isUp = computed(
  () => !!props.upMid && String(props.upMid) === String(props.item.mid)
)

/**
 * 是否为一级评论（只有一级评论有楼中楼；楼中楼恒两层，不再向下嵌套入口）。
 * `root` 后端为字符串 `"0"`，这里用 `String()` 归一，避免 number/string 差异导致入口消失。
 */
const isRootComment = computed(() => String(props.item.root ?? '0') === '0')

/** 折叠态预览：复用后端已返回的 `replies`（`comment_sub_preview_count` 条），展开态改由分页列表渲染 */
const previewReplies = computed<CommentItem[]>(() => {
  if (!isRootComment.value || subExpanded.value) return []
  return (props.item.replies ?? []) as CommentItem[]
})

/** 子回复总数（入口文案展示）：rcount 缺失时用预览条数兜底 */
const subCountDisplay = computed(() =>
  Math.max(Number(props.item.rcount) || 0, previewReplies.value.length)
)

/**
 * 是否展示「共 N 条回复，点击查看」入口：
 * 预览未覆盖全部回复时展示；`rcount` 缺失（0）但已有预览的异常数据也展示，避免无法查看更多。
 */
const hasMoreSub = computed(() => {
  if (!isRootComment.value) return false
  const total = Number(props.item.rcount) || 0
  if (total > previewReplies.value.length) return true
  return total === 0 && previewReplies.value.length > 0
})

// SDK 重新生成后 CommentUserBrief / reply_to 为松散索引类型（[key: string]: unknown），
// 模板取值统一经此收窄，避免 {} 直接赋给 string / number
const member = computed(
  () => props.item.member as Record<string, unknown> | null | undefined
)
const memberAvatar = computed(() =>
  typeof member.value?.avatar === 'string' ? member.value.avatar : ''
)
const memberUname = computed(() =>
  typeof member.value?.uname === 'string' ? member.value.uname : ''
)
const memberLevel = computed(() =>
  typeof member.value?.level === 'number' ? member.value.level : null
)
const replyToMid = computed(() => {
  const r = props.item.reply_to as Record<string, unknown> | null | undefined
  const mid = r?.mid
  return typeof mid === 'string' || typeof mid === 'number' ? mid : undefined
})
/** 总页数：至少 1 页，避免 0 页导致分页器无页码可点 */
const subTotalPages = computed(() => Math.max(1, Math.ceil(subTotal.value / subPageSize)))

/** 把正文按 @昵称 / #话题# 拆成可渲染分段（文本 / @链接 / 话题链接） */
const renderedSegments = computed(() => {
  const msg = props.item.message || ''
  const atMap = props.item.at_name_to_mid || {}
  const topicMap = props.item.topics_meta || {}
  const segments: Array<{ text: string; kind: 'text' | 'at' | 'topic'; mid?: string; uri?: string }> = []
  const re = /(@[^\s@#]+|#[^#\n]+#)/g
  let last = 0
  let m: RegExpExecArray | null
  while ((m = re.exec(msg)) !== null) {
    if (m.index > last) {
      segments.push({ text: msg.slice(last, m.index), kind: 'text' })
    }
    const token = m[0]
    if (token.startsWith('@')) {
      const name = token.slice(1)
      const mid = atMap[name] != null ? String(atMap[name]) : undefined
      segments.push({ text: token, kind: 'at', mid })
    } else if (token.startsWith('#') && token.endsWith('#')) {
      const name = token.slice(1, -1)
      const meta = topicMap[name]
      const uri = meta?.uri ? String(meta.uri) : undefined
      segments.push({ text: token, kind: 'topic', uri })
    } else {
      segments.push({ text: token, kind: 'text' })
    }
    last = m.index + token.length
  }
  if (last < msg.length) {
    segments.push({ text: msg.slice(last), kind: 'text' })
  }
  return segments
})

const formatTime = (t: string) => {
  const d = new Date(t)
  if (isNaN(d.getTime())) return t
  return d.toLocaleString('zh-Cn', { hour12: false })
}

const onLike = () => {
  handlers.like({ rpid: props.item.rpid, nextAction: props.item.action === 1 ? 0 : 1 })
}
const onHate = () => {
  handlers.like({ rpid: props.item.rpid, nextAction: props.item.action === 2 ? 0 : 2 })
}
const router = useRouter()

const onDelete = async () => {
  // Section 的 del 内部会先弹确认框；仅当后端删除成功才通知父级同步移除
  const res = await handlers.del(props.item.rpid)
  if (res?.success) emit('deleted', String(props.item.rpid))
}

/** 点击头像 / 用户名跳转用户空间 */
function goUserSpace() {
  if (props.item.mid) {
    router.push({ name: 'MOMENT_USER_SPACE', params: { mid: String(props.item.mid) } })
  }
}

/** 复制评论链接（带锚点）到剪贴板 */
async function onCopyLink() {
  const url = `${window.location.origin}${window.location.pathname}#comment-${props.item.rpid}`
  try {
    await navigator.clipboard.writeText(url)
    biliMessage.success('链接已复制')
  } catch {
    biliMessage.error('复制失败，请手动复制')
  }
}

/** 加入黑名单（拉黑评论作者）：成功提示由调用方预设，失败提示由后端响应驱动（统一 businessHandler 处理） */
function onBlock() {
  blockUser(props.item.mid, {
    showSuccessToast: true,
    successMessage: '已加入黑名单',
  })
}

/** 统一举报弹窗（P11-T6） */
const reportDialogVisible = ref(false)
const reportCommentRpid = ref<string>('')

/** 举报评论：打开统一举报弹窗（bizType=comment，bizId=rpid str 直接传递） */
function onReport() {
  if (!props.item?.rpid) return
  reportCommentRpid.value = props.item.rpid
  reportDialogVisible.value = true
}

/** 回复输入框引用：复用主评论框同一套 @ 提及组件 */
const replyMentionRef = ref<InstanceType<typeof LotteryCommentMention> | null>(null)

const submitReply = async () => {
  const msg = replyContent.value.trim()
  if (!msg) return
  const root = String(props.item.root ?? '0') === '0' ? props.item.rpid : (props.item.root || props.item.rpid)
  const atMap = replyMentionRef.value?.buildAtNameToMid(msg) || {}
  await handlers.reply({
    root,
    parent: props.item.rpid,
    message: msg,
    atNameToMid: Object.keys(atMap).length ? atMap : undefined,
    // 被回复者即当前评论作者，直接传入可保证楼中楼回复稳定显示「回复 @xxx」
    replyTo: props.item.member ?? null
  })
  replyMentionRef.value?.reset()
  showReply.value = false
  // 自己刚发的回复要立刻可见：显式展开楼中楼（折叠态只展示预览，
  // 不会被新回复自动顶开）；首次展开时按第 1 页拉取，已展开则靠父级 prepend + watch 合并。
  subExpanded.value = true
  if (subItems.value.length === 0) await loadSubRepliesPage(1)
}

/** 加载指定页的子回复（用于分页切换；替换当前页 subItems） */
async function loadSubRepliesPage(page: number) {
  if (subLoading.value) return
  subLoading.value = true
  try {
    const resp = await handlers.expandReplies(props.item, page)
    subItems.value = resp.items
    subTotal.value = resp.total
    subCurrentPage.value = page
  } finally {
    subLoading.value = false
  }
}

/** 展开楼中楼：首次展开加载第 1 页，后续翻页通过 gotoSubPage */
async function openSubReplies() {
  subExpanded.value = true
  if (subItems.value.length === 0) {
    await loadSubRepliesPage(1)
  }
}

/** 子评论被删除后，从当前展开的楼中楼列表同步移除（UI 实时消失） */
function onSubDeleted(rpid: string) {
  subItems.value = subItems.value.filter((s) => String(s.rpid) !== rpid)
}

/** 跳转到指定页（页码相同 / 越界则忽略） */
function gotoSubPage(page: number) {
  if (page === subCurrentPage.value) return
  if (page < 1 || page > subTotalPages.value) return
  loadSubRepliesPage(page)
}

/** 收起楼中楼：折叠回「共 N 条回复」入口，保留已加载数据以便再次展开 */
function collapseSubReplies() {
  subExpanded.value = false
}

/**
 * 同步父级变更的子回复（`item.replies` 既承载折叠态预览，也承载本地新增回复）：
 * **仅在已展开时**把新回复并入当前页列表，让回复立即可见；
 * 折叠态一律交给 `previewReplies` 渲染——绝不能在这里自动展开，
 * 否则列表刷新（发评论 / 点赞 / 切换分页）会把「共 N 条回复，点击查看」入口顶掉。
 * 分页自身触发的变更（subLoading=true）会被跳过。
 */
watch(
  () => props.item.replies,
  (newReplies) => {
    if (subLoading.value) return
    if (!newReplies || !subExpanded.value) return
    const existing = new Set(subItems.value.map((s) => s.rpid))
    const fresh = newReplies.filter((r) => !existing.has(r.rpid))
    if (fresh.length) {
      subItems.value = [...fresh, ...subItems.value]
    }
  },
  { deep: true }
)
</script>

<template>
  <div
    :id="`comment-${item.rpid}`"
    class="lottery-comment-item flex gap-3 py-3 scroll-mt-24 rounded-lg transition-colors duration-500"
    :class="[
      { 'lottery-comment-item--sub': depth },
      focused ? 'bg-primary-light-9 ring-2 ring-primary/40' : ''
    ]"
  >
    <el-avatar
      :size="depth ? 32 : 40"
      class="lottery-comment-item__avatar shrink-0 cursor-pointer"
      @click="goUserSpace"
    >
      <img
        :src="memberAvatar || BiliImg.face.noface"
        referrerpolicy="no-referrer"
        :alt="memberUname || '头像'"
      />
    </el-avatar>

    <div class="lottery-comment-item__body flex-1 min-w-0">
      <div class="flex items-center gap-2 flex-wrap">
        <span
          class="lottery-comment-item__name font-medium text-sm text-text-primary cursor-pointer hover:text-primary transition-colors"
          @click="goUserSpace"
        >
          {{ memberUname || '匿名用户' }}
        </span>
        <el-tag v-if="isUp" type="primary" size="small" effect="plain" round>UP</el-tag>
        <el-tag
          v-if="item.state === ResourceAuditStatusEnum.AUDITING"
          type="warning"
          size="small"
          effect="light"
          round
          class="lottery-comment-item__auditing-tag"
        >
          审核中
        </el-tag>
        <span v-if="item.member?.level" class="text-xs text-text-placeholder">Lv{{ item.member.level }}</span>
        <span v-if="item.is_top" class="text-xs text-primary">置顶</span>
        <span v-if="item.ip_location" class="text-xs text-text-placeholder">IP属地：{{ item.ip_location }}</span>
      </div>

      <p class="lottery-comment-item__content mt-1 text-sm leading-relaxed text-text-regular break-words whitespace-pre-wrap">
        <template v-if="item.reply_to">
          <span class="text-primary">回复 </span>
          <UserBriefCell
            v-if="replyToMid"
            class="lottery-comment-item__reply-at-link align-baseline"
            :mid="replyToMid"
            to-space
            :show-after="300"
          >
            <span class="text-primary">@{{ item.reply_to.uname }}</span>
          </UserBriefCell>
          <span v-else class="text-primary">@{{ item.reply_to.uname }}</span>
          <span class="text-primary">：</span>
        </template>
        <template v-for="(seg, idx) in renderedSegments" :key="idx">
          <UserBriefCell
            v-if="seg.kind === 'at' && seg.mid"
            class="lottery-comment-item__at-link align-baseline"
            :mid="seg.mid"
            to-space
            :show-after="300"
          >
            <span class="text-primary">{{ seg.text }}</span>
          </UserBriefCell>
          <el-link
            v-else-if="seg.kind === 'topic'"
            class="lottery-comment-item__topic-link align-baseline"
            type="primary"
            :href="seg.uri || `#`"
            target="_blank"
            :rel="LINK_REL"
            :referrerpolicy="LINK_REFERRER_POLICY"
          >
            {{ seg.text }}
          </el-link>
          <span v-else>{{ seg.text }}</span>
        </template>
      </p>

      <div class="lottery-comment-item__actions mt-1 flex items-center gap-4 text-text-placeholder">
        <span class="lottery-comment-item__time text-xs text-text-placeholder">{{ formatTime(item.ctime) }}</span>
        <button
          class="inline-flex items-center gap-1 text-sm cursor-pointer border-none bg-transparent px-0 transition-colors"
          :class="item.action === 1 ? 'text-primary' : 'hover:text-primary'"
          @click="onLike"
        >
          <el-icon :size="14"><Pointer /></el-icon>
          <span>{{ Number(item.like_count) > 0 ? item.like_count : '赞' }}</span>
        </button>
        <button
          class="inline-flex items-center gap-1 text-sm cursor-pointer border-none bg-transparent px-0 transition-colors"
          :class="item.action === 2 ? 'text-danger' : 'hover:text-danger'"
          @click="onHate"
        >
          <el-icon :size="14"><Bottom /></el-icon>
          <span>踩</span>
        </button>
        <button
          class="inline-flex items-center gap-1 text-sm cursor-pointer border-none bg-transparent px-0 text-text-placeholder hover:text-primary transition-colors"
          @click="showReply = !showReply"
        >
          <el-icon :size="14"><ChatDotRound /></el-icon>
          <span>回复</span>
        </button>

        <!-- 右侧三点菜单（对标 B 站） -->
        <el-dropdown
          class="lottery-comment-item__more ml-auto"
          trigger="click"
          popper-class="lottery-comment-item__more-popper"
        >
          <button
            class="lottery-comment-item__more-btn inline-flex items-center justify-center text-text-placeholder hover:text-primary transition-colors cursor-pointer border-none bg-transparent p-1"
            :aria-label="'更多操作'"
          >
            <component :is="MoreIcon" class="w-3.5 h-3.5" />
          </button>
          <template #dropdown>
            <el-dropdown-menu class="lottery-comment-item__more-menu">
              <el-dropdown-item class="lottery-comment-item__more-copy" @click="onCopyLink">
                <el-icon class="mr-1"><Pointer /></el-icon>复制评论链接
              </el-dropdown-item>
              <el-dropdown-item class="lottery-comment-item__more-block" @click="onBlock">
                <el-icon class="mr-1"><Bottom /></el-icon>加入黑名单
              </el-dropdown-item>
              <el-dropdown-item class="lottery-comment-item__more-report" @click="onReport">
                <el-icon class="mr-1"><ChatDotRound /></el-icon>举报
              </el-dropdown-item>
              <!-- 自评删除：仅自己可见，置于三点菜单最底部，对标 B 站 -->
              <el-dropdown-item
                v-if="isOwn"
                class="lottery-comment-item__more-delete"
                @click="onDelete"
              >
                <el-icon class="mr-1"><Delete /></el-icon>删除
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>

      <!-- 楼中楼折叠态：预览（后端 comment_sub_preview_count 条）+「共 N 条回复，点击查看」 -->
      <div
        v-if="!subExpanded && (previewReplies.length || hasMoreSub)"
        class="lottery-comment-item__sub-collapsed mt-2 border-l border-border-light pl-3"
      >
        <ul v-if="previewReplies.length" class="lottery-comment-item__sub-preview-list m-0 list-none space-y-0 p-0">
          <li v-for="sub in previewReplies" :key="sub.rpid">
            <LotteryCommentItem
              :item="sub"
              :depth="(depth || 0) + 1"
              :up-mid="upMid"
              :current-mid="currentMid"
              :focused="focusedRpid === sub.rpid"
              @deleted="onSubDeleted"
            />
          </li>
        </ul>
        <button
          v-if="hasMoreSub"
          type="button"
          class="lottery-comment-item__sub-more mt-1 inline-flex items-center gap-1 cursor-pointer border-none bg-transparent px-0 text-primary text-sm hover:opacity-80 transition-opacity"
          @click="openSubReplies"
        >
          共 {{ subCountDisplay }} 条回复，点击查看
          <el-icon :size="14"><ArrowDown /></el-icon>
        </button>
      </div>

      <!-- 展开态子回复列表：分页加载当前页 subItems -->
      <ul v-if="subExpanded && subItems.length" class="lottery-comment-item__sub-list mt-2 m-0 list-none space-y-0 border-l border-border-light pl-3 p-0">
        <li v-for="sub in subItems" :key="sub.rpid">
          <LotteryCommentItem
            :item="sub"
            :depth="(depth || 0) + 1"
            :up-mid="upMid"
            :current-mid="currentMid"
            :focused="focusedRpid === sub.rpid"
            @deleted="onSubDeleted"
          />
        </li>
      </ul>

      <!-- 展开态加载中 / 加载失败重试（避免展开后空白且无路可退） -->
      <div
        v-if="subExpanded && !subItems.length"
        v-loading="subLoading"
        class="lottery-comment-item__sub-loading mt-2 min-h-12"
      >
        <el-link
          v-if="!subLoading"
          class="lottery-comment-item__sub-retry text-sm"
          type="primary"
          :underline="false"
          @click="loadSubRepliesPage(subCurrentPage)"
        >
          加载失败，点击重试
        </el-link>
      </div>

      <!-- 展开态页脚：多页时给「共N页 + 页码 + 下一页」，任何展开态都保留「收起」 -->
      <div v-if="subExpanded" class="lottery-comment-item__sub-pagination mt-2 flex items-center gap-3 text-xs">
        <template v-if="subTotalPages > 1">
          <span class="text-text-placeholder">共{{ subTotalPages }}页</span>
          <button
            v-for="p in subTotalPages"
            :key="p"
            class="lottery-comment-item__sub-page cursor-pointer border-none bg-transparent px-1 transition-colors"
            :class="p === subCurrentPage ? 'text-primary font-medium' : 'text-text-secondary hover:text-primary'"
            @click="gotoSubPage(p)"
          >
            {{ p }}
          </button>
          <button
            v-if="subCurrentPage < subTotalPages"
            class="lottery-comment-item__sub-next cursor-pointer border-none bg-transparent text-text-secondary hover:text-primary transition-colors"
            @click="gotoSubPage(subCurrentPage + 1)"
          >
            下一页
          </button>
        </template>
        <button
          class="lottery-comment-item__sub-collapse ml-auto cursor-pointer border-none bg-transparent text-text-placeholder hover:text-primary transition-colors"
          @click="collapseSubReplies"
        >
          收起
        </button>
      </div>

      <!-- 回复输入框：复用可复用 @ 提及组件，与主评论框一致 -->
      <div v-if="showReply" class="mt-2">
        <LotteryCommentMention
          ref="replyMentionRef"
          v-model="replyContent"
          :placeholder="`回复 @${item.member?.uname || '匿名用户'}`"
          :rows="2"
          class="lottery-comment-item__reply-mention"
        />
        <div class="flex items-center justify-end mt-1">
          <el-button size="small" type="primary" :disabled="!replyContent.trim()" @click="submitReply">
            发表回复
          </el-button>
        </div>
      </div>
    </div>
    <ReportDialog v-model="reportDialogVisible" :biz-type="InteractionBizTypeEnum.COMMENT" :biz-id="reportCommentRpid" />
  </div>
</template>
