/*
 * @Author: 星瞳 1944637830@qq.com
 * @Date: 2024-10-21 18:29:18
 * @LastEditors: 星瞳 1944637830@qq.com
 * @LastEditTime: 2024-10-23 02:03:17
 * @FilePath: \Vue3FrontEndDemoExercise\src\api\lottery_data\bili\lottery_database_bili_api.ts
 * @Description: B 站抽奖数据库 API 接口定义（基于 hey-api 生成的客户端）
 */
import {
  getReserveLotteryApiV1LotteryDatabaseBiliGetReserveLotteryPost,
  getOfficialLotteryApiV1LotteryDatabaseBiliGetOfficialLotteryPost,
  getChargeLotteryApiV1LotteryDatabaseBiliGetChargeLotteryPost,
  getLiveLotteryApiV1LotteryDatabaseBiliGetLiveLotteryPost,
  getTopicLotteryApiV1LotteryDatabaseBiliGetTopicLotteryPost,
  getAllLotteryApiV1LotteryDatabaseBiliGetAllLotteryPost,
  addDynamicLotteryApiV1LotteryDatabaseBiliAddDynamicLotteryPost,
  bulkAddDynamicLotteryApiV1LotteryDatabaseBiliBulkAddDynamicLotteryPost,
  addTopicLotteryApiV1LotteryDatabaseBiliAddTopicLotteryPost,
  addOthersLotDynApiV1LotteryDatabaseBiliAddOthersLotDynPost,
  searchLotteryByKeywordApiV1LotteryDatabaseBiliSearchLotteryByKeywordPost,
  submitFeedbackApiV1LotteryDatabaseBiliSubmitFeedbackPost,
  getOthersLotDynListApiV1LotteryDatabaseBiliGetOthersLotDynListPost,
  getLotteryFilterParamsApiV1LotteryDatabaseBiliGetLotteryFilterParamsGet,
  getAllLotScrapyStatusApiV1LotteryDatabaseBiliGetAllLotScrapyStatusGet,
} from '@/api/bili_lottery_data/hey-api'
import type {
  LotteryAdvancedQueryParams,
  LotteryPaginationParams,
  LotterySearchPaginationParams,
  AddDynamicLotteryReq,
  BulkAddDynamicLotteryReq,
  AddTopicLotteryReq,
  SubmitFeedbackReq,
  OthersLotDynSortEnum,
  OthersLotDynSortOrderEnum,
  TimePresetEnum,
} from '@/api/bili_lottery_data/hey-api'
import type { RootObject } from '@/models/api/base_model.ts'
import type { LotDataView, ScrapyStatusResp } from '@/models/api/lottery/lotdata'

// ==================== 响应类型定义（兼容旧接口） ====================

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

export interface ReserveInfoResp {
  reserve_url: string
  lottery_prize_info: string
  etime: number
  jump_url: string
  reserve_sid: number
  available: boolean
  app_sche: string
  dynamic_id?: number | null
  dynamic_id_str?: string | null
  total?: number | null
  extra_fields?: Record<string, any> | null
}

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

export interface AllLotteryResp {
  common_lottery: CommonLotteryResp[]
  must_join_common_lottery: CommonLotteryResp[]
  reserve_lottery: ReserveInfoResp[]
  official_lottery: OfficialLotteryResp[]
  extra_fields?: Record<string, any> | null
}

export interface OthersLotDynItem {
  dynId: number
  dynamicUrl: string | null
  authorName: string | null
  up_uid: number | null
  pubTime: string | null
  dynContent: string | null
  commentCount: number | null
  repostCount: number | null
  highlightWords: string | null
  officialLotType: string | null
  isOfficialAccount: number | null
  isManualReply: string | null
  isFollowed: number | null
  isLot: number | null
  hashTag: string | null
  created_at: string | null
  dynId_str?: string
  up_uid_str?: string | null
  extra_fields?: Record<string, any> | null
}

export interface OthersLotDynListParams extends LotteryPaginationParams {
  sort_by?: string
  sort_order?: string
  is_lot?: boolean | null
  created_at_preset?: string | null
  pub_time_preset?: string | null
  pub_time_start?: number | null
  pub_time_end?: number | null
  created_at_start?: number | null
  created_at_end?: number | null
}

export interface FilterEnumValue {
  label: string
  value: string
}

