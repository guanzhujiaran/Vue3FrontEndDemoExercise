/*
 * @Author: 星瞳 1944637830@qq.com
 * @Date: 2024-06-29 19:55:53
 * @LastEditors: 星瞳 1944637830@qq.com
 * @LastEditTime: 2024-06-30 11:56:28
 * @FilePath: \Vue3FrontEndDemoExercise\src\api\do_lottery\bili_do_lottery_api.ts
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import BaseApi from '@/api/base_axios/base_api'
import type { RootObject } from '@/models/base_model'

class DolotteryApi extends BaseApi {
  constructor() {
    super()
    this.path = '/api/v1/do_lottery/bili/'
  }

  async run_account_lottery_task(account_name: string): Promise<RootObject<boolean | undefined>> {
    return await this._post('run', {
      account_name: account_name
    })
  }
}

const doLotteryApi = new DolotteryApi()

export default doLotteryApi
