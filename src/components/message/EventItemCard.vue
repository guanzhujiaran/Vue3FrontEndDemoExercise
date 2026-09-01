<template>
  <component :is="cardComponent" :item="item" @open="emit('open', $event)" />
</template>

<script setup lang="ts">
/**
 * 互动通知条目（对外统一入口）。
 *
 * 本身不渲染任何业务内容，只按后端下发的 `item.item.type`（EventTypeEnum）
 * 经 `getEventCard` 工厂分发到对应的业务卡片组件，保持对外 props / emits 契约不变。
 */
import { computed } from 'vue'
import { getEventCard } from '@/components/message/cards'
import type { EventFeedItem } from '@/api/notify/message-api'

const props = defineProps<{ item: EventFeedItem }>()
const emit = defineEmits<{ open: [EventFeedItem] }>()

/** 按 EventTypeEnum 分发的卡片组件 */
const cardComponent = computed(() => getEventCard(props.item?.item?.type))
</script>
