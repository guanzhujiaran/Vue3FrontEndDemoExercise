/**
 * 抽奖卡片互动态批量拉取（首页 / 抽奖列表页共用）。
 *
 * 背景：`/community/interaction/status` 本来就是批量接口，但此前首页每张卡片由各自的
 * `BiliLotterySimpleList` 实例去请求（`UpcomingLotteryMarquee` 的轮播每页一个实例），
 * 网络面板上就退化成一串「单个查询」。这里把请求收敛到面板级：
 * 一次算好全部卡片的互动目标，按 bizType 分组、按后端 50 上限分片，只发 1~2 个请求。
 *
 * 同时提供 `interactionStatusKey` 作为父子组件共享的互动态 key 口径
 * （`${bizType}:${bizId}`，bizType 参与拼接避免两个命名空间互相覆盖）。
 */
import {
  fetchInteractionStatus,
  isNumericBizId,
  InteractionBizTypeEnum,
} from '@/api/notify/moment-api'
import type { InteractionStatusItem } from '@/api/notify/moment-api'
import { interactionBizTypeOf } from '@/stores/lottery_detail.ts'
import { normalizeLotteryData } from '@/utils/lotteryNormalization.ts'

/** 互动资源定位：bizType + bizId（与后端 `/interaction/status` 的入参口径一致） */
export interface InteractionTarget {
  bizType: InteractionBizTypeEnum
  bizId: string
}

/**
 * 后端 `/interaction/status` 单次 `bizIds` 上限（超过会被静默截断），
 * 前端必须按此分片，否则超出部分拿不到互动态。
 */
export const INTERACTION_STATUS_BATCH_LIMIT = 50

/** 互动态 map 的 key：`${bizType}:${bizId}` */
export function interactionStatusKey(
  bizType: InteractionBizTypeEnum | number | string,
  bizId: string
): string {
  return `${bizType}:${bizId}`
}

/**
 * 抽奖卡片原始数据 → 互动资源定位列表。
 *
 * 与列表卡片渲染时同一口径：`normalizeLotteryData` 解包出 `type` / `id`，
 * 再由 `interactionBizTypeOf` 决定走 `lottery`（bizType=2）还是 `others_lot_dyn`（bizType=15）；
 * 非数字 ID（旧数据兜底 / 未知类型）会被后端整批 400，必须过滤。
 */
export function lotteryCardInteractionTargets(
  rawItems: readonly any[]
): InteractionTarget[] {
  const seen = new Set<string>()
  const targets: InteractionTarget[] = []
  for (const raw of rawItems ?? []) {
    const normalized = normalizeLotteryData(raw)
    const bizId = String(normalized.id ?? '')
    if (!isNumericBizId(bizId)) continue
    const bizType = interactionBizTypeOf(normalized.type)
    const key = interactionStatusKey(bizType, bizId)
    if (seen.has(key)) continue
    seen.add(key)
    targets.push({ bizType, bizId })
  }
  return targets
}

/**
 * 一次批量拉取多个资源的互动态。
 *
 * 按 bizType 分组、按 {@link INTERACTION_STATUS_BATCH_LIMIT} 分片并发；
 * 弱依赖：单个分片失败只丢该分片的数据，不阻断其余卡片展示。
 *
 * @returns `interactionStatusKey(bizType, bizId)` → 互动态
 */
export async function fetchInteractionStatusMap(
  targets: readonly InteractionTarget[]
): Promise<Record<string, InteractionStatusItem>> {
  const groups = new Map<InteractionBizTypeEnum, string[]>()
  for (const target of targets ?? []) {
    const bizId = String(target?.bizId ?? '')
    if (!isNumericBizId(bizId)) continue
    const ids = groups.get(target.bizType) ?? []
    if (!ids.includes(bizId)) ids.push(bizId)
    groups.set(target.bizType, ids)
  }

  const jobs: Array<Promise<InteractionStatusItem[]>> = []
  for (const [bizType, ids] of groups) {
    for (let i = 0; i < ids.length; i += INTERACTION_STATUS_BATCH_LIMIT) {
      const chunk = ids.slice(i, i + INTERACTION_STATUS_BATCH_LIMIT)
      jobs.push(
        fetchInteractionStatus(bizType, chunk).then(
          (res) => res?.items ?? [],
          () => [] as InteractionStatusItem[]
        )
      )
    }
  }

  const statusMap: Record<string, InteractionStatusItem> = {}
  for (const items of await Promise.all(jobs)) {
    for (const item of items) {
      if (item?.bizId) statusMap[interactionStatusKey(item.bizType, item.bizId)] = item
    }
  }
  return statusMap
}
