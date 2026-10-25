/*
 * @Author: 星瞳 1944637830@qq.com
 * @Date: 2024-10-21 18:29:18
 * @LastEditors: 星瞳 1944637830@qq.com
 * @LastEditTime: 2024-10-23 02:03:17
 * @FilePath: \Vue3FrontEndDemoExercise\src\api\lottery_data\bili\lottery_database_bili_api.ts
 * @Description: B 站抽奖数据库 API 接口定义（基于 hey-api 生成的客户端）
 */
import { V1BiliService } from '@/api/bili_lottery_data/hey-api'
import type {
  LotterySearchPaginationParams,
  GetReserveLotteryApiV1LotteryDatabaseBiliGetReserveLotteryGetData,
  AddDynamicLotteryReq,
  BulkAddDynamicLotteryReq,
  BulkAddOthersLotDynReq,
  AddTopicLotteryReq,
  BulkAddTopicLotteryReq,
  OthersLotDynSortEnum,
  OthersLotDynSortOrderEnum,
  TimePresetEnum,
  CommonLotExtraInfoResp,
  LotteryDetailResp,
  ScrapyTypeEnum,
} from '@/api/bili_lottery_data/hey-api'
import type { OthersLotPrizeInfo } from '@/models/api/lottery/lottery_card'

export type {
  LotterySearchPaginationParams,
}
import type { RootObject } from '@/models/api/base_model.ts'
import { client } from '@/api/bili_lottery_data/hey-api/client.gen'
import type { LotDataView, ScrapyStatusResp, ScrapyStatus, OfficialScrapyStatus } from '@/models/api/lottery/lotdata'

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
  prize_info?: OthersLotPrizeInfo | null
  extra_info?: CommonLotExtraInfoResp | null
  extra_fields?: Record<string, any> | null
}

/**
 * 抽奖列表 GET 查询参数（预约/官方/充电/话题共用）。
 *
 * 接口 GET 化后，后端用显式标量 query 参数承接、不再把入参模型写进 OpenAPI，
 * SDK 里也就没有了 LotteryAdvancedQueryParams 类型；这里直接从生成的
 * GetReserveLottery query 契约推导（去掉防缓存参数 t），与后端参数保持同步。
 */
type _LotteryListQuery = NonNullable<
  GetReserveLotteryApiV1LotteryDatabaseBiliGetReserveLotteryGetData['query']
>
export type LotteryAdvancedQueryParams = Omit<_LotteryListQuery, 't'>

export interface LotteryPaginationParams {
  page_num?: number
  page_size?: number
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

// ==================== 管理端数据汇总（GetLotteryDataSummary） ====================

/** 汇总表的一行：一个数据源 / 一种抽奖类型；字段为 null 表示该数据源不具备该统计口径 */
export interface LotterySummaryRow {
  key: string
  type_name: string
  source: string
  total: number
  not_drawn: number | null
  drawing_soon_24h: number | null
  pending_result: number | null
  grand_prize: number | null
  new_yesterday: number | null
  new_prev_day: number | null
  new_this_week: number | null
  new_this_month: number | null
  participants_avg: number | null
  participants_max: number | null
  participants_total: number | null
}

/** 近 N 天每日新增趋势点；counts 的 key 与 LotterySummaryRow.key 对应 */
export interface LotteryTrendPoint {
  date: string
  counts: Record<string, number>
}

/** 即将开奖明细项（仅限 24 小时内开奖） */
export interface UpcomingLotteryItem {
  lottery_id: number | string
  business_id: number | string | null
  business_type: number
  /** 抽奖类型标识：official/reserve/charge，用于前端按抽奖类型筛选 */
  key: string
  type_name: string
  lottery_time: number
  participants: number | null
  sender_uid: number | string | null
}

/** 管理端 bili-crawler 数据汇总响应 */
export interface LotteryDataSummaryResp {
  generated_at: number
  latest_created_at: number | null
  rows: LotterySummaryRow[]
  trend: LotteryTrendPoint[]
  upcoming: UpcomingLotteryItem[]
}

// ==================== API 类定义（基于 hey-api 生成客户端） ====================

class LotteryDataBaseApi {
  // ==================== 获取各类抽奖数据 ====================

  async getReserveLottery(
    params: LotteryAdvancedQueryParams
  ): Promise<RootObject<LotDataView<ReserveInfoResp>>> {
    const res = await V1BiliService.getReserveLotteryApiV1LotteryDatabaseBiliGetReserveLotteryGet({
      // 已改为 GET：筛选参数走 query，附带 t=当前时间戳防止浏览器缓存
      query: { ...params, t: Date.now() },
    })
    return res as any
  }

  async getOfficialLottery(
    params: LotteryAdvancedQueryParams
  ): Promise<RootObject<LotDataView<OfficialLotteryResp>>> {
    const res = await V1BiliService.getOfficialLotteryApiV1LotteryDatabaseBiliGetOfficialLotteryGet({
      query: { ...params, t: Date.now() },
    })
    return res as any
  }

