import { COMMENT_AUDIT_STATES, CommentStateEnum, type ReplyItem } from '@/models/api/communication/comment_model.ts'
import { useUserNavStore } from '@/stores/user_nav.ts'

/**
 * 判断评论是否为当前登录用户本人发布。
 * 后端 CommentItem.mid 为 int，前端 user_nav.uid 为 string，统一按字符串比较。
 */
export function isOwnComment(item: ReplyItem): boolean {
  const uid = useUserNavStore().user_nav.uid
  if (!uid) return false
  return String(item.mid) === String(uid)
}

/**
 * 评论是否处于「审核相关」状态（待审核 / 被驳回），即对外不可见、仅作者本人可见。
 */
export function isAuditState(state?: CommentStateEnum): boolean {
  return !!state && COMMENT_AUDIT_STATES.includes(state)
}

/**
 * 是否为「作者本人发布的、且处于审核相关状态」的评论。
 * 仅在此情况下需要给作者打标记提示。
 */
export function isOwnCommentInAudit(item: ReplyItem): boolean {
  return isOwnComment(item) && isAuditState(item.state)
}

/**
 * 将审核状态映射为给作者展示的文案与主题色（语义化 class 名）。
 */
export function auditStateMeta(
  state?: CommentStateEnum,
): { label: string; badgeClass: string } | null {
  switch (state) {
    case CommentStateEnum.AUDITING:
      return {
        label: '审核中',
        badgeClass: 'text-warning bg-warning-light-9',
      }
    case CommentStateEnum.REJECTED:
      return {
        label: '未通过审核',
        badgeClass: 'text-danger bg-danger-light-9',
      }
    default:
      return null
  }
}
