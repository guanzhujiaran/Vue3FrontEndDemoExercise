<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, provide, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { VideoPlay, VideoPause, Refresh, Camera, ArrowLeft, Tools, Minus, Close } from '@element-plus/icons-vue'
import { useDebounceFn } from '@vueuse/core'
import { ElMessageBox, ElDialog } from 'element-plus'
import BiliPageHeader from '@/components/CommonCompo/Bili-Container-Compo/BiliPageHeader.vue'
import FlexContainer from '@/components/CommonCompo/Bili-Container-Compo/FlexContainer.vue'
import { WebRtc视频流Service, 执行引擎Service, 浏览器会话控制Service, 浏览器指纹管理Service, type BrowserLaunchQueueStatusResponse } from '@/api/browser/hey-api'
import { useUserNavStore } from '@/stores/user_nav'
import biliMessage from '@/utils/message'
import { businessHandler } from '@/utils/businessHandler'
import LiveBox from '@/components/rpa-browser/LiveBox.vue'
import LaunchQueuePanel from '@/components/rpa-browser/LaunchQueuePanel.vue'
import DebugBox from '@/components/rpa-browser/DebugBox.vue'
import ToolboxPanel from '@/components/rpa-browser/ToolboxPanel.vue'
import EditCustomActionDialog from '@/components/rpa-browser/EditCustomActionDialog.vue'
import MinimizeBar from '@/components/rpa-browser/MinimizeBar.vue'
import { RouteName } from '@/models/router/index.ts'
import { useBrowserSessionState } from '@/composables/useBrowserSessionState'
import { useBrowserSessionEvents, type BrowserSessionStatusSnapshot } from '@/composables/useBrowserSessionEvents'
import { useI18n } from 'vue-i18n'

const route = useRoute()
const router = useRouter()
const userNavStore = useUserNavStore()
const { t } = useI18n()

interface BrowserInfo {
  browser_id: number
  browser_id_str: string
  custom_name?: string | null
  fingerprint_platform?: string | null
  fingerprint_browser?: string | null
  fingerprint_brand_version?: string | null
  fingerprint_hardware_concurrency?: number | null
  fingerprint_gpu_vendor?: string | null
  fingerprint_gpu_renderer?: string | null
  lang?: string | null
  timezone?: string | null
  proxy_server?: string | null
  created_at?: string
  updated_at?: string
  [key: string]: unknown
}

const browserId = String(route.params.browserId)

// ===== 状态机 =====
const {
  browserSessionStatus,
  isConnected,
  isConnecting,
  hasError,
  statusLabel,
  errorMessage,
  onSessionStarting,
  onSessionCreated,
  onSessionStartFailed,
  onSessionStopped,
  onSessionStopFailed,
  onStatusResponse,
  isQueued,
  onQueueEnded,
} = useBrowserSessionState()

const isStreaming = ref(false)
/** 画面是否处于暂停态（由 LiveBox 上抛）：用于标注网速行的真实含义 */
const isStreamPaused = ref(false)
const uploadSpeed = ref('0')
const downloadSpeed = ref('0')
const browserInfo = ref<BrowserInfo | null>(null)
const webrtcStatus = ref<'disconnected' | 'connecting' | 'connected'>('disconnected')
const isLoading = ref(false)
const splitterSize = ref(50)
const isLoadingInfo = ref(true)
const toolboxVisible = ref(false)
const toolboxMinimized = ref(false)
const toolboxDialogVisible = computed({
  get: () => toolboxVisible.value && !toolboxMinimized.value,
  set: (val: boolean) => {
    if (!val && !toolboxMinimized.value) {
      toolboxVisible.value = false
    }
  },
})

function handleToolboxMinimize() {
  toolboxMinimized.value = true
}

function handleToolboxRestore() {
  toolboxMinimized.value = false
}

function handleToolboxClose() {
  toolboxMinimized.value = false
  toolboxVisible.value = false
}

function openToolbox() {
  toolboxVisible.value = true
  toolboxMinimized.value = false
}

