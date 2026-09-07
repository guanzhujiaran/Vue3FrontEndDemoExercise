<template>
  <EventCardBase :item="item" :action-text="actionText" @open="emit('open', item)">
    <template #body>
      <el-text
        v-if="displayContent"
        class="like-event-card__content text-text-regular block text-sm md:hidden"
        :line-clamp="2"
        tag="p"
      >
        {{ displayContent }}
      </el-text>
    </template>
    <template #meta>
      <el-text
        v-if="sourceText"
        class="like-event-card__source text-text-placeholder truncate text-xs"
        tag="span"
      >
        {{ sourceText }}
      </el-text>
    </template>
  </EventCardBase>
</template>

<script setup lang="ts">
/**
 * 点赞通知卡片（InteractionActionTypeEnum.LIKE = 1）。
 *
 * 继承 `EventCardBase`：正文显示被赞内容 `source_content`（被赞的评论 / 动态正文），缺省回落原资源标题，底部显示来源业务；
 * 差异仅在多人聚合时把总人数并入动作文案（「等总计N人赞了我的{yyy}」）。
 */
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import EventCardBase from './EventCardBase.vue'
import { useEventCard } from './useEventCard'
import type { EventFeedItem } from '@/api/notify/message-api'

defineOptions({ name: 'LikeEventCard' })

const { t } = useI18n()
const props = defineProps<{ item: EventFeedItem }>()
const emit = defineEmits<{ open: [EventFeedItem] }>()

const { totalCount, targetName, sourceContent, title, sourceText } = useEventCard(props)

/** 卡片正文：优先被互动内容 source_content（被赞的评论 / 动态正文），缺省回落原资源标题 */
const displayContent = computed(() => sourceContent.value || title.value)

/**
 * 动作文案：单人「赞了我的{yyy}」；
 * 多人聚合改为「等总计N人赞了我的{yyy}」（总人数由文案承担，避免与头像堆叠重复计数）。
 * yyy 由基类按 `resource_type` 推导（动态 / 抽奖 / 评论 …）。
 */
const actionText = computed(() =>
  totalCount.value > 1
    ? t('message.likeMultiple', { count: totalCount.value, target: targetName.value })
    : t('message.likeAction', { target: targetName.value })
)
</script>
