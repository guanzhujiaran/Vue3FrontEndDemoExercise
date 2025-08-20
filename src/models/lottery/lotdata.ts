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
export interface ScrapyParams {
  rid?: number
  topic_id?: number
  reserve_id?: number
  extra_fields: null
}

export interface ScrapyStatus {
  crawling_speed: number
  end_params: ScrapyParams
  end_success_params: ScrapyParams
  init_params: ScrapyParams
  is_running: boolean
  last_update_time: number
  last_update_time_str: string
  null_count: number
  processed_items_count: number
  running_params_set: ScrapyParams[]
  start_time: number
  start_time_str: string
  succ_count: number
  total_run_duration: number
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