export interface FilterParamMeta {
  param_name: string
  display_name: string
  param_type: string
  widget: string
  enum_values: FilterEnumValue[] | null
  default_value: any | null
  description: string
  required: boolean
  placeholder: string | null
}

export interface EndpointFilterMeta {
  endpoint_path: string
  display_name: string
  params: FilterParamMeta[]
}

export interface LotteryFilterParamsResp {
  endpoints: EndpointFilterMeta[]
}

// ==================== API 类定义（基于 hey-api 生成客户端） ====================

class LotteryDataBaseApi {
  // ==================== 获取各类抽奖数据 ====================

  async getReserveLottery(
    params: LotteryAdvancedQueryParams
  ): Promise<RootObject<LotDataView<ReserveInfoResp>>> {
    const res = await getReserveLotteryApiV1LotteryDatabaseBiliGetReserveLotteryPost({
      body: params as any,
    })
    return res as any
  }

  async getOfficialLottery(
    params: LotteryAdvancedQueryParams
  ): Promise<RootObject<LotDataView<OfficialLotteryResp>>> {
    const res = await getOfficialLotteryApiV1LotteryDatabaseBiliGetOfficialLotteryPost({
      body: params as any,
    })
    return res as any
  }

  async getChargeLottery(
    params: LotteryAdvancedQueryParams
  ): Promise<RootObject<LotDataView<ChargeLotteryResp>>> {
    const res = await getChargeLotteryApiV1LotteryDatabaseBiliGetChargeLotteryPost({
      body: params as any,
    })
    return res as any
  }

  async getLiveLottery(
    params: LotteryAdvancedQueryParams
  ): Promise<RootObject<LotDataView<LiveLotteryResp>>> {
    const res = await getLiveLotteryApiV1LotteryDatabaseBiliGetLiveLotteryPost({
      body: params as any,
    })
    return res as any
  }

  async getTopicLottery(
    params: LotteryAdvancedQueryParams
  ): Promise<RootObject<LotDataView<TopicLotteryResp>>> {
    const res = await getTopicLotteryApiV1LotteryDatabaseBiliGetTopicLotteryPost({
      body: params as any,
    })
    return res as any
  }

  async getAllLottery(round_num: number): Promise<RootObject<AllLotteryResp>> {
    const res = await getAllLotteryApiV1LotteryDatabaseBiliGetAllLotteryPost({
      query: { round_num },
    })
    return res as any
  }

  // ==================== 提交抽奖数据 ====================

  async addDynamicLottery(dynamic_id_or_url: string): Promise<RootObject<AddDynamicLotteryResp>> {
    const res = await addDynamicLotteryApiV1LotteryDatabaseBiliAddDynamicLotteryPost({
      body: { dynamic_id_or_url } as AddDynamicLotteryReq,
    })
    return res as any
  }

  async bulkAddDynamicLottery(
    dynamic_id_or_urls: string[]
  ): Promise<RootObject<BulkAddDynamicLotteryResp[]>> {
    const res = await bulkAddDynamicLotteryApiV1LotteryDatabaseBiliBulkAddDynamicLotteryPost({
      body: { dynamic_id_or_urls } as BulkAddDynamicLotteryReq,
    })
    return res as any
  }

  async addTopicLottery(topic_id: string | number): Promise<RootObject<AddTopicLotteryResp>> {
    const res = await addTopicLotteryApiV1LotteryDatabaseBiliAddTopicLotteryPost({
      body: { topic_id } as AddTopicLotteryReq,
    })
    return res as any
  }

  async addOthersLotDyn(dynamic_id_or_url: string): Promise<RootObject<AddDynamicLotteryResp>> {
    const res = await addOthersLotDynApiV1LotteryDatabaseBiliAddOthersLotDynPost({
      body: { dynamic_id_or_url } as AddDynamicLotteryReq,
    })
    return res as any
  }

  // ==================== 搜索与反馈 ====================

  async searchLotteryByKeyword(
    params: LotterySearchPaginationParams
  ): Promise<RootObject<LotDataView<any>>> {
    const res = await searchLotteryByKeywordApiV1LotteryDatabaseBiliSearchLotteryByKeywordPost({
      body: params as any,
    })
    return res as any
  }

  async submitFeedback(message: string): Promise<RootObject<Record<string, any>>> {
    const res = await submitFeedbackApiV1LotteryDatabaseBiliSubmitFeedbackPost({
      body: { message } as SubmitFeedbackReq,
    })
    return res as any
  }

