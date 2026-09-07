<script setup lang="ts">
import { inject, ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { Pointer, ChatDotRound, Delete, Bottom, ArrowDown, MoreFilled } from '@element-plus/icons-vue'
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
/** 是否存在子回复（决定是否展示「共 N 条回复」折叠入口） */
const hasMoreSub = computed(() => Number(props.item.rcount) > 0)
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

const submitReply = () => {
  const msg = replyContent.value.trim()
  if (!msg) return
  const root = props.item.root === '0' ? props.item.rpid : (props.item.root || props.item.rpid)
  const atMap = replyMentionRef.value?.buildAtNameToMid(msg) || {}
  handlers.reply({
    root,
    parent: props.item.rpid,
    message: msg,
    atNameToMid: Object.keys(atMap).length ? atMap : undefined,
    // 被回复者即当前评论作者，直接传入可保证楼中楼回复稳定显示「回复 @xxx」
    replyTo: props.item.member ?? null
  })
  replyMentionRef.value?.reset()
  showReply.value = false
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
 * 同步父级新增的子回复：用户在本评论的楼中楼发表回复后，
 * 父级会把新回复 prepend 到 item.replies；展开态下需同步进 subItems 以立即可见。
 * 分页自身触发的 item.replies 变更（subLoading=true）会被跳过。
 */
watch(
  () => props.item.replies,
  (newReplies) => {
    if (subLoading.value) return
    if (!newReplies) return
    const existing = new Set(subItems.value.map((s) => s.rpid))
    const fresh = newReplies.filter((r) => !existing.has(r.rpid))
    if (fresh.length) {
      // 回复后无论楼中楼是否已展开都自动展开，确保用户能立刻看到自己/他人的新回复
      subExpanded.value = true
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
        :src="item.member?.avatar || BiliImg.face.noface"
        referrerpolicy="no-referrer"
        :alt="item.member?.uname || '头像'"
      />
    </el-avatar>

    <div class="lottery-comment-item__body flex-1 min-w-0">
      <div class="flex items-center gap-2 flex-wrap">
        <span
          class="lottery-comment-item__name font-medium text-sm text-text-primary cursor-pointer hover:text-primary transition-colors"
          @click="goUserSpace"
        >
          {{ item.member?.uname || '匿名用户' }}
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
            v-if="item.reply_to.mid"
            class="lottery-comment-item__reply-at-link align-baseline"
            :mid="item.reply_to.mid"
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
            <el-icon :size="18" class="rotate-90"><MoreFilled /></el-icon>
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

      <!-- 楼中楼折叠入口：点击展开并加载第 1 页 -->
      <div v-if="item.root === '0' && hasMoreSub && !subExpanded" class="mt-1">
        <span
          class="inline-flex items-center gap-1 cursor-pointer text-primary text-sm hover:opacity-80 transition-opacity"
          @click="openSubReplies"
        >
          共 {{ item.rcount }} 条回复
          <el-icon :size="14"><ArrowDown /></el-icon>
        </span>
      </div>

      <!-- 展开态子回复列表：分页加载当前页 subItems -->
      <ul v-if="subExpanded && subItems.length" class="mt-2 space-y-0 border-l border-border-light pl-3">
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

      <!-- 展开态分页器（B 站风格：共N页 + 页码 + 下一页 + 收起）；只有一页时整组隐藏 -->
      <div v-if="subExpanded && subTotalPages > 1" class="lottery-comment-item__sub-pagination mt-2 flex items-center gap-3 text-xs">
        <span class="text-text-placeholder">共{{ subTotalPages }}页</span>
        <button
          v-for="p in subTotalPages"
          :key="p"
          class="cursor-pointer border-none bg-transparent px-1 transition-colors"
          :class="p === subCurrentPage ? 'text-primary font-medium' : 'text-text-secondary hover:text-primary'"
          @click="gotoSubPage(p)"
        >
          {{ p }}
        </button>
        <button
          v-if="subCurrentPage < subTotalPages"
          class="cursor-pointer border-none bg-transparent text-text-secondary hover:text-primary transition-colors"
          @click="gotoSubPage(subCurrentPage + 1)"
        >
          下一页
        </button>
        <button
          class="ml-auto cursor-pointer border-none bg-transparent text-text-placeholder hover:text-primary transition-colors"
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
