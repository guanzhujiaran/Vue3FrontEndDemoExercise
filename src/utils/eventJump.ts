/**
 * 互动通知点击跳转。
 *
 * **后端不再下发 uri**：`business`（source_type）+ `type`（event_type）已足以定位业务，
 * 跳转 uri 由前端按 `business` 自己拼接，`type` 决定是否需要定位到具体楼层。
 *
 * - `business=dynamic`（resource_id=dynId）    → 动态详情页；
 * - `business=lottery`（resource_id=lotteryId）→ 抽奖卡片详情页；
 * - 评论（source_id=rpid）                      → 调评论详情拿 oid + type，再跳动态/抽奖详情页并定位该评论；
 * - 其它业务（视频 / 专栏 / 其它）前端暂无对应路由，保持不跳转。
 */
import type { Router } from 'vue-router'
import type { EventFeedItem } from '@/api/notify/message-api'
import commentApi from '@/api/lottery_comment'
import { RouteName } from '@/models/router'
import { InteractionBizTypeEnum, CommentTypeEnum, SourceTypeEnum } from '@/api/community/hey-api'

export async function openEventDetail(item: EventFeedItem, router: Router): Promise<void> {
  const content = item.item
  const business = content?.business
  const resourceType = content?.resource_type
  const resourceId = content?.resource_id
  const rpid = content?.source_id

  /**
   * uri 兜底：由前端按 `business` 判定业务后自行拼接跳转（不再依赖后端 uri）。
   * 评论场景下 resource_id 即所属动态的 oid，因此评论详情拉取失败时仍可跳到动态详情。
   */
  const openFallback = () => {
    if (!resourceId) return
    if (business === SourceTypeEnum.DYNAMIC) {
      router.push({ name: 'MOMENT_DETAIL', params: { momentId: resourceId } })
      return
    }
    if (business === SourceTypeEnum.LOTTERY) {
      router.push({ name: RouteName.LOTTERY_CARD_DETAIL, query: { id: resourceId } })
    }
  }

  // 评论类（source_id 即 rpid）：先取 oid + type 决定跳哪个详情页，并携带 rpid 定位评论
  if (rpid && (resourceType === InteractionBizTypeEnum.DYNAMIC || resourceType === InteractionBizTypeEnum.LOTTERY)) {
    try {
      const resp = await commentApi.detail(rpid)
      const detail = resp?.data
      if (detail?.oid != null) {
        if (detail.type === CommentTypeEnum.DYNAMIC) {
          router.push({
            name: 'MOMENT_DETAIL',
            params: { momentId: String(detail.oid) },
            query: { rpid },
          })
          return
        }
        if (detail.type === CommentTypeEnum.LOTTERY) {
          router.push({
            name: RouteName.LOTTERY_CARD_DETAIL,
            query: { id: String(detail.oid), rpid },
          })
          return
        }
      }
    } catch {
      // 详情获取失败：按 business 兜底拼接 uri
    }
    openFallback()
    return
  }

  // 动态：resource_id 即 dynId，直达动态详情
  if (resourceType === InteractionBizTypeEnum.DYNAMIC && resourceId) {
    router.push({ name: 'MOMENT_DETAIL', params: { momentId: resourceId } })
    return
  }

  // 抽奖卡片：resource_id 即抽奖卡片 id
  if (resourceType === InteractionBizTypeEnum.LOTTERY && resourceId) {
    router.push({ name: RouteName.LOTTERY_CARD_DETAIL, query: { id: resourceId } })
    return
  }

  openFallback()
}
