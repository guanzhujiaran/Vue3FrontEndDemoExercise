<template>
  <div
    class="event-item-card group relative flex cursor-pointer gap-4 rounded-lg bg-msg-card p-4 transition-colors hover:bg-msg-card-hover"
    @click="openDetail"
  >
    <img
      class="event-item-card__avatar h-11 w-11 shrink-0 rounded-full object-cover"
      :src="avatarUrl"
      alt="avatar"
    />
    <div class="event-item-card__body min-w-0 flex-1">
      <div class="event-item-card__head mb-1 flex items-center gap-2 text-sm">
        <span class="event-item-card__name truncate font-medium text-msg-text-active">{{ actorName }}</span>
        <span class="event-item-card__action shrink-0 text-msg-muted">{{ actionText }}</span>
      </div>
      <p v-if="content" class="event-item-card__content line-clamp-2 text-sm text-msg-text-active">
        {{ content }}
      </p>
      <div class="event-item-card__meta mt-2 flex items-center gap-4 text-xs text-msg-muted">
        <TimeText :time="item.created_at" />
        <span v-if="sourceText" class="event-item-card__source">{{ sourceText }}</span>
      </div>
      <div v-if="item.event_type === 'reply'" class="event-item-card__actions mt-3 flex items-center gap-4">
        <el-button link type="primary" size="default" class="event-item-card__reply-btn" @click.stop="emitReply">
          <el-icon class="mr-1"><ChatDotRound /></el-icon>
          回复
        </el-button>
        <el-button
          v-if="!item.is_read"
          link
          type="primary"
          size="default"
          class="event-item-card__like-btn"
          @click.stop="emitLike"
        >
          <el-icon class="mr-1"><Pointer /></el-icon>
          点赞
        </el-button>
      </div>
    </div>
    <div class="event-item-card__right hidden w-36 shrink-0 flex-col items-end justify-between text-right md:flex">
      <p class="event-item-card__preview line-clamp-3 text-xs text-msg-muted">
        {{ previewText }}
      </p>
      <img
        v-if="coverUrl"
        class="event-item-card__cover mt-2 h-16 w-28 rounded object-cover"
        :src="coverUrl"
        alt="cover"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { ChatDotRound, Pointer } from '@element-plus/icons-vue'
import TimeText from '@/components/message/TimeText.vue'
import type { EventItem, EventType, SourceType } from '@/api/notify/message-api'

const props = defineProps<{ item: EventItem }>()
const emit = defineEmits<{ reply: [EventItem]; like: [EventItem]; open: [EventItem] }>()

const avatarUrl = computed(() => props.item.actor_avatar || '/assets/noface.png')
const actorName = computed(() => props.item.actor_name || `用户${props.item.actor_mid}`)
const coverUrl = computed(() => props.item.source_cover || '')

const actionTextMap: Record<EventType, string> = {
  reply: '回复了我的评论',
  at: '@了我',
  like: '赞了我的评论'
}

const actionText = computed(() => {
  if (props.item.event_type === 'like' && props.item.count && props.item.count > 1) {
    return `等总计${props.item.count}人赞了我的评论`
  }
  const sourcePrefix = sourceLabel(props.item.source_type)
  const base = actionTextMap[props.item.event_type]
  return sourcePrefix ? `${sourcePrefix}中${base.replace('了我的评论', '我')}` : base
})

const content = computed(() => props.item.content || '')

const sourceText = computed(() => {
  if (!props.item.source_title) return ''
  return `来源：${props.item.source_title}`
})

const previewText = computed(() => {
  if (props.item.source_title) return props.item.source_title
  return content.value
})

function sourceLabel(s?: SourceType | null): string {
  const map: Record<SourceType, string> = {
    video: '视频',
    dynamic: '动态',
    article: '专栏',
    comment: '评论',
    lottery: '抽奖',
    other: '其他'
  }
  return s ? map[s] : ''
}

function emitReply() {
  emit('reply', props.item)
}
function emitLike() {
  emit('like', props.item)
}
function openDetail() {
  emit('open', props.item)
}
</script>
