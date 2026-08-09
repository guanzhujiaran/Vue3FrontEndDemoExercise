import { onActivated, onDeactivated, onMounted, onUnmounted } from 'vue'
import { useMessageUnreadStore } from '@/stores/message_unread'
import { fetchUnreadSummary, sendHeartbeat } from '@/api/notify/message-api'

/**
 * 消息中心活跃心跳。
 *
 * 进入消息中心（MessageLayout 激活）后启动：先上报一次心跳（标记活跃，走实时推送），
 * 再拉取跨模块未读汇总刷新 store；之后按 intervalMs 周期重复。
 * 离开消息中心（组件失活/卸载）时清除定时器。
 *
 * 注意：MessageLayout 处于 <keep-alive> 下，离开页面时触发的是 onDeactivated 而非
 * onUnmounted，因此必须同时用 onActivated/onDeactivated 管理定时器，否则离开后
 * 定时器泄漏、后台不停刷 API。
 *
 * `onTick` 允许调用方注入统一的未读刷新逻辑（如上层经 v-model 下发给子组件），
 * 默认仍直接调用 msg_feed/unread 刷新 store，保证未传参时行为不变。
 */
export function useHeartbeat(intervalMs = 60_000, onTick?: () => Promise<void> | void) {
  const store = useMessageUnreadStore()
  let timer: ReturnType<typeof setInterval> | undefined
  let running = false

  async function tick() {
    await sendHeartbeat()
    if (onTick) {
      await onTick()
    } else {
      const s = await fetchUnreadSummary()
      if (s) store.applySummary(s)
    }
  }

  function start() {
    if (running) return
    running = true
    tick()
    timer = setInterval(tick, intervalMs)
  }

  function stop() {
    if (timer) clearInterval(timer)
    timer = undefined
    running = false
  }

  // keep-alive 场景：激活启动、失活清除
  onActivated(start)
  onDeactivated(stop)

  // 非 keep-alive 场景兜底
  onMounted(start)
  onUnmounted(stop)
}
