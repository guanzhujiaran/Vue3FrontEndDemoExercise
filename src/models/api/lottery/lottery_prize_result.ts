type LotteryResultItem = {
  uid: number | string
  name: string
  face: string
  hongbao_money: number
}

type LotteryResult = {
  first_prize_result: LotteryResultItem[]
  second_prize_result?: LotteryResultItem[]
  third_prize_result?: LotteryResultItem[]
}

type PrizeTypeValue = {
  stype: number
}

type PrizeType = {
  type: number
  value: PrizeTypeValue
}

export type PrizeResult = {
  lottery_id: number
  business_id: number | string
  status: number
  lottery_time: number // Unix 时间戳
  lottery_at_num: number
  lottery_feed_limit: number
  first_prize: number
  second_prize: number
  third_prize: number
  lottery_result: LotteryResult
  first_prize_cmt: string | null // 奖品描述，如 "68上舰折扣券"
  second_prize_cmt?: string | null // 如果有二等奖的描述，则添加此字段
  third_prize_cmt?: string // 如果有三等奖的描述，则添加此字段
  first_prize_pic?: string // 如果有奖品图片 URL，则添加此字段
  second_prize_pic?: string // 如果有二等奖的图片 URL，则添加此字段
  third_prize_pic?: string // 如果有三等奖的图片 URL，则添加此字段
  need_post: number
  business_type: number
  sender_uid: number | string
  prize_type_first: PrizeType
  prize_type_second?: PrizeType | null // 如果有二等奖，则需要定义此字段
  prize_type_third?: PrizeType | null // 如果有三等奖，则需要定义此字段
  pay_status: number
  ts: number // 时间戳
  _gt_?: any // 根据具体情况调整
  has_charge_right: string
  lottery_detail_url: string // 奖品详情页面链接
  participants: number
  participated: string
  vip_batch_sign?: string // 根据具体情况调整
  exclusive_level?: any // 根据具体情况调整
  followed: number
  reposted: number
  custom_extra_key?: any // 根据具体情况调整
}

// 用户信息类型
export type User = {
  uid: number | string
  name: string
  face: string
}

// 主数据类型
export type LotteryData = {
  user: User
  prize_result: PrizeResult[]
}
