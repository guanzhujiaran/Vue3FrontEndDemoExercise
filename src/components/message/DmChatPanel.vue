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
          v-if="displayAvatar || !showBack"
          class="h-9 w-9 shrink-0 rounded-full object-cover"
          :src="displayAvatar || BiliImg.face.noface"
          alt="avatar"
          referrerpolicy="no-referrer"
        />
        <span class="truncate text-base font-medium text-text-primary">
          {{ displayName }}
        </span>
      </div>

      <el-dropdown v-if="!talkerMissing" trigger="click" @command="onMenuCommand">
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
            <el-dropdown-item command="block" divided>
              {{ iBlocked ? '解除拉黑' : '加入黑名单' }}
            </el-dropdown-item>
            <el-dropdown-item command="report">举报该用户</el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
    </div>

    <!-- 消息列表：反向无限加载（最新在底部，默认滚到底；向上拉取更老内容） -->
    <div class="dm-chat-panel__body flex-1 min-h-0 flex flex-col">
      <LoadingWrap v-if="talkerLoading" :loading="true" class="h-full" />
      <LoadingWrap v-else-if="loading" :loading="loading" class="h-full" />
      <BiliError
        v-else-if="isError"
        :txt="t('message.listLoadFailed')"
        @click-retry="load"
      />
      <EmptyState v-else-if="talkerMissing" :text="t('message.dmEmpty')" class="h-full" />
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
                  :src="displayAvatar || BiliImg.face.noface"
                  alt="avatar"
                  referrerpolicy="no-referrer"
                />

                <!-- 消息主体：右键弹出「撤回 / 删除」菜单 -->
                <el-dropdown
                  trigger="contextmenu"
                  :show-timeout="0"
                  :hide-timeout="100"
                  class="dm-chat-panel__msg-main min-w-0 max-w-[70%]"
                  @command="(cmd: string) => onMessageCommand(msg, cmd)"
                >
                  <div
                    class="dm-chat-panel__msg-body flex min-w-0 flex-col"
                    :class="isSelf(msg) ? 'items-end' : 'items-start'"
                  >
                    <!-- 对方昵称 -->
                    <span
                      v-if="!isSelf(msg)"
                      class="mb-1 max-w-full truncate px-1 text-xs text-text-secondary"
                    >
                      {{ displayName }}
                    </span>

                    <!-- 气泡 -->
                    <div
                      v-if="msg.audit_state === ResourceAuditStatusEnum.REJECTED || msg.audit_state === ResourceAuditStatusEnum.HIDDEN"
                      class="dm-chat-panel__bubble dm-chat-panel__bubble--system max-w-full break-words rounded-lg px-4 py-2.5 text-sm"
                    >
                      {{ msg.audit_state === ResourceAuditStatusEnum.HIDDEN ? t('message.dmHidden') : t('message.dmRejected') }}
                    </div>
                    <div
                      v-else-if="msg.msg_status === DmMsgStatusEnum.RECALLED"
                      class="dm-chat-panel__bubble dm-chat-panel__bubble--system max-w-full break-words rounded-lg px-4 py-2.5 text-sm"
                    >
                      {{ t('message.dmRecalled') }}
                    </div>
                    <div
                      v-else
                      class="dm-chat-panel__bubble max-w-full break-words rounded-lg px-4 py-2.5 text-sm leading-relaxed"
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
                  <template #dropdown>
                    <el-dropdown-menu class="dm-chat-panel__msg-menu">
                      <el-dropdown-item
                        v-if="isSelf(msg) && canRecall(msg)"
                        command="recall"
                      >
                        撤回
                      </el-dropdown-item>
                      <el-dropdown-item command="delete">删除</el-dropdown-item>
                    </el-dropdown-menu>
                  </template>
                </el-dropdown>
              </div>
            </template>
          </div>
        </template>
      </LoadingMoreContainer>
    </div>

    <!-- 底部输入区：用户不存在/拉取失败时隐藏，避免向不存在的用户发送消息 -->
    <div v-if="!talkerMissing" class="dm-chat-panel__footer shrink-0 border-t border-border-lighter p-3">
      <!-- 黑名单态：历史私信仍可查看，但输入区禁用并提示 -->
      <div
        v-if="blockedWithTalker"
        class="dm-chat-panel__blocked-tip px-3 py-2.5 text-center text-sm text-text-placeholder"
      >
        {{ t('message.dmBlockedCannotSend') }}
      </div>
      <div v-else class="dm-chat-panel__input-row flex items-end gap-3">
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
      :biz-type="InteractionBizTypeEnum.USER"
      :biz-id="String(talkerMid)"
      @submitted="onReportSubmitted"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onActivated, onDeactivated, onMounted, onUnmounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { ArrowLeft, MoreFilled } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  fetchDmMessages,
  sendDm,
  ackDmSession,
  recallDmMessage,
  deleteDmMessages,
  DmMsgStatusEnum,
  DmMsgTypeEnum,
  ResourceAuditStatusEnum,
  type DmMessageItem
} from '@/api/notify/message-api'
import { InteractionBizTypeEnum, fetchUserSpaceInfo } from '@/api/notify/moment-api'
import { useUserNavStore } from '@/stores/user_nav'
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
// 当前登录用户信息（取自己 mid 用于本地构造「我发送的消息」气泡，避免整段重拉）
const userNavStore = useUserNavStore()
const selfMid = computed(() => String(userNavStore.user_nav.uid || ''))

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

