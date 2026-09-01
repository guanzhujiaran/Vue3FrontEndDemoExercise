<template>
  <SystemEventCardBase
    :item="item"
    :icon="hideIcon"
    tone-class="text-warning"
    @open="emit('open', item)"
  />
</template>

<script setup lang="ts">
/**
 * 内容下架通知卡片（EventTypeEnum.HIDE = 5）。
 *
 * 继承 `SystemEventCardBase`：动作文案由基类按 EventTypeEnum 查表
 * （「下架了你的{yyy}」，yyy 由 `resource_type` 推导），
 * 本类只声明处置说明的语义图标与语义色（warning）。
 */
import SystemEventCardBase from './SystemEventCardBase.vue'
import hideIcon from '@/assets/svgs/space/eye_off.svg?component'
import type { EventFeedItem } from '@/api/notify/message-api'

defineOptions({ name: 'HideEventCard' })

defineProps<{ item: EventFeedItem }>()
const emit = defineEmits<{ open: [EventFeedItem] }>()
</script>
