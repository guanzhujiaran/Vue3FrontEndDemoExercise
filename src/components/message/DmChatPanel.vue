<template>
  <div class="dm-chat-panel flex h-full flex-col bg-bg">
    <!-- 顶部：返回（可选）+ 对方头像/昵称 + 右上角菜单 -->
    <div
      class="dm-chat-panel__header flex shrink-0 items-center justify-between border-b border-border-lighter px-4 py-3"
    >
      <div class="flex min-w-0 items-center gap-3">
        <el-button
          v-if="showBack"
          text
          :icon="ArrowLeft"
          class="shrink-0"
          @click="emit('back')"
        />
        <img
          v-if="talkerAvatar || !showBack"
          class="h-9 w-9 shrink-0 rounded-full object-cover"
          :src="talkerAvatar || BiliImg.face.noface"
          alt="avatar"
          referrerpolicy="no-referrer"
        />
        <span class="truncate text-base font-medium text-text-primary">
          {{ talkerName || `用户${talkerMid}` }}
        </span>
      </div>

      <el-dropdown trigger="click" @command="onMenuCommand">
        <el-button text class="shrink-0 p-2" :title="'更多操作'">
          <el-icon :size="20"><MoreFilled /></el-icon>
        </el-button>
        <template #dropdown>
          <el-dropdown-menu class="dm-chat-panel__menu">
            <el-dropdown-item command="top">
              {{ isTop ? '取消置顶聊天' : '置顶聊天' }}
            </el-dropdown-item>
            <el-dropdown-item command="mute">
              {{ isMuted ? '关闭免打扰' : '开启免打扰' }}
            </el-dropdown-item>
            <el-dropdown-item command="block" divided>加入黑名单</el-dropdown-item>
            <el-dropdown-item command="report">举报该用户</el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
    </div>

    <!-- 消息列表：反向无限加载（最新在底部，默认滚到底；向上拉取更老内容） -->
    <div class="dm-chat-panel__body flex-1 min-h-0 flex flex-col">
      <LoadingWrap v-if="loading" :loading="loading" class="h-full" />
      <BiliError
        v-else-if="isError"
        :txt="t('message.listLoadFailed')"
        @click-retry="load"
      />
      <LoadingMoreContainer
        v-else
        ref="listContainerRef"
        reverse
        fill-parent
        initial-position="bottom"
        :handle-load="loadOlder"
        v-model:is-more="hasMore"
        v-model:is-loading="olderLoading"
        v-model:is-error="olderError"
        :show-end-text="messages.length > 0"
      >
        <template #content>
          <div class="flex flex-col gap-1 p-4">
            <EmptyState v-if="messages.length === 0" :text="t('message.dmEmpty')" />
            <template v-for="(msg, idx) in messages" :key="msg.msgkey">
              <div
                v-if="showTimeDivider(msg, idx)"
                class="dm-chat-panel__time-divider my-2 text-center text-xs text-text-placeholder"
              >
                {{ formatDividerTime(msg.msg_ts) }}
              </div>

              <div
                class="dm-chat-panel__msg flex"
                :class="isSelf(msg) ? 'flex-row-reverse' : 'flex-row'"
              >
                <!-- 对方头像 -->
                <img
                  v-if="!isSelf(msg)"
                  class="dm-chat-panel__avatar h-9 w-9 shrink-0 self-start rounded-full object-cover"
                  :src="talkerAvatar || BiliImg.face.noface"
                  alt="avatar"
                  referrerpolicy="no-referrer"
                />

                <div
                  class="flex max-w-[70%] flex-col"
                  :class="isSelf(msg) ? 'items-end' : 'items-start'"
                >
                  <!-- 对方昵称 -->
                  <span
                    v-if="!isSelf(msg)"
                    class="mb-1 max-w-full truncate px-1 text-xs text-text-secondary"
                  >
                    {{ talkerName || `用户${talkerMid}` }}
                  </span>

                  <!-- 气泡 -->
                  <div
                    v-if="msg.audit_state === DmAuditStateEnum.REJECTED || msg.audit_state === DmAuditStateEnum.HIDDEN"
                    class="dm-chat-panel__bubble dm-chat-panel__bubble--system rounded-lg px-4 py-2.5 text-sm"
                  >
                    {{ msg.audit_state === DmAuditStateEnum.HIDDEN ? t('message.dmHidden') : t('message.dmRejected') }}
                  </div>
                  <div
                    v-else-if="msg.msg_status === DmMsgStatusEnum.RECALLED"
                    class="dm-chat-panel__bubble dm-chat-panel__bubble--system rounded-lg px-4 py-2.5 text-sm"
                  >
                    {{ t('message.dmRecalled') }}
                  </div>
                  <div
                    v-else
                    class="dm-chat-panel__bubble rounded-lg px-4 py-2.5 text-sm leading-relaxed"
                    :class="
                      isSelf(msg)
                        ? 'bg-primary text-white'
                        : 'bg-bg-overlay text-text-primary'
                    "
                  >
                    <span class="whitespace-pre-wrap break-words">{{ msg.content }}</span>
                  </div>

                  <!-- 时间 -->
                  <span class="mt-1 px-1 text-xs text-text-placeholder">
                    {{ formatTime(msg.msg_ts) }}
                  </span>
                </div>
              </div>
            </template>
          </div>
        </template>
      </LoadingMoreContainer>
    </div>

    <!-- 底部输入区 -->
    <div class="dm-chat-panel__footer shrink-0 border-t border-border-lighter p-3">
      <div class="dm-chat-panel__toolbar mb-2 flex items-center gap-1">
        <el-button text circle title="发送图片" @click="onImage">
          <template #icon>
            <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6">
              <rect x="3" y="5" width="18" height="14" rx="2" />
              <circle cx="8.5" cy="9.5" r="1.5" />
              <path d="M21 15l-4.5-4.5L10 17l-3-3L3 18" />
            </svg>
          </template>
        </el-button>
        <el-button text circle title="表情" @click="onEmoji">
          <template #icon>
            <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6">
              <circle cx="12" cy="12" r="10" />
              <circle cx="9" cy="9" r="1.2" fill="currentColor" stroke="none" />
              <circle cx="15" cy="9" r="1.2" fill="currentColor" stroke="none" />
              <path d="M8 14c1.2 1.6 3 2 4 2s2.8-.4 4-2" />
            </svg>
          </template>
        </el-button>
      </div>

      <div class="dm-chat-panel__input-row flex items-end gap-3">
        <el-input
          v-model="draft"
          type="textarea"
          :rows="1"
          :autosize="{ minRows: 1, maxRows: 5 }"
          resize="none"
          :maxlength="500"
          class="dm-chat-panel__input flex-1"
          :placeholder="t('message.dmSendPlaceholder')"
          @keydown.enter.exact.prevent="onSend"
        />
        <div class="flex flex-col items-end gap-1">
          <span class="text-xs text-text-placeholder">{{ draft.length }}/500</span>
          <el-button
            :disabled="!draft.trim() || sending"
            :loading="sending"
            class="dm-chat-panel__send-btn"
            @click="onSend"
          >
            发送
          </el-button>
        </div>
      </div>
    </div>

    <ReportDialog
      v-model="reportVisible"
      :biz-type="ReportBizTypeEnum.USER"
      :biz-id="String(talkerMid)"
      @submitted="onReportSubmitted"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onActivated, onDeactivated, onMounted, onUnmounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { ArrowLeft, MoreFilled } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import {
  fetchDmMessages,
  sendDm,
  ackDmSession,
  DmMsgStatusEnum,
  DmAuditStateEnum,
  type DmMessageItem
} from '@/api/notify/message-api'
import { ReportBizTypeEnum } from '@/api/notify/moment-api'
import { BiliImg } from '@/assets/img/BiliImg.ts'
import LoadingWrap from '@/components/message/LoadingWrap.vue'
import EmptyState from '@/components/message/EmptyState.vue'
import BiliError from '@/components/CommonCompo/Bili-Feedback-Compo/BiliError.vue'
import LoadingMoreContainer from '@/components/CommonCompo/Bili-Container-Compo/LoadingMoreContainer.vue'
import ReportDialog from '@/components/moment/ReportDialog.vue'
import userApi from '@/api/user/user_api'

