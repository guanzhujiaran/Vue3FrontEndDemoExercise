import { type UserInfo } from '@/models/user/user_model'

export interface ReplyItem {
  action: number // 1已经点赞，0未点赞
  assist: number
  content: string
  count: number //子回复数量
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
  rcount: number
  up_action: {
    like: boolean
    reply: boolean
  }
}

export interface ReplyResp extends ReplyItem {
  replies: ReplyResp[] | null
}

