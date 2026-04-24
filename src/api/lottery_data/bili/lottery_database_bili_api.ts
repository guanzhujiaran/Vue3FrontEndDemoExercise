/*
 * @Author: 星瞳 1944637830@qq.com
 * @Date: 2024-10-21 18:29:18
 * @LastEditors: 星瞳 1944637830@qq.com
 * @LastEditTime: 2024-10-23 02:03:17
 * @FilePath: \Vue3FrontEndDemoExercise\src\api\lottery_data\bili\lottery_database_bili_api.ts
 * @Description: B 站抽奖数据库 API 接口定义
 */
import BaseApi from '@/api/base_axios/base_api'
import type { RootObject } from '@/models/api/base_model.ts'
import type { LotDataView, ScrapyStatusResp } from '@/models/api/lottery/lotdata'

// ==================== 响应类型定义 ====================

export interface AddDynamicLotteryResp {
  dynamic_id_or_url: string
  msg: string
  is_succ: boolean
  is_new: boolean
  extra_fields?: Record<string, any> | null
}

export interface AddTopicLotteryResp {
  topic_id: string | number
  msg: string
  is_succ: boolean
  is_new: boolean
  extra_fields?: Record<string, any> | null
}

export interface BulkAddDynamicLotteryResp {
  msg: string
  is_succ: boolean
  is_new: boolean
  dynamic_id_or_url: string
  extra_fields?: Record<string, any> | null
}

// 一般抽奖响应
export interface CommonLotteryResp {
  dynId: string
  dynamicUrl: string
  authorName: string
  up_uid: number
  pubTime: string
  dynContent: string
  commentCount: number | null
  repostCount: number | null
  highlightWords: string
  officialLotType: string
  officialLotId: string
  isOfficialAccount: number
  isManualReply: string
  isFollowed: number
  isLot: number
  hashTag: string
  extra_fields?: Record<string, any> | null
}

// 预约抽奖响应
export interface ReserveInfoResp {
  reserve_url: string
  lottery_prize_info: string
  etime: number
  jump_url: string
  reserve_sid: number
  available: boolean
  app_sche: string
  raw: Record<string, any>
  extra_fields?: Record<string, any> | null
}

// 官方抽奖响应
export interface OfficialLotteryResp {
  jump_url: string
  app_sche: string
  lottery_text: string
  lottery_time: number
  dynId: string
  sender_uid: string
  lottery_id: number
  raw: Record<string, any>
  extra_fields?: Record<string, any> | null
}

// 充电抽奖响应
export interface ChargeLotteryResp {
  jump_url: string
  app_sche: string
  lottery_text: string
  lottery_time: number
  dynId: string
  sender_uid: string
  lottery_id: number
  upower_level_str: string
  raw: Record<string, any>
  extra_fields?: Record<string, any> | null
}

// 直播抽奖响应
export interface LiveLotteryResp {
  live_room_url: string
  app_schema: string
  award_name: string
  type: string
  end_time: number
  total_price: number
  danmu: string
  anchor_uid: number
  room_id: number
  lot_id: number
  require_type: number
  extra_fields?: Record<string, any> | null
}

// 话题抽奖响应
export interface TopicLotteryResp {
  jump_url: string
  app_sche: string
  title: string
  end_date_str: string
  lot_type_text: string
  lottery_pool_text: string
  lottery_sid: string | null
  extra_fields?: Record<string, any> | null
}

// 所有抽奖响应（GetAllLottery）
export interface AllLotteryResp {
  common_lottery: CommonLotteryResp[]
  must_join_common_lottery: CommonLotteryResp[]
  reserve_lottery: ReserveInfoResp[]
  official_lottery: OfficialLotteryResp[]
  extra_fields?: Record<string, any> | null
}

// 分页参数
export interface LotteryPaginationParams {
  page_num: number
  page_size: number
}

export interface LotteryWithLimitTimePaginationParams extends LotteryPaginationParams {
  limit_time: number
}

export interface LotterySearchPaginationParams extends LotteryPaginationParams {
  keyword: string
}

// ==================== API 类定义 ====================

class LotteryDataBaseApi extends BaseApi {
  constructor() {
    super()
    this.path = '/api/v1/lottery_database/bili/'
  }

  // ==================== 获取各类抽奖数据 ====================

  /**
   * 获取一般抽奖数据
   */
  getCommonLottery(round_num: number = 2): Promise<RootObject<CommonLotteryResp[]>> {
    return this._post('GetCommonLottery', { round_num })
  }

  /**
   * 获取预约抽奖数据（分页）
   */
  getReserveLottery(
    params: LotteryWithLimitTimePaginationParams
  ): Promise<RootObject<LotDataView<ReserveInfoResp>>> {
    return this._post('GetReserveLottery', params)
  }

  /**
   * 获取官方抽奖数据（分页）
   */
  getOfficialLottery(
    params: LotteryWithLimitTimePaginationParams
  ): Promise<RootObject<LotDataView<OfficialLotteryResp>>> {
    return this._post('GetOfficialLottery', params)
  }

