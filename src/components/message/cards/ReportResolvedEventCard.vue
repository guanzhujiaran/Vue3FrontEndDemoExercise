<template>
  <SystemEventCardBase
    :item="item"
    :icon="reportResolvedIcon"
    tone-class="text-success"
    @open="emit('open', item)"
  />
</template>

<script setup lang="ts">
/**
 * 举报已处理通知卡片（InteractionActionTypeEnum.REPORT_RESOLVED = 7）。
 *
 * 继承 `SystemEventCardBase`：动作文案由基类按 InteractionActionTypeEnum 查表
 * （针对举报本身，不含资源名），本类只声明语义图标与语义色（success）。
 */
import SystemEventCardBase from './SystemEventCardBase.vue'
import reportResolvedIcon from '@/assets/svgs/space/check.svg?component'
import type { EventFeedItem } from '@/api/notify/message-api'

defineOptions({ name: 'ReportResolvedEventCard' })

defineProps<{ item: EventFeedItem }>()
const emit = defineEmits<{ open: [EventFeedItem] }>()
</script>