  // ==================== 第三方抽奖动态列表 ====================

  async getOthersLotDynList(
    params: OthersLotDynListParams
  ): Promise<RootObject<LotDataView<OthersLotDynItem>>> {
    const { page_num, page_size, sort_by, sort_order, is_lot, created_at_preset, pub_time_preset, pub_time_start, pub_time_end, created_at_start, created_at_end } = params
    const res = await getOthersLotDynListApiV1LotteryDatabaseBiliGetOthersLotDynListPost({
      body: { page_num, page_size },
      query: {
        sort_by: sort_by as OthersLotDynSortEnum,
        sort_order: sort_order as OthersLotDynSortOrderEnum,
        is_lot: is_lot ?? undefined,
        created_at_preset: created_at_preset as TimePresetEnum | undefined,
        pub_time_preset: pub_time_preset as TimePresetEnum | undefined,
        pub_time_start: pub_time_start ?? undefined,
        pub_time_end: pub_time_end ?? undefined,
        created_at_start: created_at_start ?? undefined,
        created_at_end: created_at_end ?? undefined,
      },
    })
    return res as any
  }

  // ==================== 筛选参数元数据 ====================

  async getLotteryFilterParams(): Promise<RootObject<LotteryFilterParamsResp>> {
    const res = await getLotteryFilterParamsApiV1LotteryDatabaseBiliGetLotteryFilterParamsGet()
    return res as any
  }

  // ==================== 爬虫状态 ====================

  async get_all_scrapy_status(): Promise<RootObject<ScrapyStatusResp>> {
    const res = await getAllLotScrapyStatusApiV1LotteryDatabaseBiliGetAllLotScrapyStatusGet()
    return res as any
  }

  // ==================== 兼容旧版的方法（已废弃） ====================

  /**
   * @deprecated 请使用新的具体方法替代
   */
  async handle_lottery_data(
    { page_num, page_size }: { page_num: number; page_size: number },
    data_type:
      | 'GetOfficialLottery'
      | 'GetReserveLottery'
      | 'GetChargeLottery'
      | 'GetLiveLottery'
      | 'GetTopicLottery'
      | string
  ): Promise<RootObject<LotDataView<any> | undefined>> {
    const params = { page_num, page_size }
    switch (data_type) {
      case 'GetOfficialLottery':
        return this.getOfficialLottery(params)
      case 'GetReserveLottery':
        return this.getReserveLottery(params)
      case 'GetChargeLottery':
        return this.getChargeLottery(params)
      case 'GetLiveLottery':
        return this.getLiveLottery(params)
      case 'GetTopicLottery':
        return this.getTopicLottery(params)
      default:
        return this.getOfficialLottery(params)
    }
  }

  /**
   * @deprecated 请使用 addDynamicLottery 替代
   */
  async handle_add_dynamic_lottery_data({
    dynamic_id_or_url
  }: {
    dynamic_id_or_url: string
  }): Promise<RootObject<AddDynamicLotteryResp | undefined>> {
    return this.addDynamicLottery(dynamic_id_or_url)
  }

  /**
   * @deprecated 请使用 bulkAddDynamicLottery 替代
   */
  async handle_bulk_add_dynamic_lottery_data({
    dynamic_id_or_urls
  }: {
    dynamic_id_or_urls: string[]
  }): Promise<RootObject<AddDynamicLotteryResp[] | undefined>> {
    return this.bulkAddDynamicLottery(dynamic_id_or_urls)
  }

  /**
   * @deprecated 请使用 addTopicLottery 替代
   */
  async handle_add_topic_lottery_data({
    topic_id
  }: {
    topic_id: string | number
  }): Promise<RootObject<AddTopicLotteryResp | undefined>> {
    return this.addTopicLottery(topic_id)
  }

  /**
   * @deprecated 请使用 searchLotteryByKeyword 替代
   */
  async handle_search_lottery_data({ keyword }: { keyword: string }): Promise<RootObject<any[]>> {
    const resp = await this.searchLotteryByKeyword({ keyword, page_num: 1, page_size: 20 })
    if (resp.code === 0 && resp.data) {
      const lotData = resp.data as LotDataView<any>
      return {
        ...resp,
        data: lotData.items || []
      } as unknown as RootObject<any[]>
    }
    return resp as unknown as RootObject<any[]>
  }
}

const lotteryDataBaseApi = new LotteryDataBaseApi()

export default lotteryDataBaseApi