provide('isStreaming', isStreaming)
provide('browserSessionStatus', browserSessionStatus)
provide('isSessionConnected', isConnected)
provide('uploadSpeed', uploadSpeed)
provide('downloadSpeed', downloadSpeed)

// ===== 左侧直播区随会话启动「布丁」显隐 =====
// 规则：浏览器未启动（disconnected / connecting / queued）时不占位，启动成功（connected）后才展示直播区。
// `isConnected` 的语义正是「会话存在且浏览器在跑」（见 useBrowserSessionState），因此直接复用，
// 不再另起一套判断，避免与状态机口径不一致。
//
// 显隐不销毁面板（LiveBox 保持挂载，避免每次启停都重新拉页面列表 / 重连信令），
// 而是把左侧面板的 size 在 `40%` 与 `0%` 之间切换：
// - el-splitter 会据此重算两侧 flex-basis，右侧面板自动补满（0% + 100% / 40% + 60%）；
// - 切换瞬间给两个面板挂上 flex-basis 过渡（模板里的 `transition-[flex-basis] duration-550
//   ease-[cubic-bezier(0.34,1.56,0.64,1)]`，曲线与时长即 bili-side-nav 的布丁参数），
//   两侧同曲线同步变化、和恒等于容器宽度 → 不会有留白，视觉上是两块面板相互挤压回弹。
const isLivePanelVisible = computed(() => isConnected.value)

/** 显隐过渡时长：必须与模板中过渡类的 `duration-550` 一致（用于动画结束后摘掉过渡类） */
const LIVE_PANEL_TOGGLE_MS = 550
/** 过渡进行中标记：只在切换瞬间挂过渡类，用户拖动分隔条时不受过渡影响（否则拖拽会跟手滞后） */
const isLivePanelAnimating = ref(false)
let livePanelAnimTimer: ReturnType<typeof setTimeout> | null = null

// 首次进入页面（含刷新后已在直播）不播放动画：watch 只在变化时触发，天然跳过首帧赋值
watch(isLivePanelVisible, () => {
  isLivePanelAnimating.value = true
  if (livePanelAnimTimer) clearTimeout(livePanelAnimTimer)
  livePanelAnimTimer = setTimeout(() => {
    isLivePanelAnimating.value = false
    livePanelAnimTimer = null
  }, LIVE_PANEL_TOGGLE_MS)
})

const loadBrowserInfo = async () => {
  isLoadingInfo.value = true

  if (!userNavStore.user_nav.uid) {
    console.warn('User uid is empty, please login first')
    biliMessage.warning(t('rpa.pleaseLogin'))
    router.push({ name: RouteName.HOME })
    isLoadingInfo.value = false
    return
  }

  const result = await businessHandler<BrowserInfo>(
    浏览器指纹管理Service.readFingerprintRouterApiV1RpaBrowserReadFingerprintPost({
      query: { browser_id: browserId },
    }) as any,
    { successMessage: '', errorMessage: t('rpa.getFingerprintFailed'), showSuccessToast: false }
  )

  if (result.success && result.data) {
    browserInfo.value = result.data
  } else {
    router.push({ name: RouteName.RPA_BROWSER_FINGERPRINT_LIST })
  }

  isLoadingInfo.value = false
}

const handleStartSession = async () => {
  isLoading.value = true
  onSessionStarting()

  try {
    const response = await 浏览器会话控制Service.createBrowserSessionApiV1RpaBrowserControlCreatePost({
      query: { browser_id: browserId },
      timeout: 300000 // 5分钟超时，浏览器启动可能需要较长时间
    }) as any  // responseStyle='data' → 直接返回 {code, data, msg}

    if (response?.code === 0) {
      const data = response.data

      if (data.browser_started) {
        biliMessage.info(data.message || t('rpa.sessionExists'))
      } else if (data.queued) {
        // 内存不足：进入启动队列，排队进度交给 LaunchQueuePanel 展示
        biliMessage.info(data.message || t('rpa.queueTitle'))
      } else {
        biliMessage.success(t('rpa.sessionStartSuccess'))
      }
      onSessionCreated(data)
    } else {
      const msg = response?.msg || t('rpa.sessionStartFailed')
      biliMessage.error(msg)
      onSessionStartFailed(msg)
    }
  } catch (error) {
    const msg = t('rpa.networkError')
    biliMessage.error(msg)
    onSessionStartFailed(msg)
  } finally {
    isLoading.value = false
  }
}

