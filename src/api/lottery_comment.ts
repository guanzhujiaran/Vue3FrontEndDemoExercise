import { CommentService, InteractionBizTypeEnum, CommentSortEnum, ResourceAuditStatusEnum } from '@/api/community/hey-api'
import type { BusinessHandlerResult } from '@/utils/businessHandler'
import type {
  CommentUserBrief,
  CommentItem,
  CommentListResp,
  CommentSubListResp,
  CommentAddResp,
  CommentActionResp,
} from '@/api/community/hey-api'
import type { RootObject } from '@/models/api/base_model.ts'
import type { InjectionKey } from 'vue'

/**
 * 评论区业务类型 / 排序 / 状态，直接使用 SDK 生成的数值枚举，不再手写字符串镜像：
 * - InteractionBizTypeEnum（评论区 type）：DYNAMIC=1 / LOTTERY=2（白名单仅收录二者）
 * - CommentSortEnum：HOT=1 / TIME=2
 * - ResourceAuditStatusEnum：NORMAL=1 / AUDITING=2 / REJECTED=3 / HIDDEN=4 / DELETED=5
 * 与后端 be-message-service `app.models.enums.*` 严格对齐，保证前后端取值永远一致。
 */
export { InteractionBizTypeEnum, CommentSortEnum, ResourceAuditStatusEnum }

/** 后端合法的评论区 type 类型，等价于 SDK 生成的 InteractionBizTypeEnum */
export type CommentType = InteractionBizTypeEnum

// 以下类型直接从 SDK re-export，单一数据源，消除重复定义
export type {
  CommentUserBrief,
  CommentItem,
  CommentListResp,
  CommentSubListResp,
  CommentAddResp,
  CommentActionResp,
}

/** 评论区交互回调（由 LotteryCommentSection 通过 provide 下发给子组件） */
export interface CommentHandlers {
  like: (payload: { rpid: string; nextAction: 0 | 1 | 2 }) => void
  del: (rpid: string) => Promise<BusinessHandlerResult<null> | undefined>
  reply: (payload: { root: string; parent: string; message: string; atNameToMid?: Record<string, number>; replyTo?: CommentUserBrief | null }) => void
  /** 楼中楼展开：返回某一页的子回复与总数 */
  expandReplies: (item: CommentItem, page: number) => Promise<{ items: CommentItem[]; total: number }>
}

export const CommentHandlersKey: InjectionKey<CommentHandlers> = Symbol('CommentHandlers')

/**
 * 评论区 API —— 全部走 notify（be-message-service）SDK 生成的 client 与函数，
 * 不再手写裸调。返回结构保持 RootObject<T> 以兼容既有调用方。
 */
const commentApi = {
  // notify SDK 配置了 responseStyle: 'data'，因此调用结果直接是后端
  // StandardResponse 响应体（{ code, data, msg }），已对齐 RootObject。
  // 注意：不能再写 r.data 二次取值，否则会取到内层的 data 载荷并丢失 code/msg。
  // 非 2xx（throwOnError=false）时 SDK 直接 resolve 为 undefined，这里兜底成
  // 带 code 的 RootObject，避免上层读取 resp.data.xxx 时崩溃。
  listMain(
    oid: string | number,
    type: CommentType,
    sort: CommentSortEnum = CommentSortEnum.HOT,
    page_num = 1,
    page_size = 10,
    focusRpid?: string | number | null
  ): Promise<RootObject<CommentListResp>> {
    return CommentService.listMainApiV1CommentMainGet({
      query: {
        oid: String(oid),
        type,
        sort,
        page_num,
        page_size,
        ...(focusRpid != null && focusRpid !== '' ? { focus_rpid: String(focusRpid) } : {})
      }
    }).then(
      (r) => (r ?? { code: -1, msg: '评论区加载失败', data: {} }) as unknown as RootObject<CommentListResp>
    )
  },

  listReply(
    root: string | number,
    oid: string | number,
    type: CommentType,
    page_num = 1,
    page_size = 10
  ): Promise<RootObject<CommentSubListResp>> {
    return CommentService.replyListApiV1CommentReplyGet({
      query: { root: String(root), oid: String(oid), type, page_num, page_size }
    }).then(
      (r) => (r ?? { code: -1, msg: '回复加载失败', data: {} }) as unknown as RootObject<CommentSubListResp>
    )
  },

  /** 单条评论详情：按 rpid 查询，返回 oid / type / 正文等（消息通知按 bizId 跳转定位评论区用） */
  detail(rpid: string | number): Promise<RootObject<CommentItem>> {
    return CommentService.commentDetailApiV1CommentDetailRpidGet({
      path: { rpid: String(rpid) }
    }).then(
      (r) => (r ?? { code: -1, msg: '评论详情获取失败', data: {} }) as unknown as RootObject<CommentItem>
    )
  },

  /** @ 提及用户搜索：按昵称 / 注册名前缀匹配（登录即可），返回简单用户结构 */
  searchAt(keyword: string, limit = 10): Promise<RootObject<CommentUserBrief[]>> {
    return CommentService.atSearchApiV1CommentAtSearchGet({
      query: { keyword, limit }
    }).then(
      (r) => (r ?? { code: -1, msg: '@用户搜索失败', data: [] }) as unknown as RootObject<CommentUserBrief[]>
    )
  },

  add(
    oid: string | number,
    type: CommentType,
    root: string | number,
    parent: string | number,
    message: string,
    atNameToMid?: Record<string, number>
  ): Promise<RootObject<CommentAddResp>> {
    return CommentService.addCommentApiV1CommentAddPost({
      body: {
        oid: String(oid),
        type,
        root: String(root),
        parent: String(parent),
        message,
        ...(atNameToMid && Object.keys(atNameToMid).length ? { at_name_to_mid: atNameToMid } : {})
      }
    }).then(
      (r) => (r ?? { code: -1, msg: '评论发送失败', data: {} }) as unknown as RootObject<CommentAddResp>
    )
  },

  action(rpid: string | number, action: 0 | 1 | 2): Promise<RootObject<CommentActionResp>> {
    return CommentService.commentActionApiV1CommentActionPost({
      body: { rpid: String(rpid), action }
    }).then(
      (r) => (r ?? { code: -1, msg: '操作失败', data: {} }) as unknown as RootObject<CommentActionResp>
    )
  },

  del(rpid: string | number): Promise<RootObject<null>> {
    return CommentService.deleteCommentApiV1CommentDelPost({
      body: { rpid: String(rpid) }
    }).then((r) => (r ?? { code: -1, msg: '删除失败', data: null }) as unknown as RootObject<null>)
  }
}

export default commentApi
