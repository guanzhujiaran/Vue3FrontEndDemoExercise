<!--
 * @FilePath: \Vue3FrontEndDemoExercise\src\components\browser\SSEStreamPanel.vue
 * @Description: FLV 实时视频流面板
-->
<template>
  <div class="flex flex-col gap-3 h-full overflow-hidden">
    <!-- 顶部控制栏 -->
    <div class="flex flex-wrap items-center gap-3 p-3 rounded-xl border border-[var(--el-border-color-lighter)] bg-[var(--el-fill-color-lighter)]">
      <!-- 连接状态指示 -->
      <div class="flex items-center gap-2">
        <div :class="[
          'w-2.5 h-2.5 rounded-full transition-all duration-500',
          isStreaming && !isReconnecting
            ? 'bg-green-500 shadow-[0_0_8px_rgba(74,222,128,0.8)] animate-pulse'
            : isReconnecting
              ? 'bg-yellow-500 animate-pulse'
              : 'bg-gray-400'
        ]"></div>
        <span class="text-sm font-semibold">
          {{ isReconnecting ? '重新连接中...' : (isStreaming ? '实时传输中' : '未连接') }}
        </span>
      </div>

      <el-divider direction="vertical" />

      <!-- 连接信息 -->
      <div v-if="sessionState?.lifecycle_state" class="flex items-center gap-3 text-xs text-[var(--el-text-color-secondary)]">
        <span><el-icon><User /></el-icon> {{ activeConnections }} 连接</span>
        <span>
          <el-tag size="small" :type="sessionStatusType" effect="plain">
            {{ sessionStatusText }}
          </el-tag>
        </span>
      </div>

      <div class="ml-auto flex gap-2">
        <!-- 截图按钮 -->
        <el-button
          size="small"
          :icon="Camera"
          plain
          :disabled="!isStreaming"
          :loading="takingScreenshot"
          @click="takeScreenshot"
          round
        >截图</el-button>

        <!-- 开始/停止按钮 -->
        <el-tooltip
          :content="!browserRunning && !isStreaming ? '先启动浏览器' : ''"
          :disabled="browserRunning || isStreaming"
          placement="top"
        >
          <el-button
            v-if="!isStreaming"
            type="primary"
            size="small"
            :icon="VideoPlay"
            :loading="isConnecting"
            :disabled="!browserRunning"
            @click="startVideoStream"
            round
          >
            {{ isConnecting ? '连接中...' : '开始视频' }}
          </el-button>
          <el-button
            v-else
            type="danger"
            size="small"
            :icon="VideoPause"
            @click="stopVideoStream"
            round
          >停止视频</el-button>
        </el-tooltip>
      </div>
    </div>

    <!-- 主内容区：视频 + 控制面板 -->
    <div class="flex gap-3 flex-1 min-h-0">
      <!-- 左侧：视频区域 -->
      <div class="flex-1 flex flex-col min-h-0 min-w-0">
        <!-- 视频容器 - daisyui mockup-browser 样式 -->
        <FlexContainer class="browser border border-base-300 w-full flex-1">
          <!-- 浏览器工具栏 -->
          <div class="browser-toolbar flex flex-col h-auto">
            <!-- 标签页切换栏 - Edge风格 -->
            <div class="flex items-center gap-0.5 px-2 py-1.5 overflow-x-auto scrollbar-thin">
              <!-- 新建页面按钮 -->
              <el-button
                v-if="isStreaming"
                size="small"
                :icon="Plus"
                circle
                class="shrink-0 h-6 w-6 text-xs hover:bg-gray-200/50"
                @click="createNewPage"
                :loading="creatingPage"
              />
              <!-- 标签列表 -->
              <div
                v-for="(page, index) in pagesList"
                :key="page.page_index"
                :class="[
                  'flex items-center gap-1.5 px-3 h-8 rounded-t-lg cursor-pointer transition-all duration-200 shrink-0 group',
                  'border border-b-0 max-w-[200px]',
                  currentPageIndex === page.page_index
                    ? 'bg-[var(--el-fill-color-blank)] border-[var(--el-border-color)] -mb-px z-10'
                    : 'bg-[var(--el-fill-color-light)] border-transparent hover:bg-[var(--el-fill-color)]'
                ]"
                @click="switchToPage(page.page_index)"
              >
                <el-icon class="text-xs shrink-0" :size="14" :class="currentPageIndex === page.page_index ? 'text-[var(--el-color-primary)]' : 'text-[var(--el-text-color-secondary)]'">
                  <Document />
                </el-icon>
                <span class="text-xs truncate max-w-[140px]" :class="currentPageIndex === page.page_index ? 'text-[var(--el-text-color-primary)]' : 'text-[var(--el-text-color-regular)]'">{{ page.title || '新标签页' }}</span>
                <el-icon
                  v-if="pagesList.length > 1"
                  class="text-xs transition-opacity shrink-0"
                  :size="12"
                  @click.stop="closePageByIndex(page.page_index)"
                >
                  <Close />
                </el-icon>
              </div>
            </div>

            <!-- 地址栏 - Edge风格 -->
            <div class="flex items-center gap-2 px-3 py-1.5 border-t border-primary">
              <el-icon class="text-[var(--el-text-color-regular)]" :size="16"><Link /></el-icon>
              <input
                v-model="navigateUrl"
                type="text"
                :placeholder="currentPageUrl || '输入网址或搜索...'"
                class="flex-1 h-7 px-3 text-sm rounded-md border border-primary text-[var(--el-text-color-regular)] placeholder:text-[var(--el-text-color-placeholder)] focus:border-info focus:outline-none focus:ring-1 focus:ring-primary"
                @keyup.enter="handleNavigate"
              />
              <el-button type="primary" size="small" @click="handleNavigate" :loading="navigating" class="h-7 px-3">前往</el-button>
              <el-button
                v-if="isStreaming"
                size="small"
                @click="takeScreenshot"
                :icon="Camera"
                :loading="takingScreenshot"
                class="h-7 rounded-md"
              >截图</el-button>
            </div>
          </div>

          <!-- 浏览器内容区域 -->
          <div
            ref="videoContainer"
            class="relative border-t border-base-300 flex items-center justify-center flex-1"
            @mouseenter="showControls = true"
            @mouseleave="showControls = false"
          >
            <!-- 加载遮罩 -->
            <div v-if="isConnecting || isReconnecting" class="absolute inset-0 flex flex-col items-center justify-center bg-base-300/80 z-10 gap-4">
              <el-icon class="is-loading text-base-content" :size="48"><Loading /></el-icon>
              <p class="text-base-content text-sm m-0">{{ isReconnecting ? `重连中 (${reconnectAttempts}/${maxReconnectAttempts})...` : '正在建立 FLV 连接...' }}</p>
            </div>

            <!-- 重连失败提示 -->
            <div v-if="reconnectError && !isStreaming && !isConnecting" class="absolute inset-0 flex flex-col items-center justify-center bg-base-300/90 z-10 gap-4">
              <el-icon :size="48" class="text-error"><CircleClose /></el-icon>
              <p class="text-error text-base font-semibold m-0">{{ reconnectError }}</p>
              <p class="text-base-content/70 text-sm m-0">请点击"开始视频"重新连接</p>
            </div>

            <!-- 未连接提示 -->
            <div v-if="!isStreaming && !isConnecting && !reconnectError" class="flex flex-col items-center justify-center gap-4 text-base-content/60">
              <el-icon :size="64"><VideoCamera /></el-icon>
              <p class="text-sm m-0">点击"开始视频"建立 FLV 连接</p>
              <p class="text-xs m-0 opacity-60">将实时显示浏览器画面</p>
            </div>

            <!-- FLV 视频播放 -->
            <div
              v-show="isStreaming"
              ref="videoWrapper"
              class="w-full h-full flex items-center justify-center"
            >
              <video
                ref="videoRef"
                class="max-w-full max-h-full object-contain"
                muted
                playsinline
                @click="handleVideoClick"
              />
            </div>

            <!-- 点击覆盖层 -->
            <div
              v-if="isStreaming"
              ref="clickOverlay"
              class="absolute z-10"
              :class="clicking ? 'cursor-not-allowed' : 'cursor-crosshair'"
              :style="overlayStyle"
              @click="handleVideoClick"
            />
          </div>
        </FlexContainer>

      </div>

      <!-- 右侧面板容器 -->
      <div class="flex items-stretch gap-0 shrink-0">
        <!-- 切换按钮 - 始终可见 -->
        <el-button
          :icon="rightPanelCollapsed ? DArrowLeft : DArrowRight"
          circle
          size="small"
          @click="toggleRightPanel"
          class="self-center -ml-1 bg-white border shadow-sm z-10 hover:scale-110 transition-transform"
          :title="rightPanelCollapsed ? '展开操作面板' : '收起操作面板'"
        />

        <!-- 右侧：操作面板 - 可折叠 -->
        <transition name="panel-collapse">
          <div
            v-if="!rightPanelCollapsed"
            class="w-72 flex flex-col gap-3 overflow-y-auto"
          >
        <!-- 点击操作 -->
        <el-card shadow="never" class="flex-[0.4]">
          <template #header>
            <div class="flex items-center gap-2 text-sm font-medium">
              <el-icon><Pointer /></el-icon>
              坐标点击
            </div>
          </template>
          <div class="flex gap-2 mb-2">
            <el-input-number v-model="clickX" :min="0" placeholder="X" size="small" class="flex-1" controls-position="right" />
            <el-input-number v-model="clickY" :min="0" placeholder="Y" size="small" class="flex-1" controls-position="right" />
          </div>
          <el-button size="small" type="primary" plain @click="performClick" :loading="clicking" :disabled="!isStreaming" class="w-full">
            点击 ({{ clickX }}, {{ clickY }})
          </el-button>
        </el-card>

        <!-- 日志 -->
        <el-card shadow="never" class="flex-1">
          <template #header>
            <div class="flex items-center justify-between text-sm font-medium">
              <span class="flex items-center gap-2">
                <el-icon><List /></el-icon>
                操作日志
                <el-badge v-if="logs.length" :value="logs.length" :max="99" class="ml-1" />
              </span>
              <el-button size="small" text @click="logs = []">清空</el-button>
            </div>
          </template>
          <el-scrollbar ref="logScrollbar" height="500px">
            <div v-if="logs.length === 0" class="text-center text-xs text-secondary py-4">暂无日志</div>
            <div v-for="(log, idx) in logs" :key="idx" :class="['flex gap-2 text-xs py-0.5 border-b border-[var(--el-border-color-lighter)] last:border-0', getLogClass(log.type)]">
              <span class="text-[var(--el-text-color-secondary)] shrink-0 font-mono">{{ log.time }}</span>
              <span>{{ log.message }}</span>
            </div>
          </el-scrollbar>
        </el-card>
          </div>
        </transition>
      </div>
    </div>

    <!-- 截图预览弹窗 -->
    <el-dialog
      v-model="showScreenshotDialog"
      title="截图预览"
      :width="isStreaming ? '800px' : '600px'"
      :close-on-click-modal="false"
    >
      <div class="flex flex-col items-center">
        <img
          v-if="screenshotUrl"
          :src="screenshotUrl"
          alt="截图"
          class="max-w-full max-h-[500px] object-contain rounded-lg"
        />
        <div class="mt-4 flex gap-3">
          <el-button
            type="primary"
            @click="downloadScreenshot"
            :icon="Download"
          >下载截图</el-button>
          <el-button
            @click="showScreenshotDialog = false"
          >关闭</el-button>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick, onBeforeUnmount, onMounted, computed, watch, inject, type Ref } from 'vue'
