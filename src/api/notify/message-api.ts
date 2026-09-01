/**
 * 消息系统统一 API 封装层。
 *
 * 仅在此处直接调用 hey-api 生成的 SDK（`@/api/community/hey-api`），
 * 业务组件统一调用本文件的封装函数，便于统一错误处理、类型收敛与未读联动。
 *
 * 注意：be-message-service 的鉴权依赖上游 nodejs-pptr 网关注入的 x-bili-* 头，
 * SDK 将其声明为必填 header；生产中由网关覆盖真实值，这里仅提供占位以满足类型。
 */
import {
  MessageNotifyService,
  MessageService,
  MessageEventService,
  MessageDmService,
  MessageSettingService,
  EventTypeEnum,
  NotifyLevelEnum,
  NotifyStatusEnum,
  NotifyTargetTypeEnum,
  DmRelationEnum,
  DmMsgTypeEnum,
  DmMsgStatusEnum,
  DmAuditStateEnum
} from '@/api/community/hey-api'

// ---------------------------------------------------------------------------
// 前端类型（与后端 NotifyItem / NotifyAdminItem 对齐；SDK 的 data 被推断为 unknown）
// ---------------------------------------------------------------------------
// 所有响应类型均从生成的 hey-api SDK 导入，不再手写。
// 对外暴露的旧类型名以别名形式重导出，避免改动各消费组件。
import { request, authHeaders } from '@/api/http'
import type { RequestOptions } from '@/api/http'
import type {
  NotifyItem,
  NotifyAdminItem,
  NotifyListResp,
  NotifyAdminListResp,
  NotifyCreateReq,
  NotifyUpdateReq,
  EventUnreadResp,
  UserActivityResp,
  SourceTypeEnum,
  EventListResp,
  EventReadResp,
  DmSessionItem,
  DmSessionListResp,
  DmMessageItem,
  DmMessageListResp,
  MessageSettingResp,
  MessageSettingUpdateReq,
  EventMsgfeedItem,
  EventMsgfeedSection,
  EventUserBrief,
  DmRelationEnum as DmRelation
} from '@/api/community/hey-api'
// 对外兼容别名（实现全部来自 SDK；本地 import 后再别名导出，模块内部方可直接使用）
export type UnreadSummary = EventUnreadResp
/**
 * 事件类型：直接复用 SDK 生成的 EventTypeEnum（数字枚举，like=1, reply=2, at=3 ...）。
 * 业务组件统一通过 EventTypeEnum.LIKE 等方式传入，无需在本层再做字符串/数字转换。
 */
export type EventType = EventTypeEnum
/**
 * 重新导出 SDK 的枚举**值**，供业务组件以 `XxxEnum.XXX` 比较 / 赋值。
 *
 * 后端枚举一律是 `IntEnum`，对外序列化为**整数**（如 NotifyLevel.NORMAL=1），
 * 因此业务侧禁止再用 `'normal'` / `'published'` 之类的字符串字面量比较——
 * 那样既过不了类型检查，运行时也永远匹配不上。
 */
export {
  EventTypeEnum,
  NotifyLevelEnum,
  NotifyStatusEnum,
  NotifyTargetTypeEnum,
  DmRelationEnum,
  DmMsgTypeEnum,
  DmMsgStatusEnum,
  DmAuditStateEnum
}
export type SourceType = SourceTypeEnum
export type NotifyTargetType = NotifyTargetTypeEnum
export type CreateNotifyPayload = NotifyCreateReq
export type UpdateNotifyPayload = NotifyUpdateReq
export type MessageSettingPartial = MessageSettingUpdateReq
export type EventFeedItem = EventMsgfeedItem
export type EventFeedSection = EventMsgfeedSection
export type EventFeedUser = EventUserBrief
// 与局部 import 同名，保持原 re-export 形式（re-export 不创建局部绑定，与 import 块不冲突）
export type {
  NotifyItem,
  NotifyAdminItem,
  NotifyListResp,
  NotifyAdminListResp
} from '@/api/community/hey-api'

// 内部使用的小类型别名（枚举字面量联合）
export type NotifyLevel = NotifyLevelEnum
export type NotifyStatus = NotifyStatusEnum
export type UserActivity = UserActivityResp

// 消费组件直接使用的其余 SDK 类型（与局部 import 同名，re-export 不创建局部绑定、不冲突）
export type {
  DmMessageItem,
  DmMessageListResp,
  DmSessionItem,
  DmSessionListResp,
  MessageSettingResp,
  MessageSettingUpdateReq,
  EventListResp,
  EventReadResp,
  EventUnreadResp,
  UserActivityResp
} from '@/api/community/hey-api'

