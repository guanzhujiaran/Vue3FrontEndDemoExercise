/**
 * 互动通知点击跳转：按 bizType(business) + bizId(biz_id) 唯一定位原资源。
 *
 * 后端事件通知（msgfeed 聚合条目）携带 `item.business`（bizType）与 `item.biz_id`（bizId），
 * 二者共同唯一定位原始资源（对齐 B 站 `LinkNode{biz_type, biz_id, link}` 模式）：
 * - `dynamic`（bizId=dynId）   → 动态详情页；
 * - `comment`（bizId=rpid）    → 调评论详情拿 oid + type，再跳动态/抽奖详情页并定位该评论；
 * - `lottery`（bizId=lotteryId）→ 抽奖卡片详情页；
 * - 其它 / biz_id 为空         → 回落 `item.uri` 外链（新开标签）。
 */
import type { Router } from 'vue-router'
import type { EventFeedItem } from '@/api/notify/message-api'
import commentApi from '@/api/lottery_comment'
import { RouteName } from '@/models/router'

export async function openEventDetail(item: EventFeedItem, router: Router): Promise<void> {
  const bizType = item.item?.business
  const bizId = item.item?.biz_id
  const fallbackUri = item.item?.uri

  const openFallback = () => {
    if (fallbackUri) window.open(fallbackUri, '_blank', 'noopener')
  }

  // 动态：bizId 即 dynId，直达动态详情
  if (bizType === 'dynamic' && bizId) {
    router.push({ name: 'MOMENT_DETAIL', params: { momentId: bizId } })
    return
  }

  // 评论：bizId 即 rpid，先取 oid + type 决定跳哪个详情页，并携带 rpid 定位评论
  if (bizType === 'comment' && bizId) {
    try {
      const resp = await commentApi.detail(bizId)
      const detail = resp?.data
      if (detail?.oid) {
        if (detail.type === 'dynamic') {
          router.push({
            name: 'MOMENT_DETAIL',
            params: { momentId: String(detail.oid) },
            query: { rpid: String(bizId) }
          })
          return
        }
        if (detail.type === 'lottery') {
          router.push({
            name: RouteName.LOTTERY_CARD_DETAIL,
            query: { id: String(detail.oid), rpid: String(bizId) }
          })
          return
        }
      }
    } catch {
      // 详情获取失败：回落 uri
    }
    openFallback()
    return
  }

  // 抽奖卡片：bizId 即抽奖卡片 id
  if (bizType === 'lottery' && bizId) {
    router.push({ name: RouteName.LOTTERY_CARD_DETAIL, query: { id: bizId } })
    return
  }

  openFallback()
}
