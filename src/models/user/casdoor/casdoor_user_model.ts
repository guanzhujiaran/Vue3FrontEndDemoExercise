/**
 * Casdoor 用户账户信息模型
 * 字段来自后端 CasdoorService.getCasdoorUserByUserName 返回的完整 Casdoor 用户对象。
 * 尽量保留所有可被前端展示的字段（余额、积分、等级、角色、标签等），均为可选。
 */
export interface CasdoorRoleModel {
  id?: string
  name?: string
  displayName?: string
  description?: string
  owner?: string
  createdTime?: string
  modifiedTime?: string
  isEnabled?: boolean
  [key: string]: any
}

export interface CasdoorUserModel {
  // 基础标识
  owner?: string
  name?: string
  id?: string
  type?: string
  createdTime?: string
  updatedTime?: string

  // 个人资料
  displayName?: string
  avatar?: string
  permanentAvatar?: string
  isDefaultAvatar?: boolean
  email?: string
  phone?: string
  location?: string
  address?: string
  affiliation?: string
  title?: string
  idCardType?: string
  idCard?: string
  homePage?: string
  firstName?: string
  lastName?: string
  middleName?: string
  gender?: string
  birthday?: string
  education?: string
  country?: string
  state?: string
  city?: string
  zipcode?: string
  region?: string
  language?: string
  preferredLanguage?: string
  timezone?: string

  // 余额 / 积分 / 等级 / 货币
  score?: number
  rank?: string
  balance?: number
  currency?: string
  karma?: number
  rating?: number

  // 状态
  isOnline?: boolean
  isAdmin?: boolean
  isGlobalAdmin?: boolean
  isForbidden?: boolean
  isDeleted?: boolean
  verified?: boolean
  rememberMe?: boolean
  signupApplication?: string
  hash?: string
  preHash?: string
  createdIp?: string
  lastSignInTime?: string
  lastSignInIp?: string

  // 第三方账号绑定
  github?: string
  google?: string
  qq?: string
  wechat?: string
  properties?: Record<string, any> | null
  tag?: string | string[] | null

  // 权限 / 组织
  roles?: CasdoorRoleModel[] | null
  permissions?: any[] | null
  groups?: any[] | null

  // 安全
  totpSecret?: string

  [key: string]: any
}
