<script setup lang="ts">
import { computed, nextTick, onMounted, provide, ref, watch, type Ref } from 'vue'
import { ElMessageBox } from 'element-plus'
import { ChatDotSquare } from '@element-plus/icons-vue'
import LotteryCommentItem from '@/components/lottery_data/LotteryCommentItem.vue'
import LotteryCommentMention from '@/components/lottery_data/LotteryCommentMention.vue'
import commentApi, {
  CommentHandlersKey,
  InteractionBizTypeEnum,
  CommentSortEnum,
  type CommentAddResp,
  type CommentHandlers,
  type CommentItem,
  type CommentType,
  type CommentUserBrief
} from '@/api/lottery_comment.ts'
import { businessHandler } from '@/utils/businessHandler'
import { useUserNavStore } from '@/stores/user_nav'
import { useInject, KeysEnum } from '@/models/base/provide_model.ts'
import type { UserNavModel } from '@/models/user/user_model.ts'
import { BiliImg } from '@/assets/img/BiliImg.ts'
import { openGlobalLoginModalKey } from '@/models/inject/inject_type.ts'
import BiliError from '@/components/CommonCompo/Bili-Feedback-Compo/BiliError.vue'

const props = withDefaults(
  defineProps<{
    oid: string | number
    /** 评论区业务类型，必须来自 SDK 生成的 InteractionBizTypeEnum */
    type?: CommentType
    upMid?: number | string
    /** 定位直达的评论 rpid：从通知 / 外链进入时携带，加载后滚动到该评论并高亮 */
    focusRpid?: string | number | null
    /** 强制标记当前用户为匿名（用于内嵌场景，父组件明确控制）；默认根据本地登录态推导 */
    forceAnonymous?: boolean
  }>(),
  {
    type: InteractionBizTypeEnum.LOTTERY,
    upMid: undefined,
    focusRpid: null,
    forceAnonymous: false
  }
)

const emit = defineEmits<{
  /** 评论总数变化（首次加载 / 发评论 / 回复 / 删除后触发），供外层联动展示计数 */
  'count-change': [count: number]
}>()

const userNavStore = useUserNavStore()
const currentMid = computed(() => userNavStore.user_nav.uid)
const userAvatar = computed(() => userNavStore.user_nav.face || BiliImg.face.noface)
const isLoggedIn = computed(() => !!currentMid.value)

/** 是否匿名访问：父组件强制标记 > 后端响应 viewer_is_anonymous > 本地登录态推断 */
const viewerIsAnonymous = ref(false)

const biliUser = useInject(KeysEnum.BiliUser) as Ref<UserNavModel>
const openGlobalLoginModal = inject(openGlobalLoginModalKey, () => {})

const commentList = ref<CommentItem[]>([])
const topComment = ref<CommentItem | null>(null)
const total = ref(0)
const allCount = ref(0)
const currentPage = ref(1)
const sortBy = ref<CommentSortEnum>(CommentSortEnum.HOT)
const isLoading = ref(false)
const isError = ref(false)
const newComment = ref('')
const topMentionRef = ref<InstanceType<typeof LotteryCommentMention> | null>(null)

/** @ 提及可选用户：初始为评论列表（含楼中楼）用户，输入 @ 关键字后远程搜索覆盖 */
const mentionOptions = ref<Array<{ value: string; avatar?: string; mid?: number }>>([])
/** 收集评论列表中的用户（按 mid 去重）作为初始提及候选 */
function collectMentionUsers() {
  const seen = new Set<number>()
  const list: Array<{ value: string; avatar?: string; mid?: number }> = []
  const collect = (item: CommentItem) => {
    const m = item.member
    if (m?.mid != null && !seen.has(m.mid)) {
      seen.add(m.mid)
      list.push({ value: m.uname || `用户${m.mid}`, avatar: m.avatar || undefined, mid: m.mid })
    }
    item.replies?.forEach(collect)
  }
  if (topComment.value) collect(topComment.value)
  commentList.value.forEach(collect)
  mentionOptions.value = list
}

// 定位直达：后端回填的实际聚焦目标（可能为楼中楼），用于高亮与滚动
const focusTargetRpid = ref<string | null>(null)

const displayList = computed(() =>
  topComment.value ? [topComment.value, ...commentList.value] : commentList.value
)

