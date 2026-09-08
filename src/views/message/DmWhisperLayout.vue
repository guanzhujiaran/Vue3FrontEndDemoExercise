<template>
  <div class="dm-whisper-layout flex h-full overflow-hidden rounded-lg bg-bg">
    <!-- 左侧：最近消息列表（常驻，不受右侧路由切换影响）。直接用 LoadingMoreContainer 承载滚动与无限加载 -->
    <div class="dm-whisper-layout__sidebar flex w-50 flex-col border-r border-border-lighter bg-bg">
      <!-- 陌生人私信聚合条：参考 B 站「我的应援团」等集合分类——主列表之上常驻一行
           「陌生人私信」，点击进入专门的陌生人子列表（whisper/stranger）。
           红点与 [N条] 副标题取自主列表响应里的 stranger_unread / stranger_total，
           本身不触发额外请求，符合「点开之后再加载具体内容」的懒加载语义。 -->
      <div
        class="dm-whisper-layout__stranger-aggregate flex cursor-pointer items-center gap-3 border-b border-border-lighter px-4 py-3 transition-colors"
        :class="{ 'bg-fill-light': isStrangerView }"
        @click="enterStrangerList"
        v-if="showStrangerAggregate"
      >
        <div class="relative shrink-0">
          <div class="dm-whisper-layout__stranger-icon flex h-12 w-12 items-center justify-center rounded-full bg-bg-overlay text-text-secondary">
            <el-icon :size="22"><ChatLineRound /></el-icon>
          </div>
          <span
            v-if="strangerUnread > 0"
            class="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-msg-pink px-1 text-xs text-white"
          >
            {{ strangerUnread > 99 ? '99+' : strangerUnread }}
          </span>
        </div>
        <div class="min-w-0 flex-1">
          <div class="mb-1 flex items-center justify-between gap-2">
            <span class="truncate text-sm font-medium text-text-primary">
              {{ t('message.strangerDmAggregate') }}
            </span>
          </div>
          <p class="line-clamp-1 text-xs text-text-secondary">
            {{
              strangerUnread > 0
                ? t('message.strangerDmNewMessages', { count: strangerUnread })
                : ' '
            }}
          </p>
        </div>
      </div>
      <LoadingMoreContainer
        class="dm-whisper-layout__list"
        fill-parent
        :handle-load="handleLoad"
        v-model:is-more="isMore"
        v-model:is-loading="isLoading"
        v-model:is-error="isError"
        :show-end-text="items.length > 0"
      >
        <template #content>
          <BiliError
            v-if="isError"
            :txt="t('message.listLoadFailed')"
            @click-retry="onRetry"
          />
          <EmptyState
            v-else-if="!isLoading && items.length === 0"
            :text="t('message.emptyDm')"
          />
            <ul v-else class="dm-whisper-layout__items">
              <li
                v-for="session in items"
                :key="session.talker_mid"
                class="dm-whisper-layout__item group flex cursor-pointer items-center gap-3 px-4 py-3 transition-colors"
                :class="{ 'bg-fill-light': selectedTalkerId === String(session.talker_mid) }"
                @click="selectSession(session)"
              >
                <div class="relative shrink-0">
                  <img
                    class="h-12 w-12 rounded-full object-cover"
                    :src="session.talker_avatar || BiliImg.face.noface"
                    alt="avatar"
                    referrerpolicy="no-referrer"
                  />
                  <span
                    v-if="(session.unread_count ?? 0) > 0"
                    class="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-msg-pink px-1 text-xs text-white"
                  >
                    {{ (session.unread_count ?? 0) > 99 ? '99+' : (session.unread_count ?? 0) }}
                  </span>
                </div>
                <div class="min-w-0 flex-1">
                  <div class="mb-1 flex items-center justify-between gap-2">
                    <span class="truncate text-sm font-medium text-text-primary">
                      {{ session.talker_name || `用户${session.talker_mid}` }}
                    </span>
                  </div>
                  <p class="line-clamp-1 text-xs text-text-secondary">
                    {{ session.last_content_preview || ' ' }}
                  </p>
                </div>
              </li>
            </ul>
          </template>
      </LoadingMoreContainer>
    </div>

    <!-- 右侧：嵌套路由出口，渲染具体的聊天内容（默认空态 / :talkerId 聊天） -->
    <div class="dm-whisper-layout__chat flex-1 min-w-0">
      <router-view v-slot="{ Component, route: childRoute }">
        <!-- 按 fullPath（即 talkerId）做 key，给每个用户单独缓存一份私信：
             切走再切回时保留聊天记录、滚动位置与草稿，而非重新拉取 -->
        <keep-alive :max="10">
          <component
            :is="Component"
            :key="childRoute.fullPath"
            :talker-name="currentTalker?.talker_name ?? null"
            :talker-avatar="currentTalker?.talker_avatar ?? null"
            @refresh-unread="onChildRefreshUnread"
          />
        </keep-alive>
      </router-view>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onActivated, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { ChatLineRound } from '@element-plus/icons-vue'
import { fetchDmSessions, DmSessionType, type DmSessionItem } from '@/api/notify/message-api'
import { BiliImg } from '@/assets/img/BiliImg.ts'
import LoadingMoreContainer from '@/components/CommonCompo/Bili-Container-Compo/LoadingMoreContainer.vue'
import EmptyState from '@/components/message/EmptyState.vue'
import BiliError from '@/components/CommonCompo/Bili-Feedback-Compo/BiliError.vue'