const handleStopSession = async () => {
  try {
    await ElMessageBox.confirm(t('rpa.sessionCloseConfirm'), t('rpa.sessionCloseTitle'), {
      confirmButtonText: t('common.sure'),
      cancelButtonText: t('common.cancel'),
      type: 'warning',
      lockScroll: false
    })

    const response = await 浏览器会话控制Service.closeBrowserSessionApiV1RpaBrowserControlClosePost({
      query: { browser_id: browserId },
    }) as any  // responseStyle='data' → 直接返回 {code, data, msg}

    if (response?.code === 0) {
      biliMessage.success(t('rpa.sessionClosed'))
      isStreaming.value = false
      onSessionStopped()
    } else {
      const msg = response?.msg || t('rpa.sessionCloseFailed')
      const code = response?.code ?? 0
      biliMessage.error(msg)
      onSessionStopFailed(msg, code)
    }
  } catch (error: unknown) {
    if (error !== 'cancel') {
      const msg = t('rpa.sessionCloseFailed')
      biliMessage.error(msg)
      onSessionStopFailed(msg, 0)
    }
  }
}

// ⚠️ 没有「toggle-stream」一类反转处理：`isStreaming` 由本页 provide、LiveBox inject，
// 是**同一个 ref**，由 LiveBox 在启动 / 停止时直接置位。父组件再反转一次会把刚启动的
// 状态翻成「未开播」（画面被占位层盖住，看起来就是「点了启动但没启动」）。

// ===== 会话状态 SSE 推送（见 docs/rpa-会话状态SSE推送计划书.md）=====
// 会话状态**只**由 SSE 提供：建连首帧即当前快照，因此页面上不存在任何 GET /status 查询，
// 也没有 HTTP 兜底轮询。唯一的保活手段是客户端内置的指数退避重连（无限次）。
//
// 连接由页面统一持有：既覆盖「启动排队期」（LiveBox 此时未渲染，只看得到排队面板），
// 也覆盖直播期。LiveBox 通过 inject('sessionLifecycleSnapshot') 消费同一份快照。
//
// 代价与对策：通道一旦不可用，状态就没有第二来源，所以必须**让用户看得见**
// —— 头部用连接态标识（`sessionEventsState`）暴露「实时通道断开/重连中」，
// 而不是让人对着可能过期的状态界面猜。
const sessionLifecycleSnapshot = ref<BrowserSessionStatusSnapshot | null>(null)
provide('sessionLifecycleSnapshot', sessionLifecycleSnapshot)

const {
  connectionState: sessionEventsState,
  start: startSessionEvents,
  stop: stopSessionEvents,
} = useBrowserSessionEvents({
  browserId: () => browserId,
  onStatus: (snapshot) => {
    // 一份快照两用：驱动状态机 + 透传给 LiveBox 做闲置/待关闭提示
    sessionLifecycleSnapshot.value = snapshot
    onStatusResponse({ code: 0, data: snapshot })
  },
})

/** 实时通道是否可用（用于头部提示：不可用时状态可能已过期） */
const isSessionEventsLive = computed(() => sessionEventsState.value === 'open')

// ===== 启动排队（内存准入：内存不足时按 VIP / 普通队列排队）=====
/** 排队进度轮询间隔（比会话状态轮询更及时，排队位置变化需要尽快反馈） */
const QUEUE_POLL_INTERVAL_MS = 2000

