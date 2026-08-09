import type { AdminItem } from '@/api/notify/hey-api/types.gen'
import type {
  PptrUserSearchItem,
  PptrUserSearchResult,
  PptrUserLevelInfo,
  PptrUserVipInfo,
  PptrUserRoleInfo
} from '@/api/notify/hey-api'
import userApi from '@/api/user/user_api'

/** 单个管理员记录（与后端 AdminItem 对齐） */
export type MessageAdminItem = AdminItem

/** 管理员分页列表响应（与后端 GET /admin/list 的 data 对齐） */
export interface MessageAdminListResp {
  items: MessageAdminItem[]
  total: number
  page_num: number
  page_size: number
}

export interface MessagePermissionMeta {
  /** 与后端 UserPermission 枚举值一致 */
  value: string
  label: string
  desc: string
  /** 是否可由 root 授予他人 */
  grantable: boolean
}

/**
 * 消息管理端权限元数据，与 bili_common.deps.permissions.UserPermission 保持一致。
 * grantable=false 的权限为 root 专属，不可授予他人（后端会自动剔除）。
 */
export const MESSAGE_ADMIN_PERMISSIONS: MessagePermissionMeta[] = [
  { value: 'comment:view-queue', label: '评论审核队列', desc: '查看评论审核队列（不含内容明文）', grantable: true },
  { value: 'dm:view-queue', label: '私信审核队列', desc: '查看私信审核队列（不含内容明文）', grantable: true },
  { value: 'user:ban', label: '封禁 / 解封用户', desc: '对违规用户执行封禁或解封操作', grantable: true },
  { value: 'comment:ban', label: '评论封禁/解封', desc: '封禁 / 解封用户在评论服务', grantable: true },
  { value: 'dm:ban', label: '私信封禁/解封', desc: '封禁 / 解封用户在私信服务', grantable: true },
  { value: 'user:ban-view', label: '查看封禁记录', desc: '查看历史封禁 / 解封操作记录（跨服务）', grantable: true },
  { value: 'comment:view-content', label: '查看评论明文', desc: '查看评论内容明文（root 专属，不可授予）', grantable: false },
  { value: 'comment:audit', label: '评论过审判定', desc: '设置评论过审 / 没过审（root 专属，不可授予）', grantable: false },
  { value: 'dm:view-content', label: '查看私信明文', desc: '查看私信内容明文（root 专属，不可授予）', grantable: false },
  { value: 'dm:audit', label: '私信过审判定', desc: '设置私信过审 / 没过审（root 专属，不可授予）', grantable: false }
]

const PERMISSION_MAP = new Map(MESSAGE_ADMIN_PERMISSIONS.map((p) => [p.value, p]))

export function getPermissionMeta(value: string): MessagePermissionMeta | undefined {
  return PERMISSION_MAP.get(value)
}

export function permissionLabel(value: string): string {
  return PERMISSION_MAP.get(value)?.label ?? value
}

/** 可由 root 授予他人的权限（用于授权弹窗的勾选项） */
export const GRANTABLE_PERMISSIONS = MESSAGE_ADMIN_PERMISSIONS.filter((p) => p.grantable)

export type { PptrUserSearchItem, PptrUserLevelInfo, PptrUserVipInfo, PptrUserRoleInfo }

/** 大会员类型文案（vip_type：1 月度 / 2 年度 / 3 十年 / 4 百年） */
const VIP_TYPE_LABEL: Record<number, string> = {
  1: '月度大会员',
  2: '年度大会员',
  3: '十年大会员',
  4: '百年大会员'
}

/**
 * 返回大会员标签文案；非大会员（vip_status !== 1）返回空字符串。
 */
export function vipLabel(vip?: PptrUserVipInfo | null): string {
  if (!vip || vip.vip_status !== 1) return ''
  return VIP_TYPE_LABEL[vip.vip_type] ?? '大会员'
}

/** 大会员到期时间（本地日期字符串）；无有效到期时间返回空字符串 */
export function vipDueDateText(vip?: PptrUserVipInfo | null): string {
  if (!vip || !vip.vip_due_date) return ''
  return new Date(Number(vip.vip_due_date)).toLocaleDateString()
}

/**
 * 经 pptr 网关（:23333）的用户搜索接口，由网关反向代理转发到 be-message-service。
 *
 * 请求链路：前端 → pptr `/api/v1/message/admin/user/search` → be-message `/api/v1/message/admin/user/search`。
 * 仅系统管理员(root)可调用（网关会注入 x-bili-role 头，be-message 据此校验 root）。
 *
 * 返回结构统一走 `StandardResponse`（code=0 表示成功），与系统其余接口一致。
 * 分页采用 `offset + limit`：滚动加载时累加 `offset` 即可拉取下一批。
 *
 * 注意：不允许前端直连 be-message(:18739)，必须经 pptr 网关转发（见 userApi.SearchAdmin）。
 */
export async function searchPptrUser(
  keyword: string,
  offset = 0,
  limit = 20
): Promise<PptrUserSearchResult> {
  const res = await userApi.SearchAdmin(keyword.trim(), offset, limit)
  if (res && !res.success) {
    console.warn('[searchPptrUser]', res.msg)
    return { items: [], has_more: false }
  }
  return (res?.data as PptrUserSearchResult) ?? { items: [], has_more: false }
}
