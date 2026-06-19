<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted, inject, provide, type Ref } from 'vue'
import { VideoPlay, VideoPause, Plus, Close } from '@element-plus/icons-vue'
import { ElMessageBox } from 'element-plus'
import {
  createWebrtcOfferApiV1RpaBrowserControlWebrtcOfferPost,
  handleWebrtcAnswerApiV1RpaBrowserControlWebrtcAnswerPost,
  closeWebrtcStreamApiV1RpaBrowserControlWebrtcClosePost,
  addIceCandidateApiV1RpaBrowserControlWebrtcIceCandidatePost,
  getWebrtcStatusApiV1RpaBrowserControlWebrtcStatusPost,
  getPageInfoApiV1RpaBrowserControlOperationGetPageInfoPost,
  switchPageApiV1RpaBrowserControlOperationSwitchPagePost,
  closePageApiV1RpaBrowserControlOperationClosePagePost,
  openPageApiV1RpaBrowserControlOperationOpenPagePost
} from '@/api/browser/hey-api'
import { useUserNavStore } from '@/stores/user_nav'
import biliMessage from '@/utils/message'

interface Props {
  browserId: string
  isStreaming: boolean
}

const props = defineProps<Props>()
const emit = defineEmits<{
  (e: 'toggle-stream'): void
  (e: 'webrtc-status-change', status: 'disconnected' | 'connecting' | 'connected'): void
}>()

const userNavStore = useUserNavStore()

const localStream = ref<MediaStream | null>(null)
const peerConnection = ref<RTCPeerConnection | null>(null)
const currentPageIndex = ref(0)
const pageTabs = ref<Array<{ index: number; title: string; url?: string }>>([])
const videoRef = ref<HTMLVideoElement | null>(null)
const isLoadingPages = ref(false)
const webrtcStatus = ref<'disconnected' | 'connecting' | 'connected'>('disconnected')
const browserSessionStatus = inject<Ref<string>>('browserSessionStatus', ref('disconnected'))
const isSessionConnected = inject<Ref<boolean>>('isSessionConnected', ref(false))
const isStreaming = inject<Ref<boolean>>('isStreaming', ref(false))
const uploadSpeed = inject<Ref<string>>('uploadSpeed', ref('0'))
const downloadSpeed = inject<Ref<string>>('downloadSpeed', ref('0'))
const isStartingStream = ref(false)
const streamKey = ref<string>('')
const activeStreamsCount = ref(0)
let statsInterval: number | null = null
let lastBytesSent = 0
let lastBytesReceived = 0
let lastStatsTime = 0

const getHeaders = () => ({
  'x-bili-mid': userNavStore.user_nav.uid,
  'x-bili-level': String(userNavStore.user_nav.level_info.current_level)
})

interface PageInfo {
  pages?: Array<{ index?: number; title?: string; url?: string }>
  [key: string]: unknown
}

// 调用 get_page_info API 获取页面信息
const fetchPagesList = async (): Promise<PageInfo | null> => {
  try {
    const response = await getPageInfoApiV1RpaBrowserControlOperationGetPageInfoPost({
      headers: getHeaders(),
      query: { browser_id: props.browserId },
      body: {}
    })
    if (response.data?.code === 0) {
      console.log('获取页面信息成功:', response.data?.data)
      return response.data?.data as PageInfo | null
    } else {
      const errorCode = response.data?.code
      if (errorCode !== 404) {
        biliMessage.error(response.data?.msg || '获取页面信息失败')
      }
      return null
    }
  } catch (e) {
    console.warn('获取页面信息异常:', e)
    return null
  }
}

const closeWebRtcStream = async () => {
  try {
    const response = await closeWebrtcStreamApiV1RpaBrowserControlWebrtcClosePost({
      query: { browser_id: props.browserId },
      headers: getHeaders(),
      body: { stream_key: streamKey.value || '' }
    })

    if (response.data?.code === 0) {
      biliMessage.success('关闭 WebRTC 流成功')
    } else {
      biliMessage.error(response.data?.msg || '关闭 WebRTC 流失败')
    }
  } catch (error) {
    console.error('Failed to close WebRTC stream:', error)
    biliMessage.error('关闭 WebRTC 流失败')
  }
}

