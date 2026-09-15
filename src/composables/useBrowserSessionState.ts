import { ref, computed, type Ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { SessionLifecycleState, getSessionLifecycleStateLabel } from '@/models/rpa_browser/session_state'

/**
 * 前端 UI 会话状态
 */
export type UISessionState = 'disconnected' | 'connecting' | 'connected' | 'error'

/**
 * 允许的状态转换
 */
const ALLOWED_TRANSITIONS: Record<UISessionState, readonly UISessionState[]> = {
  disconnected: ['connecting'],
  connecting:    ['connected', 'disconnected', 'error'],
  connected:     ['disconnected', 'error'],
  error:         ['disconnected', 'connected'],
}

/**
 * 错误码 → 状态与默认文案的 i18n key 映射
 *
 * 只存 key，实际文案在状态机内部用 t() 翻译（模块级常量无法访问 setup 上下文）。
 */
const ERROR_CODE_HANDLERS: Record<number, { state: UISessionState; lifecycle: SessionLifecycleState; labelKey: string }> = {
  3001: { state: 'disconnected', lifecycle: SessionLifecycleState.TERMINATED, labelKey: 'rpa.sessionTerminated' },
  // 可扩展更多后端错误码
}

/**
 * 浏览器会话状态机
 *
 * 管理浏览器会话的 UI 状态 + 后端生命周期状态，
 * 对外暴露和旧代码兼容的 browserSessionStatus（Ref<string>）。
 */
export function useBrowserSessionState() {
  // 文案统一走 i18n（本 composable 只在 setup 上下文中调用）
  const { t } = useI18n()

  // ========== 内部状态 ==========
  const _uiState = ref<UISessionState>('disconnected')
  const _lifecycle = ref<SessionLifecycleState | null>(null)
  const _errorMsg = ref<string>('')

  // ========== 旧代码兼容：字符串 ref ==========
  const browserSessionStatus: Ref<string> = ref('disconnected')

  // ========== 派生状态 ==========
  const isConnected = computed(() => _uiState.value === 'connected')
  const isDisconnected = computed(() => _uiState.value === 'disconnected')
  const isConnecting = computed(() => _uiState.value === 'connecting')
  const hasError = computed(() => _uiState.value === 'error')

  const lifecycleLabel = computed(() =>
    _lifecycle.value ? getSessionLifecycleStateLabel(_lifecycle.value, t) : ''
  )

  const statusLabel = computed((): string => {
    const labels: Record<UISessionState, string> = {
      disconnected: t('rpa.sessionStatusDisconnected'),
      connecting: t('rpa.sessionStatusConnecting'),
      connected: t('rpa.sessionStatusConnected'),
      error: t('rpa.sessionStatusError'),
    }
    return labels[_uiState.value]
  })

  const errorMessage = computed(() => _errorMsg.value)

  // ========== 核心：状态转换 ==========
  function transition(
    to: UISessionState,
    lifecycle?: SessionLifecycleState | null,
    error?: string,
  ) {
    const from = _uiState.value

    // 自转换是幂等的（轮询刷新会反复上报同一个状态，如 connected → connected），
    // 属于正常情况，不走合法性校验以免刷警告
    if (from !== to) {
      const allowed = ALLOWED_TRANSITIONS[from] as readonly string[]
      if (!allowed.includes(to)) {
        console.warn(
          `[SessionState] 非法状态转换: ${from} → ${to}，强制执行以避免卡死`,
        )
      }
    }

    _uiState.value = to
    _lifecycle.value = lifecycle ?? _lifecycle.value
    _errorMsg.value = error ?? ''

    // 同步兼容 ref
    browserSessionStatus.value = to
  }

  // ========== API 响应处理 ==========

  /** 启动会话成功 */
  function onSessionCreated(data: { browser_started: boolean; status?: string; message?: string } | unknown) {
    const d = data as Record<string, unknown> | undefined
    if (d?.status === 'running') {
      transition('connected')
    } else {
      transition('disconnected', null, (d?.message as string) || '会话创建失败')
    }
  }

  /** 启动会话失败 */
  function onSessionStartFailed(msg: string) {
    transition('disconnected', null, msg)
  }

  /** 开始启动会话（乐观） */
  function onSessionStarting() {
    transition('connecting')
  }

  /** 关闭会话成功 */
  function onSessionStopped() {
    transition('disconnected', SessionLifecycleState.TERMINATED)
  }

  /** 关闭会话失败 — 根据错误码判断实际状态 */
  function onSessionStopFailed(msg: string, code: number) {
    const handler = ERROR_CODE_HANDLERS[code]
    if (handler) {
      transition(handler.state, handler.lifecycle, msg || t(handler.labelKey))
    } else {
      transition('error', null, msg)
    }
  }

  /** 刷新状态 API 返回后处理 */
  function onStatusResponse(rawData: unknown) {
    const data = rawData as Record<string, unknown> | undefined

    // API 级别错误
    if (!data || data.code !== 0) {
      const code = (data?.code as number) ?? 0
      const handler = ERROR_CODE_HANDLERS[code]
      if (handler) {
        transition(handler.state, handler.lifecycle, (data?.msg as string) || t(handler.labelKey))
      } else if (!data?.data) {
        // 会话不存在等场景
        transition('disconnected', SessionLifecycleState.TERMINATED, (data?.msg as string) || '会话状态未知')
      } else {
        // 其他 API 错误不改变状态，只记录
        _errorMsg.value = (data?.msg as string) || '状态获取失败'
      }
      return
    }

    const status = data.data as Record<string, unknown> | undefined
    if (!status) {
      transition('disconnected', SessionLifecycleState.TERMINATED)
      return
    }

    const sessionExists = !!status.session_exists
    const browserRunning = !!status.browser_running
    const lifecycle = (status.lifecycle_state as SessionLifecycleState) || null
    const running = (status.status as string) === 'running'

    if (sessionExists && browserRunning) {
      if (lifecycle === SessionLifecycleState.ACTIVE || lifecycle === SessionLifecycleState.IDLE || running) {
        transition('connected', lifecycle ?? SessionLifecycleState.ACTIVE)
      } else if (lifecycle === SessionLifecycleState.INITIALIZING) {
        transition('connecting', lifecycle)
      } else if (lifecycle === SessionLifecycleState.TERMINATED || lifecycle === SessionLifecycleState.TERMINATING) {
        transition('disconnected', lifecycle)
      } else {
        transition('connected')
      }
    } else if (sessionExists && !browserRunning) {
      transition('disconnected', lifecycle ?? SessionLifecycleState.TERMINATED)
    } else {
      transition('disconnected', SessionLifecycleState.TERMINATED)
    }
  }

  /** 重置到初始状态 */
  function reset() {
    _uiState.value = 'disconnected'
    _lifecycle.value = null
    _errorMsg.value = ''
    browserSessionStatus.value = 'disconnected'
  }

  return {
    // 兼容旧代码
    browserSessionStatus,

    // 新状态机接口
    uiState: _uiState,
    lifecycleState: _lifecycle,

    // 派生
    isConnected,
    isDisconnected,
    isConnecting,
    hasError,
    statusLabel,
    lifecycleLabel,
    errorMessage,

    // 转换方法
    transition,
    onSessionStarting,
    onSessionCreated,
    onSessionStartFailed,
    onSessionStopped,
    onSessionStopFailed,
    onStatusResponse,
    reset,
  }
}
