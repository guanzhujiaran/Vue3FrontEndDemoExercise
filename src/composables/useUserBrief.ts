import { reactive } from 'vue'
import { MessageAdminUserService } from '@/api/community/hey-api'
import type { UserBriefPrivate } from '@/models/user/user_brief_model.ts'

/**
 * 审核端按 mid 查询用户信息（昵称 / 头像 / 等级 / 大会员）。
 *
 * 用户展示快照存于后端 `msg_user_profile`，由 `GET /api/v1/message/admin/user/batch`
 * 批量回查。本模块维护一个跨页面共享的响应式缓存：同一 mid 只查一次，
 * 多个审核视图（评论 / 私信）复用。
 *
 * 管理端接口返回**私有**简档（UserBriefPrivate，含脱敏邮箱 / 经验 / 大会员到期 /
 * 角色），故缓存类型用 private；他人可见的展示路径应使用 UserBriefPublic。
 *
 * 该接口由后端新增，SDK 重新生成后才存在；调用处用动态 import + 函数存在性校验，
 * 未生成时静默降级（组件回落显示 mid），不阻断页面。
 */

const userCache = reactive(new Map<number, UserBriefPrivate>())

async function fetchUserBriefs(mids: number[]): Promise<void> {
  const unique = [...new Set(mids.filter((m): m is number => Boolean(m) && !userCache.has(m)))]
  if (!unique.length) return
  try {
    const res = await MessageAdminUserService.batchUserInfoApiV1MessageAdminUserBatchGet({ query: { mids: unique } })
    // responseStyle 可能返回完整 StandardResponse 或仅 data，二者兼容
    const list = ((res as Record<string, unknown>)?.['data'] ?? res) as
      | UserBriefPrivate[]
      | undefined
    if (Array.isArray(list)) {
      for (const u of list) {
        if (u?.mid) userCache.set(u.mid, u)
      }
    }
  } catch {
    // 查询失败不影响审核列表主流程，回落显示 mid
  }
}

export function useUserBrief() {
  return { userCache, fetchUserBriefs }
}
