// --- Interfaces ---

// Base interface for common fields after normalization
import type { ResultProps } from 'element-plus'

export interface BaseNormalizedLottery {
  id: number | string
  type: 'DYNAMIC' | 'CHARGING' | 'RESERVATION' | 'TOPIC' | 'ANCHOR' | 'RED_PACKET' | 'UNKNOWN'
  displayType: string
  title: string
  status: 'ONGOING' | 'ENDED' | 'CANCELLED' | 'UNKNOWN'
  statusText: string
  statusType: ResultProps['icon']
  endTime: number | null
  startTime: number | null
  participants: number | null
  prizes: Array<{ description: string; count: number | null; img: string | null }>
  requirements: Array<{ type: string; text: string; link?: string }>
  senderInfo: { uid: number | string | null; name?: string | null }
  sourceLink: string | null
  resultLink: string | null
  originalData?: any
  businessType?: number | null
  roomId?: number | null
  danmu?: string | null
}

export type NormalizedLottery = BaseNormalizedLottery

// Corrected Input Type Interfaces
export interface DynamicLotteryData {
  lottery_id: any
  raw?: any
  business_type?: number | null // Made more general
  business_id?: number | string | null // Added
  followed?: number
  reposted?: number
  need_post?: number
  has_charge_right?: string
  exclusive_level?: string | null
  participants?: number
  first_prize?: number
  first_prize_cmt?: string
  first_prize_pic?: string | null
  second_prize?: number
  second_prize_cmt?: string
  second_prize_pic?: string | null
  third_prize?: number
  third_prize_cmt?: string
  third_prize_pic?: string | null
  lottery_time?: number | null
  created_at?: any
  sender_uid?: any
  lottery_result?: string | null
  status?: number | null
  lottery_detail_url?: string | null
  // Include string versions if present in data
  business_id_str?: string
  sender_uid_str?: string
  // Add other fields from samples if needed
  pay_status?: number | null
  ts?: number | null
  vip_batch_sign?: string | null
  lottery_feed_limit?: number | null
  updated_at?: any
  prize_type_first?: string | null
  prize_type_second?: string | null
  prize_type_third?: string | null
  custom_extra_key?: string | null
}

// Extends is fine now with corrected base type
export interface ChargingLotteryData extends DynamicLotteryData {
  // business_type is implicitly number | null from base
  // exclusive_level is already in DynamicLotteryData
}

export interface ReservationLotteryData {
  ids: any
  sid?: any
  name?: string
  total?: number
  stime: any
  etime: any
  state?: number
  type?: number
  upmid?: any
  text?: string
  jumpUrl?: string
  dynamicId?: string | null
  livePlanStartTime?: number | null
  reserveTotalShowLimit?: number | null
  upmid_str?: string
  isFollow?: number
  lotteryType?: number
  upActVisible?: number
  desc?: string
  ext?: string
  raw_JSON?: any
  raw?: object
  oid?: string
  oid_str?: string
  dynamicId_str?: string
  code?: number
  message?: string
  ttl?: number
  reserveRecordCtime?: number
  start_show_time?: number
}

export interface TopicEventData {
  jump_url?: string
  title?: string
  end_date_str?: string
  lottery_sid?: string
  lot_type_text?: string
  app_sche?: string
  lottery_pool_text?: string | null
} // Added lottery_pool_text
export interface AnchorLotteryData {
  lot_id: any
  type?: 'anchor'
  award_name?: string
  end_time: any
  require_type?: number
  danmu?: string | null
  anchor_uid?: any
  room_id?: any
  live_room_url?: string
  app_schema?: string
  total_price?: number
} // Added danmu?
export interface RedPacketData {
  lot_id: any
  type?: 'popularity_red_pocket'
  award_name?: string
  end_time: any
  require_type?: number
  anchor_uid?: any
  room_id?: any
  live_room_url?: string
  app_schema?: string
  total_price?: number
  danmu?: string | null
} // Added danmu?

// Union type for the prop
export type AnyLotteryData =
  | DynamicLotteryData
  | ChargingLotteryData
  | ReservationLotteryData
  | TopicEventData
  | AnchorLotteryData
  | RedPacketData
