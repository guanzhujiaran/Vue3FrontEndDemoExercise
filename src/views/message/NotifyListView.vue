<template>
  <div class="notify-list h-full flex flex-col">
    <div class="notify-list__toolbar mb-4 flex items-center justify-between">
      <h2 class="notify-list__title flex items-center gap-2 text-base font-bold text-msg-text-active">
        {{ t('message.notifyTitle') }}
        <el-badge
          v-if="notifyUnread > 0"
          :value="notifyUnread"
          :max="99"
          class="notify-list__title-badge"
        />
      </h2>
      <div class="notify-list__actions flex items-center gap-3">
        <el-checkbox v-model="onlyUnread" size="default" class="notify-list__unread-check text-msg-text-active" @change="onFilterChange">
          {{ t('message.onlyUnread') }}
        </el-checkbox>
        <el-button
          v-if="unreadCount > 0"
          type="primary"
          size="default"
          class="notify-list__read-all"
          @click="markAllRead"
        >
          {{ t('message.markAllRead') }}
        </el-button>
        <el-button size="default" class="notify-list__refresh" @click="load">
          {{ t('message.refresh') }}
        </el-button>
      </div>
    </div>

    <LoadingWrap :loading="loading" class="notify-list__content flex-1 min-h-0 overflow-y-auto">
      <EmptyState v-if="displayItems.length === 0" :text="t('message.noNotify')" />
      <ul v-else class="notify-list__items space-y-3">
        <li
          v-for="item in displayItems"
          :key="item.id"
          class="notify-list__item group relative flex gap-4 rounded-lg bg-msg-card p-4 transition-colors hover:bg-msg-card-hover"
        >
          <div class="notify-list__indicator mt-2 h-2 w-2 shrink-0 rounded-full" :class="item.is_read ? 'bg-msg-muted' : 'bg-msg-pink'" />
          <div class="notify-list__body min-w-0 flex-1">
            <div class="notify-list__head mb-1 flex items-center gap-2">
              <span class="notify-list__title truncate text-sm font-bold text-msg-text-active">{{ item.title }}</span>
              <el-tag v-if="item.level !== 'normal'" :type="levelTagType(item.level)" size="default" effect="dark" round>
                {{ levelText(item.level) }}
              </el-tag>
            </div>
            <p class="notify-list__summary whitespace-pre-wrap text-sm leading-6 text-msg-muted">
              <template v-for="(seg, idx) in renderSegments(item.content)" :key="idx">
                <a
                  v-if="seg.url"
                  :href="seg.url"
                  target="_blank"
                  rel="noopener"
                  class="notify-list__inline-link font-medium text-primary hover:underline"
                  @click="onInlineLink($event, seg.url)"
                >{{ seg.text }}</a>
                <template v-else>{{ seg.text }}</template>
              </template>
            </p>
            <div class="notify-list__meta mt-2 flex items-center gap-4 text-xs text-msg-muted">
              <TimeText :time="item.publish_at" />
            </div>
          </div>
          <div class="notify-list__actions flex shrink-0 flex-col items-end justify-between gap-2">
            <el-button
              v-if="!item.is_read"
              link
              type="primary"
              size="default"
              class="notify-list__read-btn"
              @click="markItemRead(item.id)"
            >
              {{ t('message.markRead') }}
            </el-button>
            <el-button
              v-if="item.jump_url && !hasInlineLink(item.content)"
              type="primary"
              size="default"
              class="notify-list__jump-btn"
              @click="openJump(item)"
            >
              {{ t('message.viewOriginal') }}
            </el-button>
          </div>
        </li>
      </ul>

      <PaginationBar
        v-if="total > pageSize"
        class="notify-list__pagination mt-4"
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
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import biliMessage from '@/utils/message'
import {
  fetchNotifyList,
  markNotifyRead,
  type NotifyItem,
  type NotifyLevel
} from '@/api/notify/message-api'

const { t } = useI18n()
import LoadingWrap from '@/components/message/LoadingWrap.vue'
import EmptyState from '@/components/message/EmptyState.vue'
import PaginationBar from '@/components/message/PaginationBar.vue'
import TimeText from '@/components/message/TimeText.vue'

