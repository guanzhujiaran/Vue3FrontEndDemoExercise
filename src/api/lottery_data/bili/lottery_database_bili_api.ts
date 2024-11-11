/*
 * @Author: 星瞳 1944637830@qq.com
 * @Date: 2024-10-21 18:29:18
 * @LastEditors: 星瞳 1944637830@qq.com
 * @LastEditTime: 2024-10-23 02:03:17
 * @FilePath: \Vue3FrontEndDemoExercise\src\api\lottery_data\bili\lottery_database_bili_api.ts
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import BaseApi from '@/api/base_axios/base_api'
import type { RootObject } from '@/models/base_model'
import type { LotDataView } from '@/models/lottery/lotdata'

class LotteryDataBaseApi extends BaseApi {
  constructor() {
    super()
    this.path = '/api/v1/lottery_database/bili/'
  }

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
    return await this._get(data_type, { page_num, page_size })
  }
  async handle_add_dynamic_lottery_data({
    dynamic_id_or_url
  }: {
    dynamic_id_or_url: string
  }): Promise<RootObject<string|undefined>> {
    return await this._post('AddDynamicLottery', { dynamic_id_or_url: dynamic_id_or_url })
  }
}

const lotteryDataBaseApi = new LotteryDataBaseApi()

export default lotteryDataBaseApi