const launchQueue = ref<BrowserLaunchQueueStatusResponse | null>(null)
const queueWaitingSeconds = ref(0)
const cancellingQueue = ref(false)
let queuePollTimer: ReturnType<typeof setInterval> | null = null
let queueTickTimer: ReturnType<typeof setInterval> | null = null

const stopQueuePolling = () => {
  if (queuePollTimer) {
    clearInterval(queuePollTimer)
    queuePollTimer = null
  }
  if (queueTickTimer) {
    clearInterval(queueTickTimer)
    queueTickTimer = null
  }
}

const loadLaunchQueue = async () => {
  const result = await businessHandler<BrowserLaunchQueueStatusResponse>(
    浏览器会话控制Service.browserLaunchQueueStatusApiV1RpaBrowserControlQueueStatusPost({
      query: { browser_id: browserId },
    }) as any,
    { showSuccessToast: false, showErrorToast: false, errorMessage: t('rpa.networkError') }
  )

  // 单次轮询失败静默处理，等下一次轮询继续
  if (!result.success || !result.data) return

  launchQueue.value = result.data
  // 与后端对齐等待时长（只增不减，避免请求往返造成显示回退）
  queueWaitingSeconds.value = Math.max(
    queueWaitingSeconds.value,
    result.data.queue_waiting_seconds ?? 0
  )

  // 本循环只查排队进度，不再查会话状态（会话状态一律由 SSE 提供）。两个出口：
  // ① 启动完成：SSE 推送 browser_running=true → 状态机转 connected → isQueued 变 false，
  //    上面的 watch 自动停掉轮询；
  // ② 超时 / 被取消 / 服务端重启丢队列：in_queue 变 false，由下面的分支收尾。
  //
  // ① 必须靠 SSE：放行后处于 launching 阶段时 in_queue 仍为 true，排队接口本身分辨不出
  // 「已启动」—— 这正是以前这里要顺带调一次 GET /status 的原因。
  if (isConnected.value) return

  // 已不在队列中且未启动：排队结束（超时 / 被取消 / 服务端重启丢队列）
  if (launchQueue.value.in_queue) return
  stopQueuePolling()
  onQueueEnded(t('rpa.queueEnded'))
  biliMessage.warning(t('rpa.queueEnded'))
}

const startQueuePolling = () => {
  stopQueuePolling()
  queueWaitingSeconds.value = launchQueue.value?.queue_waiting_seconds ?? 0
  loadLaunchQueue()
  queuePollTimer = setInterval(loadLaunchQueue, QUEUE_POLL_INTERVAL_MS)
  queueTickTimer = setInterval(() => {
    queueWaitingSeconds.value += 1
  }, 1000)
}

// 进入 / 退出排队态时自动启停轮询（同时覆盖「刷新页面时已在排队」的场景）
watch(isQueued, (queued) => {
  if (queued) {
    startQueuePolling()
  } else {
    stopQueuePolling()
  }
})

/** 取消排队：后端把「关闭会话」视为取消排队，浏览器不会再启动 */
const handleCancelQueue = async () => {
  try {
    await ElMessageBox.confirm(t('rpa.queueCancelConfirm'), t('rpa.queueCancelTitle'), {
      confirmButtonText: t('common.sure'),
      cancelButtonText: t('common.cancel'),
      type: 'warning',
      lockScroll: false
    })
  } catch {
    return
  }

  cancellingQueue.value = true
  try {
    const response: any = await 浏览器会话控制Service.closeBrowserSessionApiV1RpaBrowserControlClosePost({
      query: { browser_id: browserId },
    })  // responseStyle='data' → 直接返回 {code, data, msg}

    if (response?.code === 0) {
      launchQueue.value = null
      stopQueuePolling()
      onSessionStopped()
      biliMessage.success(t('rpa.queueCancelled'))
    } else {
      biliMessage.error(response?.msg || t('rpa.queueCancelFailed'))
    }
  } catch (error) {
    console.error('取消排队失败:', error)
    biliMessage.error(t('rpa.queueCancelFailed'))
  } finally {
    cancellingQueue.value = false
  }
}