const loadWebrtcStatus = async () => {
  try {
    const response = await getWebrtcStatusApiV1RpaBrowserControlWebrtcStatusPost({
      query: { browser_id: props.browserId },
      headers: getHeaders()
    })

    if (response.data?.code === 0 && response.data?.data) {
      const data = response.data.data as Record<string, unknown>
      // 更新连接数 - 优先使用 total_streams_count，如果不存在则使用 active_streams.length
      if (typeof data.total_streams_count === 'number') {
        activeStreamsCount.value = data.total_streams_count
      } else {
        const streams = data.active_streams
        activeStreamsCount.value = Array.isArray(streams) ? streams.length : 0
      }

      if (
        data.enabled &&
        ((typeof data.total_streams_count === 'number' && data.total_streams_count > 0) ||
          (Array.isArray(data.active_streams) && data.active_streams.length > 0))
      ) {
        if (Array.isArray(data.active_streams) && data.active_streams.length > 0) {
          const firstStream = data.active_streams[0] as Record<string, unknown>
          streamKey.value = typeof firstStream.stream_key === 'string' ? firstStream.stream_key : ''
        }
        webrtcStatus.value = 'connected'
        isStreaming.value = true
      }
    }
  } catch (error) {
    console.error('Failed to load WebRTC status:', error)
  }
}

const loadPagesList = async () => {
  if (!userNavStore.user_nav.uid) {
    console.warn('User not logged in')
    return
  }

  isLoadingPages.value = true
  try {
    console.log('loadPagesList: fetching pages...')
    const result = await fetchPagesList()
    console.log('loadPagesList: result:', result)

    if (result) {
      const pages = result.pages || []
      console.log('loadPagesList: pages:', pages)
      if (pages && Array.isArray(pages)) {
        pageTabs.value = pages.map((page: Record<string, unknown>, idx: number) => ({
          index: idx,
          title: typeof page.title === 'string' ? page.title : `页面 ${idx + 1}`,
          url: typeof page.url === 'string' ? page.url : undefined
        }))
        console.log('loadPagesList: pageTabs updated:', pageTabs.value)
        if (currentPageIndex.value >= pageTabs.value.length) {
          currentPageIndex.value = 0
        }
      } else {
        console.warn('Pages data is not an array:', pages)
      }
    }
  } catch (error) {
    console.error('Failed to load pages:', error)
  } finally {
    isLoadingPages.value = false
  }
}

