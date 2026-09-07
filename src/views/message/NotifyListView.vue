<template>
  <div class="notify-list h-full flex flex-col">
    <div class="notify-list__toolbar mb-4 flex items-center justify-between">
      <h2 class="notify-list__title flex items-center gap-2 text-base font-bold text-text-primary">
        {{ t('message.notifyTitle') }}
        <el-badge
          v-if="notifyUnread > 0"
          :value="notifyUnread"
          :max="99"
          class="notify-list__title-badge"
        />
      </h2>
      <div class="notify-list__actions flex items-center gap-3">
        <el-button size="default" class="notify-list__refresh" @click="onRefresh">
          {{ t('message.refresh') }}
        </el-button>
      </div>
    </div>

    <LoadingMoreContainer
      class="notify-list__content"
      fill-parent
      :handle-load="handleLoad"
      v-model:is-more="isMore"
      v-model:is-loading="isLoading"
      v-model:is-error="isError"
      :show-end-text="displayItems.length > 0"
    >
      <template #content>
        <EmptyState
          v-if="!isLoading && !isError && displayItems.length === 0"
          :text="t('message.noNotify')"
        />
        <ul v-else class="notify-list__items space-y-3 py-4">
        <li
          v-for="item in displayItems"
          :key="item.id"
          class="notify-list__item group relative flex gap-4 rounded-lg bg-bg-overlay p-4 transition-colors hover:bg-fill-light"
        >
          <div class="notify-list__indicator mt-2 h-2 w-2 shrink-0 rounded-full" :class="item.is_read ? 'bg-text-placeholder' : 'bg-msg-pink'" />
          <div class="notify-list__body min-w-0 flex-1">
            <div class="notify-list__head mb-1 flex items-center gap-2">
              <span class="notify-list__title truncate text-sm font-bold text-text-primary">{{ item.title }}</span>
              <el-tag v-if="item.level !== NotifyLevelEnum.NORMAL" :type="levelTagType(item.level)" size="default" effect="dark" round>
                {{ levelText(item.level) }}
              </el-tag>
            </div>
            <p class="notify-list__summary whitespace-pre-wrap text-sm leading-6 text-text-placeholder">
              <template v-for="(seg, idx) in renderNotifySegments(item.content)" :key="idx">
                <a
                  v-if="seg.url"
                  :href="seg.url"
                  target="_blank"
                  :rel="LINK_REL"
                  :referrerpolicy="LINK_REFERRER_POLICY"
                  class="notify-list__inline-link font-medium text-primary hover:underline"
                  @click="onInlineLink($event, seg.url)"
                >{{ seg.text }}</a>
                <template v-else>{{ seg.text }}</template>
              </template>
              <el-link
                v-if="item.jump_url && !hasNotifyInlineLink(item.content)"
                type="primary"
                class="notify-list__jump-link ml-1"
                :href="item.jump_url ?? undefined"
                :rel="LINK_REL"
                :referrerpolicy="LINK_REFERRER_POLICY"
                :underline="false"
                @click="openJump($event, item.jump_url)"
              >
                {{ t('message.viewLink') }}
              </el-link>
            </p>
            <div class="notify-list__meta mt-2 flex items-center gap-4 text-xs text-text-placeholder">
              <TimeText :time="item.publish_at" />
            </div>
          </div>
        </li>
        </ul>
      </template>
    </LoadingMoreContainer>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { hasNotifyInlineLink, isExternalUrl, renderNotifySegments } from '@/utils/notifyContent'
import { LINK_REL, LINK_REFERRER_POLICY } from '@/utils/PageOpen/linkPolicy'
import { jumpToTarget } from '@/utils/routeJump'
import {
  fetchNotifyList,
  NotifyLevelEnum,
  type NotifyItem,
  type NotifyLevel
} from '@/api/notify/message-api'

const { t } = useI18n()
import LoadingMoreContainer from '@/components/CommonCompo/Bili-Container-Compo/LoadingMoreContainer.vue'
import EmptyState from '@/components/message/EmptyState.vue'
import TimeText from '@/components/message/TimeText.vue'

// 供 MessageLayout 的 <keep-alive> 缓存本页（切走再切回时保留列表与滚动位置）
defineOptions({ name: 'NotifyListView' })

// 未读数由父层（MessageLayout）经 msg_feed/unread 统一拉取一次后通过 v-model 下发
const notifyUnread = defineModel<number>('notifyUnread', { default: 0 })
const emit = defineEmits<{ refreshUnread: [] }>()
const router = useRouter()

const PAGE_SIZE = 20

const items = ref<NotifyItem[]>([])
const isLoading = ref(false)
const isMore = ref(true)
const isError = ref(false)
const total = ref(0)
const page = ref(1)

const displayItems = computed(() => items.value)

/** 重置为第一页：手动刷新时清空已累积列表 */
function resetList() {
  items.value = []
  page.value = 1
  total.value = 0
  isMore.value = true
  isError.value = false
}

/** 首屏加载 / 触底加载统一入口（LoadingMoreContainer 触底回调） */
async function handleLoad() {
  if (isLoading.value) return
  isError.value = false
  isLoading.value = true
  try {
    const list = await fetchNotifyList({
      page: page.value,
      size: PAGE_SIZE
    })
    const pageItems = list.items ?? []
    // 服务端页码分页：首页整体替换，后续页追加累积
    items.value = page.value === 1 ? pageItems : [...items.value, ...pageItems]
    total.value = list.total ?? 0
    page.value += 1
    // 空页兜底：防止 total 与实际条数不一致时反复触发触底加载
    isMore.value = pageItems.length > 0 && items.value.length < total.value
    // 后端「读取即已读」：本页通知返回时已落库为已读，通知父层刷新红点
    if (pageItems.length > 0) emit('refreshUnread')
  } catch (e) {
    console.error('加载系统通知失败:', e)
    isError.value = true
  } finally {
    isLoading.value = false
  }
}

function onRefresh() {
  resetList()
  handleLoad()
}

/** 点「查看链接」：按后端下发的跳转目标走路由名 / 路径 / 外链。 */
function openJump(ev: MouseEvent, url: string | null | undefined) {
  if (!url) return
  // 站内目标交给 SPA 路由，避免 href 触发整页刷新
  ev.preventDefault()
  jumpToTarget(router, url)
}

/** 正文中点击内联链接：站内目标走路由，外链交给浏览器新开标签。 */
function onInlineLink(ev: MouseEvent, url: string) {
  // 让原生 href 仍然兜底（防止 JS 异常时无响应），但站内跳转走 SPA 路由更顺滑
  if (!isExternalUrl(url)) {
    ev.preventDefault()
    jumpToTarget(router, url)
  }
}

function levelTagType(level: NotifyLevel | undefined): 'info' | 'warning' | 'danger' {
  if (level === NotifyLevelEnum.URGENT) return 'danger'
  if (level === NotifyLevelEnum.IMPORTANT) return 'warning'
  return 'info'
}

function levelText(level: NotifyLevel | undefined): string {
  if (level === NotifyLevelEnum.URGENT) return t('message.levelUrgent')
  if (level === NotifyLevelEnum.IMPORTANT) return t('message.levelImportant')
  return t('message.levelNormal')
}

onMounted(handleLoad)
</script>
