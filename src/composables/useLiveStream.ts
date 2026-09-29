import { computed, ref, type Ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { ElMessageBox } from 'element-plus'
import {
  StreamQualityLevelEnum,
  WebRtc视频流Service
} from '@/api/browser/hey-api'
import { useUserNavStore } from '@/stores/user_nav'
import biliMessage from '@/utils/message'
import type { LiveWebrtcStatus } from '@/models/rpa_browser/live_stream'
import { useWebRtcConnection } from '@/composables/useWebRtcConnection'

/**
 * 直播流业务层（LiveBox 的核心逻辑）
 *
 * 负责：启动 / 停止 / 自动重连（卡死看门狗 + failed 终态）、网速采样、
 * 观看者级的清晰度 / 暂停 / 可见性降档。
 * 建连细节（offer / answer / ICE）下沉在 `useWebRtcConnection`。
 */

/** 连着多少秒没有任何字节流入就判定链路已死（stats 每秒采样一次） */
const STALL_TICKS_TO_RECONNECT = 8
/** 连续自动重连上限，超过就如实停下，不做「黑屏假直播」 */
const MAX_AUTO_RECONNECTS = 3
/** 网速采样间隔（毫秒） */
const STATS_INTERVAL_MS = 1000

/** 清晰度档位在 localStorage 中的存储键（下次进入直播沿用上次选择） */
const QUALITY_STORAGE_KEY = 'rpa_live_quality_level'
/** 首次访问（本地无记录）时的默认档位：最省带宽的「流畅」 */
const DEFAULT_QUALITY_LEVEL: StreamQualityLevelEnum = 'low'
/** 全部可选档位（取自 SDK 枚举）：本地存储值的合法性校验用 */
const QUALITY_LEVEL_VALUES: readonly string[] = Object.values(StreamQualityLevelEnum)

/**
 * 读取上次选择的清晰度档位
 *
 * 无记录（首次访问）/ 记录值非法 / localStorage 不可用（隐私模式）时，
 * 一律退回**最低档「流畅」**——先按最省带宽的口径起步，由用户按需上调。
 */
const loadStoredQualityLevel = (): StreamQualityLevelEnum => {
  try {
    const stored = localStorage.getItem(QUALITY_STORAGE_KEY)
    if (stored && QUALITY_LEVEL_VALUES.includes(stored)) {
      return stored as StreamQualityLevelEnum
    }
  } catch {
    // 隐私模式等场景下 localStorage 不可用：退化为默认档
  }
  return DEFAULT_QUALITY_LEVEL
}

/** 记住用户**手动选择**的档位（存储不可用时静默忽略） */
const saveStoredQualityLevel = (level: StreamQualityLevelEnum): void => {
  try {
    localStorage.setItem(QUALITY_STORAGE_KEY, level)
  } catch {
    // 忽略存储失败
  }
}

/** 后端返回的档位快照（与 SDK 的 StreamQualitySnapshot 对齐） */
export interface LiveQualitySnapshot {
  level?: string
  effective_level?: string
  degraded?: boolean
  paused?: boolean
}

interface QualityResponse {
  code?: number
  msg?: string
  data?: LiveQualitySnapshot | null
}

interface TrafficCounters {
  bytesSent: number
  bytesReceived: number
}

export interface UseLiveStreamOptions {
  browserId: () => string
  /** 播放器 <video> 元素（挂载后才可取到，故用 getter） */
  videoEl: () => HTMLVideoElement | null
  /** 观看的页面索引（offer 时上报） */
  pageIndex: () => number
  /** 是否直播中（与页面共享的 ref，由本层写入） */
  isStreaming: Ref<boolean>
  /** 上行速率（与页面共享） */
  uploadSpeed: Ref<string>
  /** 下行速率（与页面共享） */
  downloadSpeed: Ref<string>
  /** 直播画面容器（可见性降档用 IntersectionObserver 观察它） */
  containerEl: () => HTMLElement | null
}

const formatBytes = (bytes: number): string => {
  if (bytes < 1024) return bytes + 'B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + 'K'
  return (bytes / (1024 * 1024)).toFixed(1) + 'M'
}

/**
 * 从 getStats() 中取出「当前链路」的累计字节数。
 *
 * 口径说明（重点：绝不能把所有 report 的字节数相加）：
 * - transport 与 candidate-pair 的 bytesSent/bytesReceived 是同一份数据的两层视图，
 *   transport 下还会挂多条 candidate-pair（已废弃/未选中的链路），直接累加会重复计数；
 * - 权威口径是 transport.selectedCandidatePairId 指向的那条 candidate-pair；
 * - 老浏览器没有 selectedCandidatePairId 时，回退到生效中的一条 pair；
 * - 都没有时回退到 inbound-rtp / outbound-rtp 的媒体字节数（仅作兜底）。
 */
const pickTrafficCounters = (stats: RTCStatsReport): TrafficCounters => {
  let selectedPairId: string | undefined
  stats.forEach((report) => {
    if (report?.type === 'transport' && report.selectedCandidatePairId) {
      selectedPairId = report.selectedCandidatePairId as string
    }
  })

  if (selectedPairId) {
    const pair = (stats as unknown as { get(id: string): unknown }).get?.(selectedPairId) as
      | TrafficCounters
      | undefined
    if (pair) {
      return {
        bytesSent: Number(pair.bytesSent ?? 0),
        bytesReceived: Number(pair.bytesReceived ?? 0)
      }
    }
  }

  const activePairs: Array<TrafficCounters & { timestamp: number }> = []
  stats.forEach((report) => {
    if (report?.type !== 'candidate-pair') return
    const isActive = report.selected === true || report.state === 'succeeded'
    if (!isActive) return
    activePairs.push({
      bytesSent: Number(report.bytesSent ?? 0),
      bytesReceived: Number(report.bytesReceived ?? 0),
      timestamp: Number(report.timestamp ?? 0)
    })
  })

  if (activePairs.length > 0) {
    activePairs.sort((a, b) => b.timestamp - a.timestamp)
    const latest = activePairs[0]
    return { bytesSent: latest.bytesSent, bytesReceived: latest.bytesReceived }
  }

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

export function useLiveStream(options: UseLiveStreamOptions) {
  const { t } = useI18n()
  const userNavStore = useUserNavStore()

  const webrtcStatus = ref<LiveWebrtcStatus>('disconnected')
  const isStartingStream = ref(false)
  const isReconnecting = ref(false)

  const connection = useWebRtcConnection({
    browserId: options.browserId,
    videoEl: options.videoEl,
    pageIndex: options.pageIndex,
    webrtcStatus,
    isStreaming: options.isStreaming
  })

  // ── 观看者级：清晰度 / 暂停（见计划书 §5.18）──
  /** 首次渲染用的档位：本地记住的上次选择（无记录 = 最低档「流畅」） */
  const initialQualityLevel = loadStoredQualityLevel()
  /** 用户档位 */
  const qualityLevel = ref<StreamQualityLevelEnum>(initialQualityLevel)
  /** 实际生效档位：被自动降档（页面不可见 / 会话闲置）时会低于用户档位 */
  const effectiveLevel = ref<StreamQualityLevelEnum>(initialQualityLevel)
  /** 是否因自动原因被降档（供 UI 提示，避免用户以为「选档没生效」） */
  const isAutoDegraded = ref(false)
  /** 用户暂停态：暂停期间后端不出帧，带宽与 CPU 归零 */
  const isPaused = ref(false)
  const isSettingQuality = ref(false)
  const isTogglingPause = ref(false)

  /** 档位下拉选项（文案随语言切换）：从最清晰到最省带宽 */
  const qualityOptions = computed(() => [
    { value: 'original' as StreamQualityLevelEnum, label: t('rpa.qualityOriginal') },
    { value: 'ultra' as StreamQualityLevelEnum, label: t('rpa.qualityUltra') },
    { value: 'high' as StreamQualityLevelEnum, label: t('rpa.qualityHigh') },
    { value: 'medium' as StreamQualityLevelEnum, label: t('rpa.qualityMedium') },
    { value: 'low' as StreamQualityLevelEnum, label: t('rpa.qualityLow') }
  ])

  /** 当前生效档位的展示名（自动降档时据此告知用户实际画质） */
  const effectiveLevelLabel = computed(() => {
    const matched = qualityOptions.value.find((opt) => opt.value === effectiveLevel.value)
    return matched?.label ?? effectiveLevel.value
  })

  /** 应用后端返回的档位快照 */
  const applyQualitySnapshot = (snapshot?: LiveQualitySnapshot | null) => {
    if (!snapshot) return
    if (snapshot.level) qualityLevel.value = snapshot.level as StreamQualityLevelEnum
    if (snapshot.effective_level) {
      effectiveLevel.value = snapshot.effective_level as StreamQualityLevelEnum
    }
    isAutoDegraded.value = snapshot.degraded === true
    isPaused.value = snapshot.paused === true
  }

  const getHeaders = () => ({
    'x-bili-mid': userNavStore.user_nav.uid,
    'x-bili-level': String(userNavStore.user_nav.level_info.current_level)
  })

  // ── 网速采样 + 卡死看门狗 ──
  let statsInterval: number | null = null
  let lastBytesSent = 0
  let lastBytesReceived = 0
  let lastStatsTime = 0
  const stalledTicks = ref(0)
  const reconnectAttempts = ref(0)
  /** 是否允许自动重连：用户主动「停止直播」后必须置 false，否则会把刚停的流又拉起来 */
  const allowAutoReconnect = ref(true)

  const stopStatsMonitor = () => {
    if (statsInterval !== null) {
      window.clearInterval(statsInterval)
      statsInterval = null
    }
    options.uploadSpeed.value = '0'
    options.downloadSpeed.value = '0'
  }

  const startStatsMonitor = () => {
    if (statsInterval !== null) return
    lastBytesSent = 0
    lastBytesReceived = 0
    lastStatsTime = 0

    statsInterval = window.setInterval(async () => {
      const pc = connection.peerConnection.value
      if (!pc || !options.isStreaming.value) return

      try {
        const stats = await pc.getStats()
        const { bytesSent, bytesReceived } = pickTrafficCounters(stats)

        // 速率用本地单调时钟计算：report.timestamp 各 report 之间并不一致
        const now = performance.now()
        if (lastStatsTime > 0) {
          const elapsedSeconds = (now - lastStatsTime) / 1000
          if (elapsedSeconds > 0) {
            // 计数器是累计值；ICE 重启 / 链路切换时可能回退，负数按 0 处理
            const uploadBytesPerSec = Math.round(Math.max(0, bytesSent - lastBytesSent) / elapsedSeconds)
            const downloadBytesPerSec = Math.round(
              Math.max(0, bytesReceived - lastBytesReceived) / elapsedSeconds
            )
            options.uploadSpeed.value = formatBytes(uploadBytesPerSec)
            options.downloadSpeed.value = formatBytes(downloadBytesPerSec)
          }
        }

        const grewInbound = bytesReceived > lastBytesReceived
        lastBytesSent = bytesSent
        lastBytesReceived = bytesReceived
        lastStatsTime = now

        // ── 卡死看门狗 ──
        // 后端闲置挂起 / ICE 掉线 / 首帧丢失都表现为「连接中、0 B/s、画面全黑」，
        // 连续 N 秒收不到字节就主动重建流，而不是干等用户手动「停止 → 再启动」。
        if (grewInbound) {
          stalledTicks.value = 0
          reconnectAttempts.value = 0
        } else if (!isPaused.value && options.isStreaming.value && !isReconnecting.value) {
          stalledTicks.value += 1
          if (stalledTicks.value >= STALL_TICKS_TO_RECONNECT) {
            stalledTicks.value = 0
            void autoReconnectStream()
          }
        }
      } catch (error) {
        console.error('[useLiveStream] 采样 WebRTC 统计失败:', error)
      }
    }, STATS_INTERVAL_MS)
  }

  /**
   * 释放「已建流但本端判定失败」的观看者
   *
   * 不关掉它，后端会一直把它算进「N 人在观看」—— 一个人的重连被算成多个人。
   */
  const releaseAbandonedViewer = async () => {
    await connection.releaseViewer()
  }

  /** 建连中的 Promise（并发守卫）：同一时刻只允许一轮建连在飞 */
  let connectingPromise: Promise<boolean> | null = null

  /**
   * 把本地记住的档位同步给后端
   *
   * 后端为新建观看者默认高档，而档位是**观看者级**的：不显式对齐的话，
   * 「上次选了流畅」只在界面上体现，实际出流仍是默认档。
   * 失败静默 —— 对齐档位不该打断开流，用户仍可手动切换。
   */
  const syncStoredQualityLevel = async () => {
    const level = loadStoredQualityLevel()
    try {
      const response = (await WebRtc视频流Service.setWebrtcQualityApiV1RpaBrowserControlWebrtcQualityPost({
        query: { browser_id: options.browserId() },
        body: { viewer_id: connection.viewerId.value, level },
        headers: getHeaders()
      })) as unknown as QualityResponse
      if (response?.code === 0) applyQualitySnapshot(response.data)
    } catch {
      // 静默：档位对齐是尽力而为
    }
  }

  /** 建流核心流程（不含确认框）：成功即启动网速采样 */
  const startStreamCore = async (): Promise<boolean> => {
    // 并发守卫：建连期间再次调用（用户连点 / 看门狗与点击撞车）复用在飞的那一轮，
    // 否则会开出两条本地 PeerConnection、发两次 offer（日志里两个不同 ufrag 即为此）。
    if (connectingPromise) return connectingPromise

    options.isStreaming.value = true
    // 显式重新拉流：恢复自动重连开关（用户主动停播时会置 false）
    allowAutoReconnect.value = true

    const run = async (): Promise<boolean> => {
      const connected = await connection.initWebRTC()
      if (!connected) {
        options.isStreaming.value = false
        webrtcStatus.value = 'disconnected'
        stopStatsMonitor()
        await releaseAbandonedViewer()
        return false
      }
      startStatsMonitor()

      // 进入直播即开始播放：把本端拉回「未暂停」。
      // 暂停是**观看者级**状态；重建观看者（自动重连 / 切页）后端会复位为未暂停，
      // 但本地 ref 可能还停留在暂停态，这里以服务端返回的快照为准覆盖。
      if (isPaused.value) {
        try {
          const response = (await WebRtc视频流Service.setWebrtcPausedApiV1RpaBrowserControlWebrtcPausePost({
            query: { browser_id: options.browserId() },
            body: { viewer_id: connection.viewerId.value, paused: false },
            headers: getHeaders()
          })) as unknown as QualityResponse
          if (response?.code === 0 && response.data) {
            applyQualitySnapshot(response.data)
          }
        } catch {
          // 静默：启动直播不该因复位失败而报错
        }
      }

      return true
    }

    connectingPromise = run().finally(() => {
      connectingPromise = null
    })
    return connectingPromise
  }

  /**
   * 直播卡死自愈：重建 WebRTC 流
   *
   * 触发来源：①「已连接但长时间 0 字节」看门狗；② connectionState 变成 failed。
   * 后端 start_stream 幂等（同一页面重拉即复用），所以重建是安全操作。
   */
  const autoReconnectStream = async () => {
    if (!allowAutoReconnect.value || isReconnecting.value || isStartingStream.value) return

    reconnectAttempts.value += 1
    if (reconnectAttempts.value > MAX_AUTO_RECONNECTS) {
      // 连着重连仍失败：如实收摊，不保留「界面直播中、画面全黑」的假象
      console.warn('[useLiveStream] 自动重连次数超限，停止直播')
      await stopStream(true)
      return
    }

    isReconnecting.value = true
    console.warn(`[useLiveStream] 画面卡死（无字节流入），自动重连 第 ${reconnectAttempts.value} 次`)
    try {
      await startStreamCore()
    } finally {
      isReconnecting.value = false
    }
  }

  /**
   * 用户主动启动：先确认（提示流量消耗），成功静默（画面即反馈），失败必须提示
   *
   * 播放器中央大播放按钮 / 「恢复直播」「续命」按钮都走这里。
   */
  const startStream = async () => {
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
      if (!connected) biliMessage.error(t('rpa.startStreamFailed'))
    } finally {
      isStartingStream.value = false
    }
  }

  /**
   * 停止直播
   *
   * @param silent true 用于「切页 / 离开页面」等连带动作：关闭流的提示不打扰用户
   */
  const stopStream = async (silent = false) => {
    // 用户（或重连上限）主动停止：关闭自动重连，避免把刚停掉的流又拉起来
    allowAutoReconnect.value = false
    stalledTicks.value = 0
    reconnectAttempts.value = 0
    stopStatsMonitor()
    options.isStreaming.value = false
    webrtcStatus.value = 'disconnected'
    await connection.reset(silent)
  }

  /** 会话挂起 / 待关闭时的一键恢复：重建流（后端 ensure_webrtc_session 会把会话刷新回 ACTIVE） */
  const resumeStream = async () => {
    if (isStartingStream.value) return
    isStartingStream.value = true
    try {
      const connected = await startStreamCore()
      if (!connected) biliMessage.error(t('rpa.startStreamFailed'))
      // 无需手动刷新：后端 ensure_webrtc_session 内部 touch() 会改写生命周期并触发 SSE 推送
    } finally {
      isStartingStream.value = false
    }
  }

  /** 切换清晰度档位：以后端返回的 effective_level 为准（被自动降档时可能低于所选值） */
  const setQuality = async (level: StreamQualityLevelEnum) => {
    if (isSettingQuality.value) return
    isSettingQuality.value = true
    try {
      // 档位是**观看者级**：只影响本端，其他观看者的画质不受影响
      const response = (await WebRtc视频流Service.setWebrtcQualityApiV1RpaBrowserControlWebrtcQualityPost({
        query: { browser_id: options.browserId() },
        body: { viewer_id: connection.viewerId.value, level },
        headers: getHeaders()
      })) as unknown as QualityResponse
      if (response?.code === 0) {
        applyQualitySnapshot(response.data)
        // 记忆用户**手动选择**的档位（不是被自动降档后的 effective_level）
        saveStoredQualityLevel(level)
      } else {
        biliMessage.error(response?.msg || t('rpa.setQualityFailed'))
      }
    } catch {
      biliMessage.error(t('rpa.networkError'))
    } finally {
      isSettingQuality.value = false
    }
  }

  /** 暂停 / 继续画面：暂停后端出帧（带宽与 CPU 归零），不重建 WebRTC 连接 */
  const togglePause = async () => {
    if (isTogglingPause.value) return
    isTogglingPause.value = true
    const next = !isPaused.value
    try {
      // 暂停是**观看者级**：只停本端出帧，其他观看者继续播放；
      // 全部观看者都暂停时后端才真正停止 screencast（浏览器侧零编码）
      const response = (await WebRtc视频流Service.setWebrtcPausedApiV1RpaBrowserControlWebrtcPausePost({
        query: { browser_id: options.browserId() },
        body: { viewer_id: connection.viewerId.value, paused: next },
        headers: getHeaders()
      })) as unknown as QualityResponse
      if (response?.code === 0) {
        applyQualitySnapshot(response.data)
      } else {
        biliMessage.error(response?.msg || t('rpa.setPausedFailed'))
      }
    } catch {
      biliMessage.error(t('rpa.networkError'))
    } finally {
      isTogglingPause.value = false
    }
  }

  /** 上报页面可见性（自动降载）；失败静默——不该因降载请求打扰用户 */
  const reportVisibility = async (visible: boolean) => {
    try {
      // 可见性也是**观看者级**：本端切后台只降本端档位，不拖累其他观看者
      const response = (await WebRtc视频流Service.reportWebrtcVisibilityApiV1RpaBrowserControlWebrtcVisibilityPost({
        query: { browser_id: options.browserId() },
        body: { viewer_id: connection.viewerId.value, visible },
        headers: getHeaders()
      })) as unknown as QualityResponse
      if (response?.code === 0) applyQualitySnapshot(response.data)
    } catch {
      // 静默：可见性上报是尽力而为，失败不提示
    }
  }

  // ── 可见性监听（自动降载）──
  /** 组件是否在视口内（IntersectionObserver 结果） */
  const isIntersecting = ref(true)
  /** 上次上报的可见性（去重；null 表示本次流尚未上报过） */
  let lastReportedVisible: boolean | null = null
  let visibilityObserver: IntersectionObserver | null = null

  /** 汇总「标签页可见」与「组件在视口内」：任一不可见即降档 */
  const syncVisibility = () => {
    if (!options.isStreaming.value) return
    const visible = !document.hidden && isIntersecting.value
    if (visible === lastReportedVisible) return
    lastReportedVisible = visible
    void reportVisibility(visible)
  }

  const handleDocumentVisibilityChange = () => syncVisibility()

  /** 监听两类不可见：标签页切后台 + 组件被折叠 / 遮挡 / 滚出视口 */
  const startVisibilityWatch = () => {
    document.addEventListener('visibilitychange', handleDocumentVisibilityChange)
    const target = options.containerEl()
    if (target && 'IntersectionObserver' in window) {
      visibilityObserver = new IntersectionObserver(
        (entries) => {
          const entry = entries[0]
          if (!entry) return
          isIntersecting.value = entry.isIntersecting
          syncVisibility()
        },
        { threshold: 0 }
      )
      visibilityObserver.observe(target)
    }
  }

  const stopVisibilityWatch = () => {
    document.removeEventListener('visibilitychange', handleDocumentVisibilityChange)
    visibilityObserver?.disconnect()
    visibilityObserver = null
    // 曾上报过「不可见」则复位：否则残留状态会把后续新流压在低档
    if (lastReportedVisible === false) void reportVisibility(true)
  }

  return {
    // 状态
    webrtcStatus,
    isStartingStream,
    isReconnecting,
    qualityLevel,
    effectiveLevel,
    effectiveLevelLabel,
    qualityOptions,
    isAutoDegraded,
    isSettingQuality,
    isPaused,
    isTogglingPause,
    // 行为
    startStream,
    startStreamCore,
    stopStream,
    resumeStream,
    setQuality,
    togglePause,
    applyQualitySnapshot,
    startStatsMonitor,
    stopStatsMonitor,
    startVisibilityWatch,
    stopVisibilityWatch
  }
}
