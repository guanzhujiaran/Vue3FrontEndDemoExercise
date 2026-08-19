/**
 * Moment（动态）全局状态管理。
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { MomentFeedItem, MomentDetailResp } from '@/api/notify/moment-api'

export const useMomentStore = defineStore('moment', () => {
  /** 当前查看的动态详情缓存（key: dynIdStr） */
  const detailCache = ref<Map<string, MomentDetailResp>>(new Map())

  /** 当前 Feed 列表（按页面隔离，这里只存一份供跨组件共享） */
  const feedItems = ref<MomentFeedItem[]>([])
  const feedHasMore = ref(false)
  const feedHistoryOffset = ref<number | undefined>(undefined)

  function setFeed(items: MomentFeedItem[], hasMore: boolean, historyOffset?: number) {
    feedItems.value = items
    feedHasMore.value = hasMore
    feedHistoryOffset.value = historyOffset
  }

  function appendFeed(items: MomentFeedItem[], hasMore: boolean, historyOffset?: number) {
    feedItems.value.push(...items)
    feedHasMore.value = hasMore
    feedHistoryOffset.value = historyOffset
  }

  function updateFeedItem(dynIdStr: string, patch: Partial<MomentFeedItem>) {
    const idx = feedItems.value.findIndex((i) => i.dynIdStr === dynIdStr)
    if (idx !== -1) {
      feedItems.value[idx] = { ...feedItems.value[idx], ...patch }
    }
  }

  function removeFeedItem(dynIdStr: string) {
    feedItems.value = feedItems.value.filter((i) => i.dynIdStr !== dynIdStr)
  }

  function cacheDetail(item: MomentDetailResp) {
    detailCache.value.set(item.dynIdStr, item)
  }

  function getCachedDetail(dynIdStr: string): MomentDetailResp | undefined {
    return detailCache.value.get(dynIdStr)
  }

  /** 重置所有状态 */
  function reset() {
    feedItems.value = []
    feedHasMore.value = false
    feedHistoryOffset.value = undefined
  }

  return {
    detailCache,
    feedItems,
    feedHasMore,
    feedHistoryOffset,
    setFeed,
    appendFeed,
    updateFeedItem,
    removeFeedItem,
    cacheDetail,
    getCachedDetail,
    reset,
  }
})