const loadMain = async () => {
  // oid 无效（0 / 空 / undefined）时直接跳过，避免发出 oid=0 的无效请求
  const rawOid = String(props.oid ?? '').trim()
  if (!rawOid || rawOid === '0') {
    isLoading.value = false
    return
  }
  isLoading.value = true
  isError.value = false
  try {
    const resp = await businessHandler(commentApi.listMain(
      props.oid,
      props.type,
      sortBy.value,
      currentPage.value,
      10,
      // 仅第一页携带 focusRpid（后端仅首页会把目标评论置顶）；后续页正常分页
      currentPage.value === 1 ? props.focusRpid : null
    ), {
      showSuccessToast: false,
    })
    if (!resp.success || !resp.data) {
      isError.value = true
      return
    }
    const data = resp.data
    topComment.value = (data.top ?? null) as CommentItem | null
    commentList.value = (data.items ?? []) as CommentItem[]
    total.value = data.total ?? 0
    allCount.value = data.all_count ?? 0
    // 仅当后端确实命中并置顶了目标时才记录聚焦目标，用于滚动定位
    focusTargetRpid.value = data.focus_rpid || null
    // 后端在匿名访问时返回 viewer_is_anonymous=true（SDK 尚未同步字段前通过 any 兜底读取）；
    // 优先级：后端标记 > 父组件 forceAnonymous > 本地登录态
    const fromServer = (data as { viewer_is_anonymous?: boolean })?.viewer_is_anonymous
    viewerIsAnonymous.value = props.forceAnonymous || fromServer || !isLoggedIn.value
    // 评论加载后收集提及候选用户
    collectMentionUsers()
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
  // 仅当被删的是一级评论（顶层）时才扣减 total；楼中楼子评论的删除不应影响一级列表计数
  const wasTop = commentList.value.some((it) => String(it.rpid) === String(rpid))
  const filterList = (list: CommentItem[]): CommentItem[] =>
    list
      .filter((it) => String(it.rpid) !== String(rpid))
      .map((it) => {
        it.replies = filterList(it.replies || [])
        return it
      })
  commentList.value = filterList(commentList.value)
  if (topComment.value?.rpid === rpid) topComment.value = null
  if (wasTop) total.value = Math.max(0, total.value - 1)
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
  // 大雪花 uid 用 Number 会丢精度，这里以字符串 uidStr 为可靠标识（与后端 CommentUserBrief.midStr 对齐），
  // mid 字段仅按 SDK number 约束给值；后续对该用户的定位/举报请优先用 midStr / 字符串 id 传参
  const uidStr = currentMid.value != null ? String(currentMid.value) : ''
  const uid = Number(currentMid.value) || 0
  const nav = userNavStore.user_nav
  return {
    rpid: data.rpid,
    oid: String(props.oid),
    type: props.type as InteractionBizTypeEnum,
    mid: uid,
    midStr: uidStr || null,
    member: {
      mid: uid,
      midStr: uidStr || null,
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
    ctime: new Date().toISOString(),
    replies: []
  }
}

const handlers: CommentHandlers = {
  like: async ({ rpid, nextAction }) => {
    // 点赞静默成功（对标 B 站交互），失败提示由后端响应驱动（统一 businessHandler 处理）
    const result = await businessHandler(commentApi.action(rpid, nextAction), {
      showSuccessToast: false,
    })
    if (!result.success) return
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
    // 返回 businessHandler 结果，供子组件判断删除是否成功后同步移除 UI
    return businessHandler(
      commentApi.del(rpid),
      { successMessage: '已删除' },
      [() => removeItem(rpid)]
    )
  },
  reply: async ({ root, parent, message, atNameToMid, replyTo }) => {
    await businessHandler(
      commentApi.add(props.oid, props.type, root, parent, message, atNameToMid),
      { successMessage: '评论成功' },
      [
        (result) => {
          if (!result.success || !result.data) return
          // 不重新拉取全部评论，直接把新回复插入对应根评论的楼中楼首条
          const rootItem = findItem(root)
          // 优先用子组件直接传入的被回复者（更可靠，避免展开后 findItem 找不到楼中楼节点）
          const replyToMember = replyTo ?? findItem(parent)?.member ?? null
          if (rootItem) {
            rootItem.replies = [
              buildNewComment(result.data, message, root, parent, replyToMember),
              ...(rootItem.replies || [])
            ]
            // 审核中的评论不计入计数（与后端 total / rcount 只统计 NORMAL 的口径一致）
            if (!result.data?.need_audit) {
              rootItem.rcount = Number(rootItem.rcount) + 1
              allCount.value += 1
            }
          }
        },
      ]
    )
  },
  expandReplies: async (item: CommentItem, page: number) => {
    const result = await businessHandler(
      commentApi.listReply(item.rpid, props.oid, props.type, page, 10),
      { showSuccessToast: false }
    )
    if (!result.success || !result.data) return { items: [], total: 0 }
    return { items: result.data.items ?? [], total: result.data.total ?? 0 }
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
  const atMap = topMentionRef.value?.buildAtNameToMid(msg) || {}
  await businessHandler(
    commentApi.add(props.oid, props.type, '0', '0', msg, atMap),
    { successMessage: '评论成功' },
    [
      (result) => {
        if (!result.success || !result.data) return
        // 不重新拉取全部评论，直接把新评论插入一级评论列表首条
        commentList.value = [
          buildNewComment(result.data, msg, '0', '0', null),
          ...commentList.value
        ]
        // 审核中的评论不计入计数（与后端 total / all_count 只统计 NORMAL 的口径一致）
        if (!result.data?.need_audit) {
          allCount.value += 1
          total.value += 1
        }
        topMentionRef.value?.reset()
      },
    ]
  )
}

watch([sortBy, currentPage], () => {
  // 切换排序 / 翻页：高亮交由 loadMain 按后端回填的 focus_rpid 重新决定，避免先清 null 再设回导致闪烁
  loadMain()
})

// 评论总数变化时通知外层（如动态详情页联动 stat.commentCount）
watch(allCount, (v) => emit('count-change', v))

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
  // 高亮由 focusRpid 驱动，持续保持，不自动淡出
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
          :class="sortBy === CommentSortEnum.HOT ? 'text-primary font-medium' : 'text-text-placeholder hover:text-text-secondary'"
          @click="sortBy = CommentSortEnum.HOT"
        >
          按热度
        </button>
        <span class="text-text-placeholder text-xs">|</span>
        <button
          class="text-sm cursor-pointer border-none bg-transparent px-0 transition-colors"
          :class="sortBy === CommentSortEnum.TIME ? 'text-primary font-medium' : 'text-text-placeholder hover:text-text-secondary'"
          @click="sortBy = CommentSortEnum.TIME"
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
          <LotteryCommentMention
            ref="topMentionRef"
            v-model="newComment"
            :local-options="mentionOptions"
            placeholder="发一条友善的评论"
            :rows="2"
            class="lottery-comment-section__mention"
          />
          <div class="flex items-center justify-end mt-1">
            <el-button size="small" type="primary" :disabled="!newComment.trim()" @click="submitTopComment">
              发表评论
            </el-button>
          </div>
        </div>
      </div>
    </div>
    <!-- 未登录：B 站风格登录引导（左侧 avatar 占位 + 右侧浅色块内嵌「请先 登录 后发表评论」） -->
    <div
      v-else
      class="lottery-comment-section__login-tip mb-6 flex gap-3"
    >
      <el-avatar :size="40" class="shrink-0">
        <img :src="BiliImg.face.noface" referrerpolicy="no-referrer" alt="头像" />
      </el-avatar>
      <div class="lottery-comment-section__login-box flex-1 flex items-center justify-center gap-2 rounded-md bg-bg-secondary py-3 text-sm text-text-secondary border border-border-light">
        <span>请先</span>
        <el-link
          class="lottery-comment-section__login-link"
          type="primary"
          underline="never"
          @click="openGlobalLoginModal"
        >
          登录
        </el-link>
        <span>后发表评论（╹◡╹）</span>
      </div>
    </div>

    <!-- 评论区加载失败错误态（复用抽奖结果同款 BiliError） -->
    <BiliError
      v-if="isError"
      class="py-16"
      txt="评论加载失败"
      @click-retry="loadMain"
    />
    <!-- 评论列表 -->
    <ul v-else-if="displayList.length" class="lottery-comment-section__list m-0 p-0 list-none divide-y divide-border-light">
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

    <!-- 匿名访问半透明蒙层（对标 B 站：未登录只能看前 10 条，登录看全部） -->
    <div
      v-if="viewerIsAnonymous && displayList.length > 0"
      class="lottery-comment-section__mask relative -mt-24 h-24 pointer-events-none"
    >
      <div class="absolute inset-x-0 bottom-0 h-24 bg-linear-to-b from-transparent to-bg-card pointer-events-none" />
    </div>
    <div
      v-if="viewerIsAnonymous && displayList.length > 0"
      class="lottery-comment-section__login-cta mt-2 mb-6 flex flex-col items-center gap-3"
    >
      <el-text class="text-sm text-text-secondary">登录后查看全部评论</el-text>
      <el-button class="lottery-comment-section__login-btn" type="primary" size="default" @click="openGlobalLoginModal">
        登录
      </el-button>
    </div>

    <!-- 底部分页 -->
    <div v-if="total > 0" class="flex justify-center py-6">
      <el-pagination
        size="small"
        background
        hide-on-single-page
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
