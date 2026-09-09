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
  InteractionActionTypeEnum,
  NotifyLevelEnum,
  NotifyStatusEnum,
  NotifyTargetTypeEnum,
  DmRelationEnum,
  DmMsgTypeEnum,
  DmMsgStatusEnum,
  ResourceAuditStatusEnum
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
  InteractionBizTypeEnum,
  EventListResp,
  EventReadResp,
  DmSessionItem,
  DmSessionListResp,
  DmMessageItem,
  DmMessageListResp,
  DmSendResp,
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
 * 事件类型：直接复用 SDK 生成的 InteractionActionTypeEnum（数字枚举，like=1, reply=2, at=3 ...）。
 * 业务组件统一通过 InteractionActionTypeEnum.LIKE 等方式传入，无需在本层再做字符串/数字转换。
 */
export type EventType = InteractionActionTypeEnum
/**
 * 重新导出 SDK 的枚举**值**，供业务组件以 `XxxEnum.XXX` 比较 / 赋值。
 *
 * 后端枚举一律是 `IntEnum`，对外序列化为**整数**（如 NotifyLevel.NORMAL=1），
 * 因此业务侧禁止再用 `'normal'` / `'published'` 之类的字符串字面量比较——
 * 那样既过不了类型检查，运行时也永远匹配不上。
 */
export {
  InteractionActionTypeEnum,
  NotifyLevelEnum,
  NotifyStatusEnum,
  NotifyTargetTypeEnum,
  DmRelationEnum,
  DmMsgTypeEnum,
  DmMsgStatusEnum,
  ResourceAuditStatusEnum
}
export type SourceType = InteractionBizTypeEnum
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
  DmSendResp,
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
    /** 按目标类型筛选（1=全员 / 2=角色 / 3=等级 / 4=大会员 / 5=指定用户）；缺省全部 */
    targetType?: number
  } = {}
): Promise<NotifyAdminListResp> {
  return request<NotifyAdminListResp>(
    () =>
      MessageNotifyService.adminListNotifyApiV1MessageNotifyAdminListGet({
        query: {
          page_num: params.page ?? 1,
          page_size: params.size ?? 20,
          target_type: params.targetType
        } as never,
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
    /** 标记该时间戳（含）之前、归属当前用户的互动提醒全部已读（自动已读用）。 */
    read_before?: string
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
          source_id: params.source_id ?? null,
          read_before: params.read_before ?? null
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
/** 后端 `DmSessionTypeEnum` 数值（SDK 尚未生成此枚举，前端以字面量传入） */
export const DmSessionType = {
  SINGLE: 1,
  STRANGER: 2
} as const
export type DmSessionTypeValue = (typeof DmSessionType)[keyof typeof DmSessionType]

/**
 * `DmSessionListResp` 的本地扩展：本次私信改造新增的陌生人分类字段
 * （`stranger_unread` 已有，SDK 重新生成后即可去掉本扩展改用 SDK 类型）。
 * hey-api 的 types.gen.ts 为生成代码，禁止手改，故在此以交叉类型补齐。
 */
export type DmSessionListWithStranger = DmSessionListResp & {
  /** 陌生人分类（STRANGER）会话总数 */
  stranger_total?: number
  /** 当前用户是否开启「陌生人私信拦截」（recv_stranger_dm=false） */
  stranger_dm_intercept_enabled?: boolean
}

export async function fetchDmSessions(
  params: {
    page?: number
    size?: number
    /** 会话关系筛选：直接传 `DmRelationEnum.NORMAL` / `DmRelationEnum.STRANGER` */
    relation?: DmRelation
    /**
     * 会话类型筛选：`SINGLE`=主 DM 列表；`STRANGER`=陌生人分类（被「陌生人私信拦截」
     * 开关拦下的会话）。主侧栏应传 SINGLE，陌生人分类页传 STRANGER。
     * SDK 尚未收录该参数（后端新增，hey-api 重新生成前以 Record 透传，参见 fetchDmMessages 中 direction 的处理）。
     */
    session_type?: DmSessionTypeValue
  } = {}
): Promise<DmSessionListWithStranger> {
  // query 以 Record 承载以便透传 SDK 尚未收录的 session_type 参数
  const query: Record<string, unknown> = {
    relation: params.relation ?? null,
    page_num: params.page ?? 1,
    page_size: params.size ?? 20
  }
  if (params.session_type !== undefined) {
    query.session_type = params.session_type
  }
  return request<DmSessionListWithStranger>(
    () =>
      MessageDmService.listSessionsApiV1MessageDmSessionsGet({
        query
      } as Parameters<typeof MessageDmService.listSessionsApiV1MessageDmSessionsGet>[0]),
    // 默认值补全陌生人分类聚合字段，前端按需取用
    {
      items: [],
      total: 0,
      unread_total: 0,
      stranger_unread: 0,
      stranger_total: 0,
      stranger_dm_intercept_enabled: false
    }
  )
}

export async function fetchDmMessages(params: {
  /** 雪花 ID：支持 number 或 str 传参（后端 StrInt 兼容） */
  talker_mid: number | string
  /** 游标 msgkey：back=本页最小（往更旧翻）；forward=已见最大（增量查新）。首屏不传 */
  cursor?: string | null
  size?: number
  /**
   * 翻页方向：back 向旧翻页（默认）/ forward 增量查新（只返回比 cursor 新的消息，升序）。
   * 注意：direction 为后端新增参数，SDK 重新生成前以断言透传；响应仍复用 DmMessageListResp。
   */
  direction?: 'back' | 'forward'
}): Promise<DmMessageListResp> {
  // query 以 Record 承载以便透传 SDK 尚未收录的 direction 参数
  const query: Record<string, unknown> = {
    talker_mid: params.talker_mid,
    cursor: params.cursor ?? null,
    page_size: params.size ?? 20
  }
  if (params.direction) query.direction = params.direction
  return request<DmMessageListResp>(
    () =>
      MessageDmService.listMessagesApiV1MessageDmMessagesGet({
        query
      } as Parameters<typeof MessageDmService.listMessagesApiV1MessageDmMessagesGet>[0]),
    { items: [], cursor: null, has_more: false }
  )
}

export async function sendDm(payload: {
  /** 雪花 ID：支持 number 或 str 传参（后端 StrInt 兼容） */
  receiver_mid: number | string
  content: string
  msg_type?: DmMsgTypeEnum
}): Promise<DmSendResp | null> {
  // 返回发送回执（含真实 msgkey / msg_ts），供前端发送成功后「直接本地追加」消息、
  // 不再整段重拉聊天记录（避免 loading 骨架屏闪动）。失败（含被拉黑等业务拒绝）返回 null。
  return request<DmSendResp | null>(
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
    null
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

// 撤回私信（双方均不可见，仅发送者可操作，且受后端时间窗口限制：发送后短时间内）。
// 返回是否成功；后端业务失败（如超时 / 非本人）已由 request 统一弹错，此处只给调用方结果。
export async function recallDmMessage(msgkey: string): Promise<boolean> {
  return request<boolean>(
    () =>
      MessageDmService.recallMessageApiV1MessageDmRecallPost({
        body: { msgkey }
      }),
    false
  )
}

// 删除私信（仅自己视角不可见，对方仍可见）。
export async function deleteDmMessages(msgkeys: string[]): Promise<boolean> {
  if (!msgkeys.length) return true
  return request<boolean>(
    () =>
      MessageDmService.deleteMessagesApiV1MessageDmDeletePost({
        body: { msgkeys }
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