// LoadingMoreContainer 暴露给父组件控制滚动的句柄
type ChatListContainer = {
  scrollToBottom: () => void
  getScrollEl: () => HTMLElement | undefined
}

const props = withDefaults(
  defineProps<{
    talkerMid: string | number
    talkerName?: string | null
    talkerAvatar?: string | null
    showBack?: boolean
  }>(),
  {
    talkerName: null,
    talkerAvatar: null,
    showBack: false
  }
)

const emit = defineEmits<{
  back: []
  refreshUnread: []
}>()

const { t } = useI18n()

const messages = ref<DmMessageItem[]>([])
const loading = ref(false)
const isError = ref(false)
// 反向无限加载（向上拉取更老消息）状态
const hasMore = ref(true)
const olderLoading = ref(false)
const olderError = ref(false)
// 翻页游标：当前已加载消息中最旧的 msgkey，用于拉取更老的一页
const cursor = ref<string | null>(null)
const draft = ref('')
const sending = ref(false)
const reportVisible = ref(false)
const isTop = ref(false)
const isMuted = ref(false)
const listContainerRef = ref<ChatListContainer | null>(null)

// 轮询：在对应聊天界面激活时每 5s 拉取最新消息，实现轻量实时通信
const POLL_INTERVAL = 5000
const pollLoading = ref(false)
let pollTimer: ReturnType<typeof setInterval> | null = null

