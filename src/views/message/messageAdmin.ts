import type { AdminItem } from '@/api/community/hey-api'
import type {
  PptrUserSearchItem,
  PptrUserSearchResult,
  PptrUserLevelInfo,
  PptrUserVipInfo,
  PptrUserRoleInfo
} from '@/api/community/hey-api'
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

/** 审核域行（授权矩阵的行，与 bili_common.deps.permissions.AUDIT_BIZ_KEYS 对齐） */
export interface AuditBizRow {
  /** 资源域文本（与后端 InteractionBizTypeEnum.to_text() 一致） */
  biz: string
  label: string
}

/** 资源域行（授权 UI 的行序） */
export const AUDIT_BIZ_ROWS: AuditBizRow[] = [
  { biz: 'dynamic', label: '动态' },
  { biz: 'topic', label: '话题' },
  { biz: 'comment', label: '评论' },
  { biz: 'dm', label: '私信' },
  { biz: 'avatar', label: '头像' },
  { biz: 'folder_cover', label: '收藏夹封面' },
  { biz: 'report', label: '举报' },
  { biz: 'user', label: '用户' }
]

/** 操作位（Linux rwx 数值语义）：处置(x=1) / 审核(w=2) / 查看(r=4) */
export const BIZ_PERM_OPS = [
  { op: 4, label: '查看', short: 'r' },
  { op: 2, label: '审核', short: 'w' },
  { op: 1, label: '封禁', short: 'x' }
] as const

/** 全部操作位（rwx = 7） */
export const ALL_OPS = 7

/** 权限字 → 可读字母串（7 → rwx、4 → r--、0 → ---） */
export function opsText(mask: number | undefined): string {
  const m = Number(mask ?? 0) & ALL_OPS
  return BIZ_PERM_OPS.map((o) => (m & o.op ? o.short : '-')).join('')
}

/** 按位检查：某资源域是否持有某操作位 */
export function hasBizPerm(
  bizPerms: Record<string, number> | undefined,
  biz: string,
  op: number
): boolean {
  return ((Number(bizPerms?.[biz] ?? 0) & op) !== 0)
}

/** 掩码 dict → 展示文本（仅列有权限的域，如 "dm:rwx · comment:r--"） */
export function bizPermsText(bizPerms: Record<string, number> | undefined): string {
  if (!bizPerms) return ''
  return Object.entries(bizPerms)
    .filter(([, m]) => Number(m) > 0)
    .map(([biz, m]) => `${biz}:${opsText(m)}`)
    .join(' · ')
}

export type { PptrUserSearchItem, PptrUserLevelInfo, PptrUserVipInfo, PptrUserRoleInfo }

/** 大会员类型文案 i18n key（vip_type：1 月度 / 2 年度 / 3 十年 / 4 百年） */
const VIP_TYPE_LABEL: Record<number, string> = {
  1: 'message.vipMonthly',
  2: 'message.vipYearly',
  3: 'message.vipTenYear',
  4: 'message.vipHundredYear'
}

/**
 * 返回大会员标签 i18n key；非大会员（vip_status !== 1）返回空字符串。
 */
export function vipLabel(vip?: PptrUserVipInfo | null): string {
  if (!vip || vip.vip_status !== 1) return ''
  return VIP_TYPE_LABEL[vip.vip_type ?? -1] ?? 'message.vipGeneric'
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
