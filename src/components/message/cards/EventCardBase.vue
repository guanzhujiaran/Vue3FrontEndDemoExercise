<template>
  <div
    class="event-card group bg-bg-overlay hover:bg-fill-light relative flex cursor-pointer gap-3 rounded-lg p-4 transition-colors"
    @click="emit('open', props.item)"
  >
    <!-- 左侧：最多 2 个头像堆叠（对齐 B 站 msgfeed 样式） -->
    <div class="event-card__avatars relative h-12 w-12 shrink-0">
      <img
        v-for="(u, idx) in showUsers"
        :key="u.mid ?? idx"
        class="event-card__avatar border-bg-overlay absolute rounded-full border-2 object-cover"
        :class="idx === 0 ? 'top-0 left-0 z-10 h-10 w-10' : 'top-5 left-5 z-20 h-7 w-7'"
        :src="u.avatar || BiliImg.face.noface"
        :alt="u.nickname || 'avatar'"
        referrerpolicy="no-referrer"
      />
    </div>

    <div class="event-card__body min-w-0 flex-1">
      <!-- 头部：触发者 + 动作（动作文案由继承者按 EventTypeEnum 覆盖） -->
      <div class="event-card__head mb-1 flex items-center gap-2 text-sm">
        <span class="event-card__name text-text-primary shrink-0 font-medium">{{ actorText }}</span>
        <span class="event-card__action text-text-placeholder truncate">
          <slot name="action">{{ headAction }}</slot>
        </span>
      </div>

      <!-- 正文：由继承者按 EventTypeEnum 填充 -->
      <slot name="body" />

      <!-- 底部：时间 + 继承者扩展的元信息 / 互动按钮 -->
      <div class="event-card__meta text-text-placeholder mt-2 flex items-center gap-4 text-xs">
        <TimeText :time="timeDisplay" />
        <slot name="meta" />
      </div>
    </div>

    <!-- 右侧：内容预览 + 封面（预览文案可由继承者覆盖，如 reply 取评论正文） -->
    <div class="event-card__right hidden shrink-0 flex-col items-end gap-2 md:flex">
      <slot name="right">
        <el-text
          v-if="rightPreview"
          class="event-card__preview text-text-placeholder max-w-56 text-right text-xs"
          :line-clamp="2"
          tag="p"
        >
          {{ rightPreview }}
        </el-text>
        <img
          v-if="coverUrl"
          class="event-card__cover h-14 w-24 rounded object-cover"
          :src="coverUrl"
          alt="cover"
          referrerpolicy="no-referrer"
        />
      </slot>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * 互动通知卡片「抽象基类」——统一骨架（模板方法模式）。
 *
 * 只负责三件事：
 * 1. 渲染所有 EventTypeEnum 共用的骨架（头像堆叠 / 头部 / 底部时间栏 / 右侧预览）；
 * 2. 经 `useEventCard` 集中推导公共字段；
 * 3. 暴露 `action` / `body` / `meta` / `right` 四个插槽供继承者填充差异部分。
 *
 * 继承者（如 `LikeEventCard.vue`）只需声明 `item`、按需覆盖 `action-text` /
 * `preview-text`，并在插槽里写自己的 EventTypeEnum 专属内容。
 */
import { computed } from 'vue'
import TimeText from '@/components/message/TimeText.vue'
import { BiliImg } from '@/assets/img/BiliImg.ts'
import { useEventCard } from './useEventCard'
import type { EventFeedItem } from '@/api/notify/message-api'

const props = defineProps<{
  item: EventFeedItem
  /** 动作文案覆盖（不传时按 EventTypeEnum 查默认表） */
  actionText?: string
  /** 右侧预览文案覆盖（不传时取原资源标题 / 事件正文） */
  previewText?: string
}>()
const emit = defineEmits<{ open: [EventFeedItem] }>()

const { showUsers, actorText, defaultActionText, content, coverUrl, timeDisplay } =
  useEventCard(props)

/** 头部动作文案：继承者覆盖优先，回落按 EventTypeEnum 查表 */
const headAction = computed(() => props.actionText ?? defaultActionText.value)

/** 右侧预览文案：继承者覆盖优先，回落原资源标题 / 事件正文 */
const rightPreview = computed(() => props.previewText ?? content.value)
</script>
