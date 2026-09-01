import { reactive } from 'vue'
import type { SpaceInfoResp } from '@/api/community/hey-api'
import { fetchUserSpaceInfo } from '@/api/notify/moment-api'
import type { UserCardData } from '@/components/message/UserCard.vue'

/**
 * 悬浮用户卡片数据的**跨组件共享常驻缓存**（2.32.0）。
 *
 * 背景：卡片悬浮一次原本要并发 3 个接口（`/user/space/info` +
 * `/message/follow/stat` + `/community/upstat`），且数据挂在组件内部的 `ref` 上，
 * 组件卸载（列表重渲染 / 路由切换 / popover 销毁）即丢弃，重复悬浮重复请求。
 *
 * 现在：
 * 1. 后端 `/user/space/info` 已把两项统计内联进 `follow_stat` / `upstat`，
 *    一次请求拿全卡片所需全部字段；
 * 2. 缓存挂在**模块作用域**，生命周期长于任何组件——已加载的卡片数据不会随
 *    组件卸载销毁，同一用户在任意位置再次悬浮直接命中缓存、零请求；
 * 3. 并发去重：同一 mid 的多个组件同时悬浮只发一次请求（共享同一个 Promise）；
 * 4. **失败不写缓存**（403 黑名单 / 1008 用户不存在 / 网络错误），下次悬浮可重试，
 *    修复原实现「请求前就标记 loadedMid，失败后该 mid 永久不再加载」的 bug。
 */

const cache = reactive(new Map<number, UserCardData>())
const inflight = new Map<number, Promise<UserCardData | null>>()

/** 把 `/user/space/info` 的响应映射为卡片展示结构（含 2.32.0 内联统计） */
export function toUserCardData(
  info: SpaceInfoResp,
  fallback?: Partial<UserCardData>
): UserCardData {
  return {
    ...fallback,
    mid: info.mid ?? fallback?.mid ?? null,
    // name/face 缺省是空串，空串不覆盖 fallback（作者模块自带的昵称/头像更可信）
    uname: info.name || fallback?.uname || null,
    avatar: info.face || fallback?.avatar || null,
    level: info.level,
    sex: info.sex ?? null,
    sign: info.sign ?? null,
    official_title: info.official?.title ?? null,
    vip_type: info.vip?.type,
    vip_status: info.vip?.status != null ? String(info.vip.status) : null,
    vip_due_date: info.vip?.due_date ?? null,
    // 2.32.0：统计随 space/info 一次返回（SDK 已生成 follow_stat / upstat）
    following_count: info.follow_stat?.following_count,
    follower_count: info.follow_stat?.follower_count,
    like_count: info.upstat?.like_count,
    is_following: info.is_followed ?? fallback?.is_following,
  }
}

/**
 * 按 mid 取卡片数据：命中缓存直接返回，否则发一次 `/user/space/info`。
 * @param fallback 已有的局部信息（如动态作者模块自带的昵称/头像），仅作兜底
 */
export async function loadUserCard(
  mid: number,
  fallback?: Partial<UserCardData>
): Promise<UserCardData | null> {
  const cached = cache.get(mid)
  if (cached) return cached

  const pending = inflight.get(mid)
  if (pending) return pending

  const task = (async (): Promise<UserCardData | null> => {
    try {
      const space = await fetchUserSpaceInfo(mid)
      // 非 0：403 黑名单互访拒绝 / 1008 用户不存在 / 网络失败 —— 均不写缓存，允许重试
      if (space.code !== 0 || !space.data) return null
      const card = toUserCardData(space.data, fallback)
      cache.set(mid, card)
      return card
    } catch {
      return null
    } finally {
      inflight.delete(mid)
    }
  })()

  inflight.set(mid, task)
  return task
}

/** 局部更新已缓存的卡片字段（如关注/取关成功后同步 `is_following`，无需重新请求） */
export function patchUserCard(mid: number, patch: Partial<UserCardData>): void {
  const current = cache.get(mid)
  if (!current) return
  cache.set(mid, { ...current, ...patch })
}

export function useUserCardCache() {
  return { cache, loadUserCard, patchUserCard, toUserCardData }
}
