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
import type {
  LotDataView,
  LotteryRankResp,
  LotteryResultResp,
  ScrapyStatusResp
} from '@/models/lottery/lotdata'
import { LotteryRankDateType, LotteryRankLotType, LotteryRankType } from '@/models/lottery/lotdata'

class LotteryDataStatisticApi extends BaseApi {
  constructor() {
    super()
    this.path = '/api/v1/lottery_database/bili/'
  }

  async handle_lottery_rank(
    { offset, limit }: { offset: number; limit: number },
    date: LotteryRankDateType,
    lot_type: LotteryRankLotType,
    rank_type: LotteryRankType
  ): Promise<RootObject<LotteryRankResp>> {
    return await this._get('rank/lottery_hof/'.concat(lot_type), { date, rank_type, offset, limit })
  }

  async handle_lottery_result({
    uid,
    date,
    lot_type,
    rank_type,
    offset,
    limit
  }: {
    uid: number | string
    date: LotteryRankDateType
    lot_type: LotteryRankLotType
    rank_type: LotteryRankType
    offset: number
    limit: number
  }): Promise<RootObject<LotteryResultResp>> {
    return await this._get('lottery_result', { uid, date, lot_type, rank_type, offset, limit })
  }
}

const lotteryDataStatisticApi = new LotteryDataStatisticApi()

export default lotteryDataStatisticApi
