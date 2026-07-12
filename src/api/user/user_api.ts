import { client } from '@/api/bili_lottery_data/hey-api/client.gen'
import type { LoginModel, UserNavModel } from '@/models/user/user_model'
import type { RootObject } from '@/models/api/base_model.ts'
import type { User_base_info_config_form } from '@/models/user/user_setting/user_base_info_config_model.ts'

class UserApi {
  RefreshToken(): Promise<RootObject<LoginModel>> {
    return client.post({
      url: '/api/v1/user/refresh_token',
      headers: { 'Content-Type': 'application/json' },
    }) as Promise<RootObject<LoginModel>>
  }

  Login(user_name: String, pwd: String): Promise<RootObject<LoginModel>> {
    return client.post({
      url: '/api/v1/user/login',
      body: { user_name: user_name, pwd: pwd },
      headers: { 'Content-Type': 'application/json' },
    }) as Promise<RootObject<LoginModel>>
  }

  // 使用 fields 返回风格：即使后端返回 401 等错误状态码，也能拿到
  // response（用于判断 HTTP 状态）和 error（响应体），避免 responseStyle: 'data'
  // 在错误响应时直接返回 undefined 导致上层无法区分网络故障与未登录
  Nav(): Promise<{
    data?: RootObject<UserNavModel>
    error?: any
    response?: { status: number; [key: string]: any }
  }> {
    return client.get({
      url: '/api/v1/user/nav',
      responseStyle: 'fields',
    }) as any
  }

  Reg(user_name: String, pwd: String): Promise<RootObject<String>> {
    return client.post({
      url: '/api/v1/user/reg',
      body: { user_name: user_name, pwd: pwd },
      headers: { 'Content-Type': 'application/json' },
    }) as Promise<RootObject<String>>
  }

  UserInfo(): Promise<RootObject<User_base_info_config_form>> {
    return client.get({
      url: '/api/v1/user/user_info',
    }) as Promise<RootObject<User_base_info_config_form>>
  }

  UpdateUserInfo(
    user_base_info_config_form: Omit<User_base_info_config_form, 'userid'>,
  ): Promise<RootObject<string>> {
    return client.post({
      url: '/api/v1/user/user_info/update',
      body: user_base_info_config_form,
      headers: { 'Content-Type': 'application/json' },
    }) as Promise<RootObject<string>>
  }

  Logout(): Promise<RootObject<string>> {
    return client.post({
      url: '/api/v1/user/logout',
      headers: { 'Content-Type': 'application/json' },
    }) as Promise<RootObject<string>>
  }
}

const userApi = new UserApi()

export default userApi