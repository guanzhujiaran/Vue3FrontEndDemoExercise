<template>
  <!--
    陌生人私信分类子列表（参考 B 站「应援团」集合下的子房间列表）：
    - 进入页面才请求 STRANGER 会话，符合「点开之后再加载具体内容」的懒加载语义。
    - 与普通 DM 列表共用 DmSessionItem / DmWhisperLayout 的渲染样式，
      仅查询参数 session_type 不同。
    - 点击子项进入与普通 DM 完全一致的聊天视图（whisper/:talkerId），
      聊天接口（/messages）按 owner+talker 查索引，与 session_type 无关。
  -->
  <div class="dm-stranger-list flex h-full flex-col bg-bg">
    <div
      class="dm-stranger-list__header shrink-0 border-b border-border-lighter px-4 py-3 text-sm font-medium text-text-primary"
    >
      {{ t('message.strangerDmTitle') }}
    </div>
    <LoadingMoreContainer
      class="dm-stranger-list__body flex-1 min-h-0"
      fill-parent
      :handle-load="handleLoad"
      v-model:is-more="isMore"
      v-model:is-loading="isLoading"
      v-model:is-error="isError"
      :show-end-text="items.length > 0"
    >
      <template #content>
        <BiliError
          v-if="isError"
          :txt="t('message.listLoadFailed')"
          @click-retry="onRetry"
        />
        <EmptyState
          v-else-if="!isLoading && items.length === 0"
          :text="t('message.strangerDmEmpty')"
        />
        <ul v-else class="dm-stranger-list__items">
          <li
            v-for="session in items"
            :key="session.talker_mid"
            class="dm-stranger-list__item group flex cursor-pointer items-center gap-3 px-4 py-3 transition-colors"
            @click="openSession(session)"
          >
            <div class="relative shrink-0">
              <img
                class="h-12 w-12 rounded-full object-cover"
                :src="session.talker_avatar || BiliImg.face.noface"
                alt="avatar"
                referrerpolicy="no-referrer"
              />
              <span
                v-if="(session.unread_count ?? 0) > 0"
                class="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-msg-pink px-1 text-xs text-white"
              >
                {{ (session.unread_count ?? 0) > 99 ? '99+' : (session.unread_count ?? 0) }}
              </span>
            </div>
            <div class="min-w-0 flex-1">
              <div class="mb-1 flex items-center justify-between gap-2">
                <span class="truncate text-sm font-medium text-text-primary">
                  {{ session.talker_name || `用户${session.talker_mid}` }}
                </span>
              </div>
              <p class="line-clamp-1 text-xs text-text-secondary">
                {{
                  (session.unread_count ?? 0) > 0
                    ? `[${session.unread_count}条]${session.last_content_preview || ''}`
                    : session.last_content_preview || ' '
                }}
              </p>
            </div>
          </li>
        </ul>
      </template>
    </LoadingMoreContainer>
  </div>
</template>

<script setup lang="ts">
import { onActivated, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import {
  fetchDmSessions,
  DmSessionType,
  type DmSessionItem
} from '@/api/notify/message-api'
import { BiliImg } from '@/assets/img/BiliImg.ts'
import LoadingMoreContainer from '@/components/CommonCompo/Bili-Container-Compo/LoadingMoreContainer.vue'
import EmptyState from '@/components/message/EmptyState.vue'
import BiliError from '@/components/CommonCompo/Bili-Feedback-Compo/BiliError.vue'

// 供 MessageLayout 的 <keep-alive> 缓存本页（切走再切回保留表单/滚动位置）
defineOptions({ name: 'DmStrangerListView' })

const { t } = useI18n()
const router = useRouter()

const PAGE_SIZE = 10

const items = ref<DmSessionItem[]>([])
const isLoading = ref(false)
const isMore = ref(true)
const isError = ref(false)
const total = ref(0)
const page = ref(1)

function resetList() {
  items.value = []
  page.value = 1
  total.value = 0
  isMore.value = true
  isError.value = false
}

async function handleLoad() {
  if (isLoading.value) return
  isLoading.value = true
  isError.value = false
  try {
    // STRANGER 分类子页：仅查 session_type=STRANGER 的会话
    const list = await fetchDmSessions({
      page: page.value,
      size: PAGE_SIZE,
      session_type: DmSessionType.STRANGER
    })
    const pageItems = list.items ?? []
    items.value = page.value === 1 ? pageItems : [...items.value, ...pageItems]
    total.value = list.total ?? 0
    page.value += 1
    isMore.value = pageItems.length > 0 && items.value.length < total.value
  } catch {
    isError.value = true
  } finally {
    isLoading.value = false
  }
}

function onRetry() {
  resetList()
  handleLoad()
}

function openSession(session: DmSessionItem) {
  // 与普通 DM 共用聊天视图：聊天接口按 owner+talker 读索引，session_type 不影响。
  router.push({
    name: 'MESSAGE_WHISPER_CHAT',
    params: { talkerId: String(session.talker_mid) }
  })
}

onActivated(() => {
  // 从其他子页切回时重拉，使后端已清的未读同步到前端红点
  resetList()
  handleLoad()
})
</script>

<style scoped>
.dm-stranger-list__item:hover {
  background: var(--color-fill-lighter);
}
.dm-stranger-list__items {
  /* 列表本身无外边距，与父容器贴合 */
}
</style>
