import {
  listMainApiV1CommentMainGet,
  replyListApiV1CommentReplyGet,
  addCommentApiV1CommentAddPost,
  commentActionApiV1CommentActionPost,
  deleteCommentApiV1CommentDelPost,
} from '@/api/notify/hey-api'
import type {
  CommentUserBrief,
  CommentItem,
  CommentListResp,
  CommentSubListResp,
  CommentAddResp,
  CommentActionResp,
  CommentTypeEnum,
} from '@/api/notify/hey-api'
import type { RootObject } from '@/models/api/base_model.ts'
import type { InjectionKey } from 'vue'

/**
 * 评论区业务类型，严格对齐后端 be-message-service 的
 * `app.models.enums.CommentTypeEnum`。
 *
 * 后端对该字段做了白名单强校验：传入枚举外的值（任意不在下列表中的字符串）
 * FastAPI / Pydantic 会直接拒绝并返回 422 错误。因此前端不自行发明类型，
 * 只能从这里取——新增类型必须先改后端枚举，再同步到此处。
 *
 * SDK 生成的 CommentTypeEnum = 'dynamic' | 'article' | 'lottery' | 'feedback' | 'other'
 * 这里提供对象形式方便业务代码取值（如 COMMENT_TYPE.LOTTERY）。
 */
export const COMMENT_TYPE = {
  DYNAMIC: 'dynamic',
  ARTICLE: 'article',
  LOTTERY: 'lottery',
  FEEDBACK: 'feedback',
  OTHER: 'other'
} as const

/** 后端合法的评论区 type 字面量联合类型（白名单），等价于 CommentTypeEnum */
export type CommentType = CommentTypeEnum

// 以下类型直接从 SDK re-export，单一数据源，消除重复定义
export type { CommentUserBrief, CommentItem, CommentListResp, CommentSubListResp, CommentAddResp, CommentActionResp }

/** 评论区交互回调（由 LotteryCommentSection 通过 provide 下发给子组件） */
export interface CommentHandlers {
  like: (payload: { rpid: string; nextAction: 0 | 1 | 2 }) => void
  del: (rpid: string) => void
  reply: (payload: { root: string; parent: string; message: string }) => void
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
    sort: 'hot' | 'time' = 'hot',
    page_num = 1,
    page_size = 10,
    focusRpid?: string | number | null
  ): Promise<RootObject<CommentListResp>> {
    return listMainApiV1CommentMainGet({
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
    return replyListApiV1CommentReplyGet({
      query: { root: String(root), oid: String(oid), type, page_num, page_size }
    }).then(
      (r) => (r ?? { code: -1, msg: '回复加载失败', data: {} }) as unknown as RootObject<CommentSubListResp>
    )
  },

  add(
    oid: string | number,
    type: CommentType,
    root: string | number,
    parent: string | number,
    message: string
  ): Promise<RootObject<CommentAddResp>> {
    return addCommentApiV1CommentAddPost({
      body: { oid: String(oid), type, root: String(root), parent: String(parent), message }
    }).then(
      (r) => (r ?? { code: -1, msg: '评论发送失败', data: {} }) as unknown as RootObject<CommentAddResp>
    )
  },

  action(rpid: string | number, action: 0 | 1 | 2): Promise<RootObject<CommentActionResp>> {
    return commentActionApiV1CommentActionPost({
      body: { rpid: String(rpid), action }
    }).then(
      (r) => (r ?? { code: -1, msg: '操作失败', data: {} }) as unknown as RootObject<CommentActionResp>
    )
  },

  del(rpid: string | number): Promise<RootObject<null>> {
    return deleteCommentApiV1CommentDelPost({
      body: { rpid: String(rpid) }
    }).then((r) => (r ?? { code: -1, msg: '删除失败', data: null }) as unknown as RootObject<null>)
  }
}

export default commentApi
