/*
 * @Author: 星瞳 1944637830@qq.com
 * @Date: 2024-06-29 19:55:53
 * @LastEditors: 星瞳 1944637830@qq.com
 * @LastEditTime: 2024-06-30 11:56:28
 * @FilePath: \Vue3FrontEndDemoExercise\src\api\do_lottery\bili_do_lottery_api.ts
 * @Description: B 站执行抽奖 API（基于 hey-api 生成的客户端）
 */
import { client } from '@/api/bili_lottery_data/hey-api/client.gen'
import type { RootObject } from '@/models/api/base_model.ts'

class DolotteryApi {
  run_account_lottery_task(account_name: string): Promise<RootObject<boolean | undefined>> {
    return client.post({
      url: '/api/v1/do_lottery/bili/run',
      body: {
        account_name: account_name,
      },
      headers: { 'Content-Type': 'application/json' },
    }) as Promise<RootObject<boolean | undefined>>
  }

  stop_account_lottery_task(account_name: string): Promise<RootObject<boolean | undefined>> {
    return client.post({
      url: '/api/v1/do_lottery/bili/stop',
      body: {
        account_name: account_name,
      },
      headers: { 'Content-Type': 'application/json' },
    }) as Promise<RootObject<boolean | undefined>>
  }
}

const doLotteryApi = new DolotteryApi()

export default doLotteryApi