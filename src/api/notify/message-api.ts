/**
 * 消息系统统一 API 封装层。
 *
 * 仅在此处直接调用 hey-api 生成的 SDK（`@/api/notify/hey-api`），
 * 业务组件统一调用本文件的封装函数，便于统一错误处理、类型收敛与未读联动。
 *
 * 注意：be-message-service 的鉴权依赖上游 nodejs-pptr 网关注入的 x-bili-* 头，
 * SDK 将其声明为必填 header；生产中由网关覆盖真实值，这里仅提供占位以满足类型。
 */
import {
  listNotifyApiV1MessageNotifyListGet,
  unreadNotifyApiV1MessageNotifyUnreadGet,
  readNotifyApiV1MessageNotifyReadPost,
  deleteNotifyApiV1MessageNotifyDeletePost,
  createNotifyApiV1MessageNotifyAdminCreatePost,
  updateNotifyApiV1MessageNotifyAdminUpdateNotifyIdPost,
  revokeNotifyApiV1MessageNotifyAdminRevokeNotifyIdPost,
  adminListNotifyApiV1MessageNotifyAdminListGet,
  unreadSummaryApiV1MessageMsgFeedUnreadGet,
  heartbeatApiV1MessageMsgFeedHeartbeatPost,
  listEventApiV1MessageEventListGet,
  readEventApiV1MessageEventReadPost,
  deleteEventApiV1MessageEventDeletePost,
  listSessionsApiV1MessageDmSessionsGet,
  listMessagesApiV1MessageDmMessagesGet,
  sendDmApiV1MessageDmSendPost,
  getSettingApiV1MessageSettingGet,
  updateSettingApiV1MessageSettingUpdatePost
} from '@/api/notify/hey-api'

// ---------------------------------------------------------------------------
// 前端类型（与后端 NotifyItem / NotifyAdminItem 对齐；SDK 的 data 被推断为 unknown）
// ---------------------------------------------------------------------------
// 所有响应类型均从生成的 hey-api SDK 导入，不再手写。
// 对外暴露的旧类型名以别名形式重导出，避免改动各消费组件。
import { request, authHeaders } from '@/api/http'
import type {
  NotifyLevelEnum,
  NotifyStatusEnum,
  NotifyTargetTypeEnum,
  NotifyItem,
  NotifyAdminItem,
  NotifyListResp,
  NotifyAdminListResp,
  NotifyReadResp,
  NotifyCreateReq,
  NotifyUpdateReq,
  EventUnreadResp,
  UserActivityResp,
  EventTypeEnum,
  SourceTypeEnum,
  EventItem,
  EventListResp,
  EventReadResp,
  DmSessionItem,
  DmSessionListResp,
  DmMsgTypeEnum,
  DmMessageItem,
  DmMessageListResp,
  MessageSettingResp,
  MessageSettingUpdateReq
} from '@/api/notify/hey-api'

// 对外兼容别名（实现全部来自 SDK）
export type { EventUnreadResp as UnreadSummary } from '@/api/notify/hey-api'
export type { EventTypeEnum as EventType } from '@/api/notify/hey-api'
export type { SourceTypeEnum as SourceType } from '@/api/notify/hey-api'
export type { NotifyTargetTypeEnum as NotifyTargetType } from '@/api/notify/hey-api'
export type { NotifyCreateReq as CreateNotifyPayload } from '@/api/notify/hey-api'
export type { NotifyUpdateReq as UpdateNotifyPayload } from '@/api/notify/hey-api'
export type { MessageSettingUpdateReq as MessageSettingPartial } from '@/api/notify/hey-api'

// 内部使用的小类型别名（枚举字面量联合）
export type NotifyLevel = NotifyLevelEnum
export type NotifyStatus = NotifyStatusEnum
export type DmMsgType = DmMsgTypeEnum
export type UserActivity = UserActivityResp

// ---------------------------------------------------------------------------
// 用户侧：通知列表 / 未读 / 已读 / 删除
// ---------------------------------------------------------------------------
export async function fetchNotifyList(params: {
  page?: number
  size?: number
  only_unread?: boolean
} = {}): Promise<NotifyListResp> {
  return request<NotifyListResp>(
    () =>
      listNotifyApiV1MessageNotifyListGet({
        headers: authHeaders(),
        query: {
          page_num: params.page ?? 1,
          page_size: params.size ?? 20,
          only_unread: params.only_unread
        }
      }),
    { items: [], total: 0, page_num: 1, page_size: params.size ?? 20 }
  )
}

export async function fetchNotifyUnread(): Promise<number> {
  return request<number>(
    () => unreadNotifyApiV1MessageNotifyUnreadGet({ headers: authHeaders() }),
    0
  )
}

export async function markNotifyRead(ids?: number[]): Promise<NotifyReadResp> {
  return request<NotifyReadResp>(
    () =>
      readNotifyApiV1MessageNotifyReadPost({
        headers: authHeaders(),
        body: { notify_ids: ids ?? null }
      }),
    { affected: 0, unread_count: 0 }
  )
}

export async function deleteNotify(ids: number[]): Promise<number> {
  return request<number>(
    () =>
      deleteNotifyApiV1MessageNotifyDeletePost({
        headers: authHeaders(),
        body: { notify_ids: ids }
      }),
    0
  )
}