import { ElScrollbar } from 'element-plus'
import {
  VideoPlay, VideoPause, Camera, Link, List,
  Loading, CircleClose, VideoCamera, User, Pointer, Download, DArrowLeft, DArrowRight,
  Document, Close, Plus
} from '@element-plus/icons-vue'
import flvjs from 'flv.js'
import { browserLiveControlApi } from '@/api/browser/browser_api'
import browserControlApi from '@/api/browser/browser_control_api'
import { businessHandler } from '@/utils/businessHandler'
import biliMessage from '@/utils/message'
import type { BrowserSessionStatus } from '@/types/browser-automation-api'
import { useJwtStore } from '@/stores/jwt_token'
import { useUserNavStore } from '@/stores/user_nav'

const sessionState = inject<Ref<BrowserSessionStatus | undefined>>('browserSessionState')

let unsubscribeStopBrowser: (() => void) | null = null

onMounted(() => {
  if (onStopBrowser) {
    unsubscribeStopBrowser = onStopBrowser(() => {
      console.log('[SSEStreamPanel] Received stopBrowser notification, stopping video stream')
      stopVideoStream()
    })
  }
  if (sessionState?.value?.browser_running && sessionState?.value?.lifecycle_state === 'active') {
    console.log('[SSEStreamPanel] Browser already running on mount, fetching page list')
    refreshPagesList()
  }
  if (videoContainer.value) {
    const updateSize = () => {
      if (videoContainer.value) {
        const rect = videoContainer.value.getBoundingClientRect()
        containerSize.value = { width: rect.width, height: rect.height }
      }
    }
    updateSize()
    const resizeObserver = new ResizeObserver(updateSize)
    resizeObserver.observe(videoContainer.value)
  }

  nextTick(() => {
    if (clickOverlay.value) {
      clickOverlay.value.addEventListener('wheel', handleWheel, { passive: false })
    }
  })
})