onUnmounted(() => {
  stopQueuePolling()
  stopSessionEvents()
  if (livePanelAnimTimer) {
    clearTimeout(livePanelAnimTimer)
    livePanelAnimTimer = null
  }
})

// 拉取 WebRTC 状态（静默，返回最新状态供调用方决定是否提示）
//
// 注意语义：这是**会话级**判断（该浏览器会话是否存在 WebRTC 连接），
// 多观看者并发直播时会把别人的观看者连接一并算入。
// 「我自己是否在直播」由 LiveBox 按 viewer_id 判断（见 docs/rpa-多观看者并发直播计划书.md）。
const loadWebrtcStatus = async (): Promise<'disconnected' | 'connecting' | 'connected'> => {
  try {
    const response: any = await WebRtc视频流Service.getWebrtcStatusApiV1RpaBrowserControlWebrtcStatusPost({
      query: { browser_id: browserId },
    })  // responseStyle='data' → 直接返回 {code, data, msg}

    if (response?.code === 0 && response?.data) {
      const data = response.data
      if (data.enabled && data.active_streams && data.active_streams.length > 0) {
        webrtcStatus.value = 'connected'
      } else {
        webrtcStatus.value = 'disconnected'
      }
    } else {
      webrtcStatus.value = 'disconnected'
    }
  } catch (error) {
    console.error('Failed to load webrtc status', error)
    webrtcStatus.value = 'disconnected'
  }
  return webrtcStatus.value
}

// 用户点击「刷新WebRTC状态」：必须给出反馈（此前点击后无任何提示）
const handleRefreshWebrtcStatus = useDebounceFn(async () => {
  const status = await loadWebrtcStatus()
  if (status === 'connected') {
    biliMessage.success(t('rpa.webrtcConnected'))
  } else {
    biliMessage.info(t('rpa.webrtcDisconnected'))
  }
}, 500)

const handleWebrtcStatusChange = (status: 'disconnected' | 'connecting' | 'connected') => {
  webrtcStatus.value = status
}

const handleRefreshStatus = useDebounceFn(() => {
  // 纯 SSE 架构下「刷新状态」= 重连事件流：服务端建连即下发首帧，
  // 等价于一次全量状态查询，因此不需要（也没有）单独的 GET /status 调用。
  startSessionEvents()
  biliMessage.success(t('rpa.refreshStatusSuccess'))
}, 500)

interface EditDialogInstance {
  id: number
  actionDetail: Record<string, unknown>
}

const editDialogs = ref<EditDialogInstance[]>([])
let editDialogIdCounter = 0

const handleEditAction = (actionDetail: Record<string, unknown>) => {
  editDialogs.value.push({
    id: ++editDialogIdCounter,
    actionDetail,
  })
}

const handleEditDialogClose = (id: number) => {
  const index = editDialogs.value.findIndex(d => d.id === id)
  if (index !== -1) {
    editDialogs.value.splice(index, 1)
  }
}

const handleBack = () => {
  router.push({ name: RouteName.RPA_BROWSER_FINGERPRINT_LIST })
}

const executingScreenshot = ref(false)
const screenshots = ref<Array<{ id: number; dataUrl: string; format: string; size: number; timestamp: number }>>([])
let screenshotIdCounter = 0

const handleScreenshot = async () => {
  if (executingScreenshot.value) return
  executingScreenshot.value = true

  try {
    const response: any = await 执行引擎Service.executeActionApiV1RpaBrowserControlActionsExecutePost({
      query: { browser_id: browserId },
      body: { action_id: 'screenshot', params: {} }
    })  // responseStyle='data' → 直接返回 {code, data, msg}

    if (response?.code === 0 && response?.data) {
      const result = response.data as Record<string, unknown>
      if (result.success === true && typeof result.data === 'object' && result.data !== null) {
        const screenshotData = result.data as { base64?: string; format?: string; size?: number }
        const format = screenshotData.format || 'png'
        const dataUrl = `data:image/${format};base64,${screenshotData.base64}`
        screenshots.value.unshift({
          id: ++screenshotIdCounter,
          dataUrl,
          format,
          size: screenshotData.size || 0,
          timestamp: Date.now()
        })
        biliMessage.success(t('rpa.screenshotSuccess'))
      } else {
        biliMessage.error(typeof result.error === 'string' ? result.error : t('rpa.screenshotFailed'))
      }
    } else {
      biliMessage.error(response?.msg || t('rpa.screenshotFailed'))
    }
  } catch (error) {
    console.error('截图失败:', error)
    biliMessage.error(t('rpa.screenshotNetworkError'))
  } finally {
    executingScreenshot.value = false
  }
}

