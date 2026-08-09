<template>
  <div class="dm-list h-full flex flex-col">
    <LoadingWrap :loading="loading" class="dm-list__content flex-1 min-h-0 overflow-y-auto">
      <EmptyState v-if="items.length === 0" text="还没有私信，快找小伙伴聊天吧" />
      <ul v-else class="dm-list__items space-y-3">
        <li
          v-for="session in items"
          :key="session.talker_mid"
          class="dm-list__item group flex cursor-pointer items-center gap-4 rounded-lg bg-msg-card p-4 transition-colors hover:bg-msg-card-hover"
          @click="openSession(session.talker_mid, session.talker_name)"
        >
          <div class="dm-list__avatar-wrap relative shrink-0">
            <img
              class="dm-list__avatar h-12 w-12 rounded-full object-cover"
              :src="session.talker_avatar || '/assets/noface.png'"
              alt="avatar"
            />
            <span
              v-if="session.unread_count > 0"
              class="dm-list__dot absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-msg-pink px-1 text-xs text-white"
            >
              {{ session.unread_count > 99 ? '99+' : session.unread_count }}
            </span>
          </div>
          <div class="dm-list__body min-w-0 flex-1">
            <div class="dm-list__head mb-1 flex items-center justify-between">
              <span class="dm-list__name truncate text-sm font-medium text-msg-text-active">
                {{ session.talker_name || `用户${session.talker_mid}` }}
              </span>
              <TimeText v-if="session.last_msg_time" :time="session.last_msg_time" />
            </div>
            <p class="dm-list__last line-clamp-1 text-sm text-msg-muted">{{ session.last_msg || ' ' }}</p>
          </div>
        </li>
      </ul>
      <PaginationBar
        v-if="total > pageSize"
        class="dm-list__pagination"
        :total="total"
        :page-size="pageSize"
        :current-page="page"
        @update:current-page="onPageChange"
      />
    </LoadingWrap>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { fetchDmSessions, type DmSessionItem } from '@/api/notify/message-api'
import LoadingWrap from '@/components/message/LoadingWrap.vue'
import EmptyState from '@/components/message/EmptyState.vue'
import PaginationBar from '@/components/message/PaginationBar.vue'
import TimeText from '@/components/message/TimeText.vue'

// 未读数由父层（MessageLayout）经 msg_feed/unread 统一拉取一次后通过 v-model 下发
const dmUnread = defineModel<number>('dmUnread', { default: 0 })
const emit = defineEmits<{ refreshUnread: [] }>()

const router = useRouter()
const items = ref<DmSessionItem[]>([])
const loading = ref(false)
const total = ref(0)
const page = ref(1)
const pageSize = 20

async function load() {
  loading.value = true
  const list = await fetchDmSessions({ page: page.value, size: pageSize })
  items.value = list.items
  total.value = list.total
  loading.value = false
}

function onPageChange(p: number) {
  page.value = p
  load()
}

function openSession(talkerMid: number, talkerName?: string | null) {
  router.push({
    name: 'MESSAGE_DM_CHAT',
    params: { talkerMid: String(talkerMid) },
    query: { name: talkerName || '' }
  })
}

onMounted(load)
</script>