const talkerMidStr = computed(() => String(props.talkerMid))

function isSelf(msg: DmMessageItem): boolean {
  return String(msg.sender_uid) !== talkerMidStr.value
}

function formatTime(ts?: number | null): string {
  if (!ts) return ''
  const d = new Date(ts)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function formatDividerTime(ts?: number | null): string {
  if (!ts) return ''
  const d = new Date(ts)
  const y = d.getFullYear()
  const m = d.getMonth() + 1
  const day = d.getDate()
  const h = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  return `${y}年${m}月${day}日 ${h}:${min}`
}

function showTimeDivider(msg: DmMessageItem, idx: number): boolean {
  if (idx === 0) return true
  const prev = messages.value[idx - 1]
  const prevTs = prev?.msg_ts ?? 0
  const currTs = msg.msg_ts ?? 0
  if (!prevTs || !currTs) return false
  // 日期不同 或 间隔超过 5 分钟，显示一次时间分隔
  const prevD = new Date(prevTs)
  const currD = new Date(currTs)
  if (
    prevD.getFullYear() !== currD.getFullYear() ||
    prevD.getMonth() !== currD.getMonth() ||
    prevD.getDate() !== currD.getDate()
  ) {
    return true
  }
  return currTs - prevTs > 5 * 60 * 1000
}

async function load() {
  if (!props.talkerMid) return
  loading.value = true
  isError.value = false
  olderError.value = false
  hasMore.value = true
  cursor.value = null
  try {
    const res = await fetchDmMessages({ talker_mid: talkerMidStr.value, size: 10 })
    // 后端按 msgkey 倒序返回（最新消息在前），聊天展示需要最早在上、最新在底部
    messages.value = [...(res.items ?? [])].reverse()
    cursor.value = res.cursor ?? null
    hasMore.value = res.has_more
    // 打开会话即标记已读：把该会话未读清零并抬高已读水位，后端红点随之消失。
    // 失败不影响消息展示，静默忽略（下次打开或轮询仍会再同步）。
    try {
      await ackDmSession({ talker_mid: talkerMidStr.value })
    } catch {
      // 标记已读失败静默处理
    }
    emit('refreshUnread')
    // 首屏定位到最新消息（底部）；容器此时已渲染，直接调用其滚动句柄
    await nextTick(() => listContainerRef.value?.scrollToBottom())
  } catch {
    isError.value = true
  } finally {
    loading.value = false
  }
}

// 向上拉取更老的消息（游标翻页），并补偿滚动位置避免视图跳动
async function loadOlder() {
  if (olderLoading.value || !hasMore.value || !cursor.value) return
  olderLoading.value = true
  try {
    const el = listContainerRef.value?.getScrollEl()
    const prevHeight = el?.scrollHeight ?? 0
    const prevTop = el?.scrollTop ?? 0
    const res = await fetchDmMessages({
      talker_mid: talkerMidStr.value,
      cursor: cursor.value,
      size: 10
    })
    // 后端返回最新在前，翻转为最早在前后拼接到现有列表头部
    const older = [...(res.items ?? [])].reverse()
    const existingKeys = new Set(messages.value.map((m) => m.msgkey))
    const filtered = older.filter((m) => !existingKeys.has(m.msgkey))
    if (filtered.length > 0) {
      messages.value = [...filtered, ...messages.value]
    }
    cursor.value = res.cursor ?? null
    hasMore.value = res.has_more
    // 补偿：在顶部插入新内容后，把滚动条下移相同高度，保持原消息视觉位置不动
    await nextTick(() => {
      const target = listContainerRef.value?.getScrollEl()
      if (target) target.scrollTop = target.scrollHeight - prevHeight + prevTop
    })
  } catch {
    olderError.value = true
  } finally {
    olderLoading.value = false
  }
}

function scrollToBottom() {
  listContainerRef.value?.scrollToBottom()
}

// 判断用户是否已贴近消息列表底部（用于决定轮询到新消息时是否自动跟随滚动）
function isNearBottom(): boolean {
  const el = listContainerRef.value?.getScrollEl()
  if (!el) return true
  return el.scrollHeight - el.scrollTop - el.clientHeight < 80
}

// 增量轮询：拉取最新一页并按 msgkey 去重合并，仅追加真正的新消息，
// 不打断用户翻阅历史（仅当用户贴近底部时才自动滚动到最新）。
async function pollLoad() {
  if (!props.talkerMid || pollLoading.value) return
  pollLoading.value = true
  try {
    const res = await fetchDmMessages({ talker_mid: talkerMidStr.value, size: 10 })
    const fetched = [...(res.items ?? [])].reverse()
    const existingKeys = new Set(messages.value.map((m) => m.msgkey))
    let added = 0
    const merged = messages.value.slice()
    for (const m of fetched) {
      if (!existingKeys.has(m.msgkey)) {
        merged.push(m)
        added++
      }
    }
    if (added > 0) {
      messages.value = merged
      if (isNearBottom()) {
        await nextTick(() => scrollToBottom())
      }
    }
  } catch {
    // 轮询失败静默处理：不弹错误、不阻塞交互，下次周期再试
  } finally {
    pollLoading.value = false
  }
}

function startPolling() {
  stopPolling()
  pollTimer = setInterval(pollLoad, POLL_INTERVAL)
}

function stopPolling() {
  if (pollTimer !== null) {
    clearInterval(pollTimer)
    pollTimer = null
  }
}

async function onSend() {
  const text = draft.value.trim()
  if (!text || sending.value) return
  sending.value = true
  try {
    const ok = await sendDm({ receiver_mid: talkerMidStr.value, content: text })
    if (ok) {
      draft.value = ''
      await load()
    }
  } finally {
    sending.value = false
  }
}

function onImage() {
  ElMessage.info('图片发送功能开发中')
}

function onEmoji() {
  ElMessage.info('表情功能开发中')
}

async function onMenuCommand(command: string) {
  switch (command) {
    case 'top':
      isTop.value = !isTop.value
      ElMessage.success(isTop.value ? '已置顶聊天' : '已取消置顶')
      break
    case 'mute':
      isMuted.value = !isMuted.value
      ElMessage.success(isMuted.value ? '已开启免打扰' : '已关闭免打扰')
      break
    case 'block': {
      const mid = Number(props.talkerMid)
      if (!mid) return
      const res = await userApi.BlocklistAdd(mid)
      if (res?.success) {
        ElMessage.success('已加入黑名单')
      }
      break
    }
    case 'report':
      reportVisible.value = true
      break
  }
}

function onReportSubmitted() {
  ElMessage.success('举报已提交')
}

// 每个用户的会话仅首次挂载时完整拉取一次消息，之后由 keep-alive 按 talkerId 缓存实例，
// 切换用户再切回时直接复用缓存（保留消息、滚动位置与草稿），不再整页重新加载。
onMounted(load)
// 进入对应聊天界面仅启动 5s 轮询；切走或缓存被回收时停止轮询。
// 注意：激活时不做立即刷新，避免每次切换页面都额外发一次请求——
// 实时性由轮询间隔（首轮在 5s 后触发）保证，而非在切换瞬间拉取。
onActivated(startPolling)
onDeactivated(stopPolling)
onUnmounted(stopPolling)

defineExpose({ load })
</script>

<style scoped>
.dm-chat-panel__body::-webkit-scrollbar {
  width: 6px;
}
.dm-chat-panel__body::-webkit-scrollbar-thumb {
  background: var(--color-border-light);
  border-radius: 3px;
}
.dm-chat-panel__bubble {
  max-width: 100%;
  word-break: break-word;
}
.dm-chat-panel__bubble--system {
  background: var(--color-bg-overlay);
  color: var(--color-text-placeholder);
}
.dm-chat-panel__avatar {
  margin-right: 0.75rem;
}
.dm-chat-panel__send-btn {
  background: #222 !important;
  border-color: #222 !important;
  color: #fff !important;
}
.dm-chat-panel__send-btn:hover:not(:disabled) {
  background: #333 !important;
  border-color: #333 !important;
}
.dm-chat-panel__send-btn.is-disabled {
  background: var(--color-fill) !important;
  border-color: var(--color-fill) !important;
  color: var(--color-text-placeholder) !important;
}
</style>