const initWebRTC = async () => {
  if (!videoRef.value) return

  webrtcStatus.value = 'connecting'

  try {
    peerConnection.value = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    })

    peerConnection.value.ontrack = (event) => {
      if (videoRef.value && event.streams[0]) {
        videoRef.value.srcObject = event.streams[0]
        localStream.value = event.streams[0]
        webrtcStatus.value = 'connected'
        isStreaming.value = true
      }
    }

    peerConnection.value.onicecandidate = async (event) => {
      if (event.candidate) {
        console.log('ICE candidate:', event.candidate)
        // 发送 ICE candidate 到后端
        try {
          await addIceCandidateApiV1RpaBrowserControlWebrtcIceCandidatePost({
            query: { browser_id: props.browserId },
            headers: getHeaders(),
            body: {
              stream_key: streamKey.value || '',
              candidate: event.candidate.candidate,
              sdpMid: event.candidate.sdpMid || '',
              sdpMLineIndex: event.candidate.sdpMLineIndex ?? 0
            }
          })
        } catch (error) {
          console.error('Failed to send ICE candidate:', error)
        }
      }
    }

    peerConnection.value.onconnectionstatechange = () => {
      if (peerConnection.value) {
        console.log('WebRTC connection state:', peerConnection.value.connectionState)
        if (peerConnection.value.connectionState === 'connected') {
          webrtcStatus.value = 'connected'
          isStreaming.value = true
        } else if (
          peerConnection.value.connectionState === 'disconnected' ||
          peerConnection.value.connectionState === 'closed' ||
          peerConnection.value.connectionState === 'failed'
        ) {
          webrtcStatus.value = 'disconnected'
          isStreaming.value = false
        }
      }
    }

    // 先调用 /webrtc/offer 获取 offer 数据
    const offerResponse = await createWebrtcOfferApiV1RpaBrowserControlWebrtcOfferPost({
      query: { browser_id: props.browserId },
      headers: getHeaders(),
      body: { page_index: currentPageIndex.value }
    })

    if (offerResponse.data?.code === 0 && offerResponse.data?.data) {
      const offerData = offerResponse.data.data
      streamKey.value = offerData.stream_key

      // 设置后端返回的 offer 为远程描述
      await peerConnection.value.setRemoteDescription({
        type: 'offer',
        sdp: offerData.sdp
      })

      // 创建 answer
      const answer = await peerConnection.value.createAnswer()
      await peerConnection.value.setLocalDescription(answer)

      // 发送 answer 到后端
      const answerResponse = await handleWebrtcAnswerApiV1RpaBrowserControlWebrtcAnswerPost({
        query: { browser_id: props.browserId },
        headers: getHeaders(),
        body: {
          stream_key: offerData.stream_key,
          sdp: answer.sdp || '',
          type: 'answer'
        }
      })

      if (answerResponse.data?.code === 0) {
        console.log('WebRTC answer sent successfully')
      }
    }
  } catch (error) {
    console.error('Failed to initialize WebRTC:', error)
    webrtcStatus.value = 'disconnected'
    isStreaming.value = false
  }
}

const handleStartStream = async () => {
  if (isStartingStream.value) return
  isStartingStream.value = true

  try {
    await ElMessageBox.confirm('启动直播后将开始监控当前页面，是否继续？', '启动直播确认', {
      confirmButtonText: '启动',
      cancelButtonText: '取消',
      type: 'warning'
    })
    isStreaming.value = true
    await initWebRTC()
    startStatsMonitor()
    emit('toggle-stream')
    loadWebrtcStatus()
  } catch {
    // 用户取消
  } finally {
    isStartingStream.value = false
  }
}

const handleStopStream = async () => {
  stopStatsMonitor()
  isStreaming.value = false
  webrtcStatus.value = 'disconnected'
  if (localStream.value) {
    localStream.value.getTracks().forEach((track) => track.stop())
    localStream.value = null
  }
  if (peerConnection.value) {
    peerConnection.value.close()
    peerConnection.value = null
  }
  if (videoRef.value) {
    videoRef.value.srcObject = null
  }
  if (streamKey.value) {
    await closeWebRtcStream()
    streamKey.value = ''
  }
}

const handleAddPage = async () => {
  if (!userNavStore.user_nav.uid) {
    biliMessage.warning('请先登录')
    return
  }

  try {
    const response = await openPageApiV1RpaBrowserControlOperationOpenPagePost({
      headers: getHeaders(),
      query: { browser_id: props.browserId },
      body: { url: 'about:blank', page_index: -1 }
    })

    if (response.data?.code === 0) {
      biliMessage.success('新建页面成功')
      await loadPagesList()
    } else {
      biliMessage.error(response.data?.msg || '新建页面失败')
    }
  } catch (error) {
    console.error('Failed to open page:', error)
    biliMessage.error('网络异常，请稍后重试')
  }
}

