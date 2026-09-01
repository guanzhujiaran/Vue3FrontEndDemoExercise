/**
 * 黑名单 / 账号注销相关的响应类型。
 *
 * 注意：这些类型目前为前端本地定义（后端已就绪，但 hey-api SDK 尚未重新生成）。
 * 待 SDK 重新生成后，若后端响应结构保持一致，可逐步替换为 SDK 导出的类型，
 * 以复用「单一数据源」约定。
 */

/** 黑名单 / 关注列表单条记录（仅含 mid 与关系建立时间） */
export interface FollowListItem {
  mid: number
  /** 拉黑时间（ISO 字符串） */
  created_at: string
}

/** 黑名单 / 关注列表分页响应 */
export interface FollowListResp {
  items: FollowListItem[]
  total: number
  page_num: number
  page_size: number
}

/** 关注 / 取关 / 拉黑 / 解除拉黑 等写操作的统一回执 */
export interface FollowOpResp {
  mid: number
  target_mid: number
  /** 操作完成后的当前关系：following 关注 / blocked 拉黑 / null 已无关系 */
  status: 'following' | 'blocked' | null
  followed: boolean
  blocked: boolean
}

/** 我与某人的双向关系查询回执 */
export interface FollowRelationResp {
  mid: number
  target_mid: number
  following: boolean
  followed_by: boolean
  mutual: boolean
  /** 我是否拉黑了对方 */
  i_blocked: boolean
  /** 对方是否拉黑了我 */
  blocked_by: boolean
}
