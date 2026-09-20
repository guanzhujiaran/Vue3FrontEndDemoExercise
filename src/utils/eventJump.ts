/**
 * 互动通知点击跳转。
 *
 * **后端不再下发 uri**：`business`（InteractionBizTypeEnum）+ `type`（InteractionActionTypeEnum）
 * 已足以定位业务，跳转 uri 由前端按 `business` 自己拼接，`type` 决定是否需要定位到具体楼层。
 *
 * 卡片本身已携带跳转所需全部字段，点击直接跳转，**不再额外请求 `/api/v1/comment/detail`**：
 * - `resource_type` 即评论所属资源的 biz 类型（DYNAMIC / LOTTERY …）；
 * - `resource_id`   即目标资源 oid（动态 id / 抽奖卡片 id），用作跳转定位；
 * - `source_id`     即触发评论的 rpid，作为 query 透传给详情页定位到该条评论楼层。
 *
 * - `resource_type=dynamic`（resource_id=dynId） → 动态详情页（携带 rpid 定位）；
 * - `resource_type=lottery`（resource_id=lotteryId）→ 抽奖卡片详情页（携带 rpid 定位）；
 * - `resource_type=others_lot_dyn`（resource_id=第三方动态 dynId）→ 第三方抽奖动态详情页；
 * - 其它业务（视频 / 专栏 / 其它）前端暂无对应路由，保持不跳转。
 */
import type { Router } from 'vue-router'
import { openRouteInNewTab } from '@/utils/PageOpen/linkPolicy'
import type { EventFeedItem } from '@/api/notify/message-api'
import { RouteName } from '@/models/router'
import { InteractionBizTypeEnum } from '@/api/community/hey-api'

export async function openEventDetail(item: EventFeedItem, router: Router): Promise<void> {
  const content = item.item
  const business = content?.business
  const resourceType = content?.resource_type
  const resourceId = content?.resource_id
  const rpid = content?.source_id

  /**
   * 直接按卡片已下发的 `resource_type` + `resource_id` 跳转，携带 `source_id`（rpid）定位评论楼层。
   * 不再调用 `/comment/detail` 解析 oid（其返回的 oid/type 与本字段一致）。
   */
  const openToResource = () => {
    if (!resourceId) return
    if (resourceType === InteractionBizTypeEnum.DYNAMIC) {
      openRouteInNewTab(router, {
        name: 'MOMENT_DETAIL',
        params: { momentId: resourceId },
        query: rpid ? { rpid } : undefined,
      })
      return
    }
    if (resourceType === InteractionBizTypeEnum.LOTTERY) {
      openRouteInNewTab(router, {
        name: RouteName.LOTTERY_CARD_DETAIL,
        query: rpid ? { id: resourceId, rpid } : { id: resourceId },
      })
      return
    }
    // 第三方抽奖动态（resource_id=dynId）：独立命名空间与详情页，不能走抽奖卡片详情
    if (resourceType === InteractionBizTypeEnum.OTHERS_LOT_DYN) {
      openRouteInNewTab(router, {
        name: RouteName.OTHERS_LOT_DYN_DETAIL,
        query: rpid ? { dynId: resourceId, rpid } : { dynId: resourceId },
      })
    }
  }

  // 卡片已带 resource_type + resource_id：直接跳转（评论类也走这里，rpid 一并带上）
  if (resourceType != null && resourceId) {
    openToResource()
    return
  }

  // resource_id 缺失（极旧数据）：按 business 兜底拼接 uri
  if (business === InteractionBizTypeEnum.DYNAMIC && resourceId) {
    openRouteInNewTab(router, { name: 'MOMENT_DETAIL', params: { momentId: resourceId } })
    return
  }
  if (business === InteractionBizTypeEnum.LOTTERY && resourceId) {
    openRouteInNewTab(router, { name: RouteName.LOTTERY_CARD_DETAIL, query: { id: resourceId } })
    return
  }
  if (business === InteractionBizTypeEnum.OTHERS_LOT_DYN && resourceId) {
    openRouteInNewTab(router, { name: RouteName.OTHERS_LOT_DYN_DETAIL, query: { dynId: resourceId } })
  }
}