const props = defineProps<{
  browserId: string
}>()

const onStopBrowser = inject<(callback: () => void) => () => void>('onStopBrowser')

const videoPlayer = ref<HTMLVideoElement | null>(null)
const videoContainer = ref<HTMLDivElement | null>(null)
const videoWrapper = ref<HTMLDivElement | null>(null)
const containerSize = ref({ width: 0, height: 0 })
const isStreaming = ref(false)
const isConnecting = ref(false)
const screenshotUrl = ref('')
const showControls = ref(false)
const videoInfo = ref('')
const takingScreenshot = ref(false)
const showScreenshotDialog = ref(false)

const flvPlayer = ref<flvjs.Player | null>(null)
const streamAbortController = ref<AbortController | null>(null)
const videoRef = ref<HTMLVideoElement | null>(null)
const clickOverlay = ref<HTMLDivElement | null>(null)

const rightPanelCollapsed = ref(false)

const toggleRightPanel = () => {
  rightPanelCollapsed.value = !rightPanelCollapsed.value
}

const navigateUrl = ref('')
const navigating = ref(false)

const reconnectAttempts = ref(0)
const maxReconnectAttempts = 3
const isReconnecting = ref(false)
const reconnectError = ref('')
let userManuallyStopped = false
let reconnectTimer: number | null = null

