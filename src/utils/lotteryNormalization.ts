import type {
  AnchorLotteryData,
  AnyLotteryData,
  ChargingLotteryData,
  DynamicLotteryData,
  RedPacketData,
  ReservationLotteryData,
  TopicEventData
} from '@/models/api/lottery/lottery_card.ts'
import type { NormalizedLottery } from '@/models/api/lottery/lottery_card.ts'
import { BiliImg } from '@/assets/img/BiliImg.ts'
import {
  getBiliLotteryResultUrl,
  getBiliOpusUrl,
  getBiliUserSpaceUrl,
  getDirectUrl
} from '@/utils/PageOpen/BiliJump.ts'
import { isMobileDevice } from '@/utils/Browser/useDeviceDetect.ts'

const is_mobile = isMobileDevice()

export const formatTimestamp = (timestamp: number | string | null | undefined): string => {
  if (timestamp === null || timestamp === undefined || timestamp === '') {
    return 'N/A'
  }
  try {
    let date: Date
    if (typeof timestamp === 'number') {
      date = new Date(timestamp * 1000)
    } else {
      const numTimestamp = Number(timestamp)
      if (!isNaN(numTimestamp) && timestamp.trim() !== '') {
        date = new Date(numTimestamp * (numTimestamp < 10000000000 ? 1000 : 1))
      } else {
        const cleanString = timestamp.replace('截止', '').trim()
        date = new Date(cleanString)
      }
    }

    if (isNaN(date.getTime())) {
      return `无法解析: ${timestamp}`
    }
    return date.toLocaleString('zh-CN', { hour12: false })
  } catch (e) {
    console.error('Timestamp format error:', timestamp, e)
    return '格式错误'
  }
}

export const parsePrizeText = (
  text: string | null | undefined
): Array<{ description: string; count: number | null; img: null }> => {
  if (!text) return []
  const prizes: Array<{ description: string; count: number | null; img: null }> = []
  const prizePart = text.split(/：|:/).pop()?.trim() || text
  const items = prizePart
    .split(/、|,|，/)
    .map((s) => s.trim())
    .filter(Boolean)

  items.forEach((item) => {
    const match = item.match(/^(.*?)(?:\*|\s+x\s*|\s*×\s*|\s+)(\d+)\s*(?:份|个|名)?$/)
    if (match && match[1] && match[2]) {
      const description = match[1].trim()
      const count = parseInt(match[2], 10)
      if (description && !isNaN(count)) {
        prizes.push({ description, count, img: null })
        return
      }
    }
    prizes.push({ description: item, count: 1, img: null })
  })

  return prizes
}

export const parseExclusiveLevel = (
  jsonString: string | null | undefined
): { type: string; text: string; link?: string } | null => {
  if (!jsonString) return null
  try {
    const data = JSON.parse(jsonString)
    const reqText =
      data.upower_level_str || data.upower_title || `充电等级 ${data.privilege_type || ''}`
    return {
      type: '充电',
      text: `充电专属: ${reqText}`,
      link: getDirectUrl(data.upower_open_url) || undefined
    }
  } catch (e) {
    console.error('Failed to parse exclusive_level JSON:', jsonString, e)
    return { type: '充电', text: '充电专属 (解析失败)' }
  }
}

