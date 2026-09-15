<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, inject, provide, type Ref } from 'vue'
import { VideoPlay, VideoPause, Plus, Close } from '@element-plus/icons-vue'
import { ElMessageBox } from 'element-plus'
import { WebRtc视频流Service, 自动化控制Service, 浏览器会话控制Service } from '@/api/browser/hey-api'
import { useUserNavStore } from '@/stores/user_nav'
import biliMessage from '@/utils/message'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

interface Props {
  browserId: string
  isStreaming: boolean
  /** 监管只读模式：只观看直播流，禁止一切写操作（不调用 /operation/*、不新建/关闭/切换页面） */
  readonly?: boolean
  /** 只读模式下的标签页数据（监管接口提供，避免调用 owner 校验的 /operation/get_page_info） */
  readonlyPages?: Array<{ index: number; title?: string; url?: string }>
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

// responseStyle='data' → hey-api 直接返回后端信封 {code, msg, data}，
// 因此业务数据在 response.data（而不是 response.data.data）
interface WebrtcStatusResponse {
  code?: number
  msg?: string
  data?: {
    enabled?: boolean
    total_streams?: number
    active_streams?: Array<Record<string, unknown>>
  }
}

interface WebrtcOfferResponse {
  code?: number
  msg?: string
  data?: {
    stream_key?: string
    sdp?: string
    type?: string
  }
}

interface StandardResponse {
  code?: number
  msg?: string
}

// 调用 get_page_info API 获取页面信息。
// 属后台刷新（初始化 / 操作后同步标签页），失败只记录日志，不弹提示——
// 调用方（新建页面 / 关闭页面等）已各自给出成功/失败提示，避免一次操作弹两条。
const fetchPagesList = async (): Promise<PageInfo | null> => {
  try {
    const response = await 自动化控制Service.getPageInfoApiV1RpaBrowserControlOperationGetPageInfoPost({
      query: { browser_id: props.browserId },
      body: {}
    })
    if (response?.code === 0) {
      return response?.data as PageInfo | null
    }
    // 404：浏览器尚未打开任何页面，属正常态，不提示
    if (response?.code !== 404) {
      console.warn('[LiveBox] 获取页面信息失败:', response?.msg)
    }
    return null
  } catch (e) {
    console.warn('[LiveBox] 获取页面信息异常:', e)
    return null
  }
}

// 关闭后端 WebRTC 流。
// silent=true 用于「切换页面 / 离开页面」这类连带动作：只记录日志，不打扰用户。
const closeWebRtcStream = async (silent = false) => {
  try {
    const response = await WebRtc视频流Service.closeWebrtcStreamApiV1RpaBrowserControlWebrtcClosePost({
      query: { browser_id: props.browserId },
      body: { stream_key: streamKey.value || '' }
    }) as StandardResponse | undefined

    if (response?.code === 0) {
      if (!silent) biliMessage.success(t('rpa.closeWebrtcSuccess'))
    } else {
      if (!silent) biliMessage.error(response?.msg || t('rpa.closeWebrtcFailed'))
      else console.warn('[LiveBox] 关闭 WebRTC 流失败:', response)
    }
  } catch (error) {
    console.error('Failed to close WebRTC stream:', error)
    if (!silent) biliMessage.error(t('rpa.closeWebrtcFailed'))
  }
}

const loadWebrtcStatus = async () => {
  try {
    const response = await WebRtc视频流Service.getWebrtcStatusApiV1RpaBrowserControlWebrtcStatusPost({
      query: { browser_id: props.browserId }}) as WebrtcStatusResponse | undefined

    if (response?.code === 0 && response?.data) {
      const data = response.data
      // 更新连接数 - 后端返回 total_streams，缺失时回退到 active_streams.length
      const streams = data.active_streams
      if (typeof data.total_streams === 'number') {
        activeStreamsCount.value = data.total_streams
      } else {
        activeStreamsCount.value = Array.isArray(streams) ? streams.length : 0
      }

      if (data.enabled && activeStreamsCount.value > 0) {
        if (Array.isArray(streams) && streams.length > 0) {
          const firstStream = streams[0]
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

// ── 后端闲置生命周期联动（见 docs/be-message-统一计划书.md §5.15）──
// 后端在「长时间无真实操作」时：2min 降质降帧 → 5min 关流保实例（lifecycle=idle）
// → 30min 进入 60s 宽限期（lifecycle=terminating）后关实例。
// 前端据此提示用户，并可一键重连（重连会刷新后端活跃时间，从而取消挂起/宽限）。
const sessionLifecycle = ref<string>('')
const sessionIdleSeconds = ref<number | null>(null)
const sessionPinned = ref(false)
const sessionPendingTerminationAt = ref<number | null>(null)
// 本地秒级时钟：仅用于把后端下发的「待关闭时间戳」渲染成倒计时
const nowSeconds = ref(Math.floor(Date.now() / 1000))

let sessionStatusTimer: number | null = null
let countdownTimer: number | null = null

const isStreamSuspended = computed(() => sessionLifecycle.value === 'idle')
const isSessionClosingSoon = computed(() => sessionLifecycle.value === 'terminating')

const terminationCountdown = computed<number | null>(() => {
  if (sessionPendingTerminationAt.value === null) return null
  return Math.max(0, sessionPendingTerminationAt.value - nowSeconds.value)
})

interface SessionStatusEnvelope {
  code?: number
  msg?: string
  data?: {
    session_exists?: boolean
    lifecycle_state?: string
    idle_seconds?: number
    is_pinned?: boolean
    pending_termination_at?: number | null
  }
}

const startCountdownTick = () => {
  if (countdownTimer !== null) return
  nowSeconds.value = Math.floor(Date.now() / 1000)
  countdownTimer = window.setInterval(() => {
    nowSeconds.value = Math.floor(Date.now() / 1000)
  }, 1000)
}

const stopCountdownTick = () => {
  if (countdownTimer !== null) {
    clearInterval(countdownTimer)
    countdownTimer = null
  }
}

// 轮询会话生命周期：该接口只读、不刷新后端活跃时间，因此不会干扰闲置判定
const loadSessionLifecycle = async () => {
  try {
    const response = (await 浏览器会话控制Service.browserSessionStatusApiV1RpaBrowserControlStatusPost({
      query: { browser_id: props.browserId }
    })) as SessionStatusEnvelope | undefined

    const data = response?.code === 0 && response.data?.session_exists ? response.data : undefined

    sessionLifecycle.value = data?.lifecycle_state || ''
    sessionIdleSeconds.value = typeof data?.idle_seconds === 'number' ? data.idle_seconds : null
    sessionPinned.value = data?.is_pinned === true

    const pending = typeof data?.pending_termination_at === 'number' ? data.pending_termination_at : null
    sessionPendingTerminationAt.value = pending
    if (pending !== null) startCountdownTick()
    else stopCountdownTick()
  } catch (error) {
    console.warn('[LiveBox] 获取会话生命周期失败:', error)
  }
}

const startSessionLifecyclePolling = () => {
  // 监管只读模式：会话状态接口是严格 owner 校验，管理员访问他人浏览器会 403，不轮询
  if (props.readonly) return
  if (sessionStatusTimer !== null) return
  void loadSessionLifecycle()
  sessionStatusTimer = window.setInterval(() => {
    void loadSessionLifecycle()
  }, 20000)
}

const stopSessionLifecyclePolling = () => {
  if (sessionStatusTimer !== null) {
    clearInterval(sessionStatusTimer)
    sessionStatusTimer = null
  }
  stopCountdownTick()
}

// 一键恢复/续命：重新建立 WebRTC（后端 ensure_webrtc_session 会把会话刷新回 ACTIVE）
const handleResumeStream = async () => {
  if (isStartingStream.value) return
  isStartingStream.value = true
  try {
    const connected = await startStreamCore()
    if (!connected) {
      biliMessage.error(t('rpa.startStreamFailed'))
    }
    await loadSessionLifecycle()
  } finally {
    isStartingStream.value = false
  }
}

const loadPagesList = async () => {
  // 监管只读模式：标签页由监管接口下发，绝不调用 owner 校验的 /operation/get_page_info
  if (props.readonly) {
    pageTabs.value = (props.readonlyPages ?? []).map((page) => ({
      index: page.index,
      title: page.title || `页面 ${page.index + 1}`,
      url: page.url
    }))
    if (currentPageIndex.value >= pageTabs.value.length) {
      currentPageIndex.value = 0
    }
    return
  }

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

// 建立 WebRTC 连接。返回是否成功，供调用方决定是否提示 / 启动网速采集。
const initWebRTC = async (): Promise<boolean> => {
  if (!videoRef.value) return false

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
          await WebRtc视频流Service.addIceCandidateApiV1RpaBrowserControlWebrtcIceCandidatePost({
            query: { browser_id: props.browserId },
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
    const offerResponse = await WebRtc视频流Service.createWebrtcOfferApiV1RpaBrowserControlWebrtcOfferPost({
      query: { browser_id: props.browserId },
      body: { page_index: currentPageIndex.value }
    }) as WebrtcOfferResponse | undefined

    // 业务数据在信封的 data 层：{code, msg, data:{stream_key, sdp}}
    const offerData = offerResponse?.data

    if (offerResponse?.code === 0 && offerData?.stream_key && offerData?.sdp) {
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
      const answerResponse = await WebRtc视频流Service.handleWebrtcAnswerApiV1RpaBrowserControlWebrtcAnswerPost({
        query: { browser_id: props.browserId },
        body: {
          stream_key: offerData.stream_key,
          sdp: answer.sdp || '',
          type: 'answer'
        }
      }) as StandardResponse | undefined

      if (answerResponse?.code === 0) {
        console.log('WebRTC answer sent successfully')
      } else {
        console.warn('[LiveBox] WebRTC answer 处理失败:', answerResponse?.msg)
      }
      return true
    }

    // 后端未返回可用的 offer（浏览器会话未就绪 / 页面不存在等）
    console.warn('[LiveBox] WebRTC offer 响应异常:', offerResponse)
    webrtcStatus.value = 'disconnected'
    isStreaming.value = false
    return false
  } catch (error) {
    console.error('Failed to initialize WebRTC:', error)
    webrtcStatus.value = 'disconnected'
    isStreaming.value = false
    return false
  }
}

// 启动直播的核心流程（建流 + 采集网速），不含确认框与成功提示，
// 供「用户点击启动」与「切换页面后自动重连」两条路径复用。
const startStreamCore = async (): Promise<boolean> => {
  isStreaming.value = true
  const connected = await initWebRTC()
  if (!connected) {
    isStreaming.value = false
    webrtcStatus.value = 'disconnected'
    stopStatsMonitor()
    return false
  }
  startStatsMonitor()
  emit('toggle-stream')
  await loadWebrtcStatus()
  return true
}

// 用户主动启动：先确认（提示流量消耗），成功静默（画面即反馈），失败必须提示
const handleStartStream = async () => {
  if (isStartingStream.value) return
  isStartingStream.value = true

  try {
    await ElMessageBox.confirm(t('rpa.startStreamConfirm'), t('rpa.startStreamTitle'), {
      confirmButtonText: t('rpa.startStream'),
      cancelButtonText: t('common.cancel'),
      type: 'warning',
      lockScroll: false
    })
  } catch {
    // 用户取消：不提示
    isStartingStream.value = false
    return
  }

  try {
    const connected = await startStreamCore()
    if (!connected) {
      biliMessage.error(t('rpa.startStreamFailed'))
    }
  } finally {
    isStartingStream.value = false
  }
}

// silent=true 用于「切换页面 / 离开页面」等连带动作，关闭流的提示不打扰用户
const handleStopStream = async (silent = false) => {
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
    await closeWebRtcStream(silent)
    streamKey.value = ''
  }
}

const handleAddPage = async () => {
  if (props.readonly) return // 监管只读：禁止代替用户新建页面

  if (!userNavStore.user_nav.uid) {
    biliMessage.warning(t('rpa.pleaseLogin'))
    return
  }

  try {
    const response = await 自动化控制Service.openPageApiV1RpaBrowserControlOperationOpenPagePost({
      query: { browser_id: props.browserId },
      body: { url: 'about:blank', page_index: -1 }
    })

    if (response?.code === 0) {
      biliMessage.success(t('rpa.newPageSuccess'))
      await loadPagesList()
    } else {
      biliMessage.error(response?.msg || t('rpa.newPageFailed'))
    }
  } catch (error) {
    console.error('Failed to open page:', error)
    biliMessage.error(t('rpa.networkError'))
  }
}

const handleClosePage = async (index: number) => {
  if (props.readonly) return // 监管只读：禁止代替用户关闭页面

  if (pageTabs.value.length <= 1) {
    biliMessage.warning(t('rpa.atLeastOnePage'))
    return
  }

  if (!userNavStore.user_nav.uid) {
    biliMessage.warning(t('rpa.pleaseLogin'))
    return
  }

  try {
    const response = await 自动化控制Service.closePageApiV1RpaBrowserControlOperationClosePagePost({
      query: { browser_id: props.browserId },
      body: { page_index: index }
    })

    if (response?.code === 0) {
      biliMessage.success(t('rpa.closePageSuccess'))
      await loadPagesList()
    } else {
      biliMessage.error(response?.msg || t('rpa.closePageFailed'))
    }
  } catch (error) {
    console.error('Failed to close page:', error)
    biliMessage.error(t('rpa.networkError'))
  }
}

// el-tabs 的 tab-click 回调参数是 TabsPaneContext，用其 paneName（即 :name）还原页面索引，
// 直接声明成 { index: string } 会和 TabsPaneContext（index?: string）类型不兼容
const handleTabClick = (pane: { paneName?: string | number }) => {
  const index = Number(pane?.paneName)
  if (!Number.isFinite(index)) return
  void handleSwitchPage(index)
}

const handleSwitchPage = async (index: number) => {
  if (props.readonly) return // 监管只读：禁止代替用户切换页面

  if (currentPageIndex.value === index) return

  if (!userNavStore.user_nav.uid) {
    biliMessage.warning(t('rpa.pleaseLogin'))
    return
  }

  const wasStreaming = isStreaming.value

  try {
    const response = await 自动化控制Service.switchPageApiV1RpaBrowserControlOperationSwitchPagePost({
      query: { browser_id: props.browserId },
      body: { page_index: index }
    })

    if (response?.code === 0) {
      currentPageIndex.value = index
      await loadPagesList()

      // 如果正在直播，切换到新页面后需要重新建立 WebRTC 连接。
      // 这是切页的连带动作：不弹确认框、关旧流静默，只有重连失败才提示。
      if (wasStreaming) {
        await handleStopStream(true)
        setTimeout(async () => {
          const connected = await startStreamCore()
          if (!connected) {
            biliMessage.error(t('rpa.startStreamFailed'))
          }
        }, 500)
      }
    } else {
      biliMessage.error(response?.msg || t('rpa.switchPageFailed'))
    }
  } catch (error) {
    console.error('Failed to switch page:', error)
    biliMessage.error(t('rpa.networkError'))
  }
}

// 页面挂载时会话尚未启动，页面列表拿不到；会话变为「已连接」后重新拉取标签页
watch(isSessionConnected, (connected) => {
  if (connected) {
    loadPagesList()
  }
})

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

interface TrafficCounters {
  bytesSent: number
  bytesReceived: number
}

/**
 * 从 getStats() 中取出「当前链路」的累计字节数。
 *
 * 口径说明（重点：绝不能把所有 report 的字节数相加）：
 * - transport 与 candidate-pair 的 bytesSent/bytesReceived 是同一份数据的两层视图，
 *   transport 下还会挂多条 candidate-pair（已废弃/未选中的链路），
 *   直接 forEach 累加会重复计数，速率会翻倍甚至更多。
 * - 权威口径是 transport.selectedCandidatePairId 指向的那条 candidate-pair：
 *   它才是当前真正在传输的链路，统计含 ICE/DTLS/SRTP 头开销，最接近真实流量消耗。
 * - 老浏览器没有 selectedCandidatePairId 时，回退到唯一一条生效中（selected / succeeded）的 pair。
 * - 以上都没有时，回退到 inbound-rtp / outbound-rtp 的媒体字节数（不含传输开销，仅作兜底）。
 */
const pickTrafficCounters = (stats: RTCStatsReport): TrafficCounters => {
  // 1) transport.selectedCandidatePairId → 当前生效链路
  let selectedPairId: string | undefined
  stats.forEach((report) => {
    if (report?.type === 'transport' && report.selectedCandidatePairId) {
      selectedPairId = report.selectedCandidatePairId as string
    }
  })

  if (selectedPairId) {
    const pair = stats.get(selectedPairId)
    if (pair) {
      return {
        bytesSent: Number(pair.bytesSent ?? 0),
        bytesReceived: Number(pair.bytesReceived ?? 0),
      }
    }
  }

  // 2) 回退：只在生效中的 candidate-pair 里取一条（取时间戳最新的那条）
  const activePairs: Array<TrafficCounters & { timestamp: number }> = []
  stats.forEach((report) => {
    if (report?.type !== 'candidate-pair') return
    const isActive = report.selected === true || report.state === 'succeeded'
    if (!isActive) return
    activePairs.push({
      bytesSent: Number(report.bytesSent ?? 0),
      bytesReceived: Number(report.bytesReceived ?? 0),
      timestamp: Number(report.timestamp ?? 0),
    })
  })

  if (activePairs.length > 0) {
    activePairs.sort((a, b) => b.timestamp - a.timestamp)
    const latest = activePairs[0]
    return { bytesSent: latest.bytesSent, bytesReceived: latest.bytesReceived }
  }

  // 3) 兜底：媒体层字节数
  let bytesSent = 0
  let bytesReceived = 0
  stats.forEach((report) => {
    if (report?.type === 'inbound-rtp') {
      bytesReceived += Number(report.bytesReceived ?? 0)
    } else if (report?.type === 'outbound-rtp') {
      bytesSent += Number(report.bytesSent ?? 0)
    }
  })
  return { bytesSent, bytesReceived }
}

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
      const { bytesSent, bytesReceived } = pickTrafficCounters(stats)

      // 速率用本地单调时钟计算：report.timestamp 是各 report 的采样时刻，
      // 不同 report 之间并不一致，拿它做时间差会算出跳变的速率
      const now = performance.now()

      if (lastStatsTime > 0) {
        const elapsedSeconds = (now - lastStatsTime) / 1000
        if (elapsedSeconds > 0) {
          // 计数器是累计值；ICE 重启 / 链路切换时可能回退，负数按 0 处理
          const uploadBytesPerSec = Math.round(Math.max(0, bytesSent - lastBytesSent) / elapsedSeconds)
          const downloadBytesPerSec = Math.round(
            Math.max(0, bytesReceived - lastBytesReceived) / elapsedSeconds
          )
          uploadSpeed.value = formatBytes(uploadBytesPerSec)
          downloadSpeed.value = formatBytes(downloadBytesPerSec)
        }
      }

      lastBytesSent = bytesSent
      lastBytesReceived = bytesReceived
      lastStatsTime = now

      // 每 10 次（约 10 秒）刷新一次 WebRTC 状态
      statusUpdateCount++
      if (statusUpdateCount >= 10) {
        statusUpdateCount = 0
        await loadWebrtcStatus()
      }
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
  startSessionLifecyclePolling()
})

onUnmounted(() => {
  stopStatsMonitor()
  stopSessionLifecyclePolling()
  // 离开页面时静默断开，避免在下一个页面弹出「关闭 WebRTC 流成功」
  handleStopStream(true)
})
</script>

<template>
  <div
    class="flex h-full flex-col overflow-hidden border border-border "
  >
    <div
      class="flex items-center gap-2 border-b border-border bg-fill-light px-4 py-2"
    >
      <div
        class="flex-1 scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-transparent overflow-x-auto overflow-y-hidden"
      >
        <el-tabs
          v-model="currentPageIndex"
          type="card"
          class="w-max min-w-full"
          @tab-click="handleTabClick"
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
                  v-if="!readonly && pageTabs.length > 1"
                  size="large"
                  circle
                  :icon="Close"
                  class="p-1!"
                  @click.stop="handleClosePage(tab.index)"
                />
              </div>
            </template>
          </el-tab-pane>
        </el-tabs>
      </div>

      <div class="flex shrink-0 items-center gap-2">
        <el-button
          v-if="!readonly"
          size="large"
          :icon="Plus"
          @click="handleAddPage"
          :loading="isLoadingPages"
          :disabled="!isSessionConnected"
          >{{ t('rpa.addPage') }}</el-button
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
          {{ t('rpa.startLive') }}
        </el-button>
        <el-button v-else size="large" type="danger" :icon="VideoPause" @click="handleStopStream()">
          {{ t('rpa.stopLive') }}
        </el-button>
      </div>
    </div>

    <div class="relative flex-1 bg-bg">
      <video ref="videoRef" class="h-full w-full object-contain" autoplay playsinline></video>

      <div
        v-if="isStreaming"
        class="absolute right-0 bottom-0 left-0 bg-linear-to-t from-black/80 via-black/50 to-transparent p-4"
      >
        <div class="flex items-center justify-between">
          <!-- 右侧信息 -->
          <div class="flex items-center gap-4 text-sm text-white">
            <span class="flex items-center gap-1">
              <span class="h-2 w-2 animate-pulse rounded-full bg-red-500"></span>
              {{ t('rpa.streaming') }}
            </span>
            <span v-if="sessionPinned" class="rounded bg-white/20 px-2 py-0.5">
              {{ t('rpa.taskRunning') }}
            </span>
            <span>{{ t('rpa.connections') }}: {{ activeStreamsCount }}</span>
            <span>{{ t('rpa.uploadSpeed', { speed: uploadSpeed }) }}</span>
            <span>{{ t('rpa.downloadSpeed', { speed: downloadSpeed }) }}</span>
          </div>
        </div>
      </div>

      <div
        v-if="!isStreaming && isStreamSuspended"
        class="live-box__suspended absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/60"
      >
        <div class="text-center text-white">
          <el-icon>
            <VideoPause />
          </el-icon>
          <div class="mt-4">{{ t('rpa.streamSuspended') }}</div>
          <div v-if="sessionIdleSeconds !== null" class="mt-1 text-sm text-white/80">
            {{ t('rpa.idleForSeconds', { seconds: sessionIdleSeconds ?? 0 }) }}
          </div>
        </div>
        <el-button type="primary" :loading="isStartingStream" @click="handleResumeStream">
          {{ t('rpa.resumeStream') }}
        </el-button>
      </div>
      <div
        v-else-if="!isStreaming && isSessionClosingSoon"
        class="live-box__closing-soon absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/60"
      >
        <div class="text-center text-white">
          <el-icon>
            <VideoPause />
          </el-icon>
          <div class="mt-4">{{ t('rpa.sessionClosingSoon') }}</div>
          <div v-if="terminationCountdown !== null" class="mt-1 text-sm text-white/80">
            {{ t('rpa.closingInSeconds', { seconds: terminationCountdown ?? 0 }) }}
          </div>
        </div>
        <el-button type="warning" :loading="isStartingStream" @click="handleResumeStream">
          {{ t('rpa.keepAlive') }}
        </el-button>
      </div>
      <div v-else-if="!isStreaming" class="absolute inset-0 flex items-center justify-center opacity-70">
        <el-empty :description="t('rpa.clickToStart')" />
      </div>
      <div
        v-else-if="webrtcStatus === 'connecting'"
        class="absolute inset-0 flex items-center justify-center opacity-70"
      >
        <div class="text-center text-white">
          <el-icon class="animate-spin">
            <VideoPlay />
          </el-icon>
          <div class="mt-4">{{ t('rpa.connecting') }}</div>
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
          <div class="mt-4">{{ t('rpa.streamStopped') }}</div>
        </div>
      </div>
    </div>
  </div>
</template>