// ---------------------------------------------------------------------------
// 用户侧：通知列表 / 未读 / 删除
//
// 后端「读取即已读」：`/notify/list` 返回前已把本页通知置为已读，
// 前端不再（也无法）单独调用标记已读接口。出参 is_read 是读取前的快照，
// 用于高亮「本次新到」。
// ---------------------------------------------------------------------------
export async function fetchNotifyList(
  params: {
    page?: number
    size?: number
  } = {}
): Promise<NotifyListResp> {
  return request<NotifyListResp>(
    () =>
      MessageNotifyService.listNotifyApiV1MessageNotifyListGet({
        query: {
          page_num: params.page ?? 1,
          page_size: params.size ?? 20
        }
      }),
    { items: [], total: 0, page_num: 1, page_size: params.size ?? 20 }
  )
}

export async function fetchNotifyUnread(): Promise<number> {
  return request<number>(() => MessageNotifyService.unreadNotifyApiV1MessageNotifyUnreadGet({}), 0)
}

export async function deleteNotify(ids: number[], options?: RequestOptions): Promise<number> {
  return request<number>(
    () =>
      MessageNotifyService.deleteNotifyApiV1MessageNotifyDeletePost({
        body: { notify_ids: ids }
      }),
    0,
    options
  )
}

// ---------------------------------------------------------------------------
// 管理员侧：列表 / 发布 / 修改 / 撤回
// ---------------------------------------------------------------------------
export async function fetchAdminNotifyList(
  params: {
    page?: number
    size?: number
  } = {}
): Promise<NotifyAdminListResp> {
  return request<NotifyAdminListResp>(
    () =>
      MessageNotifyService.adminListNotifyApiV1MessageNotifyAdminListGet({
        query: { page_num: params.page ?? 1, page_size: params.size ?? 20 }
      }),
    { items: [], total: 0, page_num: 1, page_size: params.size ?? 20 }
  )
}

export async function createNotify(
  payload: CreateNotifyPayload,
  options?: RequestOptions
): Promise<NotifyAdminItem | null> {
  return request<NotifyAdminItem | null>(
    () =>
      MessageNotifyService.createNotifyApiV1MessageNotifyAdminCreatePost({
        body: {
          title: payload.title,
          content: payload.content,
          jump_url: payload.jump_url ?? null,
          target_type: payload.target_type ?? NotifyTargetTypeEnum.ALL,
          target_value: payload.target_value ?? null,
          level: payload.level ?? NotifyLevelEnum.NORMAL,
          publish_now: payload.publish_now ?? true
        }
      }),
    null
  )
}

export async function updateNotify(
  id: number,
  payload: UpdateNotifyPayload,
  options?: RequestOptions
): Promise<NotifyAdminItem | null> {
  return request<NotifyAdminItem | null>(
    () =>
      MessageNotifyService.updateNotifyApiV1MessageNotifyAdminUpdateNotifyIdPost({
        path: { notify_id: id },
        body: {
          title: payload.title ?? null,
          content: payload.content ?? null,
          jump_url: payload.jump_url ?? null,
          target_type: payload.target_type ?? null,
          target_value: payload.target_value ?? null,
          level: payload.level ?? null,
          status: payload.status ?? null
        }
      }),
    null
  )
}

export async function revokeNotify(id: number, options?: RequestOptions): Promise<boolean> {
  return request<boolean>(
    () =>
      MessageNotifyService.revokeNotifyApiV1MessageNotifyAdminRevokeNotifyIdPost({
        path: { notify_id: id }
      }),
    false,
    options
  )
}

// ---------------------------------------------------------------------------
// 消息流（msg_feed）：跨模块未读汇总 + 活跃心跳
// ---------------------------------------------------------------------------
export async function fetchUnreadSummary(): Promise<UnreadSummary | null> {
  return request<UnreadSummary | null>(
    () => MessageService.unreadSummaryApiV1MessageMsgFeedUnreadGet({}),
    null
  )
}

export async function sendHeartbeat(): Promise<UserActivity | null> {
  return request<UserActivity | null>(
    () => MessageService.heartbeatApiV1MessageMsgFeedHeartbeatPost({}),
    null
  )
}

// ---------------------------------------------------------------------------
// 互动提醒（like / reply / at）
// ---------------------------------------------------------------------------
export async function fetchEventList(params: {
  event_type: EventType
  /** 翻页游标：上一页 total.cursor.id */
  cursor_id?: number | null
  size?: number
  only_unread?: boolean
}): Promise<EventListResp> {
  return request<EventListResp>(
    () =>
      MessageEventService.listEventApiV1MessageEventListGet({
        query: {
          event_type: params.event_type,
          cursor_id: params.cursor_id ?? null,
          page_size: params.size ?? 20,
          only_unread: params.only_unread
        }
      }),
    {
      latest: { cursor: { is_end: true, id: null, time: null }, items: [] },
      total: { cursor: { is_end: true, id: null, time: null }, items: [] }
    }
  )
}

