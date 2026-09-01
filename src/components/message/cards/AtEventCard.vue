<template>
  <EventCardBase :item="item" @open="emit('open', item)">
    <template #body>
      <el-text
        v-if="content"
        class="at-event-card__content text-text-regular block text-sm md:hidden"
        :line-clamp="2"
        tag="p"
      >
        {{ content }}
      </el-text>
    </template>
    <template #meta>
      <el-text
        v-if="sourceText"
        class="at-event-card__source text-text-placeholder truncate text-xs"
        tag="span"
      >
        {{ sourceText }}
      </el-text>
    </template>
  </EventCardBase>
</template>

<script setup lang="ts">
/**
 * @ 我的通知卡片（EventTypeEnum.AT = 3）。
 *
 * 继承 `EventCardBase`：动作文案（atAction）由基类按 EventTypeEnum 查表下发，
 * 正文显示被 @ 的原资源标题，底部显示来源业务。
 */
import EventCardBase from './EventCardBase.vue'
import { useEventCard } from './useEventCard'
import type { EventFeedItem } from '@/api/notify/message-api'

defineOptions({ name: 'AtEventCard' })

const props = defineProps<{ item: EventFeedItem }>()
const emit = defineEmits<{ open: [EventFeedItem] }>()

const { content, sourceText } = useEventCard(props)
</script>
