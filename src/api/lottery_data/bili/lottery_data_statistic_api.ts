/*
 * @Author: 星瞳 1944637830@qq.com
 * @Date: 2024-10-21 18:29:18
 * @LastEditors: 星瞳 1944637830@qq.com
 * @LastEditTime: 2024-10-23 02:03:17
 * @FilePath: \Vue3FrontEndDemoExercise\src\api\lottery_data\bili\lottery_data_statistic_api.ts
 * @Description: B 站抽奖数据统计 API（基于 hey-api 生成的客户端）
 */
import {
  lotteryHofApiV1LotteryDatabaseBiliLotteryHofLotTypeGet,
  lotteryResultApiV1LotteryDatabaseBiliLotteryResultGet,
} from '@/api/bili_lottery_data/hey-api'
import type {
  BiliLotStatisticLotTypeEnum,
  BiliLotStatisticRankTypeEnum,
  BiliLotStatisticRankDateTypeEnum,
} from '@/api/bili_lottery_data/hey-api'
import type { RootObject } from '@/models/api/base_model.ts'
import type {
  LotteryRankResp,
  LotteryResultResp,
} from '@/models/api/lottery/lotdata'
import {
  LotteryRankDateType,
  LotteryRankLotType,
  LotteryRankType,
} from '@/models/api/lottery/lotdata'

class LotteryDataStatisticApi {
  async handle_lottery_rank(
    { offset, limit }: { offset: number; limit: number },
    date: LotteryRankDateType,
    lot_type: LotteryRankLotType,
    rank_type: LotteryRankType,
  ): Promise<RootObject<LotteryRankResp>> {
    const res = await lotteryHofApiV1LotteryDatabaseBiliLotteryHofLotTypeGet({
      path: { lot_type: lot_type as unknown as BiliLotStatisticLotTypeEnum },
      query: {
        date: date as unknown as BiliLotStatisticRankDateTypeEnum,
        rank_type: rank_type as unknown as BiliLotStatisticRankTypeEnum,
        offset,
        limit,
      },
    })
    return res.data as any
  }

  async handle_lottery_result({
    uid,
    date,
    lot_type,
    rank_type,
    offset,
    limit,
  }: {
    uid: number | string
    date: LotteryRankDateType
    lot_type: LotteryRankLotType
    rank_type: LotteryRankType
    offset: number
    limit: number
  }): Promise<RootObject<LotteryResultResp>> {
    const res = await lotteryResultApiV1LotteryDatabaseBiliLotteryResultGet({
      query: {
        uid,
        date: date as unknown as BiliLotStatisticRankDateTypeEnum,
        lot_type: lot_type as unknown as BiliLotStatisticLotTypeEnum,
        rank_type: rank_type as unknown as BiliLotStatisticRankTypeEnum,
        offset,
        limit,
      },
    })
    return res.data as any
  }
}

const lotteryDataStatisticApi = new LotteryDataStatisticApi()

export default lotteryDataStatisticApi