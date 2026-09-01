<template>
  <div class="at-list h-full flex flex-col">
    <div class="at-list__toolbar mb-4 flex items-center justify-between">
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
    <LoadingMoreContainer
      class="at-list__content"
      fill-parent
      :handle-load="handleLoad"
      v-model:is-more="isMore"
      v-model:is-loading="isLoading"
      v-model:is-error="isError"
      :show-end-text="items.length > 0"
    >
      <template #content>
        <EmptyState
          v-if="!isLoading && !isError && items.length === 0"
          :text="t('message.emptyAt')"
        />
        <ul v-else class="at-list__items space-y-3 py-4">
          <EventItemCard
            v-for="item in items"
            :key="item.id"
            :item="item"
            @open="openDetail"
          />
        </ul>
      </template>
    </LoadingMoreContainer>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import {
  fetchEventList,
  markEventRead,
  EventTypeEnum,
  type EventFeedItem
} from '@/api/notify/message-api'
import { openEventDetail } from '@/utils/eventJump'

const { t } = useI18n()
const router = useRouter()
import LoadingMoreContainer from '@/components/CommonCompo/Bili-Container-Compo/LoadingMoreContainer.vue'
import EmptyState from '@/components/message/EmptyState.vue'
import EventItemCard from '@/components/message/EventItemCard.vue'

// 供 MessageLayout 的 <keep-alive> 缓存本页（切走再切回时保留列表与滚动位置）
defineOptions({ name: 'AtListView' })

// 未读数由父层（MessageLayout）经 msg_feed/unread 统一拉取一次后通过 v-model 下发
const atUnread = defineModel<number>('atUnread', { default: 0 })
const emit = defineEmits<{ refreshUnread: [] }>()

const PAGE_SIZE = 20

const items = ref<EventFeedItem[]>([])
const isLoading = ref(false)
const isMore = ref(true)
const isError = ref(false)
// B 站式游标分页：cursorId 为下一页起点（上一页 total.cursor.id）
let cursorId: number | null = null

const unreadCount = computed(() => atUnread.value)

/** 首屏加载 / 触底加载统一入口（LoadingMoreContainer 触底回调） */
async function handleLoad() {
  if (isLoading.value) return
  isError.value = false
  isLoading.value = true
  try {
    const isFirst = items.value.length === 0
    const list = await fetchEventList({
      event_type: EventTypeEnum.AT,
      cursor_id: isFirst ? null : cursorId,
      size: PAGE_SIZE
    })
    const pageItems = list.total?.items ?? []
    items.value = isFirst ? pageItems : [...items.value, ...pageItems]
    cursorId = list.total?.cursor?.id ?? null
    isMore.value = !(list.total?.cursor?.is_end ?? true)
  } catch (e) {
    console.error('加载@我的列表失败:', e)
    isError.value = true
  } finally {
    isLoading.value = false
  }
}

async function markAllRead() {
  const res = await markEventRead(
    { event_type: EventTypeEnum.AT },
    { showSuccessToast: true, successMessage: t('message.markAllRead') }
  )
  if ((res.affected ?? 0) > 0) emit('refreshUnread')
}

function openDetail(item: EventFeedItem) {
  void openEventDetail(item, router)
}

onMounted(handleLoad)
</script>
