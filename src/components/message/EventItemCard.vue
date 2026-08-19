<template>
  <div
    class="event-item-card group relative flex cursor-pointer gap-3 rounded-lg bg-msg-card p-4 transition-colors hover:bg-msg-card-hover"
    @click="openDetail"
  >
    <!-- 左侧：最多 2 个头像堆叠（对齐 B 站 msgfeed 样式） -->
    <div class="event-item-card__avatars relative h-12 w-12 shrink-0">
      <img
        v-for="(u, idx) in showUsers"
        :key="u.mid ?? idx"
        class="event-item-card__avatar absolute rounded-full border-2 border-msg-card object-cover"
        :class="idx === 0 ? 'h-10 w-10 left-0 top-0 z-10' : 'h-7 w-7 left-5 top-5 z-20'"
        :src="u.avatar || BiliImg.face.noface"
        :alt="u.nickname || 'avatar'"
        referrerpolicy="no-referrer"
      />
    </div>

    <div class="event-item-card__body min-w-0 flex-1">
      <div class="event-item-card__head mb-1 flex items-center gap-2 text-sm">
        <span class="event-item-card__name shrink-0 font-medium text-msg-text-active">{{ actorText }}</span>
        <span class="event-item-card__action truncate text-msg-muted">{{ actionText }}</span>
      </div>
      <div class="event-item-card__meta flex items-center gap-3 text-xs text-msg-muted">
        <TimeText :time="props.item.like_time" />
        <span v-if="sourceText" class="event-item-card__source truncate">{{ sourceText }}</span>
      </div>
    </div>

    <!-- 右侧：内容预览（评论摘要 / 动态标题）+ 视频封面 -->
    <div class="event-item-card__right hidden shrink-0 flex-col items-end gap-2 md:flex">
      <p v-if="previewText" class="event-item-card__preview line-clamp-2 max-w-56 text-right text-xs text-msg-muted">
        {{ previewText }}
      </p>
      <img
        v-if="coverUrl"
        class="event-item-card__cover h-14 w-24 rounded object-cover"
        :src="coverUrl"
        alt="cover"
        referrerpolicy="no-referrer"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import TimeText from '@/components/message/TimeText.vue'
import { BiliImg } from '@/assets/img/BiliImg.ts'
import type { EventFeedItem, EventFeedUser, EventType } from '@/api/notify/message-api'

const { t } = useI18n()
const props = defineProps<{ item: EventFeedItem }>()
const emit = defineEmits<{ open: [EventFeedItem] }>()

// 对齐 B 站：左侧最多展示 2 个头像堆叠
const MAX_AVATARS = 2

const showUsers = computed<EventFeedUser[]>(() => (props.item.users ?? []).slice(0, MAX_AVATARS))
const totalCount = computed(() => props.item.counts ?? props.item.users?.length ?? 0)

// 触发者文案：单人显示昵称；多人显示「用户A、用户B」，
// 总人数由 actionText（likeMultiple/replyMultiple 等）承担，避免重复"等N人"
const actorText = computed(() => {
  const users = props.item.users ?? []
  if (users.length === 0) return t('common.user')
  if (users.length === 1) return users[0].nickname || `${t('common.user')}${users[0].mid}`
  const names = users.slice(0, 2).map((u) => u.nickname || `${t('common.user')}${u.mid}`)
  return names.join('、')
})

const itemType = computed<EventType>(() => {
  const type = (props.item.item?.type || 'like') as EventType
  return ['like', 'reply', 'at'].includes(type) ? type : 'like'
})

const actionTextMap: Record<EventType, string> = {
  reply: t('message.replyAction'),
  at: t('message.atAction'),
  like: t('message.likeAction')
}

const actionText = computed(() => {
  if (itemType.value === 'like' && totalCount.value > 1) {
    return t('message.likeMultiple', { count: totalCount.value })
  }
  return actionTextMap[itemType.value]
})

const content = computed(() => props.item.item?.title || props.item.item?.desc || '')
const coverUrl = computed(() => props.item.item?.image || '')
const sourceText = computed(() => {
  if (!props.item.item?.business) return ''
  return `${t('message.sourcePrefix')}${props.item.item.business}`
})
const previewText = computed(() => content.value)

function openDetail() {
  emit('open', props.item)
}
</script>