  async getChargeLottery(
    params: LotteryAdvancedQueryParams
  ): Promise<RootObject<LotDataView<ChargeLotteryResp>>> {
    const res = await V1BiliService.getChargeLotteryApiV1LotteryDatabaseBiliGetChargeLotteryGet({
      query: { ...params, t: Date.now() },
    })
    return res as any
  }

  async getLiveLottery(
    params: LotteryAdvancedQueryParams
  ): Promise<RootObject<LotDataView<LiveLotteryResp>>> {
    const res = await V1BiliService.getLiveLotteryApiV1LotteryDatabaseBiliGetLiveLotteryGet({
      query: { ...params, t: Date.now() },
    })
    return res as any
  }

  async getTopicLottery(
    params: LotteryAdvancedQueryParams
  ): Promise<RootObject<LotDataView<TopicLotteryResp>>> {
    const res = await V1BiliService.getTopicLotteryApiV1LotteryDatabaseBiliGetTopicLotteryGet({
      query: { ...params, t: Date.now() },
    })
    return res as any
  }

  async getAllLottery(
    created_at_preset: string | null = '30d',
    created_at_start: number | null = null,
    created_at_end: number | null = null,
    pub_time_preset: string | null = '30d',
    pub_time_start: number | null = null,
    pub_time_end: number | null = null,
  ): Promise<RootObject<AllLotteryResp>> {
    const res = await V1BiliService.getAllLotteryApiV1LotteryDatabaseBiliGetAllLotteryGet({
      query: {
        created_at_preset: created_at_preset as TimePresetEnum | null,
        created_at_start,
        created_at_end,
        pub_time_preset: pub_time_preset as TimePresetEnum | null,
        pub_time_start,
        pub_time_end,
        // 防浏览器缓存时间戳
        t: Date.now(),
      },
    })
    return res as any
  }

  /**
   * 按 lottery_id 获取单个抽奖卡片详情（后端 GetLotteryDetail，计划书 Phase 9）。
   *
   * 响应 `{ raw: LotdataResp, extra_info }` 与 GetOfficialLottery 列表项形态一致，
   * 可直接交 `normalizeLotteryData` 渲染完整卡片；资源不存在时 `code !== 0`。
   */
  async getLotteryDetailById(
    lottery_id: string | number
  ): Promise<RootObject<LotteryDetailResp | null>> {
    const res = await V1BiliService.getLotteryDetailApiV1LotteryDatabaseBiliGetLotteryDetailGet({
      // 已改为 GET：lottery_id 走 query，附带 t 时间戳防浏览器缓存
      query: { lottery_id: Number(lottery_id), t: Date.now() },
    })
    return res as any
  }

  /**
   * 按 `dynId` 获取单个第三方抽奖动态详情（后端 GetOthersLotDynDetail，2.61.0）。
   *
   * 第三方抽奖动态没有 `lottery_id`，**不能**走 `getLotteryDetailById`（那按 lotdata 主键查）；
   * 响应形态与 GetOthersLotDynList 列表项一致，可直接交 `normalizeLotteryData` 渲染。
   *
   * ⚠️ `dynId` 是 **19 位雪花 ID**，超过 JS `Number.MAX_SAFE_INTEGER`：
   * `Number(dynId)` / 网关 `JSON.parse` 会把它四舍五入（`...52360` → `...52400`），
   * 后端按错误 ID 查询必然 404，故**必须以字符串传递**（后端 `dyn_id` 为 StrInt，
   * 接受数字字符串并归一为 int）。
   */
  async getOthersLotDynDetailById(
    dynId: string | number
  ): Promise<RootObject<OthersLotDynItem | null>> {
    const res = await V1BiliService.getOthersLotDynDetailApiV1LotteryDatabaseBiliGetOthersLotDynDetailGet({
      // 已改为 GET：dyn_id 以字符串走 query（19 位雪花 ID，Number() 会丢精度导致后端查不到），附带 t 防缓存
      query: { dyn_id: String(dynId), t: Date.now() },
    })
    return res as any
  }

  // ==================== 提交抽奖数据 ====================

  async addDynamicLottery(dynamic_id_or_url: string): Promise<RootObject<AddDynamicLotteryResp>> {
    const res = await V1BiliService.addDynamicLotteryApiV1LotteryDatabaseBiliAddDynamicLotteryPost({
      body: { dynamic_id_or_url } as AddDynamicLotteryReq,
    })
    return res as any
  }

  async bulkAddDynamicLottery(
    dynamic_id_or_urls: string[]
  ): Promise<RootObject<BulkAddDynamicLotteryResp[]>> {
    const res = await V1BiliService.bulkAddDynamicLotteryApiV1LotteryDatabaseBiliBulkAddDynamicLotteryPost({
      body: { dynamic_id_or_urls } as BulkAddDynamicLotteryReq,
    })
    return res as any
  }

  async addTopicLottery(topic_id: string | number): Promise<RootObject<AddTopicLotteryResp>> {
    const res = await V1BiliService.addTopicLotteryApiV1LotteryDatabaseBiliAddTopicLotteryPost({
      body: { topic_id } as AddTopicLotteryReq,
    })
    return res as any
  }