// ---------------------------------------------------------------------------
// 管理员侧：列表 / 发布 / 修改 / 撤回
// ---------------------------------------------------------------------------
export async function fetchAdminNotifyList(params: {
  page?: number
  size?: number
} = {}): Promise<NotifyAdminListResp> {
  return request<NotifyAdminListResp>(
    () =>
      adminListNotifyApiV1MessageNotifyAdminListGet({
        headers: authHeaders(),
        query: { page_num: params.page ?? 1, page_size: params.size ?? 20 }
      }),
    { items: [], total: 0, page_num: 1, page_size: params.size ?? 20 }
  )
}

export async function createNotify(payload: CreateNotifyPayload): Promise<NotifyAdminItem | null> {
  return request<NotifyAdminItem | null>(
    () =>
      createNotifyApiV1MessageNotifyAdminCreatePost({
        headers: authHeaders(),
        body: {
          title: payload.title,
          content: payload.content,
          jump_url: payload.jump_url ?? null,
          target_type: payload.target_type ?? 'all',
          target_value: payload.target_value ?? null,
          level: payload.level ?? 'normal',
          publish_now: payload.publish_now ?? true
        }
      }),
    null
  )
}

export async function updateNotify(
  id: number,
  payload: UpdateNotifyPayload
): Promise<NotifyAdminItem | null> {
  return request<NotifyAdminItem | null>(
    () =>
      updateNotifyApiV1MessageNotifyAdminUpdateNotifyIdPost({
        headers: authHeaders(),
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

export async function revokeNotify(id: number): Promise<boolean> {
  return request<boolean>(
    () =>
      revokeNotifyApiV1MessageNotifyAdminRevokeNotifyIdPost({
        headers: authHeaders(),
        path: { notify_id: id }
      }),
    false
  )
}

// ---------------------------------------------------------------------------
// 消息流（msg_feed）：跨模块未读汇总 + 活跃心跳
// ---------------------------------------------------------------------------
export async function fetchUnreadSummary(): Promise<UnreadSummary | null> {
  return request<UnreadSummary | null>(
    () => unreadSummaryApiV1MessageMsgFeedUnreadGet({ headers: authHeaders() }),
    null
  )
}

export async function sendHeartbeat(): Promise<UserActivity | null> {
  return request<UserActivity | null>(
    () => heartbeatApiV1MessageMsgFeedHeartbeatPost({ headers: authHeaders() }),
    null
  )
}

// ---------------------------------------------------------------------------
// 互动提醒（like / reply / at）
// ---------------------------------------------------------------------------
export async function fetchEventList(params: {
  event_type: EventType
  page?: number
  size?: number
  only_unread?: boolean
}): Promise<EventListResp> {
  return request<EventListResp>(
    () =>
      listEventApiV1MessageEventListGet({
        headers: authHeaders(),
        query: {
          event_type: params.event_type,
          page_num: params.page ?? 1,
          page_size: params.size ?? 20,
          only_unread: params.only_unread
        }
      }),
    { items: [], total: 0, page_num: 1, page_size: params.size ?? 20 }
  )
}

export async function markEventRead(params: {
  event_ids?: number[]
  event_type?: EventType
  source_type?: SourceType
  source_id?: string
}): Promise<EventReadResp> {
  return request<EventReadResp>(
    () =>
      readEventApiV1MessageEventReadPost({
        headers: authHeaders(),
        body: {
          event_ids: params.event_ids ?? null,
          event_type: params.event_type ?? null,
          source_type: params.source_type ?? null,
          source_id: params.source_id ?? null
        }
      }),
    { affected: 0, unread_count: 0 }
  )
}

export async function deleteEvent(ids: number[]): Promise<number> {
  return request<number>(
    () =>
      deleteEventApiV1MessageEventDeletePost({
        headers: authHeaders(),
        body: { event_ids: ids }
      }),
    0
  )
}

// ---------------------------------------------------------------------------
// 私信会话
// ---------------------------------------------------------------------------
export async function fetchDmSessions(params: {
  page?: number
  size?: number
  relation?: 'normal' | 'stranger'
} = {}): Promise<DmSessionListResp> {
  return request<DmSessionListResp>(
    () =>
      listSessionsApiV1MessageDmSessionsGet({
        headers: authHeaders(),
        query: {
          relation: params.relation ?? null,
          page_num: params.page ?? 1,
          page_size: params.size ?? 20
        }
      }),
    { items: [], total: 0, page_num: 1, page_size: params.size ?? 20 }
  )
}

export async function fetchDmMessages(params: {
  talker_mid: number
  cursor?: string | null
  size?: number
}): Promise<DmMessageListResp> {
  return request<DmMessageListResp>(
    () =>
      listMessagesApiV1MessageDmMessagesGet({
        headers: authHeaders(),
        query: {
          talker_mid: params.talker_mid,
          cursor: params.cursor ?? null,
          page_size: params.size ?? 20
        }
      }),
    { items: [], total: 0, cursor: null, page_size: params.size ?? 20 }
  )
}

export async function sendDm(payload: {
  receiver_mid: number
  content: string
  msg_type?: DmMsgType
}): Promise<boolean> {
  return request<boolean>(
    () =>
      sendDmApiV1MessageDmSendPost({
        headers: authHeaders(),
        body: {
          receiver_mid: payload.receiver_mid,
          content: payload.content,
          msg_type: payload.msg_type ?? 'text',
          receiver_name: null,
          receiver_avatar: null
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
    () => getSettingApiV1MessageSettingGet({ headers: authHeaders() }),
    null
  )
}

export async function updateMessageSetting(payload: MessageSettingPartial): Promise<MessageSettingResp | null> {
  return request<MessageSettingResp | null>(
    () =>
      updateSettingApiV1MessageSettingUpdatePost({
        headers: authHeaders(),
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
    null
  )
}
