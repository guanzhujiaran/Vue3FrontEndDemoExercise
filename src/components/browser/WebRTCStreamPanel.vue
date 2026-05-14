<!--
 * @FilePath: \Vue3FrontEndDemoExercise\src\components\browser\WebRTCStreamPanel.vue
 * @Description: WebRTC 实时视频流面板
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
        <span v-if="isStreaming">FPS: {{ fpsDisplay }}</span>
        <span v-if="resolutionDisplay">{{ resolutionDisplay }}</span>
        <template v-if="isStreaming && (bandwidthDownload > 0 || bandwidthUpload > 0)">
          <el-divider direction="vertical" class="!mx-0 !h-3" />
          <span class="text-blue-500 font-medium">⬇ {{ formatBandwidth(bandwidthDownload) }}</span>
          <span class="text-green-500 font-medium">⬆ {{ formatBandwidth(bandwidthUpload) }}</span>
        </template>
      </div>

      <div class="ml-auto flex gap-2">
        <!-- 截图按钮 -->
        <el-button
          size="small"
          :icon="Camera"
          plain
          :disabled="!browserRunning"
          :loading="takingScreenshot"
          @click="takeScreenshot"
          round
        >截图</el-button>

        <!-- 刷新流按钮 -->
        <el-tooltip content="刷新视频流（解决卡顿或无画面）" placement="top">
          <el-button
            size="small"
            :icon="RefreshRight"
            plain
            :disabled="!isStreaming"
            :loading="refreshingStream"
            @click="refreshStream"
            round
          >刷新</el-button>
        </el-tooltip>

        <!-- 手动刷新直播状态 -->
        <el-tooltip :content="isStreaming ? '刷新直播状态（视频流+页面列表+会话信息）' : '刷新会话和页面状态'" placement="top">
          <el-button
            size="small"
            :icon="Refresh"
            type="warning"
            plain
            :loading="refreshingLiveStatus"
            @click="handleRefreshLiveStatus"
            round
          >直播状态</el-button>
        </el-tooltip>

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
              <p class="text-base-content text-sm m-0">{{ isReconnecting ? `重连中 (${reconnectAttempts}/${maxReconnectAttempts})...` : '正在建立 WebRTC 连接...' }}</p>
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
              <p class="text-sm m-0">点击"开始视频"建立 WebRTC 连接</p>
              <p class="text-xs m-0 opacity-60">将实时显示浏览器画面</p>
            </div>

            <!-- WebRTC 视频播放 -->
            <div
              v-show="isStreaming"
              ref="videoWrapper"
              class="w-full h-full flex items-center justify-center"
            >
              <video
                ref="videoRef"
                class="max-w-full max-h-full object-contain video-element"
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

      <!-- 右侧面板区域 -->
      <div class="flex shrink-0">
        <!-- 拖动调整宽度的把手 -->
        <div
          class="w-1 cursor-col-resize transition-all duration-150 group"
          :class="isResizing ? 'bg-primary w-2' : 'bg-gray-300 hover:bg-primary hover:w-1.5'"
          @mousedown="startResize"
          ref="resizeHandle"
          title="拖动调整宽度"
        >
          <div class="w-full h-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <div class="w-0.5 h-8 bg-white/50 rounded-full"></div>
          </div>
        </div>

        <!-- 面板内容区域 -->
        <div
          class="flex shrink-0 overflow-visible"
          :style="{ width: rightPanelWidth + 'px' }"
          ref="resizeContainer"
        >
          <!-- 内容区域 -->
          <div class="flex-1 flex flex-col gap-3 p-3 overflow-auto">
            <!-- 操作调试 Tab -->
            <div v-if="activeTab === 'action'" class="flex-1">
              <DebugActionPanel
                ref="actionRef"
                :browser-id="browserId"
                :browser-running="browserRunning"
                :registered-actions="registeredActions"
                :loading-actions="loadingActions"
                @log="(msg, t) => handleLog(msg, t)"
                @refresh-actions="loadRegisteredActions"
              />
            </div>

            <!-- 插件管理 Tab -->
            <div v-if="activeTab === 'plugin'" class="flex-1">
              <DebugPluginPanel
                ref="pluginRef"
                :browser-id="browserId"
                :browser-running="browserRunning"
                @log="(msg, t) => handleLog(msg, t)"
              />
            </div>

            <!-- 日志 Tab -->
            <div v-if="activeTab === 'log'" class="flex-1">
              <RightPanelLogTab ref="logTabRef" />
            </div>
          </div>

          <!-- 右侧菜单栏 - 和左侧样式完全一致 -->
          <div class="flex flex-col shrink-0 overflow-hidden bg-bg border-l border-(--el-border-color-lighter) w-[72px]">
            <el-menu
              class="console-side-nav-menu"
              :default-active="activeTab"
              :collapse="false"
              :collapse-transition="false"
            >
              <el-menu-item index="action" @click="activeTab = 'action'">
                <i class="el-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">
                    <path fill="currentColor" d="M768 64H256a32 32 0 0 0-32 32v832a32 32 0 0 0 32 32h512a32 32 0 0 0 32-32V96a32 32 0 0 0-32-32m-48 130.56V192H256v2.56a128 128 0 0 1 65.472 33.92l35.84 28.864A64 64 0 0 0 416 228.032V192h256v36.032a64 64 0 0 0 58.688 63.872l35.84-28.864A128 128 0 0 1 720 194.56M256 384v416h256V384Zm32 96v224h192V480Zm320 224V384h144v416Z"/>
                  </svg>
                </i>
                <template #title>自定义操作</template>
              </el-menu-item>
              <el-menu-item index="plugin" @click="activeTab = 'plugin'">
                <i class="el-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">
                    <path fill="currentColor" d="M317.056 128 128 344.064V896h768V344.064L706.944 128zm-14.528-64h418.944a32 32 0 0 1 24.064 10.88l206.528 236.096A32 32 0 0 1 960 332.032V928a32 32 0 0 1-32 32H96a32 32 0 0 1-32-32V332.032a32 32 0 0 1 7.936-21.12L278.4 75.008A32 32 0 0 1 302.528 64"/>
                    <path fill="currentColor" d="M64 320h896v64H64z"/>
                    <path fill="currentColor" d="M448 327.872V640h128V327.872L526.08 128h-28.16zM448 64h128l64 256v352a32 32 0 0 1-32 32H416a32 32 0 0 1-32-32V320z"/>
                  </svg>
                </i>
                <template #title>插件</template>
              </el-menu-item>
              <el-menu-item index="log" @click="activeTab = 'log'">
                <i class="el-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">
                    <path fill="currentColor" d="M192 128h640a32 32 0 0 1 32 32v640a32 32 0 0 1-32 32H192a32 32 0 0 1-32-32V160a32 32 0 0 1 32-32m0 64V832h640V192zm64 128h512v64H256zm0 128h512v64H256zm0 128h512v64H256zm0 128h256v64H256z"/>
                  </svg>
                </i>
                <template #title>日志</template>
              </el-menu-item>
            </el-menu>
          </div>
        </div>
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
        <el-image
          v-if="screenshotUrl"
          :src="screenshotUrl"
          :preview-src-list="[screenshotUrl]"
          :initial-index="0"
          fit="contain"
          class="max-w-full rounded-lg border-2 border-gray-200 shadow-sm cursor-zoom-in"
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
import {
  VideoPlay, VideoPause, Camera, Link,
  Loading, CircleClose, VideoCamera, User, Download,
  Document, Close, Plus, RefreshRight, Refresh
} from '@element-plus/icons-vue'
import { browserLiveControlApi } from '@/api/browser/browser_api'
import browserControlApi from '@/api/browser/browser_control_api'
import actionsApi, { ActionsApi } from '@/api/browser/actions_api'
import biliMessage from '@/utils/message'
import type { BrowserSessionStatus } from '@/types/browser-automation-api'

