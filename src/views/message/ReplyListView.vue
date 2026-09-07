<template>
  <div class="reply-list h-full flex flex-col">
    <LoadingMoreContainer
      class="reply-list__content"
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
          :text="t('message.emptyReply')"
        />
        <ul v-else class="reply-list__items space-y-3 py-4">
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
import { onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import {
  fetchEventList,
  markEventRead,
  InteractionActionTypeEnum,
  type EventFeedItem
} from '@/api/notify/message-api'
import { openEventDetail } from '@/utils/eventJump'

const { t } = useI18n()
const router = useRouter()
import LoadingMoreContainer from '@/components/CommonCompo/Bili-Container-Compo/LoadingMoreContainer.vue'
import EmptyState from '@/components/message/EmptyState.vue'
import EventItemCard from '@/components/message/EventItemCard.vue'

// 供 MessageLayout 的 <keep-alive> 缓存本页（切走再切回时保留列表与滚动位置）
defineOptions({ name: 'ReplyListView' })

// 未读数由父层（MessageLayout）经 msg_feed/unread 统一拉取一次后通过 v-model 下发
const replyUnread = defineModel<number>('replyUnread', { default: 0 })
const emit = defineEmits<{ refreshUnread: [] }>()

const PAGE_SIZE = 20

const items = ref<EventFeedItem[]>([])
const isLoading = ref(false)
const isMore = ref(true)
const isError = ref(false)
// B 站式游标分页：cursorId 为下一页起点（上一页 total.cursor.id）
let cursorId: number | null = null

/** 首屏加载 / 触底加载统一入口（LoadingMoreContainer 触底回调） */
async function handleLoad() {
  if (isLoading.value) return
  isError.value = false
  isLoading.value = true
  try {
    const isFirst = items.value.length === 0
    const list = await fetchEventList({
      event_type: InteractionActionTypeEnum.REPLY,
      cursor_id: isFirst ? null : cursorId,
      size: PAGE_SIZE
    })
    const pageItems = list.total?.items ?? []
    items.value = isFirst ? pageItems : [...items.value, ...pageItems]
    cursorId = list.total?.cursor?.id ?? null
    isMore.value = !(list.total?.cursor?.is_end ?? true)
    // 首屏：拉取列表后自动把「当前时刻之前」的回复全部置为已读（取代原「全部已读」按钮）
    if (isFirst) await markReadBeforeNow()
  } catch (e) {
    console.error('加载回复列表失败:', e)
    isError.value = true
  } finally {
    isLoading.value = false
  }
}

/** 自动已读：把当前时刻之前、归属本用户的该类型互动提醒全部标记为已读 */
async function markReadBeforeNow() {
  await markEventRead({
    event_type: InteractionActionTypeEnum.REPLY,
    read_before: new Date().toISOString()
  })
  emit('refreshUnread')
}

function openDetail(item: EventFeedItem) {
  void openEventDetail(item, router)
}

onMounted(handleLoad)
</script>
