import type { BaseSimpleUserInfo } from '@/models/compo/ranking/Ranking.ts'
import type { PrizeResult } from '@/models/lottery/lottery_prize_result.ts'

export interface LotDataView<T> {
  items: T[]
  total: number
}

export interface LotDataWrapperProps {
  lot_name:
    | 'GetOfficialLottery'
    | 'GetReserveLottery'
    | 'GetChargeLottery'
    | 'GetLiveLottery'
    | 'GetTopicLottery'
    | string
  lot_data: LotDataView<any>
  lot_page: number
  loading: boolean
  error:boolean
}

export interface LotUploadAreaProps {
  title: string
  placeholder: string
  is_textarea_able: boolean
}

//region 爬虫状态响应类型
export interface ScrapyStatus {
  succ_count: number
  cur_stop_num: number
  start_ts: number
  freq: number
  is_running: boolean
  latest_rid?: number
  latest_succ_dyn_id?: number
  first_dyn_id?: string
  update_ts: number
  latest_succ_dyn_id_str?: string
  first_dyn_id_str?: string
  latest_succ_topic_id?: number
  first_topic_id?: number
  latest_topic_id?: number
  latest_succ_first_topic_id_str?: string
  first_topic_id_str?: string
  latest_succ_reserve_id?: number
  first_reserve_id?: number
  latest_reserve_id?: number
}

export interface ScrapyStatusResp {
  dyn_scrapy_status: ScrapyStatus
  topic_scrapy_status: ScrapyStatus
  reserve_scrapy_status: ScrapyStatus
}
//endregion

//region B站抽奖统计数据响应类型
export enum LotteryRankLotType {
  official = 'official',
  reserve = 'reserve',
  charge = 'charge',
  total = 'total'
}

export enum LotteryRankDateType {
  month = 'month',
  pre_month = 'pre_month',
  year = 'year',
  pre_year = 'pre_yrea',
  total = 'total'
}

export enum LotteryRankType {
  first = 'first',
  second = 'second',
  third = 'third',
  total = 'total'
}

export type LotteryRankResp = {
  sync_ts: number
  winners: {
    user: BaseSimpleUserInfo
    count: number
    rank: number
  }[]
  total: number
}

export type LotteryResultResp = {
  user: BaseSimpleUserInfo
  prize_result: PrizeResult[]
  total: number
}
//endregion

export enum ParentLotDataTab {
  Bili = 'bili',
  ScrapyStat = 'scrapy-stat',
  Bili_Atari_HOF = 'bili-atari-hall-of-fame'
}

export type PartitionParamsInfo = {
  displayName: string //显示的名称
  paramValue: string //对应的参数
}

export type RankingPartition = {
  partitionName: string // 分区的中文名称
  partitionValue: string // 分区的值
  params: PartitionParamsInfo[] // 对应的参数名称列表
  activeValue: PartitionParamsInfo['paramValue']
}