const handleClosePage = async (index: number) => {
  if (pageTabs.value.length <= 1) {
    biliMessage.warning('至少保留一个页面')
    return
  }

  if (!userNavStore.user_nav.uid) {
    biliMessage.warning('请先登录')
    return
  }

  try {
    const response = await closePageApiV1RpaBrowserControlOperationClosePagePost({
      headers: getHeaders(),
      query: { browser_id: props.browserId },
      body: { page_index: index }
    })

    if (response.data?.code === 0) {
      biliMessage.success('关闭页面成功')
      await loadPagesList()
    } else {
      biliMessage.error(response.data?.msg || '关闭页面失败')
    }
  } catch (error) {
    console.error('Failed to close page:', error)
    biliMessage.error('网络异常，请稍后重试')
  }
}

const handleSwitchPage = async (index: number) => {
  if (currentPageIndex.value === index) return

  if (!userNavStore.user_nav.uid) {
    biliMessage.warning('请先登录')
    return
  }

  const wasStreaming = isStreaming.value

  try {
    const response = await switchPageApiV1RpaBrowserControlOperationSwitchPagePost({
      headers: getHeaders(),
      query: { browser_id: props.browserId },
      body: { page_index: index }
    })

    if (response.data?.code === 0) {
      currentPageIndex.value = index
      await loadPagesList()

      // 如果正在直播，切换到新页面后需要重新建立 WebRTC 连接
      if (wasStreaming) {
        await handleStopStream()
        setTimeout(() => {
          handleStartStream()
        }, 500)
      }
    } else {
      biliMessage.error(response.data?.msg || '切换页面失败')
    }
  } catch (error) {
    console.error('Failed to switch page:', error)
    biliMessage.error('网络异常，请稍后重试')
  }
}

watch(webrtcStatus, (newVal) => {
  emit('webrtc-status-change', newVal)
})

provide('webrtcStatus', webrtcStatus)
provide('isStreaming', isStreaming)

const formatBytes = (bytes: number): string => {
  if (bytes < 1024) return bytes + 'B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + 'K'
  return (bytes / (1024 * 1024)).toFixed(1) + 'M'
}

let statusUpdateCount = 0

const startStatsMonitor = () => {
  if (statsInterval) return
  lastBytesSent = 0
  lastBytesReceived = 0
  lastStatsTime = 0
  statusUpdateCount = 0

  statsInterval = window.setInterval(async () => {
    if (!peerConnection.value || !isStreaming.value) return

    try {
      const stats = await peerConnection.value.getStats()
      let totalBytesSent = 0
      let totalBytesReceived = 0
      let currentTimestamp = 0

      stats.forEach((report: Record<string, unknown>) => {
        if (report.type === 'transport' || report.type === 'candidate-pair') {
          if (report.bytesSent !== undefined) {
            totalBytesSent += Number(report.bytesSent)
          }
          if (report.bytesReceived !== undefined) {
            totalBytesReceived += Number(report.bytesReceived)
          }
        }
        if (report.timestamp) {
          currentTimestamp = report.timestamp
        }
      })

      if (lastStatsTime > 0 && currentTimestamp > lastStatsTime) {
        const elapsedSeconds = (currentTimestamp - lastStatsTime) / 1000
        if (elapsedSeconds > 0) {
          const uploadBytesPerSec = Math.round((totalBytesSent - lastBytesSent) / elapsedSeconds)
          const downloadBytesPerSec = Math.round(
            (totalBytesReceived - lastBytesReceived) / elapsedSeconds
          )
          uploadSpeed.value = formatBytes(Math.max(0, uploadBytesPerSec))
          downloadSpeed.value = formatBytes(Math.max(0, downloadBytesPerSec))
        }
      }

      lastBytesSent = totalBytesSent

      // 每10次统计更新一次WebRTC状态（大约每5秒）
      statusUpdateCount++
      if (statusUpdateCount >= 10) {
        statusUpdateCount = 0
        await loadWebrtcStatus()
      }
      lastBytesReceived = totalBytesReceived
      lastStatsTime = currentTimestamp
    } catch (error) {
      console.error('Failed to get WebRTC stats:', error)
    }
  }, 1000)
}

