import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import {
  isTerminalRunStatus,
  subscribeWorkflowRunProgress,
  type WorkflowRequestHeaders,
  type WorkflowRunLogEvent,
  type WorkflowRunProgress,
} from '@/api/browser/workflow_run_api'

/**
 * 工作流运行消息（全局）
 *
 * 为什么放到 Pinia：SSE 订阅与消息列表要跨页面存活——用户从工作流页切到别的页面，
 * 运行仍在继续，消息栏应继续累积；否则组件卸载会断开连接、丢掉后续消息。
 *
 * 订阅句柄放在模块作用域（Pinia state 不适合存函数），随 SPA 生命周期存活。
 */

/**
 * 面板保留的消息条数上限。
 *
 * 后端「打印」是全量的（SSE 消息不落库、不占硬盘），这里只是**前端展示窗口**：
 * 循环体密集上报时（368 轮 × 9 动作）不可能全部堆在 DOM 里，超出只保留最近的。
 * 配合面板的「按轮次分批收拢」，1000 条足够回看相当长的一段执行过程。
 */
const MAX_MESSAGES = 1000
/**
 * 单条消息保留的返回内容（`detail`）最大字符数。
 *
 * 后端运行日志对 `detail` **不做总量限制**（`workflow_run_log_detail_max_length` 默认 0），
 * 实测一个 LLM 步骤的 detail 就有 9.7MB，1000 条窗口累计 100MB+：
 * 全部留在内存里会让面板卡死。前端只做展示，保留前 4000 字符足够定位问题，
 * 完整内容去「运行记录 → 执行日志」看。
 */
const MAX_DETAIL_CHARS = 4000
/**
 * 消息聚合窗口（毫秒）。
 *
 * 循环体密集上报时（一轮 33 个动作 × 起止两条 ≈ 70+ 条消息，几秒内涌入），
 * 每条消息都替换一次数组会让面板整棵消息树重建 + 重渲染。这里把窗口内的消息
 * 合并成一次提交，渲染次数从「每条一次」降到「每 120ms 一次」。
 */
const FLUSH_INTERVAL = 120
/** run_id -> 取消订阅函数（模块级，跨组件/页面存活） */
const subscriptions = new Map<string, () => void>()

export const useWorkflowRunMessageStore = defineStore('workflow-run-messages', () => {
  /** 「运行消息」面板是否展开（默认关闭，由用户点悬浮按钮打开） */
  const panelOpen = ref(false)
  const messages = ref<WorkflowRunLogEvent[]>([])
  /** 当前消息栏跟随的运行 */
  const runId = ref('')
  const workflowName = ref('')
  /** 当前运行状态（idle=从未订阅过） */
  const status = ref('idle')
  /** 面板收起时收到的新消息数（展开后清零） */
  const unread = ref(0)

  const running = computed(() => status.value === 'running')
  const hasMessages = computed(() => messages.value.length > 0)
  /** 悬浮入口：从未订阅且无消息时不显示 */
  const showEntry = computed(() => running.value || hasMessages.value)

  function closeSubscription(targetRunId: string) {
    const close = subscriptions.get(targetRunId)
    if (!close) return
    close()
    subscriptions.delete(targetRunId)
  }

  /** 已入列/已展示的 seq（SSE 断线重连会补发最近消息，据此去重） */
  let seenSeq = new Set<number>()
  /** 聚合窗口内待提交的消息 */
  let pending: WorkflowRunLogEvent[] = []
  let flushTimer: ReturnType<typeof setTimeout> | null = null

  /** 把窗口内的消息一次性并入消息列表（超出上限只保留最近的） */
  function flushPending() {
    flushTimer = null
    if (pending.length === 0) return
    const batch = pending
    pending = []
    messages.value = [...messages.value, ...batch].slice(-MAX_MESSAGES)
  }

  /** 丢弃未提交的消息（切换运行 / 清空时不能把上一批补进来） */
  function dropPending() {
    if (flushTimer !== null) {
      clearTimeout(flushTimer)
      flushTimer = null
    }
    pending = []
  }

  /**
   * 入列前先给 `detail` 兜底截断。
   *
   * 必须在进内存前做：超长 detail 一旦进入响应式数组，面板的 computed（消息树、
   * 焦点路径、占位行）每帧都要遍历它，DOM 里也会留下巨大的文本节点，改再多的渲染策略都救不回来。
   */
  function clampDetail(event: WorkflowRunLogEvent): WorkflowRunLogEvent {
    const detail = event.detail
    if (typeof detail !== 'string' || detail.length <= MAX_DETAIL_CHARS) return event
    return {
      ...event,
      detail: `${detail.slice(0, MAX_DETAIL_CHARS)}\n…（已截断，原文 ${detail.length} 字符；完整内容见运行记录的执行日志）`,
    }
  }

  function handleLogEvent(event: WorkflowRunLogEvent) {
    if (event.run_id !== runId.value) return
    if (seenSeq.has(event.seq)) return
    seenSeq.add(event.seq)
    if (!panelOpen.value) unread.value += 1
    pending.push(clampDetail(event))
    if (flushTimer === null) flushTimer = setTimeout(flushPending, FLUSH_INTERVAL)
  }

  /**
   * 跟随一次运行（重复调用幂等）。
   *
   * @param reset 新一轮开始时清空历史（手动运行 / 继续运行）；
   *              页面刷新后发现「正在运行」的存量运行则传 false，保留本次会话已有消息。
   */
  function attachRun(
    targetRunId: string,
    name: string,
    headers: WorkflowRequestHeaders,
    reset = false
  ) {
    const switched = runId.value !== targetRunId
    if (switched || reset) {
      if (switched && runId.value) closeSubscription(runId.value)
      runId.value = targetRunId
      workflowName.value = name
      // 换了运行：未提交的旧消息与去重表一并作废，避免把上一轮消息混进新运行
      dropPending()
      seenSeq = new Set<number>()
      messages.value = []
      unread.value = 0
      status.value = 'running'
    }
    if (subscriptions.has(targetRunId)) return

    const close = subscribeWorkflowRunProgress(targetRunId, headers, {
      onProgress: (progress: WorkflowRunProgress) => {
        if (progress.run_id !== runId.value) return
        status.value = progress.status
        if (isTerminalRunStatus(progress.status)) closeSubscription(targetRunId)
      },
      onLogEvent: handleLogEvent,
    })
    subscriptions.set(targetRunId, close)
  }

  function openPanel() {
    panelOpen.value = true
    unread.value = 0
  }

  function closePanel() {
    panelOpen.value = false
  }

  function togglePanel() {
    if (panelOpen.value) closePanel()
    else openPanel()
  }

  /** 清空消息（不影响订阅，后续消息继续累积） */
  function clearMessages() {
    dropPending()
    messages.value = []
    unread.value = 0
  }

  /** 断开当前运行的订阅（退出登录等场景） */
  function detachAll() {
    for (const close of subscriptions.values()) close()
    subscriptions.clear()
    dropPending()
    status.value = 'idle'
  }

  return {
    panelOpen,
    messages,
    runId,
    workflowName,
    status,
    unread,
    running,
    hasMessages,
    showEntry,
    attachRun,
    openPanel,
    closePanel,
    togglePanel,
    clearMessages,
    detachAll,
  }
})
