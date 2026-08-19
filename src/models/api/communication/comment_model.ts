import { type UserInfo } from '@/models/user/user_model.ts'

/**
 * 单条评论的生命周期状态，与后端 CommentStateEnum 对齐。
 * - normal    ：所有人可见
 * - auditing  ：待审核（仅作者本人可见），「先审后发」开启时新评论落入此态
 * - rejected  ：审核驳回
 * - hidden    ：管理员下架
 * - deleted   ：已删除
 */
export enum CommentStateEnum {
  NORMAL = 'normal',
  AUDITING = 'auditing',
  REJECTED = 'rejected',
  HIDDEN = 'hidden',
  DELETED = 'deleted',
}

/** 处于「作者本人可见但对外不可见」的审核相关状态 */
export const COMMENT_AUDIT_STATES: CommentStateEnum[] = [
  CommentStateEnum.AUDITING,
  CommentStateEnum.REJECTED,
]

export interface ReplyItem {
  current_page?: number
  /**
   * 需要登录(Cookie 或 APP)
   * 否则恒为 0
   * 0：无
   * 1：已点赞
   * 2：已点踩
   */
  action: number
  assist: number
  content: {
    message: string
    members?: {
      avatar: string
      mid: string | number
      sex: string
      sign: string
      uname: string
    }[]
    /** IP 属地（服务端 GeoIP 解析，如「浙江 杭州」） */
    ip_location?: string | null
    /** IP 运营商 ISP */
    ip_isp?: string | null
  }
  at_name_to_mid: { [key: string]: string | number }
  count: number //二级评论条数
  ctime: number //秒级回复
  dislike: number | string
  like: number | string
  member: UserInfo
  mid: number
  /** 评论生命周期状态，与后端 CommentStateEnum 对齐；缺省视为 normal（所有人可见） */
  state?: CommentStateEnum
  rid: number | string // 视频或者动态的id
  rpid: number | string // 评论的主键id
  root: number | string // 根回复的主键id，也就是哪条回复底下的
  parent: number | string //回复的评论的rpid
  rcount: number | string //回复评论条数
  up_action: {
    like: boolean
    reply: boolean
  }
  replies: ReplyItem[]
}

export interface ReplyMainResp {
  replies: ReplyItem[]
  top_replies: ReplyItem[]
  total_num: number
  cur_page: number
  upper: { mid: string | number }
}
export interface ReplyReplyResp {
  replies: ReplyItem[]
  upper: { mid: string | number }
  total_num: number
  cur_page: number
}

export interface CommentSectionStat {
  is_reply_section_active: boolean
  replyTarget: number | string
  rpidTarget: number | string
  rid: number | string
  root: number | string
  parent: number | string
  reply_content: string // 回复内容
}

export interface CommentSectionBaseInfo {
  oid: number | string
  type: number | string
}
