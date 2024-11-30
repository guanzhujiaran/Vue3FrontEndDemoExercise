import { type UserInfo } from '@/models/user/user_model'

export interface ReplyItem {
  /**
   * 需要登录(Cookie 或 APP)
   * 否则恒为 0
   * 0：无
   * 1：已点赞
   * 2：已点踩
   */
  action: number
  assist: number
  content: string
  count: number //二级评论条数
  ctime: number //秒级回复
  like: number
  dislike: number
  member: UserInfo
  mid: number
  oid: number // 视频或者动态的id
  oid_str: string
  rpid: number // 评论的主键id
  rpid_str: string
  root: number // 根回复的主键id，也就是哪条回复底下的
  root_str: string
  parent: number //回复的评论的rpid
  parent_str: string
  rcount: number //回复评论条数
  up_action: {
    like: boolean
    reply: boolean
  }
  replies: ReplyItem[]
}

export interface ReplyResp {
  replies: ReplyItem[]
  total_num: number
  cur_page: number
}

export interface CommentSectionStat {
  is_reply_section_active: boolean
  replyTarget: string
  rpidTarget: string
  oid: string
  root: string
  parent: string
  reply_content: string // 回复内容
}