  async bulkAddTopicLottery(
    topic_ids: Array<string | number>
  ): Promise<RootObject<AddTopicLotteryResp[]>> {
    const res = await V1BiliService.bulkAddTopicLotteryApiV1LotteryDatabaseBiliBulkAddTopicLotteryPost({
      body: { topic_ids } as BulkAddTopicLotteryReq,
    })
    return res as any
  }

  async addOthersLotDyn(dynamic_id_or_url: string): Promise<RootObject<AddDynamicLotteryResp>> {
    const res = await V1BiliService.addOthersLotDynApiV1LotteryDatabaseBiliAddOthersLotDynPost({
      body: { dynamic_id_or_url } as AddDynamicLotteryReq,
    })
    return res as any
  }

  async bulkAddOthersLotDyn(
    dynamic_id_or_urls: string[]
  ): Promise<RootObject<AddDynamicLotteryResp[]>> {
    const res = await V1BiliService.bulkAddOthersLotDynApiV1LotteryDatabaseBiliBulkAddOthersLotDynPost({
      body: { dynamic_id_or_urls } as BulkAddOthersLotDynReq,
    })
    return res as any
  }

  // ==================== 搜索 ====================

  async searchLotteryByKeyword(
    params: LotterySearchPaginationParams
  ): Promise<RootObject<LotDataView<any>>> {
    const res = await V1BiliService.searchLotteryByKeywordApiV1LotteryDatabaseBiliSearchLotteryByKeywordPost({
      body: params as any,
    })
    return res as any
  }

  // ==================== 第三方抽奖动态列表 ====================

  async getOthersLotDynList(
    params: OthersLotDynListParams
  ): Promise<RootObject<LotDataView<OthersLotDynItem>>> {
    const { page_num, page_size, sort_by, sort_order, is_lot, created_at_preset, pub_time_preset, pub_time_start, pub_time_end, created_at_start, created_at_end } = params
    const res = await V1BiliService.getOthersLotDynListApiV1LotteryDatabaseBiliGetOthersLotDynListGet({
      // 已改为 GET：分页 + 筛选参数全部走 query，附带 t=当前时间戳防止浏览器缓存
      query: {
        page_num,
        page_size,
        sort_by: sort_by as OthersLotDynSortEnum,
        sort_order: sort_order as OthersLotDynSortOrderEnum,
        is_lot: is_lot ?? undefined,
        created_at_preset: created_at_preset as TimePresetEnum | undefined,
        pub_time_preset: pub_time_preset as TimePresetEnum | undefined,
        pub_time_start: pub_time_start ?? undefined,
        pub_time_end: pub_time_end ?? undefined,
        created_at_start: created_at_start ?? undefined,
        created_at_end: created_at_end ?? undefined,
        t: Date.now(),
      },
    })
    return res as any
  }

  // ==================== 筛选参数元数据 ====================

  async getLotteryFilterParams(): Promise<RootObject<LotteryFilterParamsResp>> {
    const res = await V1BiliService.getLotteryFilterParamsApiV1LotteryDatabaseBiliGetLotteryFilterParamsGet()
    return res as any
  }

  // ==================== 爬虫状态 ====================

  // 直接调用后端的全量接口 lottery_database/bili/GetAllLotScrapyStatus，一次返回所有爬虫状态
  async get_all_scrapy_status(): Promise<RootObject<ScrapyStatusResp>> {
    const res = await V1BiliService.getAllLotScrapyStatusApiV1LotteryDatabaseBiliGetAllLotScrapyStatusGet()
    return res as any
  }

  /** 查询单个爬虫状态（按 ScrapyTypeEnum 入参） */
  async get_single_scrapy_status(
    scrapy_name: ScrapyTypeEnum
  ): Promise<RootObject<ScrapyStatus | OfficialScrapyStatus | null>> {
    const res = await V1BiliService.getSingleScrapyStatusApiV1LotteryDatabaseBiliGetSingleScrapyStatusGet({
      query: { scrapy_name, t: Date.now() },
    })
    return res as any
  }

  // ==================== 管理端数据汇总 ====================

  /**
   * 管理端「bili-crawler 数据汇总」：按抽奖类型统计未开奖数、昨日/本周/本月新增、
   * 累计总量、24h 内即将开奖、待抓结果积压、大奖数、参与人数分布、近 14 天新增趋势、
   * 即将开奖明细，并额外汇总话题 / 直播 / 第三方动态抽奖。
   *
   * 该接口尚未纳入 hey-api 生成的 SDK，故直接用生成的底层 client 发请求；
   * `runtime_config.ts` 已设置 `responseStyle: 'data'`，promise 直接 resolve 响应体。
   */
  async getLotterySummary(): Promise<RootObject<LotteryDataSummaryResp>> {
    const res = await client.get({
      url: '/api/v1/lottery_database/bili/GetLotteryDataSummary',
      // 附带 t=当前时间戳防止浏览器/CDN 缓存
      query: { t: Date.now() },
    })
    return res as unknown as RootObject<LotteryDataSummaryResp>
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