<script setup lang="ts">
import { inject, ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { Pointer, ChatDotRound, Delete, Bottom, ArrowDown, MoreFilled } from '@element-plus/icons-vue'
import type { CommentItem } from '@/api/lottery_comment.ts'
import { CommentHandlersKey } from '@/api/lottery_comment.ts'
import commentApi from '@/api/lottery_comment'
import { BiliImg } from '@/assets/img/BiliImg.ts'
import type { CommentUserBrief } from '@/api/notify/hey-api'
import { blockUser } from '@/api/notify/moment-api'
import ReportDialog from '@/components/moment/ReportDialog.vue'
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

const showReply = ref(false)
const replyContent = ref('')
const subLoading = ref(false)
const subPage = ref(0)
const subTotal = ref(0)

const isOwn = computed(
  () => !!props.currentMid && String(props.currentMid) === String(props.item.mid)
)
const isUp = computed(
  () => !!props.upMid && String(props.upMid) === String(props.item.mid)
)
const hasMoreSub = computed(
  () => Number(props.item.rcount) > (props.item.replies?.length || 0)
)

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

const onDelete = () => handlers.del(props.item.rpid)

/** 点击头像 / 用户名跳转用户空间 */
function goUserSpace() {
  if (props.item.mid) {
    router.push({ name: 'MOMENT_USER_SPACE', params: { mid: String(props.item.mid) } })
  }
}

/** 点击「回复 @被回复用户名」跳转其用户空间 */
function goReplyToSpace() {
  if (props.item.reply_to?.mid) {
    router.push({ name: 'MOMENT_USER_SPACE', params: { mid: String(props.item.reply_to.mid) } })
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

/** 加入黑名单（拉黑评论作者） */
async function onBlock() {
  try {
    await blockUser(Number(props.item.mid), {
      onError: (msg) => {
        biliMessage.error(msg)
        return true
      },
    })
    biliMessage.success('已加入黑名单')
  } catch {
    biliMessage.error('拉黑失败，请稍后重试')
  }
}

/** 统一举报弹窗（P11-T6） */
const reportDialogVisible = ref(false)
const reportCommentRpid = ref<number>(0)

/** 举报评论：打开统一举报弹窗（bizType=comment，bizId=rpid） */
function onReport() {
  if (!props.item?.rpid) return
  reportCommentRpid.value = Number(props.item.rpid)
  reportDialogVisible.value = true
}

/** 回复输入框的 @ 提及候选与映射 */
const replyMentionOptions = ref<Array<{ value: string; avatar?: string; mid?: number }>>([])
const replyMentionLoading = ref(false)
const replyAtNameToMid = ref<Record<string, number>>({})

async function handleReplyMentionSearch(pattern: string) {
  if (!pattern.trim()) {
    replyMentionOptions.value = []
    return
  }
  replyMentionLoading.value = true
  try {
    const res = await commentApi.searchAt(pattern.trim(), 20)
    if (res && res.code === 0 && res.data) {
      replyMentionOptions.value = (res.data as CommentUserBrief[])
        .filter((u) => u.mid != null)
        .map((u) => ({
          value: u.uname || `用户${u.mid}`,
          avatar: u.avatar || undefined,
          mid: u.mid
        }))
    }
  } finally {
    replyMentionLoading.value = false
  }
}

function onReplyMentionSelect(opt: { value?: string; mid?: number }) {
  if (!opt?.value || opt.mid == null) return
  replyAtNameToMid.value[opt.value] = opt.mid
}

const submitReply = () => {
  const msg = replyContent.value.trim()
  if (!msg) return
  const root = props.item.root === '0' ? props.item.rpid : props.item.root
  handlers.reply({
    root,
    parent: props.item.rpid,
    message: msg,
    atNameToMid: Object.keys(replyAtNameToMid.value).length ? { ...replyAtNameToMid.value } : undefined
  })
  replyContent.value = ''
  replyAtNameToMid.value = {}
  showReply.value = false
}

const loadSubReplies = async () => {
  if (subLoading.value) return
  subLoading.value = true
  try {
    const page = subPage.value + 1
    const resp = await handlers.expandReplies(props.item, page)
    subTotal.value = resp.total
    subPage.value = page
    props.item.replies = page === 1 ? resp.items : [...(props.item.replies || []), ...resp.items]
  } finally {
    subLoading.value = false
  }
}
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
          v-if="item.state === 'auditing'"
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
      </div>

      <p class="lottery-comment-item__content mt-1 text-sm leading-relaxed text-text-regular break-words whitespace-pre-wrap">
        <template v-if="item.reply_to">
          <span class="text-primary">回复 </span>
          <el-link
            class="lottery-comment-item__reply-at-link align-baseline"
            type="primary"
            underline="never"
            @click="goReplyToSpace"
          >
            @{{ item.reply_to.uname }}
          </el-link>
          <span class="text-primary">：</span>
        </template>
        <template v-for="(seg, idx) in renderedSegments" :key="idx">
          <el-link
            v-if="seg.kind === 'at' && seg.mid"
            class="lottery-comment-item__at-link align-baseline"
            type="primary"
            :href="`/app/space/${seg.mid}`"
          >
            {{ seg.text }}
          </el-link>
          <el-link
            v-else-if="seg.kind === 'topic'"
            class="lottery-comment-item__topic-link align-baseline"
            type="primary"
            :href="seg.uri || `#`"
            target="_blank"
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
        <button
          v-if="isOwn"
          class="inline-flex items-center gap-1 text-sm cursor-pointer border-none bg-transparent px-0 text-text-placeholder hover:text-danger transition-colors"
          @click="onDelete"
        >
          <el-icon :size="14"><Delete /></el-icon>
          <span>删除</span>
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
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>

      <!-- 楼中楼展开 -->
      <div v-if="item.root === '0' && hasMoreSub && subPage === 0" class="mt-1">
        <span
          class="inline-flex items-center gap-1 cursor-pointer text-primary text-sm hover:opacity-80 transition-opacity"
          @click="loadSubReplies"
        >
          共 {{ item.rcount }} 条回复
          <el-icon :size="14"><ArrowDown /></el-icon>
        </span>
      </div>

      <!-- 子回复列表（仅一级，新系统楼中楼固定两层） -->
      <ul v-if="item.replies && item.replies.length" class="mt-2 space-y-0 border-l border-border-light pl-3">
        <li v-for="sub in item.replies" :key="sub.rpid">
          <LotteryCommentItem
            :item="sub"
            :depth="(depth || 0) + 1"
            :up-mid="upMid"
            :current-mid="currentMid"
            :focused="focusedRpid === sub.rpid"
          />
        </li>
      </ul>

      <!-- 加载更多子回复 -->
      <div v-if="subPage > 0 && hasMoreSub" class="mt-1">
        <span
          class="inline-flex items-center gap-1 cursor-pointer text-primary text-sm hover:opacity-80 transition-opacity"
          :class="{ 'opacity-60': subLoading }"
          @click="loadSubReplies"
        >
          {{ subLoading ? '加载中...' : '查看更多回复' }}
        </span>
      </div>

      <!-- 回复输入框：el-mention 支持 @ 提及 -->
      <div v-if="showReply" class="mt-2">
        <el-mention
          v-model="replyContent"
          type="textarea"
          class="w-full lottery-comment-item__reply-mention"
          :options="replyMentionOptions"
          :loading="replyMentionLoading"
          prefix="@"
          split=" "
          :placeholder="`回复 @${item.member?.uname || '匿名用户'}`"
          :rows="2"
          resize="vertical"
          @search="handleReplyMentionSearch"
          @select="onReplyMentionSelect"
        >
          <template #label="{ item: opt }">
            <div class="lottery-comment-item__reply-mention-option flex items-center gap-2">
              <el-avatar :size="24" :src="opt.avatar || BiliImg.face.noface" referrerpolicy="no-referrer">
                <img :src="opt.avatar || BiliImg.face.noface" referrerpolicy="no-referrer" alt="avatar" />
              </el-avatar>
              <span class="lottery-comment-item__reply-mention-name text-sm text-text-primary">{{ opt.value }}</span>
            </div>
          </template>
        </el-mention>
        <div class="flex items-center justify-end mt-1">
          <el-button size="small" type="primary" :disabled="!replyContent.trim()" @click="submitReply">
            发表回复
          </el-button>
        </div>
      </div>
    </div>
    <ReportDialog v-model="reportDialogVisible" biz-type="comment" :biz-id="reportCommentRpid" />
  </div>
</template>