// 轮询：在对应聊天界面激活时每 15s 增量查新一次（direction=forward 游标增量，开销恒定），
// 实时性要求不高，降低请求频率减轻前后端负担
const POLL_INTERVAL = 15000
const pollLoading = ref(false)
let pollTimer: ReturnType<typeof setInterval> | null = null

const talkerMidStr = computed(() => String(props.talkerMid))

// 展示用「对方资料」：优先用主动拉取到的真实资料（按 mid 走 /user/space/info），
// 回退到布局透传的会话快照（昵称/头像），最后回落到「用户{mid}」+ 默认头像。
// 不再依赖外部 deep link 带入的 ?name= 查询参数。
const talkerInfo = ref<{ name?: string | null; face?: string | null } | null>(null)
const displayName = computed(() => talkerInfo.value?.name || props.talkerName || `用户${talkerMidStr.value}`)
const displayAvatar = computed(() => talkerInfo.value?.face || props.talkerAvatar || null)

// 拉取对方资料时的加载态与「用户不存在/拉取失败」标记：
// 命中时直接展示「暂无消息」默认页，不再渲染消息列表与输入框。
const talkerLoading = ref(false)
const talkerMissing = ref(false)
// 与对方存在黑名单关系（我拉黑对方 / 被对方拉黑）：历史私信仍展示，但禁止再发送。
const blockedWithTalker = ref(false)
// 是否是我主动拉黑对方（决定顶部菜单显示「加入黑名单 / 解除拉黑」）
const iBlocked = ref(false)

// 撤回时间窗口（与后端 settings.dm_recall_window_seconds=120 对齐）
const RECALL_WINDOW_MS = 120 * 1000

/** 自己发送的消息是否仍可撤回：仅当是自己发送、状态正常、且未超时 */
function canRecall(msg: DmMessageItem): boolean {
  if (!msg.msgkey) return false
  // 发送者判定与气泡归属（isSelf）语义一致：单聊中「非对方即自己」，
  // 不依赖登录态（user_nav.uid）的加载时序——此前用 selfMid 精确比较，
  // 登录态未就绪时撤回项会整体消失；selfMid 就绪后再做一次交叉校验。
  if (!isSelf(msg)) return false
  if (selfMid.value && String(msg.sender_uid) !== selfMid.value) return false
  if (msg.msg_status !== DmMsgStatusEnum.NORMAL) return false
  const ts = msg.msg_ts ?? 0
  if (!ts) return false
  return Date.now() - ts <= RECALL_WINDOW_MS
}

async function fetchTalker() {
  const mid = Number(props.talkerMid)
  if (!mid) {
    talkerMissing.value = true
    return
  }
  talkerLoading.value = true
  try {
    const res = await fetchUserSpaceInfo(mid)
    if (res.code === 0 && res.data) {
      // 正常用户：展示真实昵称 / 头像
      talkerInfo.value = { name: res.data.name ?? null, face: res.data.face ?? null }
      blockedWithTalker.value = false
      talkerMissing.value = false
    } else if (res.code === 403) {
      // 黑名单互访（403）：不影响阅读已存在的历史私信，仅禁止再发送。
      // 不置 talkerMissing，保留聊天窗，展示历史消息；对方资料回落到会话快照 / 占位。
      blockedWithTalker.value = true
      talkerMissing.value = false
      talkerInfo.value = { name: props.talkerName || `用户${talkerMidStr.value}`, face: props.talkerAvatar || null }
      // 判定方向：是否我主动拉黑了对方（用于顶部「解除拉黑」入口）
      try {
        const r = await userApi.BlocklistCheck(mid)
        iBlocked.value = r?.success ? Boolean(r.data?.i_blocked) : false
      } catch {
        iBlocked.value = false
      }
    } else {
      // 用户不存在 / 拉取失败：无可聊对象，展示「暂无消息」默认页
      blockedWithTalker.value = false
      talkerMissing.value = true
    }
  } catch {
    // 网络异常等：同样视为「无此用户」，展示空默认页
    blockedWithTalker.value = false
    talkerMissing.value = true
  } finally {
    talkerLoading.value = false
  }
}

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
    hasMore.value = res.has_more ?? false
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
    hasMore.value = res.has_more ?? false
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

// 已加载消息中的最大 msgkey（msgkey 为 64 位雪花 ID，用 BigInt 比较避免精度问题），
// 作为轮询「增量查新」的正向游标：direction=forward 只拉比它新的消息。
const newestMsgkey = computed<string | null>(() => {
  let max: string | null = null
  for (const m of messages.value) {
    if (!m.msgkey) continue
    if (max === null || BigInt(m.msgkey) > BigInt(max)) max = m.msgkey
  }
  return max
})