import RightPanelLogTab from './right-panel/RightPanelLogTab.vue'
import FlexContainer from '@/components/CommonCompo/Bili-Container-Compo/FlexContainer.vue'
import DebugActionPanel from './right-panel/DebugActionPanel.vue'
import DebugPluginPanel from './right-panel/DebugPluginPanel.vue'

const sessionState = inject<Ref<BrowserSessionStatus | undefined>>('browserSessionState')

let unsubscribeStopBrowser: (() => void) | null = null

onMounted(() => {
  if (onStopBrowser) {
    unsubscribeStopBrowser = onStopBrowser(() => {
      console.log('[WebRTCStreamPanel] Received stopBrowser notification, stopping video stream')
      stopVideoStream()
    })
  }
  if (sessionState?.value?.browser_running && sessionState?.value?.lifecycle_state === 'active') {
    console.log('[WebRTCStreamPanel] Browser already running on mount, fetching page list')
    refreshPagesList()
    loadRegisteredActions()
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
      clickOverlay.value.addEventListener('wheel', handleWheel, { passive: true })
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

const videoRef = ref<HTMLVideoElement | null>(null)
const clickOverlay = ref<HTMLDivElement | null>(null)
const peerConnection = ref<RTCPeerConnection | null>(null)
const streamKey = ref('')
const resizeContainer = ref<HTMLDivElement | null>(null)

const rightPanelWidth = ref(Math.floor(window.innerWidth * 0.48))
const isResizing = ref(false)

const startResize = (e: MouseEvent) => {
  isResizing.value = true
  const startX = e.clientX
  const startWidth = rightPanelWidth.value

  const onMouseMove = (moveEvent: MouseEvent) => {
    if (!isResizing.value) return
    // 往左拉时右边扩大，往右拉时右边缩小
    const delta = startX - moveEvent.clientX
    const newWidth = Math.max(300, Math.min(800, startWidth + delta))
    rightPanelWidth.value = newWidth
  }

  const onMouseUp = () => {
    isResizing.value = false
    document.removeEventListener('mousemove', onMouseMove)
    document.removeEventListener('mouseup', onMouseUp)
  }

  document.addEventListener('mousemove', onMouseMove)
  document.addEventListener('mouseup', onMouseUp)
}

const navigateUrl = ref('')
const navigating = ref(false)

const reconnectAttempts = ref(0)
const maxReconnectAttempts = 3
const isReconnecting = ref(false)
const reconnectError = ref('')
let userManuallyStopped = false
let reconnectTimer: number | null = null

let totalReconnectCount = 0

let heartbeatTimer: number | null = null
const HEARTBEAT_INTERVAL = 30000

let frameCount = 0
let lastFrameTime = 0
let fpsInterval: number | null = null

interface PageInfo {
  page_index: number
  page_id: string
  title: string
  url: string
}
const pagesList = ref<PageInfo[]>([])
const currentPageIndex = ref(0)
const creatingPage = ref(false)
const refreshingStream = ref(false)
const refreshingLiveStatus = ref(false)

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

const currentPageId = computed(() => {
  const currentPage = pagesList.value.find(page => page.page_index === currentPageIndex.value)
  return currentPage?.page_id || ''
})

watch(() => currentPageIndex.value, () => {
  navigateUrl.value = currentPageUrl.value
})

watch(() => sessionState?.value, (newState) => {
  if (newState && isStreaming.value) {
    const { session_exists, browser_running, lifecycle_state } = newState
    if (!session_exists || (!browser_running && (lifecycle_state === 'stopped' || lifecycle_state === 'error'))) {
      console.log('[WebRTCStreamPanel] Browser terminated, stopping video stream')
      stopVideoStream()
    }
  }
  if (newState && newState.browser_running && newState.lifecycle_state === 'active') {
    console.log('[WebRTCStreamPanel] Browser is running, fetching page list')
    refreshPagesList()
    loadRegisteredActions()
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

const activeConnections = computed(() => 1)

const tabs = [
  { key: 'action', label: '操作' },
  { key: 'plugin', label: '插件' },
  { key: 'log', label: '日志' }
]

const activeTab = ref('action')

const logTabRef = ref<InstanceType<typeof RightPanelLogTab> | null>(null)
const actionRef = ref<InstanceType<typeof DebugActionPanel> | null>(null)
const pluginRef = ref<InstanceType<typeof DebugPluginPanel> | null>(null)

const handleLog = (message: string, type: 'info' | 'success' | 'warning' | 'error') => {
  logTabRef.value?.addLog(message, type)
}

const registeredActions = ref<any[]>([])
const loadingActions = ref(false)

const loadRegisteredActions = async () => {
  loadingActions.value = true
  try {
    const res = await actionsApi.getRegisteredActions({ browser_id: props.browserId })
    if (res.code === 0 && res.data) {
      const actions = Array.isArray(res.data) ? res.data : (res.data.actions || [])
      registeredActions.value = actions.map((action: any) => {
        const normalized = ActionsApi.normalizeActionMetadata(action)
        return {
          id: normalized.id,
          action_id: normalized.action_id,
          name: normalized.name,
          description: normalized.description,
          category: normalized.category || normalized.type || 'other',
          parameters: normalized.parameters || [],
          schema: action.schema || null
        }
      })
      console.log(`[WebRTCStreamPanel] Loaded ${registeredActions.value.length} registered actions`)
    } else {
      console.warn('[WebRTCStreamPanel] Failed to load actions:', res.msg)
    }
  } catch (e: any) {
    console.error('[WebRTCStreamPanel] Error loading actions:', e)
  } finally {
    loadingActions.value = false
  }
}

const stopVideoStream = () => {
  console.log('[WebRTCStreamPanel] stopVideoStream called')
  userManuallyStopped = true
  isStreaming.value = false
  isConnecting.value = false
  isReconnecting.value = false
  reconnectAttempts.value = 0
  totalReconnectCount = 0

  if (reconnectTimer) {
    clearTimeout(reconnectTimer)
    reconnectTimer = null
  }

  if (fpsInterval) {
    clearInterval(fpsInterval)
    fpsInterval = null
  }

  stopBandwidthStats()

  const closeStream = async () => {
    if (streamKey.value && props.browserId) {
      try {
        await browserControlApi.closeWebrtcStream({
          browser_id: props.browserId,
          stream_key: streamKey.value
        })
        console.log('[WebRTCStreamPanel] WebRTC stream closed on server')
      } catch (e) {
        console.error('[WebRTCStreamPanel] Failed to close webrtc stream:', e)
      }
    }
    streamKey.value = ''
  }
  
  closeStream()

  stopWebrtcConnection()
  stopTimers()

  fpsDisplay.value = 0
  resolutionDisplay.value = ''

  if (sessionState?.value) {
    sessionState.value.status = 'disconnected'
  }
  handleLog('视频流已停止', 'info')
  biliMessage.info('视频流已停止')
}

const stopWebrtcConnection = async () => {
  if (peerConnection.value) {
    try {
      peerConnection.value.close()
      peerConnection.value = null
    } catch (e) {
      console.error('[WebRTCStreamPanel] Failed to close peer connection:', e)
    }
  }
}

const refreshStream = async () => {
  if (!isStreaming.value || refreshingStream.value) return
  refreshingStream.value = true
  try {
    handleLog('正在刷新 WebRTC 视频流...', 'info')

    if (streamKey.value) {
      try {
        await browserControlApi.closeWebrtcStream({
          browser_id: props.browserId,
          stream_key: streamKey.value
        })
        handleLog('已发送关闭流请求', 'info')
      } catch (e) {
        console.error('[WebRTCStreamPanel] Failed to close webrtc stream:', e)
      }
    }

    await stopWebrtcConnection()
    streamKey.value = ''

    await startWebrtcStream()
    handleLog('视频流刷新成功', 'success')
    biliMessage.success('视频流已刷新')
  } catch (e: any) {
    handleLog(`刷新失败: ${e.message || e}`, 'error')
    biliMessage.error('刷新失败：' + (e.message || '未知错误'))
  } finally {
    refreshingStream.value = false
  }
}

const handleRefreshLiveStatus = async () => {
  if (refreshingLiveStatus.value) return
  refreshingLiveStatus.value = true

  const startTime = Date.now()
  handleLog('🔄 刷新直播状态...', 'info')

  try {
    const res = await browserControlApi.getBrowserSessionStatus({
      browser_id: props.browserId
    })

    const elapsed = Date.now() - startTime
    if (res.code === 0) {
      handleLog(`✅ 直播状态刷新完成 (${elapsed}ms)`, 'success')
      biliMessage.success(`直播状态已刷新 (${elapsed}ms)`)
    } else {
      handleLog(`⚠️ 直播状态刷新异常: ${res.msg} (${elapsed}ms)`, 'warning')
      biliMessage.warning(res.msg || '刷新异常')
    }
  } catch (e: any) {
    handleLog(`❌ 直播状态刷新失败: ${e.message || e}`, 'error')
    biliMessage.error('刷新失败：' + (e.message || '未知错误'))
  } finally {
    refreshingLiveStatus.value = false
  }
}

const stopTimers = () => {
  if (heartbeatTimer) { clearInterval(heartbeatTimer); heartbeatTimer = null }
}

const startVideoStream = async () => {
  console.log('[WebRTCStreamPanel] startVideoStream called, isStreaming:', isStreaming.value)
  if (isStreaming.value) return

  isConnecting.value = true
  userManuallyStopped = false
  reconnectError.value = ''
  screenshotUrl.value = ''
  totalReconnectCount = 0
  reconnectAttempts.value = 0

  try {
    handleLog('检查浏览器会话...', 'info')
    const currentState = sessionState?.value
    if (currentState && !currentState.browser_running) {
      handleLog('浏览器未运行，正在启动...（大约需要等待1分钟）', 'warning')
      const createRes = await browserLiveControlApi.createBrowserSession({ browser_id: props.browserId })
      if (createRes.code !== 0) {
        throw new Error(createRes.msg || '启动浏览器失败')
      }
    }

    await startWebrtcStream()
    startHeartbeat()
    await refreshPagesList()

  } catch (error: any) {
    if (error.name !== 'AbortError') {
      handleLog(`连接失败: ${error.message || error}`, 'error')
      biliMessage.error('启动视频流失败：' + (error.message || '未知错误'))
      reconnectError.value = error.message || '连接失败'
    }
  } finally {
    isConnecting.value = false
  }
}

const startWebrtcStream = async () => {
  console.log('[WebRTCStreamPanel] startWebrtcStream called')

  await stopWebrtcConnection()

  if (!videoRef.value) {
    await nextTick()
    if (!videoRef.value) {
      throw new Error('Video element not found')
    }
  }

  try {
    handleLog('Step 1: 请求 SDP Offer...', 'info')
    const offerRes = await browserControlApi.createWebrtcOffer({
      browser_id: props.browserId,
      page_index: currentPageIndex.value
    })

    if (offerRes.code !== 0) {
      throw new Error(offerRes.msg || '获取 Offer 失败')
    }

    const offer = offerRes.data
    console.log('[WebRTCStreamPanel] Received offer, sdp length:', offer?.sdp?.length)
    console.log('[WebRTCStreamPanel] Offer type:', offer?.type)
    
    if (offer?.stream_key) {
      streamKey.value = offer.stream_key
      console.log('[WebRTCStreamPanel] Received stream_key:', offer.stream_key)
    }

    handleLog(`收到SDP Offer (${offer?.sdp?.length || 0} bytes)`, 'success')

    const pc = new RTCPeerConnection({
      iceServers: []
    })

    pc.onicecandidate = async (event) => {
      console.log('[WebRTCStreamPanel] ICE candidate:', event.candidate)
      if (event.candidate && streamKey.value) {
        try {
          await browserControlApi.addIceCandidate({
            browser_id: props.browserId,
            stream_key: streamKey.value,
            candidate: event.candidate.candidate,
            sdpMid: event.candidate.sdpMid || '',
            sdpMLineIndex: event.candidate.sdpMLineIndex || 0
          })
        } catch (e) {
          console.error('[WebRTCStreamPanel] Failed to send ICE candidate:', e)
        }
      }
    }

    pc.ontrack = (event) => {
      console.log('[WebRTCStreamPanel] Received track:', event.track.kind, 'streams:', event.streams)
      if (event.track.kind === 'video' && event.streams[0]) {
        console.log('[WebRTCStreamPanel] isStreaming set to true')
        isStreaming.value = true
        const videoEl = document.querySelector('.browser .video-element') as HTMLVideoElement
        console.log('[WebRTCStreamPanel] Found video element:', videoEl)
        if (videoEl) {
          videoEl.srcObject = event.streams[0]
          console.log('[WebRTCStreamPanel] srcObject set, calling play()')
          videoEl.play().then(() => {
            console.log('[WebRTCStreamPanel] Video playing successfully')
            handleLog('视频播放成功', 'success')
            startFPSCounter()
            startBandwidthStats()
          }).catch(e => {
            console.error('[WebRTCStreamPanel] Play failed:', e)
          })
        } else {
          console.error('[WebRTCStreamPanel] videoEl is null!')
        }
      }
    }

    pc.onconnectionstatechange = () => {
      const state = pc.connectionState
      console.log('[WebRTCStreamPanel] Connection state:', state)
      if (state === 'connected') {
        handleLog('WebRTC 连接建立成功', 'success')
      } else if (state === 'disconnected') {
        handleLog('WebRTC 连接中断，等待自动恢复...', 'warning')
        setTimeout(() => {
          if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
            console.log('[WebRTCStreamPanel] Connection did not recover, state:', pc.connectionState)
            if (!userManuallyStopped) {
              handleConnectionLost(`Connection ${state}`)
            }
          } else if (pc.connectionState === 'connected') {
            handleLog('WebRTC 连接已自动恢复', 'success')
          }
        }, 3000)
      } else if (state === 'failed') {
        if (!userManuallyStopped) {
          handleConnectionLost(`Connection ${state}`)
        }
      }
    }

    pc.oniceconnectionstatechange = () => {
      console.log('[WebRTCStreamPanel] ICE state:', pc.iceConnectionState)
    }

    handleLog('Step 2: 设置远程描述...', 'info')
    await pc.setRemoteDescription(new RTCSessionDescription(offer))

    handleLog('Step 3: 创建本地 Answer...', 'info')
    const answer = await pc.createAnswer()
    console.log('[WebRTCStreamPanel] Created answer, sdp length:', answer.sdp?.length)
    await pc.setLocalDescription(answer)

    handleLog('Step 4: 发送 Answer 到服务器...', 'info')
    
    try {
      const answerRes = await browserControlApi.submitWebrtcAnswer({
        browser_id: props.browserId,
        page_index: currentPageIndex.value,
        answer: {
          sdp: answer.sdp,
          type: answer.type
        },
        stream_key: streamKey.value
      })

      if (answerRes.code !== 0) {
        console.warn('[WebRTCStreamPanel] Answer submit returned non-zero code:', answerRes.msg)
        handleLog(`Answer 提交返回: ${answerRes.msg || '未知'}`, 'warning')
      } else {
        handleLog('Answer 已发送到服务器', 'success')
      }
    } catch (answerErr: any) {
      console.warn('[WebRTCStreamPanel] Failed to submit answer:', answerErr)
      handleLog(`Answer 提交失败(非致命): ${answerErr.message || answerErr}`, 'warning')
    }

    peerConnection.value = pc
    console.log('[WebRTCStreamPanel] WebRTC stream started')

  } catch (e: any) {
    console.error('[WebRTCStreamPanel] startWebrtcStream error:', e)
    handleLog(`错误: ${e.message || e}`, 'error')
    throw e
  }
}

const startFPSCounter = () => {
  frameCount = 0
  lastFrameTime = performance.now()

  if (videoRef.value) {
    const countFrames = () => {
      if (peerConnection.value && peerConnection.value.connectionState === 'connected') {
        frameCount++
      }
      requestAnimationFrame(countFrames)
    }
    countFrames()

    videoRef.value.addEventListener('play', () => {
      if (fpsInterval) {
        clearInterval(fpsInterval)
      }
      fpsInterval = window.setInterval(() => {
        const now = performance.now()
        const elapsed = (now - lastFrameTime) / 1000
        const fps = Math.round(frameCount / elapsed)
        fpsDisplay.value = fps
        if (videoRef.value && videoRef.value.videoWidth && videoRef.value.videoHeight) {
          resolutionDisplay.value = `${videoRef.value.videoWidth}x${videoRef.value.videoHeight}`
        }
        frameCount = 0
        lastFrameTime = now
      }, 1000)
    })
  }
}

const startBandwidthStats = () => {
  stopBandwidthStats()
  
  const initStats = async () => {
    if (!peerConnection.value) return
    try {
      const stats = await peerConnection.value.getStats()
      stats.forEach((report: RTCStatsReport) => {
        if (report.type === 'inbound-rtp' && (report as any).kind === 'video') {
          lastBytesReceived = (report as any).bytesReceived || 0
        }
        if (report.type === 'outbound-rtp' && (report as any).kind === 'video') {
          lastBytesSent = (report as any).bytesSent || 0
        }
      })
    } catch (e) {
      console.error('[WebRTCStreamPanel] Failed to get initial stats:', e)
    }
  }
  
  initStats().then(() => {
    bandwidthStatsInterval = window.setInterval(async () => {
      if (!peerConnection.value || peerConnection.value.connectionState !== 'connected') return
      
      try {
        const stats = await peerConnection.value.getStats()
        let currentBytesReceived = 0
        let currentBytesSent = 0
        
        stats.forEach((report: RTCStatsReport) => {
          if (report.type === 'inbound-rtp' && (report as any).kind === 'video') {
            currentBytesReceived = (report as any).bytesReceived || 0
          }
          if (report.type === 'outbound-rtp' && (report as any).kind === 'video') {
            currentBytesSent = (report as any).bytesSent || 0
          }
        })
        
        bandwidthDownload.value = Math.max(0, currentBytesReceived - lastBytesReceived)
        bandwidthUpload.value = Math.max(0, currentBytesSent - lastBytesSent)
        
        lastBytesReceived = currentBytesReceived
        lastBytesSent = currentBytesSent
      } catch (e) {
        console.error('[WebRTCStreamPanel] Failed to get bandwidth stats:', e)
      }
    }, 1000)
  })
}

const stopBandwidthStats = () => {
  if (bandwidthStatsInterval) {
    clearInterval(bandwidthStatsInterval)
    bandwidthStatsInterval = null
  }
  bandwidthDownload.value = 0
  bandwidthUpload.value = 0
  lastBytesReceived = 0
  lastBytesSent = 0
}

const handleConnectionLost = async (reason: string) => {
  console.log('[WebRTCStreamPanel] handleConnectionLost called, reason:', reason, 'totalReconnectCount:', totalReconnectCount, 'isReconnecting:', isReconnecting.value)

  if (userManuallyStopped || isReconnecting.value) {
    console.log('[WebRTCStreamPanel] Skipping handleConnectionLost: userManuallyStopped or already reconnecting')
    return
  }

  isReconnecting.value = true
  totalReconnectCount++
  reconnectAttempts.value++

  if (totalReconnectCount > maxReconnectAttempts) {
    console.log('[WebRTCStreamPanel] Max reconnect attempts reached, stopping')
    reconnectError.value = `重连次数已达上限 (${maxReconnectAttempts})，请手动刷新`
    isReconnecting.value = false
    isStreaming.value = false
    handleLog('WebRTC 流重连失败，请手动刷新页面', 'error')
    return
  }

  handleLog(`WebRTC 流断开，第 ${reconnectAttempts.value} 次重连中... (总计 ${totalReconnectCount}/${maxReconnectAttempts})`, 'warning')

  await new Promise<void>((resolve) => {
    reconnectTimer = window.setTimeout(() => {
      reconnectTimer = null
      resolve()
    }, 2000)
  })

  if (userManuallyStopped || !isReconnecting.value) {
    console.log('[WebRTCStreamPanel] User stopped during reconnect delay, aborting')
    isReconnecting.value = false
    return
  }

  try {
    await stopWebrtcConnection()
    await startWebrtcStream()
    reconnectAttempts.value = 0
    isReconnecting.value = false
    handleLog(`WebRTC 流重连成功 (已用 ${totalReconnectCount}/${maxReconnectAttempts})`, 'success')
  } catch (e) {
    console.error('[WebRTCStreamPanel] Reconnect failed:', e)
    isReconnecting.value = false
    if (!userManuallyStopped && totalReconnectCount < maxReconnectAttempts) {
      handleConnectionLost(reason)
    }
  }
}

const startHeartbeat = () => {
  stopTimers()
  heartbeatTimer = window.setInterval(async () => {
    if (!isStreaming.value) return
    try {
      const heartbeatRequest: any = {
        client_id: `client_${Date.now()}`,
        timestamp: Math.floor(Date.now() / 1000)
      }
      if (currentPageId.value) {
        heartbeatRequest.page_id = currentPageId.value
      }

      const res = await browserLiveControlApi.sendHeartbeat({
        browser_id: props.browserId,
        request: heartbeatRequest
      })
      if (res.code !== 0 && res.code !== 200) {
        console.log('[WebRTCStreamPanel] Heartbeat returned error, stopping video stream:', res.msg)
        stopVideoStream()
        return
      }
      if (res.data?.status === 'session_not_found' || res.data?.status === 'error') {
        console.log('[WebRTCStreamPanel] Session not found or error, stopping video stream')
        stopVideoStream()
        return
      }
    } catch {}
  }, HEARTBEAT_INTERVAL)
}

const refreshPagesList = async () => {
  if (!props.browserId) return
  try {
    console.log('[WebRTCStreamPanel] refreshPagesList called, browserId:', props.browserId)
    const res = await browserLiveControlApi.getPageList({ browser_id: props.browserId })
    console.log('[WebRTCStreamPanel] getPageList response:', res)
    if (res.code === 0 && res.data && res.data.pages) {
      pagesList.value = res.data.pages.map((page: any) => ({
        page_index: page.index,
        page_id: page.page_id || '',
        title: page.title || '新标签页',
        url: page.url
      }))
      handleLog(`获取到 ${pagesList.value.length} 个页面`, 'success')
      console.log('[WebRTCStreamPanel] Pages with IDs:', pagesList.value.map(p => ({ index: p.page_index, id: p.page_id })))
      if (currentPageIndex.value >= pagesList.value.length && pagesList.value.length > 0) {
        currentPageIndex.value = 0
      }
    } else {
      handleLog(`获取页面列表失败: ${res.msg || '未知错误'}`, 'error')
      console.error('[WebRTCStreamPanel] getPageList failed:', res.msg)
    }
  } catch (e) {
    handleLog(`获取页面列表异常: ${e}`, 'error')
    console.error('[WebRTCStreamPanel] refreshPagesList error:', e)
  }
}

const switchToPage = async (pageIndex: number) => {
  if (!props.browserId || pageIndex === currentPageIndex.value) return
  const oldPageIndex = currentPageIndex.value
  try {
    await browserLiveControlApi.switchPage({ browser_id: props.browserId, page_index: pageIndex })
    currentPageIndex.value = pageIndex
    handleLog(`已切换到页面 ${pageIndex + 1}`, 'success')

    if (isStreaming.value) {
      await stopVideoStream()
      await nextTick()
      await startVideoStream()
    }
  } catch (e) {
    handleLog(`切换页面失败: ${e}`, 'error')
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
      handleLog(`已关闭页面 ${pageIndex + 1}`, 'success')
      await refreshPagesList()
      if (pageIndex === currentPageIndex.value && pagesList.value.length > 0) {
        const newPageIndex = 0
        await browserLiveControlApi.switchPage({ browser_id: props.browserId, page_index: newPageIndex })
        currentPageIndex.value = newPageIndex
        if (isStreaming.value) {
          await stopVideoStream()
          await nextTick()
          await startVideoStream()
        }
      }
    }
  } catch (e) {
    handleLog(`关闭页面失败: ${e}`, 'error')
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
      handleLog('已创建新页面', 'success')
      await refreshPagesList()
    }
  } catch (e) {
    handleLog(`创建页面失败: ${e}`, 'error')
  } finally {
    creatingPage.value = false
  }
}

const takeScreenshot = async () => {
  if (takingScreenshot.value) return
  takingScreenshot.value = true
  try {
    const res = await browserLiveControlApi.executeAction({
      browser_id: props.browserId,
      req: { action_id: 'screenshot', params: {}, page_index: currentPageIndex.value }
    })
    console.log('[WebRTCStreamPanel] takeScreenshot response:', JSON.stringify(res, null, 2))
    if (res.code === 0 && res.data) {
      let imgData: string | null = null
      console.log('[WebRTCStreamPanel] res.data:', res.data)
      console.log('[WebRTCStreamPanel] typeof res.data.data:', typeof res.data.data)
      if (res.data.data && typeof res.data.data === 'string') {
        imgData = res.data.data.startsWith('data:') ? res.data.data : `data:image/png;base64,${res.data.data}`
      } else if (res.data.data && typeof res.data.data === 'object') {
        const d = res.data.data as any
        console.log('[WebRTCStreamPanel] d:', d)
        const raw = d.base64 || d.image_base64 || d.screenshot
        console.log('[WebRTCStreamPanel] raw base64:', raw ? raw.substring(0, 100) + '...' : null)
        if (raw) imgData = raw.startsWith('data:') ? raw : `data:image/png;base64,${raw}`
      }
      console.log('[WebRTCStreamPanel] imgData:', imgData ? imgData.substring(0, 100) + '...' : null)
      if (imgData) {
        screenshotUrl.value = imgData
        showScreenshotDialog.value = true
        handleLog('截图成功', 'success')
        biliMessage.success('截图成功')
      }
    } else {
      handleLog(`截图失败: ${res.msg}`, 'error')
      biliMessage.error('截图失败')
    }
  } catch (e) {
    handleLog(`截图异常: ${e}`, 'error')
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
      handleLog(`导航到: ${navigateUrl.value}`, 'success')
      biliMessage.success('导航成功')
    } else {
      handleLog(`导航失败: ${res.data?.error || res.msg}`, 'error')
      biliMessage.error(res.data?.error|| res.msg || '导航失败')
    }
  } catch (e) {
    biliMessage.error(`导航失败${e}`)
  } finally {
    navigating.value = false
  }
}

const clicking = ref(false)

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

  clicking.value = true
  try {
    const res = await browserLiveControlApi.executeAction({
      browser_id: props.browserId,
      req: { action_id: 'click', params: { selector: 'body', x: actualX, y: actualY, button: 'left', double_click: false }, page_index: currentPageIndex.value }
    })
    if (res.code === 0 && res.data?.success) {
      handleLog(`点击 (${actualX}, ${actualY}) 成功`, 'success')
      refreshPagesList()
    } else {
      handleLog(`点击失败: ${res.data?.error || res.msg}`, 'error')
    }
  } catch (e) {
    handleLog(`点击异常: ${e}`, 'error')
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
      handleLog(`滚动 (${deltaX}, ${deltaY}) 成功`, 'success')
    } else {
      handleLog(`滚动失败: ${res.data?.error || res.msg}`, 'error')
    }
  } catch (e) {
    handleLog(`滚动异常: ${e}`, 'error')
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

const fpsDisplay = ref(0)
const resolutionDisplay = ref('')
const bandwidthDownload = ref(0)
const bandwidthUpload = ref(0)
let bandwidthStatsInterval: number | null = null
let lastBytesReceived = 0
let lastBytesSent = 0

const formatBandwidth = (bytesPerSecond: number): string => {
  if (bytesPerSecond < 1024) return `${bytesPerSecond} B/s`
  if (bytesPerSecond < 1024 * 1024) return `${(bytesPerSecond / 1024).toFixed(1)} KB/s`
  return `${(bytesPerSecond / (1024 * 1024)).toFixed(2)} MB/s`
}
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