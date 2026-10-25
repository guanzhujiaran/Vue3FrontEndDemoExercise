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

  function handleLogEvent(event: WorkflowRunLogEvent) {
    if (event.run_id !== runId.value) return
    const duplicated = messages.value.some(
      existing => existing.run_id === event.run_id && existing.seq === event.seq
    )
    if (duplicated) return
    messages.value = [...messages.value, event].slice(-MAX_MESSAGES)
    if (!panelOpen.value) unread.value += 1
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
    messages.value = []
    unread.value = 0
  }

  /** 断开当前运行的订阅（退出登录等场景） */
  function detachAll() {
    for (const close of subscriptions.values()) close()
    subscriptions.clear()
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