// 增量轮询查新：带「已见最大 msgkey」作为 cursor、direction=forward，
// 服务端只返回增量新消息（升序，可直接追加），无新消息时返回空列表，
// 开销恒定、不再整页重拉。仅当贴近底部时自动滚动到最新，不打断翻阅历史。
async function pollLoad() {
  if (!props.talkerMid || pollLoading.value) return
  pollLoading.value = true
  try {
    if (newestMsgkey.value) {
      const res = await fetchDmMessages({
        talker_mid: talkerMidStr.value,
        cursor: newestMsgkey.value,
        size: 10,
        direction: 'forward'
      })
      const fresh = res.items ?? []
      if (fresh.length) {
        const existingKeys = new Set(messages.value.map((m) => m.msgkey))
        const added = fresh.filter((m) => !existingKeys.has(m.msgkey))
        if (added.length) {
          messages.value = [...messages.value, ...added]
          if (isNearBottom()) {
            await nextTick(() => scrollToBottom())
          }
        }
      }
    } else {
      // 尚无已加载消息（异常兜底）：回落拉最新一页
      const res = await fetchDmMessages({ talker_mid: talkerMidStr.value, size: 10 })
      const fetched = [...(res.items ?? [])].reverse()
      const existingKeys = new Set(messages.value.map((m) => m.msgkey))
      const merged = messages.value.slice()
      for (const m of fetched) {
        if (!existingKeys.has(m.msgkey)) merged.push(m)
      }
      messages.value = merged
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
    const resp = await sendDm({ receiver_mid: talkerMidStr.value, content: text })
    if (resp) {
      // 发送成功：直接按发送回执本地构造并追加这条消息，不再整段重拉聊天记录
      //（避免触发 loading 骨架屏闪动、丢失浏览位置）。真实 msgkey 与轮询 / 历史
      // 同源，后续 pollLoad / 翻页按 msgkey 去重，不会出现重复气泡。
      draft.value = ''
      const ts = resp.msg_ts || Date.now()
      const localMsg: DmMessageItem = {
        msgkey: resp.msgkey,
        sender_uid: Number(selfMid.value) || 0,
        sender_uidStr: selfMid.value || null,
        msg_type: DmMsgTypeEnum.TEXT,
        msg_status: DmMsgStatusEnum.NORMAL,
        content: text,
        content_ready: true,
        msg_ts: ts,
        created_at: new Date(ts).toISOString(),
        audit_state: ResourceAuditStatusEnum.NORMAL
      }
      if (!messages.value.some((m) => m.msgkey === resp.msgkey)) {
        messages.value = [...messages.value, localMsg]
      }
      await nextTick(() => scrollToBottom())
    }
  } finally {
    sending.value = false
  }
}

/** 消息右键菜单：撤回 / 删除（成功后仅更新本地对应气泡，不整段重拉） */
async function onMessageCommand(msg: DmMessageItem, command: string) {
  if (!msg?.msgkey) return
  if (command === 'recall') {
    if (!canRecall(msg)) {
      ElMessage.warning('消息发送已超过可撤回时间')
      return
    }
    try {
      await ElMessageBox.confirm('撤回后对方也将无法看到该消息，确定撤回？', '撤回消息', {
        confirmButtonText: '撤回',
        cancelButtonText: '取消',
        type: 'warning'
      })
    } catch {
      return // 用户取消
    }
    const ok = await recallDmMessage(msg.msgkey)
    if (!ok) return // 失败已由 request 弹错（含后端超时拒绝）
    // 本地标记为已撤回，展示「XX 撤回了一条消息」样式
    messages.value = messages.value.map((m) =>
      m.msgkey === msg.msgkey
        ? { ...m, msg_status: DmMsgStatusEnum.RECALLED, content: null, content_ready: true }
        : m
    )
    return
  }
  if (command === 'delete') {
    try {
      await ElMessageBox.confirm('删除后仅自己不可见，对方仍可看到。确定删除？', '删除消息', {
        confirmButtonText: '删除',
        cancelButtonText: '取消',
        type: 'warning'
      })
    } catch {
      return // 用户取消
    }
    const ok = await deleteDmMessages([msg.msgkey])
    if (!ok) return
    messages.value = messages.value.filter((m) => m.msgkey !== msg.msgkey)
  }
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
      if (iBlocked.value) {
        // 已拉黑对方 → 解除：恢复发送能力
        const res = await userApi.BlocklistRemove(mid)
        if (res?.success) {
          ElMessage.success('已解除拉黑')
          iBlocked.value = false
          blockedWithTalker.value = false
        }
      } else {
        const res = await userApi.BlocklistAdd(mid)
        if (res?.success) {
          ElMessage.success('已加入黑名单')
          iBlocked.value = true
          blockedWithTalker.value = true
        }
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
// 先按 mid 拉取对方资料：用户不存在/拉取失败时直接展示「暂无消息」默认页，不再拉消息。
onMounted(async () => {
  await fetchTalker()
  if (!talkerMissing.value) {
    load()
  }
})
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