// 供 MessageLayout 的 <keep-alive> 缓存本布局（切走再切回时保留左侧会话列表与滚动位置）
defineOptions({ name: 'DmWhisperLayout' })

const emit = defineEmits<{ refreshUnread: [] }>()
// 承接 MessageLayout 透传的 dm 未读模型（与既有子页面保持一致，左侧列表按各会话 unread_count 展示）
const dmUnread = defineModel<number>('dmUnread', { default: 0 })

const { t } = useI18n()
const route = useRoute()
const router = useRouter()

const PAGE_SIZE = 10

const items = ref<DmSessionItem[]>([])
const isLoading = ref(false)
const isMore = ref(true)
const isError = ref(false)
const total = ref(0)
const page = ref(1)
// 陌生人分类聚合：取自最近一次主列表响应（与列表分页无关，list_sessions 单次返回全局）
const strangerUnread = ref(0)
const strangerTotal = ref(0)
// 拦截开关（recv_stranger_dm=false）。聚合条展示条件：开关已开启 且 确有 STRANGER 会话
const strangerInterceptEnabled = ref(false)
const showStrangerAggregate = computed(
  () => strangerInterceptEnabled.value && strangerTotal.value > 0
)

// 当前路由选中的 talker（用于左侧高亮 + 给右侧聊天页传递昵称/头像）
const selectedTalkerId = computed(() => String(route.params.talkerId ?? ''))
const currentTalker = computed(() =>
  items.value.find((s) => String(s.talker_mid) === selectedTalkerId.value)
)
// 当前是否处于「陌生人私信」子页（用于聚合条高亮）
const isStrangerView = computed(() => route.name === 'MESSAGE_WHISPER_STRANGER')

function resetList() {
  items.value = []
  page.value = 1
  total.value = 0
  isMore.value = true
  isError.value = false
}

async function handleLoad() {
  if (isLoading.value) return
  isLoading.value = true
  isError.value = false
  try {
    // 主侧栏只展示 SINGLE 类型的会话；STRANGER 由聚合条 + whisper/stranger 子页承载。
    const list = await fetchDmSessions({
      page: page.value,
      size: PAGE_SIZE,
      session_type: DmSessionType.SINGLE
    })
    const pageItems = list.items ?? []
    items.value = page.value === 1 ? pageItems : [...items.value, ...pageItems]
    total.value = list.total ?? 0
    page.value += 1
    isMore.value = pageItems.length > 0 && items.value.length < total.value
    // 每次拉取都带回聚合统计与拦截开关状态；非首页分页不重复取（服务端每次都返回，浪费不大）
    strangerUnread.value = list.stranger_unread ?? 0
    strangerTotal.value = list.stranger_total ?? 0
    strangerInterceptEnabled.value = list.stranger_dm_intercept_enabled ?? false
  } catch {
    isError.value = true
  } finally {
    isLoading.value = false
  }
}

// 点击聚合条：进入陌生人分类子页（whisper/stranger），由其独立请求 STRANGER 会话
function enterStrangerList() {
  router.push({ name: 'MESSAGE_WHISPER_STRANGER' })
}

function onRetry() {
  resetList()
  handleLoad()
}

// 子组件（聊天面板）打开会话已调后端 ack 标记已读并抛出 refreshUnread 后，
// 这里把左侧对应会话项的本地未读角标清零，使 dm-whisper-layout__item 上的小红点即时消失。
// 顶部导航的 dm 总红点由 emit('refreshUnread') 向上汇总刷新负责。
function onChildRefreshUnread() {
  const tid = selectedTalkerId.value
  if (tid) {
    const target = String(tid)
    items.value = items.value.map((s) =>
      String(s.talker_mid) === target ? { ...s, unread_count: 0 } : s
    )
  }
  emit('refreshUnread')
}

// 选中会话：站内 SPA 导航到 /app/message/whisper/:talkerId，仅右侧聊天窗口按 talkerId 切换。
// 左侧会话列表常驻，配合 layout 内 keep-alive（按 fullPath 缓存各聊天窗口），
// 切走再切回保留消息与草稿，不再整页重新加载（不再新开标签页）。
function selectSession(session: DmSessionItem) {
  router.push({
    name: 'MESSAGE_WHISPER_CHAT',
    params: { talkerId: String(session.talker_mid) }
  })
}

onActivated(() => {
  // 从其他子页切回时重拉会话列表，使后端已清的未读同步到前端红点
  resetList()
  handleLoad()
})
</script>

<style scoped>
.dm-whisper-layout__list :deep(.el-scrollbar__bar.is-vertical),
.dm-whisper-layout__chat::-webkit-scrollbar {
  width: 6px;
}
.dm-whisper-layout__list :deep(.el-scrollbar__bar.is-vertical .el-scrollbar__thumb),
.dm-whisper-layout__chat::-webkit-scrollbar-thumb {
  background: var(--color-border-light);
  border-radius: 3px;
}
.dm-whisper-layout__item:hover,
.dm-whisper-layout__stranger-aggregate:hover {
  background: var(--color-fill-lighter);
}
</style>
