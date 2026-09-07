/**
 * 用户展示简档：**公开（public）/ 私有（private）严格分离**（对齐后端 `user_brief.py`）。
 *
 * - `UserBriefPublic`：任何人可见的展示信息（他人空间、评论、私信、@ 面板、黑名单列表）。
 * - `UserBriefPrivate`：仅本人 / 管理员可见（管理端批量接口），在 public 基础上追加
 *   脱敏邮箱 / 经验 / 大会员到期 / 系统角色，**不得**用于他人可见的展示位。
 *
 * 说明：后端接口已就绪，但 hey-api SDK 可能尚未重新生成，故此处以本地模型为准；
 * 待 SDK 重新生成后若字段一致，可替换为 SDK 导出类型（单一数据源）。
 */

/** 公开用户简档：他人可见 */
export interface UserBriefPublic {
  mid: number
  uname: string | null
  avatar: string | null
  level: number
  vip_status: string | null
  vip_type: number
  sex: string | null
  sign: string | null
  follower_count: number
  following_count: number
  like_count: number
}

/** 私有用户简档：仅本人 / 管理员可见 */
export interface UserBriefPrivate extends UserBriefPublic {
  /** 大会员到期时间（毫秒时间戳） */
  vip_due_date: number | null
  /** 当前累积经验 */
  exp: number | null
  /** 系统角色标识 */
  role: string | null
  /** 脱敏邮箱 */
  email: string | null
}
