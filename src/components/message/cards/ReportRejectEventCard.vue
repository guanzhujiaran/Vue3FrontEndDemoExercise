<template>
  <SystemEventCardBase
    :item="item"
    :icon="reportRejectIcon"
    tone-class="text-text-secondary"
    @open="emit('open', item)"
  />
</template>

<script setup lang="ts">
/**
 * 举报未通过通知卡片（EventTypeEnum.REPORT_REJECT = 6）。
 *
 * 继承 `SystemEventCardBase`：动作文案由基类按 EventTypeEnum 查表
 * （针对举报本身，不含资源名），本类只声明语义图标与语义色（中性）。
 */
import SystemEventCardBase from './SystemEventCardBase.vue'
import reportRejectIcon from '@/assets/svgs/space/close_circle.svg?component'
import type { EventFeedItem } from '@/api/notify/message-api'

defineOptions({ name: 'ReportRejectEventCard' })

defineProps<{ item: EventFeedItem }>()
const emit = defineEmits<{ open: [EventFeedItem] }>()
</script>