  /**
   * 获取充电抽奖数据（分页）
   */
  getChargeLottery(
    params: LotteryWithLimitTimePaginationParams
  ): Promise<RootObject<LotDataView<ChargeLotteryResp>>> {
    return this._post('GetChargeLottery', params)
  }

  /**
   * 获取直播抽奖数据（分页）
   */
  getLiveLottery(
    params: LotteryPaginationParams
  ): Promise<RootObject<LotDataView<LiveLotteryResp>>> {
    return this._post('GetLiveLottery', params)
  }

  /**
   * 获取话题抽奖数据（分页）
   */
  getTopicLottery(
    params: LotteryPaginationParams
  ): Promise<RootObject<LotDataView<TopicLotteryResp>>> {
    return this._post('GetTopicLottery', params)
  }

  /**
   * 获取一轮的所有抽奖信息
   */
  getAllLottery(round_num: number): Promise<RootObject<AllLotteryResp>> {
    return this._get('GetAllLottery', { round_num })
  }

  // ==================== 提交抽奖数据 ====================

  /**
   * 提交单个动态抽奖
   */
  addDynamicLottery(dynamic_id_or_url: string): Promise<RootObject<AddDynamicLotteryResp>> {
    return this._post(
      'AddDynamicLottery',
      { dynamic_id_or_url },
      {
        timeout: 0
      }
    )
  }

  /**
   * 批量提交动态抽奖
   */
  bulkAddDynamicLottery(
    dynamic_id_or_urls: string[]
  ): Promise<RootObject<BulkAddDynamicLotteryResp[]>> {
    return this._post(
      'BulkAddDynamicLottery',
      { dynamic_id_or_urls },
      {
        timeout: 0
      }
    )
  }

  /**
   * 提交话题抽奖
   */
  addTopicLottery(topic_id: string | number): Promise<RootObject<AddTopicLotteryResp>> {
    return this._post('AddTopicLottery', { topic_id }, { timeout: 0 })
  }

  // ==================== 搜索与反馈 ====================

  /**
   * 根据关键词搜索抽奖信息
   */
  searchLotteryByKeyword(
    params: LotterySearchPaginationParams
  ): Promise<RootObject<LotDataView<any>>> {
    return this._post('SearchLotteryByKeyword', params)
  }

  /**
   * 提交反馈信息
   */
  submitFeedback(message: string): Promise<RootObject<Record<string, any>>> {
    return this._post('SubmitFeedback', { message })
  }

  // ==================== 爬虫状态 ====================

  /**
   * 获取所有爬虫状态
   */
  get_all_scrapy_status(): Promise<RootObject<ScrapyStatusResp>> {
    // 临时修改路径，使用 background_service 接口
    const originalPath = this.path
    this.path = '/api/v1/background_service/'
    const result = this._get('GetAllLotScrapyStatus')
    this.path = originalPath
    return result
  }

  // ==================== 兼容旧版的方法（已废弃） ====================

  /**
   * @deprecated 请使用新的具体方法替代
   */
  handle_lottery_data(
    { page_num, page_size }: { page_num: number; page_size: number },
    data_type:
      | 'GetOfficialLottery'
      | 'GetReserveLottery'
      | 'GetChargeLottery'
      | 'GetLiveLottery'
      | 'GetTopicLottery'
      | string
  ): Promise<RootObject<LotDataView<any> | undefined>> {
    return this._get(data_type, { page_num, page_size })
  }

  /**
   * @deprecated 请使用 addDynamicLottery 替代
   */
  handle_add_dynamic_lottery_data({
    dynamic_id_or_url
  }: {
    dynamic_id_or_url: string
  }): Promise<RootObject<AddDynamicLotteryResp | undefined>> {
    return this.addDynamicLottery(dynamic_id_or_url)
  }

  /**
   * @deprecated 请使用 bulkAddDynamicLottery 替代
   */
  handle_bulk_add_dynamic_lottery_data({
    dynamic_id_or_urls
  }: {
    dynamic_id_or_urls: string[]
  }): Promise<RootObject<AddDynamicLotteryResp[] | undefined>> {
    return this.bulkAddDynamicLottery(dynamic_id_or_urls)
  }

  /**
   * @deprecated 请使用 addTopicLottery 替代
   */
  handle_add_topic_lottery_data({
    topic_id
  }: {
    topic_id: string | number
  }): Promise<RootObject<AddTopicLotteryResp | undefined>> {
    return this.addTopicLottery(topic_id)
  }

  /**
   * @deprecated 请使用 searchLotteryByKeyword 替代
   */
  handle_search_lottery_data({ keyword }: { keyword: string }): Promise<RootObject<any[]>> {
    // 返回兼容的数组格式
    return this.searchLotteryByKeyword({ keyword, page_num: 1, page_size: 20 }).then(resp => {
      if (resp.code === 0 && resp.data) {
        const lotData = resp.data as LotDataView<any>
        return {
          ...resp,
          data: lotData.items || []
        } as unknown as RootObject<any[]>
      }
      return resp as unknown as RootObject<any[]>
    })
  }
}

const lotteryDataBaseApi = new LotteryDataBaseApi()

export default lotteryDataBaseApi
