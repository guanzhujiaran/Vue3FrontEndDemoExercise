<template>
  <div class="like-list h-full flex flex-col">
    <div class="like-list__toolbar mb-4 flex items-center justify-between">
      <h2 class="like-list__title text-base font-bold text-msg-text-active">收到的赞</h2>
      <el-button
        v-if="unreadCount > 0"
        type="primary"
        size="default"
        class="like-list__read-all"
        @click="markAllRead"
      >
        全部已读
      </el-button>
    </div>
    <LoadingWrap :loading="loading" class="like-list__content flex-1 min-h-0 overflow-y-auto">
      <EmptyState v-if="items.length === 0" text="还没有收到赞哦 ~" />
      <ul v-else class="like-list__items space-y-3">
        <EventItemCard
          v-for="item in items"
          :key="item.id"
          :item="item"
          @open="openDetail"
        />
      </ul>
      <PaginationBar
        v-if="total > pageSize"
        class="like-list__pagination mt-4"
        :total="total"
        :page-size="pageSize"
        :current-page="page"
        @update:current-page="onPageChange"
      />
    </LoadingWrap>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import biliMessage from '@/utils/message'
import {
  fetchEventList,
  markEventRead,
  type EventItem
} from '@/api/notify/message-api'
import LoadingWrap from '@/components/message/LoadingWrap.vue'
import EmptyState from '@/components/message/EmptyState.vue'
import PaginationBar from '@/components/message/PaginationBar.vue'
import EventItemCard from '@/components/message/EventItemCard.vue'

// 未读数由父层（MessageLayout）经 msg_feed/unread 统一拉取一次后通过 v-model 下发
const likeUnread = defineModel<number>('likeUnread', { default: 0 })
const emit = defineEmits<{ refreshUnread: [] }>()

const items = ref<EventItem[]>([])
const loading = ref(false)
const total = ref(0)
const page = ref(1)
const pageSize = 20

const unreadCount = computed(() => likeUnread.value)

async function load() {
  loading.value = true
  const list = await fetchEventList({ event_type: 'like', page: page.value, size: pageSize })
  items.value = list.items
  total.value = list.total
  loading.value = false
}

function onPageChange(p: number) {
  page.value = p
  load()
}

async function markAllRead() {
  const res = await markEventRead({ event_type: 'like' })
  if (res.affected > 0) {
    items.value.forEach((i) => (i.is_read = true))
    emit('refreshUnread')
    biliMessage.success('全部已读')
  }
}

async function markItemRead(item: EventItem) {
  if (item.is_read) return
  await markEventRead({ event_ids: [item.id] })
  item.is_read = true
  emit('refreshUnread')
}

function openDetail(item: EventItem) {
  if (item.jump_url) window.open(item.jump_url, '_blank')
  markItemRead(item)
}

onMounted(load)
</script>