let heartbeatTimer: number | null = null
const HEARTBEAT_INTERVAL = 30000

interface PageInfo {
  page_index: number
  title: string
  url: string
}
const pagesList = ref<PageInfo[]>([])
const currentPageIndex = ref(0)
const creatingPage = ref(false)

const videoWidth = ref(1920)
const videoHeight = ref(1080)

const overlayStyle = computed(() => {
  return {
    width: '100%',
    height: '100%',
    left: '0',
    top: '0'
  }
})

const currentPageUrl = computed(() => {
  const currentPage = pagesList.value.find(page => page.page_index === currentPageIndex.value)
  return currentPage?.url || ''
})

watch(() => currentPageIndex.value, () => {
  navigateUrl.value = currentPageUrl.value
})

const refreshPagesList = async () => {
  if (!props.browserId) return
  try {
    console.log('[SSEStreamPanel] refreshPagesList called, browserId:', props.browserId)
    const res = await browserLiveControlApi.getPageList({ browser_id: props.browserId })
    console.log('[SSEStreamPanel] getPageList response:', res)
    if (res.code === 0 && res.data && res.data.pages) {
      pagesList.value = res.data.pages.map((page: any) => ({
        page_index: page.index,
        title: page.title || '新标签页',
        url: page.url
      }))
      addLog(`获取到 ${pagesList.value.length} 个页面`, 'success')
      if (currentPageIndex.value >= pagesList.value.length && pagesList.value.length > 0) {
        currentPageIndex.value = 0
      }
    } else {
      addLog(`获取页面列表失败: ${res.msg || '未知错误'}`, 'error')
      console.error('[SSEStreamPanel] getPageList failed:', res.msg)
    }
  } catch (e) {
    addLog(`获取页面列表异常: ${e}`, 'error')
    console.error('[SSEStreamPanel] refreshPagesList error:', e)
  }
}

const switchToPage = async (pageIndex: number) => {
  if (!props.browserId || pageIndex === currentPageIndex.value) return
  const oldPageIndex = currentPageIndex.value
  try {
    await browserLiveControlApi.switchPage({ browser_id: props.browserId, page_index: pageIndex })
    currentPageIndex.value = pageIndex
    addLog(`已切换到页面 ${pageIndex + 1}`, 'success')

    await refreshPagesList()

    if (isStreaming.value) {
      await stopFlvPlayer()
      await nextTick()
      await startFlvStream()
    }
  } catch (e) {
    addLog(`切换页面失败: ${e}`, 'error')
    currentPageIndex.value = oldPageIndex
  }
}

