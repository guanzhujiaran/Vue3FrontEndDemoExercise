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
  content: {
    message: string
    members?: {
      avatar: string
      mid: string | number
      sex: string
      sign: string
      uname: string
    }[]
  }
  at_name_to_mid: { [key: string]: string | number }
  count: number //二级评论条数
  ctime: number //秒级回复
  dislike: number | string
  like: number | string
  member: UserInfo
  mid: number
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

export interface ReplyResp {
  replies: ReplyItem[]
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
