import type { LoginModel, UserNavModel } from '@/models/user/user_model'
import BaseApi from '../base_axios/base_api'
import type { RootObject } from '@/models/api/base_model.ts'
import type { User_base_info_config_form } from '@/models/user/user_setting/user_base_info_config_model.ts'

class UserApi extends BaseApi {
  constructor() {
    super()
    this.path = '/api/v1/user/'
  }

  RefreshToken(): Promise<RootObject<LoginModel>> {
    return this._post('refresh_token')
  }

  Login(user_name: String, pwd: String): Promise<RootObject<LoginModel>> {
    return this._post('login', { user_name: user_name, pwd: pwd })
  }

  Nav(): Promise<RootObject<UserNavModel>> {
    return this._get('nav')
  }

  Reg(user_name: String, pwd: String): Promise<RootObject<String>> {
    return this._post('reg', { user_name: user_name, pwd: pwd })
  }

  UserInfo(): Promise<RootObject<User_base_info_config_form>> {
    return this._get('user_info')
  }

  UpdateUserInfo(
    user_base_info_config_form: Omit<User_base_info_config_form, 'userid'>
  ): Promise<RootObject<string>> {
    return this._post('user_info/update', user_base_info_config_form)
  }

  Logout(): Promise<RootObject<string>> {
    return this._post('logout')
  }
}

const userApi = new UserApi()

export default userApi
