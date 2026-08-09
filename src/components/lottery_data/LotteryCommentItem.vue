<script setup lang="ts">
import { inject, ref, computed } from 'vue'
import { Pointer, ChatDotRound, Delete, Bottom, ArrowDown } from '@element-plus/icons-vue'
import type { CommentItem } from '@/api/lottery_comment.ts'
import { CommentHandlersKey } from '@/api/lottery_comment.ts'

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
const onDelete = () => handlers.del(props.item.rpid)

const submitReply = () => {
  const msg = replyContent.value.trim()
  if (!msg) return
  const root = props.item.root === '0' ? props.item.rpid : props.item.root
  handlers.reply({ root, parent: props.item.rpid, message: msg })
  replyContent.value = ''
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
    <el-avatar :size="depth ? 32 : 40" class="shrink-0">
      <img
        v-if="item.member?.avatar"
        :src="item.member.avatar"
        referrerpolicy="no-referrer"
        :alt="item.member.uname || '头像'"
      />
    </el-avatar>

    <div class="lottery-comment-item__body flex-1 min-w-0">
      <div class="flex items-center gap-2 flex-wrap">
        <span class="lottery-comment-item__name font-medium text-sm text-text-primary">
          {{ item.member?.uname || '匿名用户' }}
        </span>
        <el-tag v-if="isUp" type="primary" size="small" effect="plain" round>UP</el-tag>
        <span v-if="item.member?.level" class="text-xs text-text-placeholder">Lv{{ item.member.level }}</span>
        <span v-if="item.is_top" class="text-xs text-primary">置顶</span>
        <span class="text-xs text-text-placeholder ml-auto">{{ formatTime(item.ctime) }}</span>
      </div>

      <p class="lottery-comment-item__content mt-1 text-sm leading-relaxed text-text-regular break-words whitespace-pre-wrap">
        <template v-if="item.reply_to">
          <span class="text-primary">回复 @{{ item.reply_to.uname }}：</span>
        </template>
        {{ item.message }}
      </p>

      <div class="lottery-comment-item__actions mt-1 flex items-center gap-4 text-text-placeholder">
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

      <!-- 回复输入框 -->
      <div v-if="showReply" class="mt-2">
        <div class="relative">
          <textarea
            v-model="replyContent"
            rows="2"
            :placeholder="`回复 @${item.member?.uname || '匿名用户'}`"
            class="w-full min-h-[40px] px-3 py-2 rounded-md bg-bg-secondary border border-border-light text-sm text-text-primary placeholder-text-placeholder outline-none transition-all duration-200 resize-none focus:border-primary focus:ring-1 focus:ring-primary/30"
          ></textarea>
        </div>
        <div class="flex items-center justify-end mt-1">
          <el-button size="small" type="primary" :disabled="!replyContent.trim()" @click="submitReply">
            发表回复
          </el-button>
        </div>
      </div>
    </div>
  </div>
</template>
