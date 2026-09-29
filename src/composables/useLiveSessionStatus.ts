import { computed, inject, onUnmounted, ref, watch, type Ref } from 'vue'
import type { LiveSessionState, LiveViewerInfo } from '@/models/rpa_browser/live_stream'

/**
 * 会话侧直播状态（消费会话状态 SSE 快照）
 *
 * 会话状态由页面（BrowserStream）统一订阅 SSE，这里只消费注入的同份快照：
 * 观看者人数 / 观看者列表 / 生命周期（闲置挂起 / 待关闭）都从它派生。
 * 该接口只读、不刷新后端活跃时间，因此不会干扰闲置判定。
 */

/** 页面注入的会话快照结构（只取本组件关心的字段） */
interface SessionStatusSnapshot {
  lifecycle_state?: string
  idle_seconds?: number
  is_pinned?: boolean
  pending_termination_at?: number | null
  viewer_count?: number
  viewers?: LiveViewerInfo[]
}

export function useLiveSessionStatus() {
  /** 页面注入的会话快照；监管只读页（AdminBrowserMonitorView）不注入，走空默认值 */
  const snapshot = inject<Ref<SessionStatusSnapshot | null>>('sessionLifecycleSnapshot', ref(null))

  const lifecycleState = ref('')
  const idleSeconds = ref<number | null>(null)
  const pinned = ref(false)
  const pendingTerminationAt = ref<number | null>(null)
  /** 当前观看者人数（多观看者并发直播） */
  const viewerCount = ref(0)
  /** 观看者列表（后端已排除监管管理员观看者） */
  const viewers = ref<LiveViewerInfo[]>([])
  /** 活跃观看者连接数（顶栏「连接数」） */
  const activeStreamsCount = ref(0)

  // 本地秒级时钟：仅用于把后端下发的「待关闭时间戳」渲染成倒计时
  const nowSeconds = ref(Math.floor(Date.now() / 1000))
  let countdownTimer: number | null = null

  const startCountdownTick = () => {
    if (countdownTimer !== null) return
    nowSeconds.value = Math.floor(Date.now() / 1000)
    countdownTimer = window.setInterval(() => {
      nowSeconds.value = Math.floor(Date.now() / 1000)
    }, 1000)
  }

  const stopCountdownTick = () => {
    if (countdownTimer !== null) {
      window.clearInterval(countdownTimer)
      countdownTimer = null
    }
  }

  const applySnapshot = (data: SessionStatusSnapshot) => {
    lifecycleState.value = data.lifecycle_state || ''
    idleSeconds.value = typeof data.idle_seconds === 'number' ? data.idle_seconds : null
    pinned.value = data.is_pinned === true

    // 观看者人数与列表：随会话状态 SSE 一并下发（建连首帧即全量快照，
    // 之后有人加入 / 离开 / 暂停 / 切档都会即时推送），前端因此**不再轮询** /webrtc/status。
    if (typeof data.viewer_count === 'number') viewerCount.value = data.viewer_count
    if (Array.isArray(data.viewers)) {
      viewers.value = data.viewers
      activeStreamsCount.value = data.viewers.length
    }

    const pending = typeof data.pending_termination_at === 'number' ? data.pending_termination_at : null
    pendingTerminationAt.value = pending
    if (pending !== null) startCountdownTick()
    else stopCountdownTick()
  }

  watch(
    snapshot,
    (data) => {
      if (data) applySnapshot(data)
    },
    { immediate: true },
  )

  /** 会话侧状态（供覆盖层与顶栏提示） */
  const sessionState = computed<LiveSessionState>(() => ({
    suspended: lifecycleState.value === 'idle',
    closingSoon: lifecycleState.value === 'terminating',
    idleSeconds: idleSeconds.value,
    closingCountdown:
      pendingTerminationAt.value === null
        ? null
        : Math.max(0, pendingTerminationAt.value - nowSeconds.value),
    pinned: pinned.value
  }))

  onUnmounted(stopCountdownTick)

  return {
    viewerCount,
    viewers,
    activeStreamsCount,
    sessionState
  }
}
