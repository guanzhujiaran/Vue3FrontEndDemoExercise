<template>
  <div class="at-list h-full flex flex-col">
    <div class="at-list__toolbar mb-4 flex items-center justify-between">
      <h2 class="at-list__title text-base font-bold text-msg-text-active">{{ t('message.navAts') }}</h2>
      <el-button
        v-if="unreadCount > 0"
        type="primary"
        size="default"
        class="at-list__read-all"
        @click="markAllRead"
      >
        {{ t('message.markAllRead') }}
      </el-button>
    </div>
    <LoadingWrap :loading="loading" class="at-list__content flex-1 min-h-0 overflow-y-auto">
      <EmptyState v-if="items.length === 0" :text="t('message.emptyAt')" />
      <ul v-else class="at-list__items space-y-3">
        <EventItemCard
          v-for="item in items"
          :key="item.id"
          :item="item"
          @open="openDetail"
        />
      </ul>
      <div v-if="hasMore" class="at-list__loadmore mt-4 flex justify-center">
        <el-button
          text
          size="default"
          class="at-list__loadmore-btn"
          :loading="loadingMore"
          @click="loadMore"
        >
          {{ t('message.loadMore') }}
        </el-button>
      </div>
    </LoadingWrap>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import biliMessage from '@/utils/message'
import {
  fetchEventList,
  markEventRead,
  type EventFeedItem
} from '@/api/notify/message-api'

const { t } = useI18n()
import LoadingWrap from '@/components/message/LoadingWrap.vue'
import EmptyState from '@/components/message/EmptyState.vue'
import EventItemCard from '@/components/message/EventItemCard.vue'

// 供 MessageLayout 的 <keep-alive> 缓存本页（切走再切回时保留列表与滚动位置）
defineOptions({ name: 'AtListView' })

// 未读数由父层（MessageLayout）经 msg_feed/unread 统一拉取一次后通过 v-model 下发
const atUnread = defineModel<number>('atUnread', { default: 0 })
const emit = defineEmits<{ refreshUnread: [] }>()

const items = ref<EventFeedItem[]>([])
const loading = ref(false)
const loadingMore = ref(false)
// B 站式游标分页：cursorId 为下一页起点（上一页 total.cursor.id）
const cursorId = ref<number | null>(null)
const hasMore = ref(false)

const unreadCount = computed(() => atUnread.value)

async function load() {
  loading.value = true
  const list = await fetchEventList({ event_type: 'at', size: 20 })
  items.value = list.total?.items ?? []
  cursorId.value = list.total?.cursor?.id ?? null
  hasMore.value = !(list.total?.cursor?.is_end ?? true)
  loading.value = false
}

async function loadMore() {
  if (loadingMore.value || !hasMore.value) return
  loadingMore.value = true
  const list = await fetchEventList({ event_type: 'at', cursor_id: cursorId.value, size: 20 })
  items.value = [...items.value, ...(list.total?.items ?? [])]
  cursorId.value = list.total?.cursor?.id ?? null
  hasMore.value = !(list.total?.cursor?.is_end ?? true)
  loadingMore.value = false
}

async function markAllRead() {
  const res = await markEventRead({ event_type: 'at' })
  if (res.affected > 0) {
    emit('refreshUnread')
    biliMessage.success(t('message.markAllRead'))
  }
}

function openDetail(item: EventFeedItem) {
  const uri = item.item?.uri
  if (uri) window.open(uri, '_blank')
}

onMounted(load)
</script>