export async function markEventRead(
  params: {
    event_ids?: number[]
    event_type?: EventType
    source_type?: SourceType
    source_id?: string
  },
  options?: RequestOptions
): Promise<EventReadResp> {
  return request<EventReadResp>(
    () =>
      MessageEventService.readEventApiV1MessageEventReadPost({
        body: {
          event_ids: params.event_ids,
          event_type: params.event_type ?? null,
          source_type: params.source_type ?? null,
          source_id: params.source_id ?? null
        }
      }),
    { affected: 0, unread_count: 0 },
    options
  )
}

export async function deleteEvent(ids: number[]): Promise<number> {
  return request<number>(
    () =>
      MessageEventService.deleteEventApiV1MessageEventDeletePost({
        body: { event_ids: ids }
      }),
    0
  )
}

// ---------------------------------------------------------------------------
// 私信会话
// ---------------------------------------------------------------------------
export async function fetchDmSessions(
  params: {
    page?: number
    size?: number
    /** 会话关系筛选：直接传 `DmRelationEnum.NORMAL` / `DmRelationEnum.STRANGER` */
    relation?: DmRelation
  } = {}
): Promise<DmSessionListResp> {
  return request<DmSessionListResp>(
    () =>
      MessageDmService.listSessionsApiV1MessageDmSessionsGet({
        query: {
          relation: params.relation ?? null,
          page_num: params.page ?? 1,
          page_size: params.size ?? 20
        }
      }),
    { items: [], total: 0, unread_total: 0, stranger_unread: 0 }
  )
}

export async function fetchDmMessages(params: {
  /** 雪花 ID：支持 number 或 str 传参（后端 StrInt 兼容） */
  talker_mid: number | string
  cursor?: string | null
  size?: number
}): Promise<DmMessageListResp> {
  return request<DmMessageListResp>(
    () =>
      MessageDmService.listMessagesApiV1MessageDmMessagesGet({
        query: {
          talker_mid: params.talker_mid,
          cursor: params.cursor ?? null,
          page_size: params.size ?? 20
        }
      }),
    { items: [], cursor: null, has_more: false }
  )
}

export async function sendDm(payload: {
  /** 雪花 ID：支持 number 或 str 传参（后端 StrInt 兼容） */
  receiver_mid: number | string
  content: string
  msg_type?: DmMsgTypeEnum
}): Promise<boolean> {
  return request<boolean>(
    () =>
      MessageDmService.sendDmApiV1MessageDmSendPost({
        body: {
          receiver_mid: payload.receiver_mid,
          content: payload.content,
          msg_type: payload.msg_type ?? DmMsgTypeEnum.TEXT,
          receiver_name: null,
          receiver_avatar: null
        }
      }),
    false
  )
}

// 标记某会话已读（未读清零 + 抬高已读水位）。打开私信会话时调用，用于同步后端消掉红点。
// ack_msgkey 不传时后端自动抬到 last_msgkey（即全部已读）。
export async function ackDmSession(params: {
  talker_mid: number | string
  ack_msgkey?: string | null
}): Promise<boolean> {
  return request<boolean>(
    () =>
      MessageDmService.ackSessionApiV1MessageDmAckPost({
        body: {
          talker_mid: params.talker_mid,
          ack_msgkey: params.ack_msgkey ?? null
        }
      }),
    false
  )
}

// ---------------------------------------------------------------------------
// 消息设置
// ---------------------------------------------------------------------------
export async function fetchMessageSetting(): Promise<MessageSettingResp | null> {
  return request<MessageSettingResp | null>(
    () => MessageSettingService.getSettingApiV1MessageSettingGet({}),
    null
  )
}

export async function updateMessageSetting(
  payload: MessageSettingPartial,
  options?: RequestOptions
): Promise<MessageSettingResp | null> {
  return request<MessageSettingResp | null>(
    () =>
      MessageSettingService.updateSettingApiV1MessageSettingUpdatePost({
        body: {
          recv_like: payload.recv_like ?? null,
          recv_reply: payload.recv_reply ?? null,
          recv_at: payload.recv_at ?? null,
          recv_stranger_dm: payload.recv_stranger_dm ?? null,
          recv_notify: payload.recv_notify ?? null,
          push_enabled: payload.push_enabled ?? null,
          dnd_start_hour: payload.dnd_start_hour ?? null,
          dnd_end_hour: payload.dnd_end_hour ?? null
        }
      }),
    null,
    options
  )
}