export const normalizeLotteryData = (data: AnyLotteryData): NormalizedLottery => {
  // 如果数据有 raw 字段，使用 raw 字段
  let actualData: AnyLotteryData = data
  if ('raw' in data && data.raw) {
    actualData = data.raw as AnyLotteryData
  }

  const nowSec = Date.now() / 1000
  const normalized: Partial<NormalizedLottery> = {
    originalData: data,
    prizes: [],
    requirements: [],
    senderInfo: { uid: null }
  }

  if (
    'lottery_id' in actualData &&
    (actualData.business_type === 1 ||
      actualData.business_type === 12 ||
      actualData.business_type === 10)
  ) {
    const dynData = actualData as DynamicLotteryData | ChargingLotteryData
    normalized.id = dynData.lottery_id
    normalized.endTime = dynData.lottery_time ?? null
    normalized.startTime = dynData.created_at
      ? formatTimestamp(dynData.created_at) !== 'N/A'
        ? new Date(formatTimestamp(dynData.created_at)).getTime() / 1000
        : null
      : null
    normalized.participants = dynData.participants ?? null
    normalized.senderInfo = { uid: dynData.sender_uid_str || dynData.sender_uid || null }
    normalized.sourceLink = getBiliOpusUrl(dynData.business_id_str)
    normalized.resultLink =
      dynData.lottery_detail_url && dynData.lottery_detail_url.trim() !== ''
        ? dynData.lottery_detail_url
        : getBiliLotteryResultUrl(dynData.business_id_str, dynData.business_type)
    normalized.businessType = dynData.business_type

    switch (actualData.business_type) {
      case 1:
        normalized.type = 'DYNAMIC'
        normalized.displayType = '官方转发抽奖'
        normalized.title = dynData.first_prize_cmt || `官方转发抽奖 #${dynData.lottery_id}`
        normalized.requirements!.push({
          type: '转发',
          text: '转发动态',
          link: normalized.sourceLink
        })
        break
      case 12:
        normalized.type = 'CHARGING'
        normalized.displayType = '充电抽奖'
        normalized.title = dynData.first_prize_cmt || `充电抽奖 #${dynData.lottery_id}`
        normalized.requirements!.push({
          type: '关注',
          text: '关注UP主',
          link:
            normalized.senderInfo && normalized.senderInfo.uid
              ? getBiliUserSpaceUrl(normalized.senderInfo.uid)
              : undefined
        })
        break
      case 10:
        normalized.id = dynData.business_id_str
        normalized.type = 'RESERVATION'
        normalized.displayType = '预约抽奖'
        normalized.title = dynData.first_prize_cmt || `预约抽奖 #${dynData.lottery_id}`
        data.business_id && String(data.business_id).length > 18
          ? normalized.requirements!.push({
              type: '预约',
              text: '完成直播预约(动态)',
              link: getBiliOpusUrl(data.business_id)
            })
          : null
        normalized.requirements!.push({
          type: '预约',
          text: '完成直播预约(空间)',
          link: getBiliUserSpaceUrl(normalized.senderInfo.uid)
        })
        break
    }

    if (dynData.first_prize_cmt || (dynData.first_prize ?? 0) > 0) {
      normalized.prizes!.push({
        description: dynData.first_prize_cmt || '一等奖',
        count: dynData.first_prize ?? null,
        img: dynData.first_prize_pic || BiliImg.ranking.prize_default
      })
    }
    if (dynData.second_prize_cmt || (dynData.second_prize ?? 0) > 0) {
      normalized.prizes!.push({
        description: dynData.second_prize_cmt || '二等奖',
        count: dynData.second_prize ?? null,
        img: dynData.second_prize_pic || BiliImg.ranking.prize_default
      })
    }
    if (dynData.third_prize_cmt || (dynData.third_prize ?? 0) > 0) {
      normalized.prizes!.push({
        description: dynData.third_prize_cmt || '三等奖',
        count: dynData.third_prize ?? null,
        img: dynData.third_prize_pic || BiliImg.ranking.prize_default
      })
    }

    if (dynData.exclusive_level) {
      const chargeReq = parseExclusiveLevel(dynData.exclusive_level)
      if (chargeReq) normalized.requirements!.push(chargeReq)
      normalized.requirements!.push({
        type: '转发',
        text: '充电动态',
        link: getBiliOpusUrl(dynData.business_id_str)
      })
    }

    switch (dynData.status) {
      case -1:
        normalized.status = 'CANCELLED'
        break
      case 0:
        normalized.status = normalized.endTime && nowSec < normalized.endTime ? 'ONGOING' : 'ENDED'
        break
      case 1:
      case 2:
        normalized.status = 'ENDED'
        break
      default:
        normalized.status =
          normalized.endTime && nowSec < normalized.endTime ? 'ONGOING' : 'UNKNOWN'
    }
  } else if ('ids' in actualData && 'stime' in actualData) {
    const resData = actualData as ReservationLotteryData
    normalized.id = resData.ids
    normalized.type = 'RESERVATION'
    normalized.displayType = '预约抽奖'
    normalized.title = resData.name || `预约 #${resData.ids}`
    normalized.endTime = resData.etime ?? null
    normalized.startTime = resData.stime ?? null
    normalized.participants = resData.total ?? null
    normalized.senderInfo = { uid: resData.upmid_str || String(resData.upmid) || null }
    normalized.sourceLink = getBiliOpusUrl(resData.dynamicId_str) || null
    normalized.resultLink = resData.jumpUrl || null
    normalized.businessType = 10

    try {
      if (resData.jumpUrl) {
        const url = new URL(resData.jumpUrl)
        const typeParam = url.searchParams.get('business_type')
        if (typeParam) normalized.businessType = parseInt(typeParam, 10) || 10
      }
    } catch (e) {}

    normalized.prizes = parsePrizeText(resData.text)
    normalized.requirements = []
    resData.dynamicId_str && resData.dynamicId_str.length > 18
      ? normalized.requirements.push({
          type: '预约',
          text: '完成直播预约(动态)',
          link: getBiliOpusUrl(resData.dynamicId_str)
        })
      : null
    normalized.requirements.push({
      type: '预约',
      text: '完成直播预约(空间)',
      link: getBiliUserSpaceUrl(resData.upmid_str)
    })
    normalized.roomId = null
    normalized.danmu = null

    const state = resData.state
    if (state === 100 && normalized.endTime && nowSec < normalized.endTime)
      normalized.status = 'ONGOING'
    else if (normalized.endTime && nowSec >= normalized.endTime) normalized.status = 'ENDED'
    else normalized.status = 'UNKNOWN'
  } else if ('lot_id' in actualData && 'anchor_uid' in actualData) {
    const liveData = actualData as AnchorLotteryData | RedPacketData
    normalized.id = liveData.lot_id
    normalized.type = liveData.type === 'anchor' ? 'ANCHOR' : 'RED_PACKET'
    normalized.displayType = liveData.type === 'anchor' ? '天选时刻' : '红包抽奖'
    normalized.title =
      liveData.award_name || (normalized.type === 'ANCHOR' ? '天选抽奖' : '红包抽奖')
    normalized.endTime = liveData.end_time ?? null
    normalized.startTime = null
    normalized.participants = null
    normalized.senderInfo = { uid: liveData.anchor_uid ?? null }
    normalized.sourceLink =
      liveData.live_room_url ||
      (liveData.room_id ? `https://live.bilibili.com/${liveData.room_id}` : null)
    normalized.resultLink = normalized.sourceLink
    normalized.businessType = null
    normalized.roomId = liveData.room_id ?? null
    normalized.danmu = liveData.danmu ?? null
    normalized.prizes = liveData.award_name
      ? [{ description: liveData.award_name, count: 1, img: null }]
      : []

    if (liveData.require_type === 1)
      normalized.requirements!.push({ type: '关注', text: '关注主播' })
    else if (liveData.require_type === 2)
      normalized.requirements!.push({ type: '粉丝团', text: '加入粉丝团' })
    else if (liveData.require_type === 4 && liveData.danmu)
      normalized.requirements!.push({ type: '弹幕', text: `发送弹幕: ${liveData.danmu}` })
    else if (liveData.require_type && liveData.require_type > 2 && liveData.require_type !== 4)
      normalized.requirements!.push({ type: '其他', text: `特殊要求 (${liveData.require_type})` })

    normalized.status = normalized.endTime && nowSec < normalized.endTime ? 'ONGOING' : 'ENDED'
  } else if (
    ('jump_url' in actualData || 'app_sche' in actualData) &&
    ('lottery_text' in actualData || 'title' in actualData)
  ) {
    const rawData = actualData as any

    // 从 rawData 中提取信息
    const lotteryText = rawData.lottery_text || rawData.title || ''
    const lotteryTime = rawData.lottery_time || null
    const dynId = rawData.dynId || null
    const senderUid = rawData.sender_uid || null
    const lotteryId = rawData.lottery_id || dynId || lotteryText.substring(0, 10)

    normalized.id = lotteryId
    normalized.type = 'DYNAMIC'
    normalized.displayType = '抽奖活动'
    normalized.title = lotteryText || `抽奖 #${lotteryId}`

    // 处理时间
    if (lotteryTime) {
      normalized.endTime = lotteryTime
    } else {
      normalized.endTime = null
    }
    normalized.startTime = null
    normalized.participants = null
    normalized.senderInfo = { uid: senderUid }

    // 设置链接
    if ('jump_url' in actualData && actualData.jump_url) {
      normalized.sourceLink = getDirectUrl(actualData.jump_url) || null
    } else if (dynId) {
      normalized.sourceLink = getBiliOpusUrl(String(dynId))
    } else {
      normalized.sourceLink = null
    }
    normalized.resultLink = normalized.sourceLink
    normalized.businessType = 1

    // 设置奖品
    normalized.prizes = [
      {
        description: lotteryText || '奖品',
        count: null,
        img: null
      }
    ]

    // 设置参与要求
    normalized.requirements = [
      {
        type: '参与',
        text: '参与抽奖',
        link: is_mobile === 2 ? rawData.app_sche : normalized.sourceLink
      }
    ]

    normalized.roomId = null
    normalized.danmu = null

    // 设置状态
    if (normalized.endTime) {
      normalized.status = nowSec < normalized.endTime ? 'ONGOING' : 'ENDED'
    } else {
      normalized.status = 'UNKNOWN'
    }
  } else {
    normalized.id = 'N/A'
    normalized.type = 'UNKNOWN'
    normalized.displayType = '未知类型'
    normalized.title = '无法识别的数据'
    normalized.status = 'UNKNOWN'
    normalized.endTime = null
    normalized.startTime = null
    normalized.participants = null
    normalized.prizes = []
    normalized.requirements = []
    normalized.roomId = null
    normalized.danmu = null
  }

  switch (normalized.status) {
    case 'ONGOING':
      normalized.statusText = '进行中'
      normalized.statusType = 'success'
      break
    case 'ENDED':
      normalized.statusText = '已结束/已开奖'
      normalized.statusType = 'danger'
      break
    case 'CANCELLED':
      normalized.statusText = '已取消'
      normalized.statusType = 'warning'
      break
    default:
      normalized.statusText = '未知状态'
      normalized.statusType = 'info'
  }

  if (!normalized.title) normalized.title = `${normalized.displayType} #${normalized.id}`

  return normalized as NormalizedLottery
}
