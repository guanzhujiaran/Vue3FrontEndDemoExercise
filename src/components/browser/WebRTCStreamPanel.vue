<!--
 * @FilePath: \Vue3FrontEndDemoExercise\src\components\browser\WebRTCStreamPanel.vue
 * @Description: WebRTC 实时视频流面板 - 内嵌于 BrowserDebugPanel Tab 中
-->
<template>
  <div class="flex flex-col gap-3 h-full">
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
      <div v-if="sessionInfo.status !== 'disconnected'" class="flex items-center gap-3 text-xs text-[var(--el-text-color-secondary)]">
        <span><el-icon><User /></el-icon> {{ sessionInfo.active_connections }} 连接</span>
        <span v-if="sessionInfo.lifecycle_state">
          <el-tag size="small" :type="getLifecycleType(sessionInfo.lifecycle_state)" effect="plain">
            {{ sessionInfo.lifecycle_state }}
          </el-tag>
        </span>
      </div>

      <!-- 调试信息 -->
      <div class="ml-auto flex items-center gap-2">
        <el-tooltip content="调试信息" placement="bottom">
          <el-button size="small" icon="Info" plain @click="showDebug = !showDebug">调试</el-button>
        </el-tooltip>
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
          :content="!browserRunning && !isStreaming ? '请先在左侧导航栏启动浏览器' : ''"
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
        <!-- URL 导航栏 -->
        <div class="flex items-center gap-2 px-3 py-2 rounded-t-xl bg-gray-900 border border-b-0 border-[var(--el-border-color)]">
          <el-input
            v-model="navigateUrl"
            placeholder="输入URL导航..."
            clearable
            @keyup.enter="handleNavigate"
            size="small"
            style="font-family: monospace;"
          >
            <template #prefix><el-icon><Link /></el-icon></template>
          </el-input>
          <el-button type="primary" size="small" @click="handleNavigate" :loading="navigating">前往</el-button>
        </div>

        <!-- 视频容器 -->
        <div
          class="relative flex-1 bg-black rounded-b-xl overflow-hidden border border-[var(--el-border-color)] flex items-center justify-center min-h-[300px]"
          @mouseenter="showControls = true"
          @mouseleave="showControls = false"
        >
          <!-- 加载遮罩 -->
          <div v-if="isConnecting || isReconnecting" class="absolute inset-0 flex flex-col items-center justify-center bg-black/80 z-10 gap-4">
            <el-icon class="is-loading text-white" :size="48"><Loading /></el-icon>
            <p class="text-white text-sm m-0">{{ isReconnecting ? `重连中 (${reconnectAttempts}/${maxReconnectAttempts})...` : '正在建立 WebRTC 连接...' }}</p>
          </div>

          <!-- 重连失败提示 -->
          <div v-if="reconnectError && !isStreaming && !isConnecting" class="absolute inset-0 flex flex-col items-center justify-center bg-black/90 z-10 gap-4">
            <el-icon :size="48" class="text-red-400"><CircleClose /></el-icon>
            <p class="text-red-400 text-base font-semibold m-0">{{ reconnectError }}</p>
            <p class="text-white/70 text-sm m-0">请点击"开始视频"重新连接</p>
          </div>

          <!-- 未连接提示 -->
          <div v-if="!isStreaming && !isConnecting && !reconnectError" class="flex flex-col items-center justify-center gap-4 text-white/60">
            <el-icon :size="64"><VideoCamera /></el-icon>
            <p class="text-sm m-0">点击"开始视频"建立 WebRTC 连接</p>
            <p class="text-xs m-0 opacity-60">将实时显示浏览器画面</p>
          </div>

          <!-- 视频元素 -->
          <video
            ref="videoPlayer"
            :class="[
              'max-w-full max-h-full w-full h-full object-contain',
              isStreaming ? 'block' : 'hidden'
            ]"
            autoplay
            playsinline
            muted
          >
            您的浏览器不支持视频播放
          </video>

          <!-- 截图叠加层 -->
          <img
            v-if="screenshotUrl && !isStreaming"
            :src="screenshotUrl"
            alt="截图"
            class="max-w-full max-h-full object-contain absolute inset-0"
          />

          <!-- 底部控制条（悬浮显示）-->
          <transition name="transition-opacity duration-300">
            <div v-if="showControls && isStreaming" class="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent px-4 py-3 flex items-center gap-3">
              <span class="text-white/80 text-xs">{{ videoInfo }}</span>
              <div class="ml-auto flex gap-2">
                <el-button size="small" type="primary" plain @click="takeScreenshot" :icon="Camera" :loading="takingScreenshot">截图</el-button>
              </div>
            </div>
          </transition>
        </div>

        <!-- 调试信息面板 -->
        <transition name="transition-opacity duration-300">
          <div v-if="showDebug" class="mt-4 p-4 bg-gray-900 rounded-xl border border-[var(--el-border-color)]">
            <h3 class="text-white text-sm font-semibold mb-3">调试信息</h3>
            <div class="space-y-2 text-xs">
              <div class="flex justify-between">
                <span class="text-gray-400">sessionState:</span>
                <span class="text-white">{{ JSON.stringify(props.sessionState) }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-400">browserRunning:</span>
                <span class="text-white">{{ browserRunning.value }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-400">isStreaming:</span>
                <span class="text-white">{{ isStreaming.value }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-400">isConnecting:</span>
                <span class="text-white">{{ isConnecting.value }}</span>
              </div>
            </div>
          </div>
        </transition>
      </div>

      <!-- 右侧：操作面板 -->
      <div class="w-72 flex flex-col gap-3 overflow-y-auto shrink-0">
        <!-- 点击操作 -->
        <el-card shadow="never" :body-style="{ padding: '12px' }">
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
          <div class="mt-2 text-xs text-[var(--el-text-color-secondary)]">也可点击视频画面直接定位</div>
        </el-card>

        <!-- 日志 -->
        <el-card shadow="never" :body-style="{ padding: '12px' }" class="flex-1">
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
          <el-scrollbar ref="logScrollbar" max-height="200px">
            <div v-if="logs.length === 0" class="text-center text-xs text-[var(--el-text-color-secondary)] py-4">暂无日志</div>
            <div v-for="(log, idx) in logs" :key="idx" :class="['flex gap-2 text-xs py-0.5 border-b border-[var(--el-border-color-lighter)] last:border-0', getLogClass(log.type)]">
              <span class="text-[var(--el-text-color-secondary)] shrink-0 font-mono">{{ log.time }}</span>
              <span>{{ log.message }}</span>
            </div>
          </el-scrollbar>
        </el-card>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick, onBeforeUnmount, onMounted, computed, watch } from 'vue'
import { ElScrollbar } from 'element-plus'
import {
  VideoPlay, VideoPause, Camera, Link, List,
  Loading, CircleClose, VideoCamera, User, Pointer
} from '@element-plus/icons-vue'
import { browserLiveControlApi } from '@/api/browser/browser_api'
import { businessHandler } from '@/utils/businessHandler'
import biliMessage from '@/utils/message'

// 调试日志
onMounted(() => {
  console.log('[WebRTCStreamPanel] mounted, browserId:', props.browserId)
  console.log('[WebRTCStreamPanel] mounted, sessionState:', props.sessionState)
  console.log('[WebRTCStreamPanel] mounted, browserRunning:', browserRunning.value)
})

// Props
const props = defineProps<{
  browserId: string
  sessionState?: {
    session_exists: boolean
    browser_running: boolean
    lifecycle_state: string
    status?: string
  } | null
}>()

// 监听sessionState变化以便调试
watch(() => props.sessionState, (newVal) => {
  console.log('[WebRTCStreamPanel] sessionState changed:', newVal)
  console.log('[WebRTCStreamPanel] browserRunning computed:', browserRunning.value)
}, { deep: true })

// 视频相关
const videoPlayer = ref<HTMLVideoElement | null>(null)
const isStreaming = ref(false)
const isConnecting = ref(false)
const screenshotUrl = ref('')
const showControls = ref(false)
const showDebug = ref(false)
const videoInfo = ref('')
const takingScreenshot = ref(false)

// URL 导航
const navigateUrl = ref('')
const navigating = ref(false)

// WebRTC
let peerConnection: RTCPeerConnection | null = null
let remoteStream: MediaStream | null = null
let sentIceCandidates = new Set<string>()
let iceCandidateSentCount = 0
let isWebrtcConnecting = false

// 重连
const reconnectAttempts = ref(0)
const maxReconnectAttempts = 3
const isReconnecting = ref(false)
const reconnectError = ref('')

// 心跳轮询
let heartbeatTimer: number | null = null
let pollingTimer: number | null = null
const HEARTBEAT_INTERVAL = 30000



// 点击操作
const clickX = ref(0)
const clickY = ref(0)
const clicking = ref(false)

// 日志
interface LogItem {
  time: string
  message: string
  type: 'info' | 'success' | 'warning' | 'error' | 'debug'
}
const logs = ref<LogItem[]>([])
const logScrollbar = ref<InstanceType<typeof ElScrollbar>>()

// 会话信息
const sessionInfo = ref({
  status: 'disconnected',
  lifecycle_state: '',
  active_connections: 0,
})

// 浏览器是否正在运行（用于控制"开始视频"按钮）
const browserRunning = computed(() => {
  if (!props.sessionState) return false
  const { browser_running, lifecycle_state } = props.sessionState
  return browser_running || lifecycle_state === 'running' || lifecycle_state === 'active'
})

// 工具函数
const addLog = (message: string, type: LogItem['type'] = 'info') => {
  const now = new Date()
  const time = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`
  logs.value.push({ time, message, type })
  // 滚到底部
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

const getLifecycleType = (state: string) => {
  const map: Record<string, any> = {
    running: 'success', initializing: 'warning', paused: 'info', stopped: 'info', error: 'danger'
  }
  return map[state] || 'info'
}

// 关闭 WebRTC 连接
const closeWebRTCConnection = () => {
  console.log('[WebRTCStreamPanel] closeWebRTCConnection called, peerConnection exists:', !!peerConnection, ', isStreaming:', isStreaming.value)
  if (peerConnection) {
    peerConnection.onicecandidate = null
    peerConnection.onconnectionstatechange = null
    peerConnection.oniceconnectionstatechange = null
    peerConnection.onsignalingstatechange = null
    peerConnection.ontrack = null
    peerConnection.close()
    peerConnection = null
  }
  if (remoteStream) {
    remoteStream.getTracks().forEach(track => track.stop())
    remoteStream = null
  }
  // 通知后端关闭
  browserLiveControlApi.closeWebrtcConnection(props.browserId).catch(() => {})
  sentIceCandidates.clear()
  iceCandidateSentCount = 0
}

// 停止心跳和轮询
const stopTimers = () => {
  if (heartbeatTimer) { clearInterval(heartbeatTimer); heartbeatTimer = null }
  if (pollingTimer) { clearTimeout(pollingTimer); pollingTimer = null }
}

// 开始视频流
const startVideoStream = async () => {
  console.log('[WebRTCStreamPanel] startVideoStream called, isWebrtcConnecting:', isWebrtcConnecting, ', isStreaming:', isStreaming.value, ', peerConnection exists:', !!peerConnection)
  if (isWebrtcConnecting || isStreaming.value) return

  isConnecting.value = true
  isWebrtcConnecting = true
  reconnectError.value = ''
  screenshotUrl.value = ''

  try {
    // 先确保会话存在
    addLog('检查浏览器会话...', 'info')
    console.log('[WebRTCStreamPanel] getBrowserSessionStatus req:', { browser_id: props.browserId })
    const statusRes = await browserLiveControlApi.getBrowserSessionStatus({ browser_id: props.browserId })
    console.log('[WebRTCStreamPanel] getBrowserSessionStatus res:', statusRes)
    if (statusRes.code === 0 && statusRes.data) {
      const data = statusRes.data as any
      sessionInfo.value = {
        status: data.lifecycle_status || 'unknown',
        lifecycle_state: data.lifecycle_status || '',
        active_connections: data.connected_clients || 0
      }
      if (!data.browser_running) {
        addLog('浏览器未运行，正在启动...', 'warning')
        console.log('[WebRTCStreamPanel] createBrowserSession req:', { browser_id: props.browserId })
        const createRes = await browserLiveControlApi.createBrowserSession({ browser_id: props.browserId })
        console.log('[WebRTCStreamPanel] createBrowserSession res:', createRes)
        if (createRes.code !== 0) {
          throw new Error(createRes.msg || '启动浏览器失败')
        }
        await new Promise(resolve => setTimeout(resolve, 2000))
      }
    }

    if (peerConnection) {
      console.log('[WebRTCStreamPanel] startVideoStream: existing peerConnection found, closing it first')
      closeWebRTCConnection()
    }
    await nextTick()
    await setupWebrtcStream()

    isStreaming.value = true
    reconnectAttempts.value = 0
    isReconnecting.value = false
    reconnectError.value = ''
    addLog('WebRTC 连接建立成功', 'success')

    // 启动心跳
    startHeartbeat()
  } catch (error: any) {
    addLog(`连接失败: ${error.message || error}`, 'error')
    biliMessage.error('启动视频流失败：' + (error.message || '未知错误'))
    isStreaming.value = false
    reconnectError.value = error.message || '连接失败'
  } finally {
    isConnecting.value = false
    isWebrtcConnecting = false
  }
}

// 建立 WebRTC 流
const setupWebrtcStream = async () => {
  const browserId = props.browserId

  addLog('请求后端创建 WebRTC offer...', 'info')
  console.log('[WebRTCStreamPanel] createWebrtcOffer req:', { browser_id: browserId })
  const offerResult = await businessHandler(
    browserLiveControlApi.createWebrtcOffer({ browser_id: browserId }),
    { showSuccessToast: false }
  )
  console.log('[WebRTCStreamPanel] createWebrtcOffer res:', offerResult)
  if (!offerResult.success || !offerResult.data?.sdp) {
    throw new Error('获取 WebRTC offer 失败')
  }
  addLog('收到 offer，创建 PeerConnection...', 'success')

  peerConnection = new RTCPeerConnection({ iceServers: [] })

  peerConnection.ontrack = (event) => {
    if (event.streams && event.streams.length > 0) {
      remoteStream = event.streams[0]
      if (videoPlayer.value) {
        videoPlayer.value.srcObject = remoteStream
        videoPlayer.value.onloadedmetadata = () => {
          videoPlayer.value?.play().then(() => {
            addLog('视频播放成功', 'success')
            videoInfo.value = `${videoPlayer.value?.videoWidth}×${videoPlayer.value?.videoHeight}`
          }).catch(e => {
            addLog(`视频播放失败: ${e}`, 'error')
          })
        }
      }
      remoteStream?.getTracks().forEach(track => {
        track.onended = () => {
          if (isStreaming.value) handleConnectionLost('视频流结束')
        }
      })
    }
  }

  peerConnection.onicecandidate = (event) => {
    if (event.candidate) {
      const candidate = event.candidate
      const key = `${candidate.candidate}-${candidate.sdpMid}-${candidate.sdpMLineIndex}`
      if (sentIceCandidates.has(key)) return
      sentIceCandidates.add(key)
      iceCandidateSentCount++
      browserLiveControlApi.addWebrtcIceCandidate({
        browser_id: browserId,
        candidate: {
          candidate: candidate.candidate,
          sdpMid: candidate.sdpMid,
          sdpMLineIndex: candidate.sdpMLineIndex
        }
      }).catch(() => {})
    } else {
      addLog(`ICE 收集完成 (${iceCandidateSentCount} 个)`, 'info')
    }
  }

  peerConnection.oniceconnectionstatechange = () => {
    const state = peerConnection?.iceConnectionState
    addLog(`ICE 状态: ${state}`, 'debug')
    if (state === 'connected') {
      addLog('ICE 连接成功', 'success')
    } else if (state === 'failed') {
      addLog('ICE 连接失败', 'error')
      if (isStreaming.value) handleConnectionLost('ICE连接失败')
    }
  }

  peerConnection.onconnectionstatechange = () => {
    const state = peerConnection?.connectionState
    addLog(`连接状态: ${state}`, 'debug')
    if (state === 'failed' || state === 'disconnected') {
      if (isStreaming.value) handleConnectionLost(`连接${state}`)
    }
  }

  // 设置远程描述
  await peerConnection.setRemoteDescription({ type: 'offer', sdp: offerResult.data.sdp })
  addLog('远程 offer 设置成功', 'success')

  // 获取服务端 ICE candidates（此调用可能失败，不影响后续流程）
  try {
    const iceCandidatesResult = await browserLiveControlApi.getWebrtcIceCandidates({ browser_id: browserId })
    if (iceCandidatesResult && iceCandidatesResult.data && iceCandidatesResult.data.candidates) {
      const serverCandidates = iceCandidatesResult.data.candidates
      addLog(`添加服务端 ${serverCandidates.length} 个 ICE candidates`, 'info')
      for (const c of serverCandidates) {
        try { await peerConnection.addIceCandidate(c) } catch {}
      }
    }
  } catch (error) {
    // ICE candidates 获取失败不影响连接建立，后续通过onIceCandidate事件接收
    console.warn('[WebRTCStreamPanel] 获取服务端ICE candidates失败:', error)
    addLog('服务端ICE候选者暂不可用，将通过实时推送获取', 'warning')
  }

  // 创建并发送 answer
  addLog('创建 WebRTC answer...', 'info')
  const answer = await peerConnection.createAnswer()
  await peerConnection.setLocalDescription(answer)

  // 等待 ICE 收集完成
  if (peerConnection.iceGatheringState !== 'complete') {
    await new Promise<void>((resolve) => {
      const timer = setTimeout(resolve, 12000)
      const check = setInterval(() => {
        if (peerConnection?.iceGatheringState === 'complete') {
          clearInterval(check)
          clearTimeout(timer)
          resolve()
        }
      }, 100)
    })
  }

  // 发送 answer
  await businessHandler(
    browserLiveControlApi.setWebrtcAnswer({
      browser_id: browserId,
      sdp: answer.sdp || ''
    }),
    { showSuccessToast: false }
  )
  addLog('answer 发送成功，等待视频流...', 'success')
}

// 停止视频流
const stopVideoStream = () => {
  isWebrtcConnecting = false
  isStreaming.value = false
  isConnecting.value = false
  closeWebRTCConnection()
  stopTimers()

  if (videoPlayer.value) {
    videoPlayer.value.pause()
    videoPlayer.value.srcObject = null
    videoPlayer.value.src = ''
  }
  sessionInfo.value.status = 'disconnected'
  addLog('视频流已停止', 'info')
  biliMessage.info('视频流已停止')
}

// 处理连接丢失
const handleConnectionLost = async (reason: string) => {
  if (isReconnecting.value || !isStreaming.value) return
  if (reconnectAttempts.value >= maxReconnectAttempts) {
    reconnectError.value = reason
    isReconnecting.value = false
    addLog(`达到最大重连次数，停止重连`, 'error')
    isStreaming.value = false
    closeWebRTCConnection()
    stopTimers()
    return
  }

  isReconnecting.value = true
  reconnectAttempts.value++
  addLog(`连接断开(${reason})，第 ${reconnectAttempts.value} 次重连...`, 'warning')
  closeWebRTCConnection()

  await new Promise(resolve => setTimeout(resolve, 2000))
  try {
    await startVideoStream()
  } catch {
    handleConnectionLost(reason)
  }
}

// 启动心跳
const startHeartbeat = () => {
  stopTimers()
  heartbeatTimer = window.setInterval(async () => {
    if (!isStreaming.value) return
    try {
      await browserLiveControlApi.sendHeartbeat({
        browser_id: props.browserId,
        request: { client_id: `client_${Date.now()}`, timestamp: Math.floor(Date.now() / 1000) }
      })
    } catch {}
  }, HEARTBEAT_INTERVAL)
}

// 截图
const takeScreenshot = async () => {
  if (takingScreenshot.value) return
  takingScreenshot.value = true
  try {
    const res = await browserLiveControlApi.executeAction({
      browser_id: props.browserId,
      req: { action_id: 'screenshot', params: {} }
    })
    if (res.code === 0 && res.data) {
      let imgData: string | null = null
      if (res.data.data && typeof res.data.data === 'string') {
        imgData = res.data.data.startsWith('data:') ? res.data.data : `data:image/png;base64,${res.data.data}`
      } else if (res.data.data && typeof res.data.data === 'object') {
        const d = res.data.data as any
        const raw = d.image_base64 || d.screenshot
        if (raw) imgData = raw.startsWith('data:') ? raw : `data:image/png;base64,${raw}`
      }
      if (imgData) {
        screenshotUrl.value = imgData
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

// URL 导航
const handleNavigate = async () => {
  if (!navigateUrl.value) return
  navigating.value = true
  try {
    const res = await browserLiveControlApi.executeAction({
      browser_id: props.browserId,
      req: { action_id: 'navigate', params: { url: navigateUrl.value, wait_for_load: true } }
    })
    if (res.code === 0 && res.data?.success) {
      addLog(`导航到: ${navigateUrl.value}`, 'success')
      biliMessage.success('导航成功')
    } else {
      addLog(`导航失败: ${res.data?.error || res.msg}`, 'error')
      biliMessage.error(res.data?.error || '导航失败')
    }
  } catch (e) {
    biliMessage.error('导航失败')
  } finally {
    navigating.value = false
  }
}



// 坐标点击
const performClick = async () => {
  clicking.value = true
  try {
    const res = await browserLiveControlApi.executeAction({
      browser_id: props.browserId,
      req: { action_id: 'click', params: { x: clickX.value, y: clickY.value, button: 'left', double_click: false } }
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

// 组件卸载时清理
onBeforeUnmount(() => {
  stopVideoStream()
})
</script>