const closePageByIndex = async (pageIndex: number) => {
  if (!props.browserId || pagesList.value.length <= 1) return
  try {
    const res = await browserLiveControlApi.closePage({
      browser_id: props.browserId,
      page_index: pageIndex
    })
    if (res.code === 0) {
      addLog(`已关闭页面 ${pageIndex + 1}`, 'success')
      await refreshPagesList()
      if (pageIndex === currentPageIndex.value && pagesList.value.length > 0) {
        const newPageIndex = 0
        await browserLiveControlApi.switchPage({ browser_id: props.browserId, page_index: newPageIndex })
        currentPageIndex.value = newPageIndex
        await refreshPagesList()
        if (isStreaming.value) {
          await stopFlvPlayer()
          await nextTick()
          await startFlvStream()
        }
      }
    }
  } catch (e) {
    addLog(`关闭页面失败: ${e}`, 'error')
  }
}

const createNewPage = async () => {
  if (!props.browserId) return
  creatingPage.value = true
  try {
    const res = await browserLiveControlApi.executeAction({
      browser_id: props.browserId,
      req: {
        action_id: 'new_page',
        params: {},
        page_index: currentPageIndex.value
      }
    })
    if (res.code === 0) {
      addLog('已创建新页面', 'success')
      await refreshPagesList()
    }
  } catch (e) {
    addLog(`创建页面失败: ${e}`, 'error')
  } finally {
    creatingPage.value = false
  }
}

const clickX = ref(0)
const clickY = ref(0)
const clicking = ref(false)

interface LogItem {
  time: string
  message: string
  type: 'info' | 'success' | 'warning' | 'error' | 'debug'
}
const logs = ref<LogItem[]>([])
const logScrollbar = ref<InstanceType<typeof ElScrollbar>>()

const heartbeatActiveClients = ref(0)

const activeConnections = computed(() => heartbeatActiveClients.value)

watch(() => sessionState?.value, (newState) => {
  if (newState && isStreaming.value) {
    const { session_exists, browser_running, lifecycle_state } = newState
    if (!session_exists || (!browser_running && (lifecycle_state === 'stopped' || lifecycle_state === 'error'))) {
      console.log('[SSEStreamPanel] Browser terminated, stopping video stream')
      stopVideoStream()
    }
  }
  if (newState && newState.browser_running && newState.lifecycle_state === 'active') {
    console.log('[SSEStreamPanel] Browser is running, fetching page list')
    refreshPagesList()
  }
  if (newState?.screen?.width && newState?.screen?.height) {
    videoWidth.value = newState.screen.width
    videoHeight.value = newState.screen.height
  } else if (newState?.viewport?.width && newState?.viewport?.height) {
    videoWidth.value = newState.viewport.width
    videoHeight.value = newState.viewport.height
  }
}, { deep: true })

const sessionStatusText = computed(() => {
  const state = sessionState?.value?.lifecycle_state
  const map: Record<string, string> = {
    active: '运行中',
    running: '运行中',
    idle: '空闲',
    disconnected: '未连接',
    stopped: '已停止'
  }
  return map[state || ''] || state || '未知'
})

const sessionStatusType = computed(() => {
  const state = sessionState?.value?.lifecycle_state || sessionState?.value?.status
  const map: Record<string, 'info' | 'success' | 'warning' | 'danger' | 'primary'> = {
    running: 'success',
    paused: 'warning',
    pending: 'info',
    stopping: 'warning',
    stopped: 'danger',
    error: 'danger',
    initializing: 'info'
  }
  return map[state || ''] || 'info'
})

const browserRunning = computed(() => {
  if (!sessionState?.value) return false
  const { browser_running, lifecycle_state } = sessionState.value
  return browser_running || lifecycle_state === 'running'
})

