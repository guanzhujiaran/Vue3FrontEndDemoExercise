/**
 * 互动通知卡片工厂（对齐后端 `interaction_actions/factory.py::get_action`）。
 *
 * 集中维护「InteractionActionTypeEnum → 卡片组件」映射表：新增一种事件类型时，
 * 只需写一个继承 `EventCardBase` 的卡片组件并在此注册，分发层无需改动。
 */
import type { Component } from 'vue'
import { InteractionActionTypeEnum, type EventType } from '@/api/notify/message-api'
import LikeEventCard from './LikeEventCard.vue'
import ReplyEventCard from './ReplyEventCard.vue'
import AtEventCard from './AtEventCard.vue'
import AuditRejectEventCard from './AuditRejectEventCard.vue'
import HideEventCard from './HideEventCard.vue'
import ReportRejectEventCard from './ReportRejectEventCard.vue'
import ReportResolvedEventCard from './ReportResolvedEventCard.vue'

/** InteractionActionTypeEnum → 卡片组件（继承 `EventCardBase` 的具体子类） */
export const EVENT_CARD_TABLE: Partial<Record<EventType, Component>> = {
  [InteractionActionTypeEnum.LIKE]: LikeEventCard,
  [InteractionActionTypeEnum.REPLY]: ReplyEventCard,
  [InteractionActionTypeEnum.AT]: AtEventCard,
  [InteractionActionTypeEnum.AUDIT_REJECT]: AuditRejectEventCard,
  [InteractionActionTypeEnum.HIDE]: HideEventCard,
  [InteractionActionTypeEnum.REPORT_REJECT]: ReportRejectEventCard,
  [InteractionActionTypeEnum.REPORT_RESOLVED]: ReportResolvedEventCard
}

/**
 * 按事件类型返回对应的卡片组件。
 *
 * @param type 后端下发的 `item.type`（InteractionActionTypeEnum）；未知 / 缺省回落点赞卡片。
 */
export function getEventCard(type?: number | null): Component {
  if (type == null) return LikeEventCard
  return EVENT_CARD_TABLE[type as EventType] ?? LikeEventCard
}

export { default as EventCardBase } from './EventCardBase.vue'
export { default as SystemEventCardBase } from './SystemEventCardBase.vue'
export { default as LikeEventCard } from './LikeEventCard.vue'
export { default as ReplyEventCard } from './ReplyEventCard.vue'
export { default as AtEventCard } from './AtEventCard.vue'
export { default as AuditRejectEventCard } from './AuditRejectEventCard.vue'
export { default as HideEventCard } from './HideEventCard.vue'
export { default as ReportRejectEventCard } from './ReportRejectEventCard.vue'
export { default as ReportResolvedEventCard } from './ReportResolvedEventCard.vue'
export { useEventCard, MAX_EVENT_CARD_AVATARS } from './useEventCard'
