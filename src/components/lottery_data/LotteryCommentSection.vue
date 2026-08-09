<script setup lang="ts">
import { computed, nextTick, onMounted, provide, ref, watch, type Ref } from 'vue'
import { ElMessageBox } from 'element-plus'
import { ChatDotSquare } from '@element-plus/icons-vue'
import LotteryCommentItem from '@/components/lottery_data/LotteryCommentItem.vue'
import commentApi, {
  CommentHandlersKey,
  COMMENT_TYPE,
  type CommentAddResp,
  type CommentHandlers,
  type CommentItem,
  type CommentType,
  type CommentUserBrief
} from '@/api/lottery_comment.ts'
import biliMessage from '@/utils/message'
import { useUserNavStore } from '@/stores/user_nav'
import { useInject, KeysEnum } from '@/models/base/provide_model.ts'
import type { UserNavModel } from '@/models/user/user_model.ts'
import { BiliImg } from '@/assets/img/BiliImg.ts'
import { openGlobalLoginModalKey } from '@/models/inject/inject_type.ts'

const props = withDefaults(
  defineProps<{
    oid: string | number
    /** 评论区业务类型，必须来自后端 CommentTypeEnum 白名单（见 COMMENT_TYPE） */
    type?: CommentType
    upMid?: number | string
    /** 定位直达的评论 rpid：从通知 / 外链进入时携带，加载后滚动到该评论并高亮 */
    focusRpid?: string | number | null
  }>(),
  {
    type: COMMENT_TYPE.LOTTERY,
    upMid: undefined,
    focusRpid: null
  }
)

const userNavStore = useUserNavStore()
const currentMid = computed(() => userNavStore.user_nav.uid)
const userAvatar = computed(() => userNavStore.user_nav.face || BiliImg.face.noface)
const isLoggedIn = computed(() => !!currentMid.value)

const biliUser = useInject(KeysEnum.BiliUser) as Ref<UserNavModel>
const openGlobalLoginModal = inject(openGlobalLoginModalKey, () => {})

const commentList = ref<CommentItem[]>([])
const topComment = ref<CommentItem | null>(null)
const total = ref(0)
const allCount = ref(0)
const currentPage = ref(1)
const sortBy = ref<'hot' | 'time'>('hot')
const isLoading = ref(false)
const newComment = ref('')

// 定位直达：后端回填的实际聚焦目标（可能为楼中楼），用于高亮与滚动
const focusTargetRpid = ref<string | null>(null)

const displayList = computed(() =>
  topComment.value ? [topComment.value, ...commentList.value] : commentList.value
)

const loadMain = async () => {
  isLoading.value = true
  try {
    const resp = await commentApi.listMain(
      props.oid,
      props.type,
      sortBy.value,
      currentPage.value,
      10,
      props.focusRpid
    )
    if (resp.code || !resp.data) {
      biliMessage.error(resp.msg || '评论区加载失败')
      return
    }
    topComment.value = resp.data.top
    commentList.value = resp.data.items
    total.value = resp.data.total
    allCount.value = resp.data.all_count
    // 仅当后端确实命中并置顶了目标时才记录聚焦目标，用于滚动定位
    focusTargetRpid.value = resp.data.focus_rpid || null
  } finally {
    isLoading.value = false
    // 等 DOM 渲染完成后再滚动到定位目标（楼中楼需先挂载子评论）
    if (focusTargetRpid.value) {
      await nextTick()
      scrollToFocus()
    }
  }
}

const findItem = (rpid: string): CommentItem | null => {
  const search = (list: CommentItem[]): CommentItem | null => {
    for (const it of list) {
      if (it.rpid === rpid) return it
      const found = search(it.replies || [])
      if (found) return found
    }
    return null
  }
  if (topComment.value && topComment.value.rpid === rpid) return topComment.value
  return search(commentList.value)
}

const removeItem = (rpid: string) => {
  const filterList = (list: CommentItem[]): CommentItem[] =>
    list
      .filter((it) => it.rpid !== rpid)
      .map((it) => {
        it.replies = filterList(it.replies || [])
        return it
      })
  commentList.value = filterList(commentList.value)
  if (topComment.value?.rpid === rpid) topComment.value = null
  total.value = Math.max(0, total.value - 1)
  allCount.value = Math.max(0, allCount.value - 1)
}

