<template>
  <EventCardBase
    :item="item"
    :action-text="defaultActionText"
    :preview-text="title"
    @open="emit('open', item)"
  >
    <template #body>
      <!-- 系统处置说明（驳回原因 / 下架说明 / 举报结论），带语义图标与语义色 -->
      <div
        class="system-event-card__reason bg-fill-light mt-0.5 flex items-start gap-1.5 rounded px-2 py-1.5"
        :class="toneClass"
      >
        <component :is="icon" class="system-event-card__icon mt-0.5 h-4 w-4 shrink-0" />
        <el-text class="system-event-card__text block text-xs" :line-clamp="2" tag="p">
          {{ reason }}
        </el-text>
      </div>
    </template>
    <template #meta>
      <el-text
        v-if="sourceText"
        class="system-event-card__source text-text-placeholder truncate text-xs"
        tag="span"
      >
        {{ sourceText }}
      </el-text>
    </template>
  </EventCardBase>
</template>

<script setup lang="ts">
/**
 * 系统处置类通知卡片「二级基类」。
 *
 * 覆盖 InteractionActionTypeEnum.AUDIT_REJECT / HIDE / REPORT_REJECT / REPORT_RESOLVED
 * 这四类**无互动按钮、以处置说明为核心**的通知：它们结构完全一致，
 * 仅在「语义图标 / 语义色」上不同，因此再抽一层基类，继承者只声明这两个属性即可
 * （对齐后端「基类 → 中间基类 → 具体子类」的继承链）。
 *
 * 动作文案沿用基类按 InteractionActionTypeEnum 查表的 `defaultActionText`
 * （yyy 由基类按 `resource_type` 推导），继承者无需重复声明。
 *
 * 处置说明取 `item.desc`（后端事件正文，如审核驳回原因 / 下架说明 / 举报结论），
 * 右侧预览取原资源标题（`item.title`），避免与正文重复。
 */
import type { Component } from 'vue'
import EventCardBase from './EventCardBase.vue'
import { useEventCard } from './useEventCard'
import type { EventFeedItem } from '@/api/notify/message-api'

const props = defineProps<{
  item: EventFeedItem
  /** 语义图标（由继承者按 InteractionActionTypeEnum 声明，取自 `src/assets/svgs/`） */
  icon: Component
  /** 语义色 class（由继承者按 InteractionActionTypeEnum 声明，如 `text-danger`） */
  toneClass?: string
}>()
const emit = defineEmits<{ open: [EventFeedItem] }>()

const { title, desc, sourceText, defaultActionText } = useEventCard(props)

/** 处置说明：事件正文（驳回原因 / 下架说明 / 举报结论） */
const reason = desc
</script>
