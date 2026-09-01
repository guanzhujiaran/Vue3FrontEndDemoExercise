<template>
  <SystemEventCardBase
    :item="item"
    :icon="rejectIcon"
    tone-class="text-danger"
    @open="emit('open', item)"
  />
</template>

<script setup lang="ts">
/**
 * 审核驳回通知卡片（EventTypeEnum.AUDIT_REJECT = 4）。
 *
 * 继承 `SystemEventCardBase`：动作文案由基类按 EventTypeEnum 查表
 * （「驳回了你的{yyy}」，yyy 由 `resource_type` 推导），
 * 本类只声明处置说明的语义图标与语义色（danger）。
 */
import SystemEventCardBase from './SystemEventCardBase.vue'
import rejectIcon from '@/assets/svgs/space/warning.svg?component'
import type { EventFeedItem } from '@/api/notify/message-api'

defineOptions({ name: 'AuditRejectEventCard' })

defineProps<{ item: EventFeedItem }>()
const emit = defineEmits<{ open: [EventFeedItem] }>()
</script>
