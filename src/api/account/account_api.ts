import { client } from '@/api/bili_lottery_data/hey-api/client.gen'
import type { RootObject } from '@/models/api/base_model.ts'
import type { AccountInfoModel, AccountRunningStatus, AccountSettingModel, AccountMsgSessionModel } from '@/models/account/account_model'

class AccountApi {
  GetAllAccounts(): Promise<RootObject<Array<AccountInfoModel>>> {
    return client.get({
      url: '/api/v1/account/all_accounts',
    }) as Promise<RootObject<Array<AccountInfoModel>>>
  }

  AddAccount(new_account_name: string): Promise<RootObject<null>> {
    return client.post({
      url: '/api/v1/account/add_account',
      body: { account_name: new_account_name },
      headers: { 'Content-Type': 'application/json' },
    }) as Promise<RootObject<null>>
  }

  GetAccountInfoByAccountName(account_name: string): Promise<RootObject<AccountInfoModel>> {
    return client.get({
      url: '/api/v1/account/get_account_info',
      query: { account_name: account_name },
    }) as Promise<RootObject<AccountInfoModel>>
  }

  GetAccountLotterySettingByAccountName(account_name: string): Promise<
    RootObject<{
      account_name: string
      info: {
        settings: AccountSettingModel
      }
    }>
  > {
    return client.get({
      url: '/api/v1/account/get_account_setting',
      query: { account_name: account_name },
    }) as Promise<RootObject<{
      account_name: string
      info: {
        settings: AccountSettingModel
      }
    }>>
  }

  save_account_setting(account_name: string, settings: Object): Promise<RootObject<string>> {
    return client.post({
      url: '/api/v1/account/save_account_setting',
      body: {
        account_name: account_name,
        settings: settings,
      },
      headers: { 'Content-Type': 'application/json' },
    }) as Promise<RootObject<string>>
  }

  GetAccountRunningStatus(account_name: string): Promise<RootObject<AccountRunningStatus>> {
    return client.get({
      url: '/api/v1/account/get_account_running_status',
      query: {
        account_name: account_name,
      },
    }) as Promise<RootObject<AccountRunningStatus>>
  }

  GetAccountMessages(account_name: string): Promise<RootObject<Array<AccountMsgSessionModel>>> {
    return client.get({
      url: '/api/v1/account/get_account_messages',
      query: {
        account_name: account_name,
      },
    }) as Promise<RootObject<Array<AccountMsgSessionModel>>>
  }
}

const accountApi = new AccountApi()

export default accountApi