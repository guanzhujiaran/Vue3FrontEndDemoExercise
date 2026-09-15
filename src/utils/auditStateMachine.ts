/**
 * 管理端审核通用状态机（Phase 10 / 对齐后端审核状态机）。
 *
 * 所有管理端审核页（动态 / 话题 / 头像 / 封面 / 操作审批）共用：
 * - 状态 → Tab 配置（待审核 / 已过审 / 已驳回）
 * - 状态 → 允许的审核动作（通过 / 驳回）：待审核两者皆可、已过审仅可驳回撤回、
 *   已驳回仅可通过恢复（与后端各资源审核方法及 RPA 审批状态机的流转语义一致）
 * - 状态 → 标签文案 / 颜色映射
 *
 * 各资源状态值有两种形态：
 * - `ResourceAuditStatusEnum` 数字枚举（be-message 资源：dynamic/comment/user…）
 * - 字符串状态（RPA 审批单：pending / approved / rejected）
 * 统一经 `toAuditStateName` 归一为成员名后再查表。
 */
import { ResourceAuditStatusEnum } from '@/api/notify/moment-api'

export type AuditStateName = 'AUDITING' | 'NORMAL' | 'REJECTED' | 'HIDDEN'

/** 状态 → 允许的审核动作（审核界面按钮显隐的唯一真相源） */
const AUDIT_TRANSITIONS: Record<AuditStateName, { canApprove: boolean; canReject: boolean }> = {
  AUDITING: { canApprove: true, canReject: true },
  NORMAL: { canApprove: false, canReject: true }, // 已过审：仅可驳回（撤回）
  REJECTED: { canApprove: true, canReject: false }, // 已驳回：仅可通过（恢复）
  HIDDEN: { canApprove: false, canReject: false }, // 已下架：不可再审核
}

/** 状态 → 标签文案 / 颜色映射 */
const AUDIT_STATE_META: Record<AuditStateName, { text: string; type: 'warning' | 'success' | 'danger' | 'info' }> = {
  AUDITING: { text: '待审核', type: 'warning' },
  NORMAL: { text: '已过审', type: 'success' },
  REJECTED: { text: '已驳回', type: 'danger' },
  HIDDEN: { text: '已下架', type: 'info' },
}

/** 审核页状态 Tab 配置（待审核 / 已过审 / 已驳回） */
export const AUDIT_TABS: Array<{ name: AuditStateName; label: string; status: ResourceAuditStatusEnum }> = [
  { name: 'AUDITING', label: '待审核', status: ResourceAuditStatusEnum.AUDITING },
  { name: 'NORMAL', label: '已过审', status: ResourceAuditStatusEnum.NORMAL },
  { name: 'REJECTED', label: '已驳回', status: ResourceAuditStatusEnum.REJECTED },
]

/**
 * 任意形态的状态值 → 成员名（大小写不敏感；各业务域的字符串状态做映射）
 *
 * 已登记的字符串词汇表：
 * - RPA 审批单：`pending` / `approved` / `rejected`
 * - 举报（be-message `ReportItem.auditStatus` 契约）：`pending` / `resolved` / `rejected`
 *   —— `resolved`（已成立）等价于本状态机的 `NORMAL`（已过审）。
 *   ⚠️ 漏登记会让它落到下方 `AUDITING` 兜底，把「已成立」显示成「待审核」（且颜色、可审核动作一并判错）。
 */
export function toAuditStateName(status: string | number | null | undefined): AuditStateName {
  const raw = String(status ?? '').trim()
  const alias: Record<string, AuditStateName> = {
    pending: 'AUDITING',
    approved: 'NORMAL',
    resolved: 'NORMAL', // 举报「已成立」≡ 已过审（通过）
  }
  const key = (alias[raw.toLowerCase()] ?? raw).toUpperCase()
  return (key in AUDIT_STATE_META ? key : 'AUDITING') as AuditStateName
}

/** 该状态下是否允许「通过」（含恢复语义） */
export function canApprove(status: string | number | null | undefined): boolean {
  return AUDIT_TRANSITIONS[toAuditStateName(status)].canApprove
}

/** 该状态下是否允许「驳回」（含撤回语义） */
export function canReject(status: string | number | null | undefined): boolean {
  return AUDIT_TRANSITIONS[toAuditStateName(status)].canReject
}

/** 状态标签文案（未识别状态原样返回） */
export function auditStateText(status: string | number | null | undefined): string {
  const name = toAuditStateName(status)
  return AUDIT_STATE_META[name]?.text ?? String(status ?? '')
}

/** 状态标签颜色（el-tag type） */
export function auditStateTagType(
  status: string | number | null | undefined
): 'warning' | 'success' | 'danger' | 'info' {
  return AUDIT_STATE_META[toAuditStateName(status)]?.type ?? 'info'
}
