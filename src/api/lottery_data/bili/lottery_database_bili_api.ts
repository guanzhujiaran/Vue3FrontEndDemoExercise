/*
 * @Author: 星瞳 1944637830@qq.com
 * @Date: 2024-10-21 18:29:18
 * @LastEditors: 星瞳 1944637830@qq.com
 * @LastEditTime: 2024-10-23 02:03:17
 * @FilePath: \Vue3FrontEndDemoExercise\src\api\lottery_data\bili\lottery_database_bili_api.ts
 * @Description: 这是默认设置，请设置 `customMade`, 打开 koroFileHeader 查看配置 进行设置：https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import BaseApi from '@/api/base_axios/base_api'
import type { RootObject } from '@/models/api/base_model.ts'
import type { LotDataView, ScrapyStatusResp } from '@/models/api/lottery/lotdata'

export interface AddDynamicLotteryResp {
  dynamic_id_or_url: string
  msg: string
  is_succ: boolean
  is_new: boolean
  extra_fields?: Record<string, any>
}

export interface AddTopicLotteryResp {
  topic_id: string | number
  msg: string
  is_succ: boolean
  is_new: boolean
  extra_fields?: Record<string, any>
}

class LotteryDataBaseApi extends BaseApi {
  constructor() {
    super()
    this.path = '/api/v1/lottery_database/bili/'
  }

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

  handle_add_dynamic_lottery_data({
    dynamic_id_or_url
  }: {
    dynamic_id_or_url: string
  }): Promise<RootObject<AddDynamicLotteryResp | undefined>> {
    return this._post(
      'AddDynamicLottery',
      { dynamic_id_or_url: dynamic_id_or_url },
      {
        timeout: 0
      }
    )
  }

  handle_bulk_add_dynamic_lottery_data({
    dynamic_id_or_urls
  }: {
    dynamic_id_or_urls: string[]
  }): Promise<RootObject<AddDynamicLotteryResp[] | undefined>> {
    return this._post(
      'BulkAddDynamicLottery',
      { dynamic_id_or_urls },
      {
        timeout: 0
      }
    )
  }

  get_all_scrapy_status(): Promise<RootObject<ScrapyStatusResp>> {
    return this._get('GetAllScrapyStatus')
  }

  handle_search_lottery_data({ keyword }: { keyword: string }): Promise<RootObject<any[]>> {
    return this._get('SearchLotteryByKeyword', { keyword })
  }

  handle_add_topic_lottery_data({
    topic_id
  }: {
    topic_id: string | number
  }): Promise<RootObject<AddTopicLotteryResp | undefined>> {
    return this._post('AddTopicLottery', { topic_id }, { timeout: 0 })
  }

  handle_submit_feedback({ message }: { message: string }): Promise<RootObject<Record<string, any>>> {
    return this._post('SubmitFeedback', { message })
  }
}

const lotteryDataBaseApi = new LotteryDataBaseApi()

export default lotteryDataBaseApi
