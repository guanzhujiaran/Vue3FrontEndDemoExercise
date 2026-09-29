import { onUnmounted, ref } from 'vue'
import { 浏览器会话控制Service } from '@/api/browser/hey-api'

/**
 * 会话状态 SSE 订阅（见 docs/rpa-会话状态SSE推送计划书.md）。
 *
 * 用生成的 `browserSessionEventsApiV1RpaBrowserControlEventsGet` 接入：
 * 它是 fetch 实现，会走 client 的 onRequest 拦截器注入
 * `x-bili-mid / x-bili-level / x-bili-role`，并携带 `credentials: 'include'`，
 * 鉴权链路与既有 POST 接口完全一致。
 * 断线重连由 SSE 客户端内置的指数退避负责（不设 sseMaxRetryAttempts 即无限重试）。
 */

/** 后端固定事件名 */
const SESSION_STATUS_EVENT_NAME = 'session_status'

/** 后端下发的会话状态快照（与 POST /browser/control/status 的 data 字段一致） */
export interface BrowserSessionStatusSnapshot {
  session_exists?: boolean
  browser_running?: boolean
  lifecycle_state?: string
  idle_seconds?: number
  is_pinned?: boolean
  pending_termination_at?: number | null
  in_launch_queue?: boolean
}

/** SSE 连接态：connecting=建连或断线重连中，open=已收到服务端事件 */
export type SessionEventsConnectionState = 'idle' | 'connecting' | 'open'

type Getter<T> = () => T

interface UseBrowserSessionEventsOptions {
  /** 订阅目标浏览器 id；为空则不建连 */
  browserId: Getter<string>
  /** 是否禁用订阅（监管只读模式：该接口为严格 owner 校验，会 403） */
  disabled?: Getter<boolean>
  /** 收到会话状态快照（建连首帧即当前状态，无需再补一次 HTTP 查询） */
  onStatus: (snapshot: BrowserSessionStatusSnapshot) => void
  /** 连接异常；客户端会自动重连，此处仅作日志/埋点 */
  onError?: (error: unknown) => void
}

export function useBrowserSessionEvents(options: UseBrowserSessionEventsOptions) {
  const connectionState = ref<SessionEventsConnectionState>('idle')
  let controller: AbortController | null = null

  const stop = () => {
    if (controller !== null) {
      controller.abort()
      controller = null
    }
    connectionState.value = 'idle'
  }

  const run = async (browserId: string, localController: AbortController) => {
    const { stream } =
      await 浏览器会话控制Service.browserSessionEventsApiV1RpaBrowserControlEventsGet({
        query: { browser_id: browserId },
        signal: localController.signal,
        onSseError: (error) => {
          if (localController.signal.aborted) return
          console.warn('[useBrowserSessionEvents] SSE 连接异常，客户端将自动重连:', error)
          connectionState.value = 'connecting'
          options.onError?.(error)
        },
        onSseEvent: (event) => {
          if (localController.signal.aborted) return
          // 心跳是 SSE 注释行，不会带事件名，在此被过滤
          if (event.event !== SESSION_STATUS_EVENT_NAME) return
          if (!event.data || typeof event.data !== 'object') return
          connectionState.value = 'open'
          options.onStatus(event.data as BrowserSessionStatusSnapshot)
        },
      })

    // 生成器只在被迭代时才真正发起请求；事件分发在上面的 onSseEvent 中完成
    while (!localController.signal.aborted) {
      const { done } = await stream.next()
      if (done) break
    }
  }

  const start = () => {
    stop()
    const browserId = options.browserId()
    if (!browserId) return
    if (options.disabled?.()) return

    const localController = new AbortController()
    controller = localController
    connectionState.value = 'connecting'

    void run(browserId, localController)
      .catch((error) => {
        if (!localController.signal.aborted) {
          console.warn('[useBrowserSessionEvents] SSE 订阅异常:', error)
          connectionState.value = 'connecting'
        }
      })
      .finally(() => {
        if (controller === localController) connectionState.value = 'idle'
      })
  }

  onUnmounted(stop)

  return { connectionState, start, stop }
}