/**
 * 根据 add 接口响应与当前登录用户本地构造一条评论视图对象。
 * add 成功后不再重新拉取整个评论区，直接把该对象插入列表首条即可。
 * 字段尽量对齐后端 CommentItem；楼层(floor)/计数等由后端异步生成，前端先给默认值。
 */
const buildNewComment = (
  data: CommentAddResp,
  message: string,
  root: string,
  parent: string,
  replyTo: CommentUserBrief | null
): CommentItem => {
  const uid = Number(currentMid.value)
  const nav = userNavStore.user_nav
  return {
    rpid: data.rpid,
    oid: String(props.oid),
    type: props.type as string,
    mid: uid,
    member: {
      mid: uid,
      uname: nav.user_name || null,
      avatar: userAvatar.value,
      level: Number(nav.level_info.current_level) || 0,
      vip_status: null
    },
    root,
    parent,
    dialog: root === '0' ? data.rpid : root,
    floor: 0,
    reply_to: replyTo,
    message,
    pictures: [],
    at_users: [],
    like_count: 0,
    hate_count: 0,
    rcount: 0,
    action: data.need_audit ? 0 : 0,
    state: data.state,
    is_top: false,
    is_essence: false,
    is_up_liked: false,
    ip_v4_masked: null,
    ip_v6_masked: null,
    ctime: new Date().toISOString(),
    replies: []
  }
}

const handlers: CommentHandlers = {
  like: async ({ rpid, nextAction }) => {
    const resp = await commentApi.action(rpid, nextAction)
    if (resp.code) {
      biliMessage.error(resp.msg)
      return
    }
    const item = findItem(rpid)
    if (item) {
      const old = item.action
      item.action = nextAction
      const likeDelta = (nextAction === 1 ? 1 : 0) - (old === 1 ? 1 : 0)
      const hateDelta = (nextAction === 2 ? 1 : 0) - (old === 2 ? 1 : 0)
      item.like_count = Number(item.like_count) + likeDelta
      item.hate_count = Number(item.hate_count) + hateDelta
    }
  },
  del: async (rpid: string) => {
    try {
      await ElMessageBox.confirm('确定删除这条评论吗？删除后不可恢复', '提示', {
        type: 'warning',
        confirmButtonText: '删除',
        cancelButtonText: '取消'
      })
    } catch {
      return
    }
    const resp = await commentApi.del(rpid)
    if (resp.code) {
      biliMessage.error(resp.msg)
      return
    }
    removeItem(rpid)
    biliMessage.success('已删除')
  },
  reply: async ({ root, parent, message }) => {
    const resp = await commentApi.add(props.oid, props.type, root, parent, message)
    if (resp.code) {
      biliMessage.error(resp.msg)
      return
    }
    // 不重新拉取全部评论，直接把新回复插入对应根评论的楼中楼首条
    const rootItem = findItem(root)
    const replyTo = findItem(parent)?.member ?? null
    if (rootItem) {
      rootItem.replies = [
        buildNewComment(resp.data, message, root, parent, replyTo),
        ...(rootItem.replies || [])
      ]
      rootItem.rcount = Number(rootItem.rcount) + 1
    }
    allCount.value += 1
    biliMessage.success('评论成功')
  },
  expandReplies: async (item: CommentItem, page: number) => {
    const resp = await commentApi.listReply(item.rpid, props.oid, props.type, page, 10)
    if (resp.code) {
      biliMessage.error(resp.msg)
      return { items: [], total: 0 }
    }
    return { items: resp.data.items, total: resp.data.total }
  }
}
provide(CommentHandlersKey, handlers)

const submitTopComment = async () => {
  const msg = newComment.value.trim()
  if (!msg) return
  if (!isLoggedIn.value) {
    openGlobalLoginModal()
    return
  }
  const resp = await commentApi.add(props.oid, props.type, '0', '0', msg)
  if (resp.code) {
    biliMessage.error(resp.msg)
    return
  }
  // 不重新拉取全部评论，直接把新评论插入一级评论列表首条
  commentList.value = [buildNewComment(resp.data, msg, '0', '0', null), ...commentList.value]
  allCount.value += 1
  total.value += 1
  newComment.value = ''
  biliMessage.success('评论成功')
}

watch([sortBy, currentPage], () => {
  // 切换排序 / 翻页后不再保持定位高亮
  focusTargetRpid.value = null
  loadMain()
})

onMounted(loadMain)

