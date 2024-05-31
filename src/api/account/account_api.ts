import BaseApi from '../base_axios/base_api'
import type { RootObject } from '@/models/base_model'
import type { AccountInfoModel } from '@/models/account/account_model'

/*
 * @Author: 星瞳 1944637830@qq.com
 * @Date: 2024-05-30 23:35:42
 * @LastEditors: 星瞳 1944637830@qq.com
 * @LastEditTime: 2024-05-31 12:26:06
 * @FilePath: \Vue3FrontEndDemoExercise\src\api\user\login.ts
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
class AccountApi extends BaseApi {
  constructor() {
    super()
    this.path = '/api/v1/account/'
  }
  async GetAllAccounts(): Promise<RootObject<Array<AccountInfoModel>>> {
    return await this._get('all_accounts')
  }
  async AddAccount(new_account_name: string): Promise<RootObject<null>> {
    return await this._post('add_account', { account_name: new_account_name })
  }
  async GetAccountInfoByAccountName(
    account_name: string
  ): Promise<RootObject<string | AccountInfoModel>> {
    return await this._get('get_account_info', { account_name: account_name })
  }
}

const accountApi = new AccountApi()

export default accountApi
