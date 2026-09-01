<template>
  <EventCardBase :item="item" :preview-text="commentDeleted ? t('message.commentDeleted') : replyText" @open="emit('open', item)">
    <template #body>
      <!-- 评论被删 / 未过审等非正常状态：展示占位文案（对齐知乎） -->
      <el-text
        v-if="commentDeleted"
        class="reply-event-card__deleted text-text-placeholder block text-sm"
        tag="p"
      >
        {{ t('message.commentDeleted') }}
      </el-text>
      <template v-else>
        <!-- 触发者回复内容（粗体大字，对齐 B 站主回复） -->
        <el-text
          v-if="replyText"
          class="reply-event-card__source text-text-primary block text-base font-medium"
          :line-clamp="2"
          tag="p"
        >
          {{ replyText }}
        </el-text>
        <!-- 被回复内容（楼中楼 / 根评论，带左侧竖线，对齐 B 站楼中楼） -->
        <div
          v-if="targetContent"
          class="reply-event-card__target border-fill-light mt-1 border-l-2 pl-2"
        >
          <el-text
            class="reply-event-card__target-text text-text-secondary block text-xs"
            :line-clamp="2"
            tag="p"
          >
            {{ targetContent }}
          </el-text>
        </div>
      </template>
    </template>
    <template #meta>
      <span
        class="reply-event-card__action hover:text-text-primary flex cursor-pointer items-center gap-1 transition-colors"
      >
        <component :is="commentIcon" class="reply-event-card__action-icon h-4 w-4" />
        <span>{{ t('message.eventReply') }}</span>
      </span>
      <span
        class="reply-event-card__action flex cursor-pointer items-center gap-1 transition-colors"
        :class="isLiked ? 'text-primary' : 'text-text-placeholder hover:text-text-primary'"
      >
        <component
          :is="isLiked ? likeActiveIcon : likeIcon"
          class="reply-event-card__action-icon h-4 w-4"
        />
        <span>{{ t('message.eventLike') }}</span>
      </span>
    </template>
  </EventCardBase>
</template>

<script setup lang="ts">
/**
 * 回复通知卡片（EventTypeEnum.REPLY = 2）。
 *
 * 继承 `EventCardBase`，复用骨架与动作文案（replyAction）：
 * 正文为「触发者写的回复」+「被回复的评论」（楼中楼 / 根评论均展示，提供上下文），
 * 底部为回复 / 点赞互动按钮，右侧预览取触发者的回复正文。
 */
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import EventCardBase from './EventCardBase.vue'
import { useEventCard } from './useEventCard'
import commentIcon from '@/assets/svgs/dynamic/detail/side_toolbar/comment.svg?component'
import likeIcon from '@/assets/svgs/like.svg?component'
import likeActiveIcon from '@/assets/svgs/like_active.svg?component'
import type { EventFeedItem } from '@/api/notify/message-api'

defineOptions({ name: 'ReplyEventCard' })

const { t } = useI18n()
const props = defineProps<{ item: EventFeedItem }>()
const emit = defineEmits<{ open: [EventFeedItem] }>()

const { sourceContent, targetContent, desc } = useEventCard(props)

/**
 * 触发者回复正文：优先 `item.source_content`（后端按评论 rpid 实时回捞）。
 *
 * 后端已不再把评论正文快照进事件表（desc 为空）；评论处于非正常状态
 * （被删 / 未过审）时后端下发 `comment_deleted=true`，本卡片整体切换为
 * 「该评论已被删除」占位，正文不再展示。此处 `desc` 仅作兜底（历史数据）。
 */
const replyText = computed(() => sourceContent.value || desc.value)

/** 评论是否处于非正常状态（被删 / 未过审 / 驳回 / 下架 / 待审） */
const commentDeleted = computed(() => !!props.item?.item?.comment_deleted)

// 点赞态不再随事件冗余下发（按 mid 走评论交互独立接口获取），此处不展示高亮
const isLiked = computed(() => false)
</script>