// 加载完成后把定位目标滚动到屏幕中间并高亮（若后端命中了 focus）
const scrollToFocus = () => {
  const target = focusTargetRpid.value
  if (!target) return
  const el = document.getElementById(`comment-${target}`)
  if (!el) return
  // 计算目标元素相对视口的位置，使其落在屏幕垂直中部
  const rect = el.getBoundingClientRect()
  const top = rect.top + window.scrollY - window.innerHeight / 2 + rect.height / 2
  window.scrollTo({ top, behavior: 'smooth' })
  // 高亮约 2.5s 后淡出
  window.setTimeout(() => {
    if (focusTargetRpid.value === target) focusTargetRpid.value = null
  }, 2500)
}
</script>

<template>
  <div class="lottery-comment-section flex flex-col" v-loading="isLoading">
    <!-- 标题 + 排序 -->
    <div class="flex items-center justify-between mb-4">
      <div class="flex items-center gap-2">
        <h2 class="m-0 text-base font-bold text-text-primary">评论</h2>
        <span class="text-sm text-text-placeholder">{{ allCount }}</span>
      </div>
      <div class="flex items-center gap-3">
        <button
          class="text-sm cursor-pointer border-none bg-transparent px-0 transition-colors"
          :class="sortBy === 'hot' ? 'text-primary font-medium' : 'text-text-placeholder hover:text-text-secondary'"
          @click="sortBy = 'hot'"
        >
          按热度
        </button>
        <span class="text-text-placeholder text-xs">|</span>
        <button
          class="text-sm cursor-pointer border-none bg-transparent px-0 transition-colors"
          :class="sortBy === 'time' ? 'text-primary font-medium' : 'text-text-placeholder hover:text-text-secondary'"
          @click="sortBy = 'time'"
        >
          按时间
        </button>
      </div>
    </div>

    <!-- 发表评论 -->
    <div v-if="isLoggedIn" class="lottery-comment-section__submit mb-6">
      <div class="flex gap-3">
        <el-avatar :size="40" class="shrink-0">
          <img :src="userAvatar" referrerpolicy="no-referrer" alt="头像" />
        </el-avatar>
        <div class="flex-1">
          <textarea
            v-model="newComment"
            rows="2"
            placeholder="发一条友善的评论"
            class="w-full min-h-10 px-3 py-2 rounded-md bg-bg-secondary border border-border-light text-sm text-text-primary placeholder-text-placeholder outline-none transition-all duration-200 resize-none focus:border-primary focus:ring-1 focus:ring-primary/30"
          ></textarea>
          <div class="flex items-center justify-end mt-1">
            <el-button size="small" type="primary" :disabled="!newComment.trim()" @click="submitTopComment">
              发表评论
            </el-button>
          </div>
        </div>
      </div>
    </div>
    <el-alert
      v-else
      class="lottery-comment-section__login-tip mb-6"
      title="登录后参与评论"
      description="登录即可发表评论、为喜欢的抽奖加油打气"
      type="info"
      :closable="false"
      show-icon
    >
      <template #default>
        <el-button size="small" type="primary" class="mt-2" @click="openGlobalLoginModal">
          立即登录
        </el-button>
      </template>
    </el-alert>

    <!-- 评论列表 -->
    <ul v-if="displayList.length" class="lottery-comment-section__list m-0 p-0 list-none divide-y divide-border-light">
      <li v-for="item in displayList" :key="item.rpid" class="lottery-comment-section__list-item">
        <LotteryCommentItem
          :item="item"
          :up-mid="upMid"
          :current-mid="currentMid"
          :focused="focusTargetRpid === item.rpid"
          :focused-rpid="focusTargetRpid"
        />
      </li>
    </ul>
    <div v-else class="flex flex-col items-center justify-center py-16 text-text-placeholder">
      <el-icon :size="48" class="opacity-30"><ChatDotSquare /></el-icon>
      <p class="mt-3 text-sm">还没有评论，快来抢沙发吧~</p>
    </div>

    <!-- 底部分页 -->
    <div v-if="total > 0" class="flex justify-center py-6">
      <el-pagination
        size="small"
        background
        layout="prev, pager, next"
        :total="total"
        :page-size="10"
        :current-page="currentPage"
        :pager-count="5"
        @update:current-page="(p: number) => (currentPage = p)"
      />
    </div>
  </div>
</template>
