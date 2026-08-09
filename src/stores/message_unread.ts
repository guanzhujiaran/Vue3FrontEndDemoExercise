import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { UnreadSummary } from '@/api/notify/message-api'

/**
 * 消息系统未读数汇总 store（持久化）。
 * 各模块（事件 like/reply/at、通知 notify、私信 dm）的未读数统一在此聚合，
 * 由 msg_feed/unread 汇总接口一次性刷新，供顶部徽标与侧边栏联动。
 */
export const useMessageUnreadStore = defineStore(
  'message-unread',
  () => {
    const notifyUnread = ref(0)
    const likeUnread = ref(0)
    const replyUnread = ref(0)
    const atUnread = ref(0)
    const dmUnread = ref(0)

    // 事件类（点赞/回复/@）未读合计
    const eventUnread = ref(0)

    function setNotifyUnread(n: number) {
      notifyUnread.value = n
    }

    function setDmUnread(n: number) {
      dmUnread.value = n
    }

    function setEventUnread(n: number) {
      eventUnread.value = n
    }

    /** 用跨模块汇总结果整体刷新 */
    function applySummary(s: UnreadSummary | null | undefined) {
      if (!s) return
      notifyUnread.value = s.notify ?? 0
      dmUnread.value = s.dm ?? 0
      likeUnread.value = s.like ?? 0
      replyUnread.value = s.reply ?? 0
      atUnread.value = s.at ?? 0
      eventUnread.value = (s.like ?? 0) + (s.reply ?? 0) + (s.at ?? 0)
    }

    function totalUnread(): number {
      return notifyUnread.value + eventUnread.value + dmUnread.value
    }

    function reset() {
      notifyUnread.value = 0
      likeUnread.value = 0
      replyUnread.value = 0
      atUnread.value = 0
      dmUnread.value = 0
      eventUnread.value = 0
    }

    return {
      notifyUnread,
      likeUnread,
      replyUnread,
      atUnread,
      dmUnread,
      eventUnread,
      setNotifyUnread,
      setDmUnread,
      setEventUnread,
      applySummary,
      totalUnread,
      reset
    }
  },
  {
    persist: {
      key: 'message-unread',
      storage: localStorage
    }
  }
)