const addLog = (message: string, type: LogItem['type'] = 'info') => {
  const now = new Date()
  const time = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`
  logs.value.push({ time, message, type })
  nextTick(() => {
    logScrollbar.value?.setScrollTop(999999)
  })
}

const getLogClass = (type: string) => {
  const map: Record<string, string> = {
    success: 'text-green-600',
    error: 'text-red-500',
    warning: 'text-yellow-600',
    debug: 'text-[var(--el-text-color-placeholder)]'
  }
  return map[type] || ''
}

const stopVideoStream = () => {
  console.log('[SSEStreamPanel] stopVideoStream called')
  userManuallyStopped = true
  isStreaming.value = false
  isConnecting.value = false
  isReconnecting.value = false
  reconnectAttempts.value = 0

  if (reconnectTimer) {
    clearTimeout(reconnectTimer)
    reconnectTimer = null
  }

  stopFlvPlayer()
  stopTimers()

  if (sessionState?.value) {
    sessionState.value.status = 'disconnected'
  }
  addLog('视频流已停止', 'info')
  biliMessage.info('视频流已停止')
}

const stopFlvPlayer = async () => {
  if (flvPlayer.value) {
    flvPlayer.value.pause()
    flvPlayer.value.unload()
    flvPlayer.value.detachMediaElement()
    flvPlayer.value.destroy()
    flvPlayer.value = null
  }
  if (streamAbortController.value) {
    streamAbortController.value.abort()
    streamAbortController.value = null
  }
  try {
    await browserControlApi.stopFlvStream(currentPageIndex.value, props.browserId)
    console.log('[SSEStreamPanel] FLV stream stopped')
  } catch (e) {
    console.error('[SSEStreamPanel] Failed to stop FLV stream:', e)
  }
}

const stopTimers = () => {
  if (heartbeatTimer) { clearInterval(heartbeatTimer); heartbeatTimer = null }
}

const startVideoStream = async () => {
  console.log('[SSEStreamPanel] startVideoStream called, isStreaming:', isStreaming.value)
  if (isStreaming.value) return

  isConnecting.value = true
  userManuallyStopped = false
  reconnectError.value = ''
  screenshotUrl.value = ''

  try {
    addLog('检查浏览器会话...', 'info')
    const currentState = sessionState?.value
    if (currentState && !currentState.browser_running) {
      addLog('浏览器未运行，正在启动...（大约需要等待1分钟）', 'warning')
      const createRes = await browserLiveControlApi.createBrowserSession({ browser_id: props.browserId })
      if (createRes.code !== 0) {
        throw new Error(createRes.msg || '启动浏览器失败')
      }
    }

    await startFlvStream()
    startHeartbeat()
    await refreshPagesList()

  } catch (error: any) {
    if (error.name !== 'AbortError') {
      addLog(`连接失败: ${error.message || error}`, 'error')
      biliMessage.error('启动视频流失败：' + (error.message || '未知错误'))
      reconnectError.value = error.message || '连接失败'
    }
  } finally {
    isConnecting.value = false
  }
}

const startFlvStream = async () => {
  if (!videoRef.value) {
    await nextTick()
    if (!videoRef.value) {
      throw new Error('Video element not found')
    }
  }

  await stopFlvPlayer()

  streamAbortController.value = new AbortController()

  let baseUrl = import.meta.env.VITE_API_BASE_URL
  if (!baseUrl || baseUrl === '/') {
    baseUrl = window.location.origin
  }
  const streamUrl = `${baseUrl}/api/v1/rpa/browser/control/flv/stream?browser_id=${props.browserId}&page_index=${currentPageIndex.value}`

  console.log('[SSEStreamPanel] Creating FLV player with URL:', streamUrl)

  const jwtStore = useJwtStore()
  const userNavStore = useUserNavStore()

  const headers: Record<string, string> = {}
  if (jwtStore.jwt) {
    headers['Authorization'] = `Bearer ${jwtStore.jwt}`
  }

  flvPlayer.value = flvjs.createPlayer({
    type: 'flv',
    url: streamUrl,
    hasAudio: false,
    hasVideo: true,
    isLive: true
  }, {
    enableWorker: false,
    enableStashBuffer: false,
    stashInitialSize: 128,
    headers: headers
  })

  flvPlayer.value.attachMediaElement(videoRef.value)
  flvPlayer.value.load()

  flvPlayer.value.on(flvjs.Events.ERROR, (errType: any, errDetail: any) => {
    console.error('[SSEStreamPanel] FLV player error:', errType, errDetail)
    if (!isReconnecting.value && !userManuallyStopped) {
      handleConnectionLost(`FLV stream error: ${errDetail}`)
    }
  })

  flvPlayer.value.on(flvjs.Events.LOADING_COMPLETE, () => {
    console.log('[SSEStreamPanel] FLV loading complete')
    if (!isReconnecting.value && !userManuallyStopped) {
      handleConnectionLost('FLV loading complete')
    }
  })

  try {
    flvPlayer.value.play()
    isStreaming.value = true
    addLog('FLV 连接建立成功', 'success')
  } catch (e) {
    console.error('[SSEStreamPanel] Play error:', e)
    throw e
  }
}

const handleConnectionLost = async (reason: string) => {
  console.log('[SSEStreamPanel] handleConnectionLost called, reason:', reason, 'attempts:', reconnectAttempts.value, 'isReconnecting:', isReconnecting.value)

  if (userManuallyStopped || isReconnecting.value) {
    console.log('[SSEStreamPanel] Skipping handleConnectionLost: userManuallyStopped or already reconnecting')
    return
  }

  isReconnecting.value = true
  reconnectAttempts.value++

  if (reconnectAttempts.value > maxReconnectAttempts) {
    console.log('[SSEStreamPanel] Max reconnect attempts reached, stopping')
    reconnectError.value = `重连次数已达上限 (${maxReconnectAttempts})，请手动刷新`
    isReconnecting.value = false
    isStreaming.value = false
    addLog('FLV 流重连失败，请手动刷新页面', 'error')
    return
  }

  addLog(`FLV 流断开，第 ${reconnectAttempts.value} 次重连中...`, 'warning')

  await new Promise<void>((resolve) => {
    reconnectTimer = window.setTimeout(() => {
      reconnectTimer = null
      resolve()
    }, 2000)
  })

  if (userManuallyStopped || !isReconnecting.value) {
    console.log('[SSEStreamPanel] User stopped during reconnect delay, aborting')
    isReconnecting.value = false
    return
  }

  try {
    await stopFlvPlayer()
    await startFlvStream()
    reconnectAttempts.value = 0
    isReconnecting.value = false
    addLog('FLV 流重连成功', 'success')
  } catch (e) {
    console.error('[SSEStreamPanel] Reconnect failed:', e)
    isReconnecting.value = false
    if (!userManuallyStopped && reconnectAttempts.value < maxReconnectAttempts) {
      handleConnectionLost(reason)
    }
  }
}

const startHeartbeat = () => {
  stopTimers()
  heartbeatTimer = window.setInterval(async () => {
    if (!isStreaming.value) return
    try {
      const res = await browserLiveControlApi.sendHeartbeat({
        browser_id: props.browserId,
        request: { client_id: `client_${Date.now()}`, timestamp: Math.floor(Date.now() / 1000) }
      })
      if (res.code !== 0 && res.code !== 200) {
        console.log('[SSEStreamPanel] Heartbeat returned error, stopping video stream:', res.msg)
        stopVideoStream()
        return
      }
      if (res.data?.status === 'session_not_found' || res.data?.status === 'error') {
        console.log('[SSEStreamPanel] Session not found or error, stopping video stream')
        stopVideoStream()
        return
      }
      if (res.data?.active_clients !== undefined) {
        heartbeatActiveClients.value = res.data.active_clients
      }
    } catch {}
  }, HEARTBEAT_INTERVAL)
}

const takeScreenshot = async () => {
  if (takingScreenshot.value) return
  takingScreenshot.value = true
  try {
    const res = await browserLiveControlApi.executeAction({
      browser_id: props.browserId,
      req: { action_id: 'screenshot', params: {}, page_index: currentPageIndex.value }
    })
    console.log('[SSEStreamPanel] takeScreenshot response:', JSON.stringify(res, null, 2))
    if (res.code === 0 && res.data) {
      let imgData: string | null = null
      console.log('[SSEStreamPanel] res.data:', res.data)
      console.log('[SSEStreamPanel] typeof res.data.data:', typeof res.data.data)
      if (res.data.data && typeof res.data.data === 'string') {
        imgData = res.data.data.startsWith('data:') ? res.data.data : `data:image/png;base64,${res.data.data}`
      } else if (res.data.data && typeof res.data.data === 'object') {
        const d = res.data.data as any
        console.log('[SSEStreamPanel] d:', d)
        const raw = d.base64 || d.image_base64 || d.screenshot
        console.log('[SSEStreamPanel] raw base64:', raw ? raw.substring(0, 100) + '...' : null)
        if (raw) imgData = raw.startsWith('data:') ? raw : `data:image/png;base64,${raw}`
      }
      console.log('[SSEStreamPanel] imgData:', imgData ? imgData.substring(0, 100) + '...' : null)
      if (imgData) {
        screenshotUrl.value = imgData
        showScreenshotDialog.value = true
        addLog('截图成功', 'success')
        biliMessage.success('截图成功')
      }
    } else {
      addLog(`截图失败: ${res.msg}`, 'error')
      biliMessage.error('截图失败')
    }
  } catch (e) {
    addLog(`截图异常: ${e}`, 'error')
    biliMessage.error('截图失败')
  } finally {
    takingScreenshot.value = false
  }
}

const downloadScreenshot = () => {
  if (!screenshotUrl.value) return
  const link = document.createElement('a')
  link.href = screenshotUrl.value
  link.download = `screenshot_${Date.now()}.png`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  biliMessage.success('截图已下载')
}

const handleNavigate = async () => {
  if (!navigateUrl.value) return
  navigating.value = true
  try {
    const res = await browserLiveControlApi.executeAction({
      browser_id: props.browserId,
      req: { action_id: 'navigate', params: { url: navigateUrl.value, wait_for_load: true }, page_index: currentPageIndex.value }
    })
    if (res.code === 0 && res.data?.success) {
      addLog(`导航到: ${navigateUrl.value}`, 'success')
      biliMessage.success('导航成功')
    } else {
      addLog(`导航失败: ${res.data?.error || res.msg}`, 'error')
      biliMessage.error(res.data?.error|| res.msg || '导航失败')
    }
  } catch (e) {
    biliMessage.error(`导航失败${e}`)
  } finally {
    navigating.value = false
  }
}

const handleVideoClick = async (event: MouseEvent) => {
  if (!isStreaming.value || clicking.value) return
  if (!videoRef.value) return

  const rect = videoRef.value.getBoundingClientRect()
  const x = event.clientX - rect.left
  const y = event.clientY - rect.top

  const ratioX = x / rect.width
  const ratioY = y / rect.height

  const actualX = Math.round(ratioX * videoWidth.value)
  const actualY = Math.round(ratioY * videoHeight.value)

  clickX.value = actualX
  clickY.value = actualY

  clicking.value = true
  try {
    const res = await browserLiveControlApi.executeAction({
      browser_id: props.browserId,
      req: { action_id: 'click', params: { selector: 'body', x: actualX, y: actualY, button: 'left', double_click: false }, page_index: currentPageIndex.value }
    })
    if (res.code === 0 && res.data?.success) {
      addLog(`点击 (${actualX}, ${actualY}) 成功`, 'success')
      refreshPagesList()
    } else {
      addLog(`点击失败: ${res.data?.error || res.msg}`, 'error')
    }
  } catch (e) {
    addLog(`点击异常: ${e}`, 'error')
  } finally {
    clicking.value = false
  }
}

const handleWheel = async (event: WheelEvent) => {
  if (!isStreaming.value || clicking.value) return
  if (!videoRef.value) return

  const videoRect = videoRef.value.getBoundingClientRect()
  const x = event.clientX - videoRect.left
  const y = event.clientY - videoRect.top

  const ratioX = x / videoRect.width
  const ratioY = y / videoRect.height
  const deltaX = event.deltaX
  const deltaY = event.deltaY

  clicking.value = true
  try {
    const res = await browserLiveControlApi.executeAction({
      browser_id: props.browserId,
      req: { action_id: 'scroll', params: { x: Math.round(ratioX * videoWidth.value), y: Math.round(ratioY * videoHeight.value), delta_x: deltaX, delta_y: deltaY }, page_index: currentPageIndex.value }
    })
    if (res.code === 0 && res.data?.success) {
      addLog(`滚动 (${deltaX}, ${deltaY}) 成功`, 'success')
    } else {
      addLog(`滚动失败: ${res.data?.error || res.msg}`, 'error')
    }
  } catch (e) {
    addLog(`滚动异常: ${e}`, 'error')
  } finally {
    clicking.value = false
  }
}

const performClick = async () => {
  clicking.value = true
  try {
    const res = await browserLiveControlApi.executeAction({
      browser_id: props.browserId,
      req: { action_id: 'click', params: {selector:'body', x: clickX.value, y: clickY.value, button: 'left', double_click: false }, page_index: currentPageIndex.value }
    })
    if (res.code === 0 && res.data?.success) {
      addLog(`点击 (${clickX.value}, ${clickY.value}) 成功`, 'success')
      biliMessage.success('点击成功')
    } else {
      addLog(`点击失败: ${res.data?.error || res.msg}`, 'error')
      biliMessage.error(res.data?.error || '点击失败')
    }
  } catch (e) {
    biliMessage.error('点击失败')
  } finally {
    clicking.value = false
  }
}

onBeforeUnmount(() => {
  if (unsubscribeStopBrowser) {
    unsubscribeStopBrowser()
    unsubscribeStopBrowser = null
  }
  if (clickOverlay.value) {
    clickOverlay.value.removeEventListener('wheel', handleWheel)
  }
  stopVideoStream()
})
</script>

<style scoped>
.panel-collapse-enter-active,
.panel-collapse-leave-active {
  transition: all 0.3s ease;
  overflow: hidden;
}

.panel-collapse-enter-from,
.panel-collapse-leave-to {
  width: 0 !important;
  opacity: 0;
  margin-left: 0 !important;
}
</style>
