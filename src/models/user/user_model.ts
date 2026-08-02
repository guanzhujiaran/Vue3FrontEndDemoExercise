export interface LoginModel {
  uid: number
  user_name: string
  jwt_token: string
}

export interface UserRoleInfo {
  role: string
  role_name: string
  role_description: string
}

export interface UserNavModel {
  uid: string
  user_name: string
  level?: string
  role?: string
  role_info?: UserRoleInfo
  face: string
  email: string
  level_info: UserLevelInfo
}

export interface UserInfo {
  avatar: string
  level_info: UserLevelInfo
  mid: number
  uname: string
  sign: string
  sex: string
  vip: UserVipinfo
}

export interface UserLevelInfo {
  current_exp: string
  current_level: string | number
  current_min: string
  next_exp: string
}

export interface UserVipinfo {
  vip_due_date: number // 秒级时间戳
  vip_pay_type: number
  vip_status: number
  vip_type: number
}

/**
 * 用户角色分类
 * - level0 ~ level6：成长等级角色，随用户升级自动设置，等级越高权限/能力越强
 * - root：系统管理员，拥有最高权限，只能由已有管理员手动赋予
 */
export type UserRole = 'level0' | 'level1' | 'level2' | 'level3' | 'level4' | 'level5' | 'level6' | 'root'

export interface UserRoleDescription {
  level: number
  name: string
  description: string
}

// 与后端 user_role_const.js 中 ROLE_DESCRIPTIONS 保持一致
export const ROLE_DESCRIPTIONS: Record<UserRole, UserRoleDescription> = {
  level0: { level: 0, name: '新手上路', description: '刚注册或经验值极少的用户，仅拥有基础浏览与使用权限。' },
  level1: { level: 1, name: '初级用户', description: '已有一定活跃度的用户，可参与基础的社区互动。' },
  level2: { level: 2, name: '进阶用户', description: '持续活跃的用户，可解锁更多社区功能与个性化配置。' },
  level3: { level: 3, name: '活跃用户', description: '活跃度较高的用户，享有更高的互动权重与部分高级功能。' },
  level4: { level: 4, name: '核心用户', description: '社区核心成员，可参与内容管理与活动运营相关功能。' },
  level5: { level: 5, name: '资深用户', description: '资深贡献者，拥有接近管理员的多数操作权限。' },
  level6: { level: 6, name: '荣誉用户', description: '社区荣誉用户，达到最高成长等级，享有最高等级的非管理权限。' },
  root: {
    level: 99,
    name: '系统管理员',
    description: '系统最高权限管理员，可管理用户、赋予他人管理员权限、配置系统设置等。仅能由已有管理员手动授予。',
  },
}

export const ROOT_ROLE: UserRole = 'root'

export function getUserRoleDescription(role: string | undefined): UserRoleDescription {
  return ROLE_DESCRIPTIONS[(role as UserRole)] || ROLE_DESCRIPTIONS.level0
}

export function isRootRole(role: string | undefined): boolean {
  return role === ROOT_ROLE
}