const stopStatsMonitor = () => {
  if (statsInterval) {
    clearInterval(statsInterval)
    statsInterval = null
  }
  uploadSpeed.value = '0'
  downloadSpeed.value = '0'
}

onMounted(() => {
  loadPagesList()
  loadWebrtcStatus()
})

onUnmounted(() => {
  stopStatsMonitor()
  handleStopStream()
})
</script>

<template>
  <div
    class="flex h-full flex-col overflow-hidden rounded-lg border border-border "
  >
    <div
      class="flex items-center gap-2 border-b border-border bg-[var(--el-fill-color-light)] px-4 py-2"
    >
      <div
        class="flex-1 scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-transparent overflow-x-auto overflow-y-hidden"
      >
        <el-tabs
          v-model="currentPageIndex"
          type="card"
          class="w-max min-w-full"
          @tab-click="(tab: { index: string }) => handleSwitchPage(Number(tab.index))"
        >
          <el-tab-pane
            v-for="tab in pageTabs"
            :key="tab.index"
            :label="tab.title"
            :name="String(tab.index)"
          >
            <template #label>
              <div class="flex items-center gap-1">
                <span>{{ tab.title }}</span>
                <el-button
                  v-if="pageTabs.length > 1"
                  size="large"
                  circle
                  :icon="Close"
                  class="!p-1"
                  @click.stop="handleClosePage(tab.index)"
                />
              </div>
            </template>
          </el-tab-pane>
        </el-tabs>
      </div>

      <div class="flex shrink-0 items-center gap-2">
        <el-button
          size="large"
          :icon="Plus"
          @click="handleAddPage"
          :loading="isLoadingPages"
          :disabled="!isSessionConnected"
          >新建页面</el-button
        >
        <el-button
          v-if="!isStreaming"
          size="large"
          type="primary"
          :icon="VideoPlay"
          @click="handleStartStream"
          :disabled="!isSessionConnected || isStartingStream"
          :loading="isStartingStream"
        >
          启动直播
        </el-button>
        <el-button v-else size="large" type="danger" :icon="VideoPause" @click="handleStopStream">
          停止直播
        </el-button>
      </div>
    </div>

    <div class="relative flex-1 bg-bg">
      <video ref="videoRef" class="h-full w-full object-contain" autoplay playsinline></video>

      <div
        v-if="isStreaming"
        class="absolute right-0 bottom-0 left-0 bg-gradient-to-t from-black/80 via-black/50 to-transparent p-4"
      >
        <div class="flex items-center justify-between">
          <!-- 右侧信息 -->
          <div class="flex items-center gap-4 text-sm text-white">
            <span class="flex items-center gap-1">
              <span class="h-2 w-2 animate-pulse rounded-full bg-red-500"></span>
              直播中
            </span>
            <span>连接数: {{ activeStreamsCount }}</span>
            <span>↑ {{ uploadSpeed }}/s</span>
            <span>↓ {{ downloadSpeed }}/s</span>
          </div>
        </div>
      </div>

      <div v-if="!isStreaming" class="absolute inset-0 flex items-center justify-center opacity-70">
        <el-empty description="点击上方启动直播开始监控" />
      </div>
      <div
        v-else-if="webrtcStatus === 'connecting'"
        class="absolute inset-0 flex items-center justify-center opacity-70"
      >
        <div class="text-center text-white">
          <el-icon class="animate-spin">
            <VideoPlay />
          </el-icon>
          <div class="mt-4">正在连接...</div>
        </div>
      </div>
      <div
        v-else-if="webrtcStatus === 'disconnected'"
        class="absolute inset-0 flex items-center justify-center opacity-70"
      >
        <div class="text-center text-white">
          <el-icon>
            <VideoPause />
          </el-icon>
          <div class="mt-4">直播已停止</div>
        </div>
      </div>
    </div>
  </div>
</template>