const handleDeleteScreenshot = (id: number) => {
  const index = screenshots.value.findIndex(s => s.id === id)
  if (index !== -1) {
    screenshots.value.splice(index, 1)
  }
}

provide('browserId', browserId)
provide('isStreaming', isStreaming)
provide('browserSessionStatus', browserSessionStatus)

onMounted(() => {
  loadBrowserInfo()
  // 会话状态完全由 SSE 提供：建连首帧即当前状态，不再额外发一次 GET /status
  startSessionEvents()
})
</script>

<template>
  <FlexContainer class="flex flex-col h-full">
    <BiliPageHeader
      :title="isLoadingInfo ? t('common.loading') : (browserInfo?.custom_name || t('rpa.pageTitleFallback', { id: browserId }))"
      :description="t('rpa.consoleDesc')" :tag-text="t('rpa.browserTag')">
      <template #extra>
        <div class="flex flex-wrap items-center gap-4">
          <div class="flex items-center gap-2">
            <span>{{ t('rpa.browserLabel') }}:</span>
            <el-tag :type="isConnected ? 'success' : (isConnecting || isQueued) ? 'warning' : 'info'">
              <span class="flex items-center gap-1">
                <span :class="{
                  'bg-green-500 animate-pulse': isConnected,
                  'bg-yellow-500 animate-pulse': isConnecting || isQueued,
                  'bg-gray-400': !isConnected && !isConnecting && !isQueued
                }" class="w-2 h-2 rounded-full"></span>
                {{ statusLabel }}
              </span>
            </el-tag>
            <span v-if="hasError" class="text-xs text-(--el-color-danger) ml-1" :title="errorMessage">⚠</span>
            <!-- 纯 SSE 架构：事件流断了就没有第二来源，必须让用户看见「状态可能已过期」 -->
            <el-tag v-if="!isSessionEventsLive" class="browser-stream__events-offline" type="warning">
              {{ t('rpa.sessionEventsOffline') }}
            </el-tag>
          </div>

          <el-button-group>
            <el-button v-if="!isConnected" type="primary" :icon="VideoPlay" :loading="isLoading || isQueued"
              :disabled="isQueued" @click="handleStartSession">
              {{ t('rpa.sessionStart') }}
            </el-button>
            <el-button v-else type="danger" :icon="VideoPause" @click="handleStopSession">
              {{ t('rpa.sessionStop') }}
            </el-button>
          </el-button-group>

          <el-button :icon="Refresh" @click="handleRefreshStatus">{{ t('rpa.refreshSessionStatus') }}</el-button>

          <el-button :icon="ArrowLeft" @click="handleBack">{{ t('common.back') }}</el-button>
        </div>
      </template>
    </BiliPageHeader>

    <div v-if="isLoadingInfo" class="flex-1 flex items-center justify-center bg-bg rounded-2xl p-4">
      <div class="text-center">
        <el-icon class="animate-spin" size="40" style="color: var(--el-color-primary)">
          <VideoPause />
        </el-icon>
        <div class="mt-4 text-text-secondary">{{ t('common.loading') }}</div>
      </div>
    </div>

    <!-- 内存不足：排队中（VIP 队列优先于普通队列），展示排队进度并允许取消排队 -->
    <div v-else-if="isQueued" class="flex-1 flex flex-col min-h-[70vh] overflow-hidden bg-bg rounded-2xl p-4">
      <LaunchQueuePanel class="launch-queue-panel-page flex-1" :queue="launchQueue"
        :waiting-seconds="queueWaitingSeconds" :cancelling="cancellingQueue" @cancel="handleCancelQueue" />
    </div>

    <!-- 高度需容纳：固定 720px 的分栏（h-180）+ WebRTC 状态行 + 内边距（min-h-205 = 820px） -->
    <div v-else class="flex-1 flex flex-col min-h-205 overflow-hidden bg-bg rounded-2xl p-4">
      <div class="flex items-center justify-between px-4 py-2 border-t border-border bg-fill-light">
        <div class="flex items-center gap-4">
          <div class="flex items-center gap-2">
            <span>WebRTC:</span>
            <el-tag
              :type="webrtcStatus === 'connected' ? 'success' : webrtcStatus === 'connecting' ? 'warning' : 'info'">
              <span class="flex items-center gap-1">
                <span
                  :class="['w-2 h-2 rounded-full', webrtcStatus === 'connected' ? 'bg-green-500 animate-pulse' : webrtcStatus === 'connecting' ? 'bg-yellow-500 animate-pulse' : 'bg-gray-400']"></span>
                {{ webrtcStatus === 'connected' ? t('rpa.statusConnected') : webrtcStatus === 'connecting' ?
                  t('rpa.statusConnecting') : t('rpa.statusDisconnected') }}
              </span>
            </el-tag>
          </div>

          <el-button size="large" :icon="Refresh" @click="handleRefreshWebrtcStatus">{{ t('rpa.refreshWebrtcStatus')
            }}</el-button>

          <div v-if="isStreaming" class="browser-stream__network-speed flex items-center gap-2 text-sm">
            <span class="text-text-secondary">{{ t('rpa.networkSpeed') }}:</span>
            <span class="text-green-500">↑ {{ uploadSpeed }}/s</span>
            <span class="text-blue-500">↓ {{ downloadSpeed }}/s</span>
            <!-- 这个数字取自「候选对的全部字节」，含 RTCP/STUN 保活包：
                 暂停后视频帧已停，但连接还活着 → 数字不会归零。必须标注，否则会被误判成「流量没停」。 -->
            <span v-if="isStreamPaused" class="text-text-secondary">
              {{ t('rpa.networkSpeedKeepAliveHint') }}
            </span>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <el-button size="large" :icon="Camera" :loading="executingScreenshot" @click="handleScreenshot">{{
            t('rpa.screenshotBtn') }}</el-button>
          <el-button size="large" type="primary" :icon="Tools" @click="openToolbox">{{ t('rpa.toolbox') }}</el-button>
        </div>
      </div>

      <!-- 分栏整体固定高度：高度必须落在普通 div 上——Element Plus 的
           `.el-splitter{height:100%}` 是无层级样式，会盖掉 Tailwind（@layer utilities）里的 h-180 -->
      <div class="stream-splitter-wrap h-180 shrink-0">
        <!-- 左侧直播区仅在浏览器启动后占位：未启动时左侧面板 size 收到 0，右侧调试面板自动补满宽度。
             折叠态下隐藏分隔条（[&_.el-splitter-bar]:hidden）：此时面板不可拖拽，
             残留的分隔条折叠按钮会让用户在浏览器未启动时就把直播区「拉」回来，与规则冲突 -->
        <el-splitter v-model="splitterSize" class="stream-splitter h-full"
          :class="{ '[&_.el-splitter-bar]:hidden': !isLivePanelVisible }">
          <!-- size 必须用 :size 动态绑定而非 v-if：v-if 会卸载面板（动画无从播放，LiveBox 也会反复重建）。
               size 收到 0% 时 min 不必跟着放开：面板未设 max 时 el-splitter 以 size 自身作为上限，
               最终尺寸会被钳到 0，所以 30% 的拖动下限在展示态依旧生效。
               min-w-0 / overflow-hidden：放行 flex 收缩（flex 项默认 min-width:auto 会被内容撑住不缩），
               并避免折叠到 0 宽时闪出滚动条。
               过渡类同时挂到左右两个面板：两侧 flex-basis 同曲线同步变化，才不会有留白 -->
          <el-splitter-panel class="live-box-container min-w-0 overflow-hidden" collapsible min="30%"
            :class="{ 'transition-[flex-basis] duration-550 ease-[cubic-bezier(0.34,1.56,0.64,1)]': isLivePanelAnimating }"
            :size="isLivePanelVisible ? '40%' : '0%'">
            <LiveBox :browser-id="browserId" :is-streaming="isStreaming"
              @paused-change="isStreamPaused = $event" @webrtc-status-change="handleWebrtcStatusChange" />
          </el-splitter-panel>
          <el-splitter-panel class="debug-box-container flex flex-1" collapsible min="30%"
            :class="{ 'transition-[flex-basis] duration-550 ease-[cubic-bezier(0.34,1.56,0.64,1)]': isLivePanelAnimating }">
            <DebugBox :browser-id="browserId" />
          </el-splitter-panel>
        </el-splitter>
      </div>
    </div>

    <div v-if="screenshots.length > 0" class="mx-4 mb-4 rounded-lg border border-border bg-fill-light">
      <div class="flex items-center justify-between px-4 py-2 border-b border-border">
        <span class="text-sm font-medium text-text-primary">{{ t('rpa.screenshotHistory') }} ({{ screenshots.length
          }})</span>
      </div>
      <div class="flex gap-3 overflow-x-auto p-3">
        <div v-for="shot in screenshots" :key="shot.id"
          class="group relative shrink-0 w-48 rounded-lg border border-border bg-bg overflow-hidden">
          <el-image :src="shot.dataUrl" :preview-src-list="[shot.dataUrl]" fit="cover"
            class="w-full h-32 cursor-pointer" preview-teleported :z-index="3000" />
          <div class="flex items-center justify-between px-2 py-1 text-xs text-text-secondary">
            <span>{{ new Date(shot.timestamp).toLocaleTimeString() }}</span>
            <span>{{ (shot.size / 1024).toFixed(0) }}KB</span>
          </div>
          <button
            class="absolute top-1 right-1 p-0.5 rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity"
            @click="handleDeleteScreenshot(shot.id)">
            <el-icon :size="14">
              <Close />
            </el-icon>
          </button>
        </div>
      </div>
    </div>

    <!-- 工具箱对话框 -->
    <el-dialog v-model="toolboxDialogVisible" width="520px" :modal-penetrable="true" :modal="false" :lock-scroll="false"
      :draggable="true" :close-on-click-modal="false" :destroy-on-close="false" :append-to-body="true"
      modal-class="toolbox-overlay" class="toolbox-dialog">
      <template #header>
        <div class="flex">
          <span class="text-2xl">{{ t('rpa.toolbox') }}</span>
          <button class="ml-auto mr-3 cursor-pointer hover:text-color-secondary" :title="t('rpa.minimize')"
            @click="handleToolboxMinimize">
            <el-icon :size="14">
              <Minus />
            </el-icon>
          </button>
        </div>
      </template>
      <ToolboxPanel :browser-id="browserId" @edit-action="handleEditAction" />
    </el-dialog>

    <!-- 工具箱最小化浮动标签 -->
    <MinimizeBar v-if="toolboxMinimized && toolboxVisible" :title="t('rpa.toolbox')" @restore="handleToolboxRestore"
      @close="handleToolboxClose" />

    <!-- 编辑自定义操作弹窗（支持同时开启多个，独立于调试面板） -->
    <EditCustomActionDialog v-for="dialog in editDialogs" :key="dialog.id" :model-value="true"
      :action-detail="dialog.actionDetail" :browser-id="browserId"
      @update:model-value="(val: boolean) => { if (!val) handleEditDialogClose(dialog.id) }" />
  </FlexContainer>
</template>
