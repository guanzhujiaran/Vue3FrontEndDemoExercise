import { reactive } from 'vue'
import type { InteractionStatusItem } from '@/api/notify/moment-api'

/**
 * 动态点踩态的**跨组件共享缓存**（2.62.0，计划书 §5.20）。
 *
 * 语义：只关心「我点没点踩」——**点踩数不对外展示**（后端 `dislikeCount` 仅内部供
 * EdgeRank 全局降权消费，不出参），因此前端不渲染踩的计数，只渲染踩的状态。
 *
 * 点踩后由后端生效两层效果（前端无额外排序逻辑）：
 * 1. **对所有人**：该资源 `dislike_ratio` 上升 → EdgeRank `feedback_penalty` 略降；
 * 2. **对点踩者本人**：精排后处理 `s' = s·scale − weight` → 大幅降权（可配置直接剔除）。
 *
 * 缓存挂在**模块作用域**，承担两件事：
 * - 乐观更新：点踩成功后立即生效，不等接口回查；
 * - 跨组件存活：卡片随列表重渲染 / 路由切换卸载后，已踩状态不丢失，不会闪回「未踩」。
 */

/** 本地（会话内）点踩态：dynIdStr → 是否已踩，优先于服务端互动态 */
const dislikedMap = reactive<Record<string, boolean>>({})

/** 是否已点踩：本地乐观态优先，回落服务端互动态 `isDislike`（2.62.0 出参） */
export function isMomentDisliked(
  dynIdStr: string,
  status?: InteractionStatusItem | null
): boolean {
  const local = dislikedMap[dynIdStr]
  if (local !== undefined) return local
  return Boolean(status?.isDislike)
}

/** 写入点踩态（点踩 / 取消点踩成功后调用，跨组件共享） */
export function setMomentDisliked(dynIdStr: string, value: boolean): void {
  dislikedMap[dynIdStr] = value
}