// 供 MessageLayout 的 <keep-alive> 缓存本页（切走再切回时保留列表与滚动位置）
defineOptions({ name: 'NotifyListView' })

// 未读数由父层（MessageLayout）经 msg_feed/unread 统一拉取一次后通过 v-model 下发
const notifyUnread = defineModel<number>('notifyUnread', { default: 0 })
const emit = defineEmits<{ refreshUnread: [] }>()
const router = useRouter()

const items = ref<NotifyItem[]>([])
const loading = ref(false)
const total = ref(0)
const page = ref(1)
const pageSize = 20
const onlyUnread = ref(false)

const displayItems = computed(() => items.value)
const unreadCount = computed(() => notifyUnread.value)

async function load() {
  loading.value = true
  const list = await fetchNotifyList({
    page: page.value,
    size: pageSize,
    only_unread: onlyUnread.value || undefined
  })
  items.value = list.items
  total.value = list.total
  loading.value = false
}

function onFilterChange() {
  page.value = 1
  load()
}

function onPageChange(p: number) {
  page.value = p
  load()
}

async function markItemRead(id: number) {
  const resp = await markNotifyRead([id])
  if (!resp || (resp.affected ?? 0) <= 0) return
  const item = items.value.find((i) => i.id === id)
  if (item) item.is_read = true
  emit('refreshUnread')
  biliMessage.success(t('message.markedRead'))
}

async function markAllRead() {
  // 全部已读：不传 ids，由后端标记当前用户全部可见通知为已读（支持跨页）
  const resp = await markNotifyRead()
  if (!resp || (resp.affected ?? 0) <= 0) return
  items.value.forEach((i) => (i.is_read = true))
  emit('refreshUnread')
  biliMessage.success(t('message.markAllRead'))
}

/** 点「查看原文」：站内路径走路由，外链（B 站动态 / 专栏）新开标签页。 */
function openJump(item: NotifyItem) {
  if (!item.jump_url) return
  if (!item.is_read) markItemRead(item.id)
  if (/^https?:\/\//.test(item.jump_url)) {
    window.open(item.jump_url, '_blank', 'noopener')
  } else {
    router.push(item.jump_url)
  }
}

/** 通知正文里 #{文本}{"url"} 的内联链接 —— 与 B 站 system_notify 同构。
 *
 *  返回的段落里 url 为空的是纯文本片段；带 url 的是可点击的链接片段，
 *  Vue 模板按顺序遍历渲染即可。
 */
const INLINE_LINK_RE = /#\{([^{}]*?)\}\{"((?:https?:\/\/[^"\s]+|\/app\/\S+))"\}/g

function renderSegments(content: string): Array<{ text: string; url: string | null }> {
  if (!content) return []
  const segs: Array<{ text: string; url: string | null }> = []
  let lastIndex = 0
  let m: RegExpExecArray | null
  while ((m = INLINE_LINK_RE.exec(content)) !== null) {
    if (m.index > lastIndex) {
      segs.push({ text: content.slice(lastIndex, m.index), url: null })
    }
    segs.push({ text: m[1], url: m[2] })
    lastIndex = m.index + m[0].length
  }
  if (lastIndex < content.length) {
    segs.push({ text: content.slice(lastIndex), url: null })
  }
  return segs
}

function hasInlineLink(content: string): boolean {
  // 重新构造一份正则，避免与 renderSegments 共享 lastIndex 状态导致漏判
  return new RegExp(INLINE_LINK_RE.source).test(content)
}

/** 正文中点击内联链接：站内路径走路由，外链交给浏览器新开标签。 */
function onInlineLink(ev: MouseEvent, url: string) {
  // 让原生 href 仍然兜底（防止 JS 异常时无响应），但站内跳转走 SPA 路由更顺滑
  if (!/^https?:\/\//.test(url)) {
    ev.preventDefault()
    router.push(url)
  }
}

function levelTagType(level: NotifyLevel) {
  if (level === 'urgent') return 'danger'
  if (level === 'important') return 'warning'
  return 'info'
}

function levelText(level: NotifyLevel) {
  if (level === 'urgent') return t('message.levelUrgent')
  if (level === 'important') return t('message.levelImportant')
  return t('message.levelNormal')
}

onMounted(load)
</script>
