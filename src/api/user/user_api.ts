import type { LoginModel, UserNavModel } from '@/models/user/user_model'
import BaseApi from '../base_axios/base_api'
import type { RootObject } from '@/models/base_model'
import { useJwtStore } from '@/stores/jwt_token.ts'
import type { User_base_info_config_form } from '@/models/user/user_setting/user_base_info_config_model.ts'

class UserApi extends BaseApi {
  constructor() {
    super()
    this.path = '/api/v1/user/'
  }

  async RefreshToken(): Promise<RootObject<LoginModel>> {
    return await this._post('refresh_token')
  }

  async Login(user_name: String, pwd: String): Promise<RootObject<LoginModel>> {
    return await this._post('login', { user_name: user_name, pwd: pwd })
  }

  async Nav(): Promise<RootObject<UserNavModel>> {
    let resp = await this._get('nav')
    resp.code === -101 &&
      (() => {
        const JwtStore = useJwtStore()
        JwtStore.jwt && JwtStore.delete_jwt_token()
      })()

    return resp
  }

  async Reg(user_name: String, pwd: String): Promise<RootObject<String>> {
    return await this._post('reg', { user_name: user_name, pwd: pwd })
  }

  async PwdSalt(): Promise<RootObject<string>> {
    return await this._get('pwd_salt')
  }

  async UserInfo(): Promise<RootObject<User_base_info_config_form>> {
    return await this._get('user_info')
  }

  async UpdateUserInfo(
    user_base_info_config_form: Omit<User_base_info_config_form, 'userid'>
  ): Promise<RootObject<string>> {
    return await this._post('user_info/update', user_base_info_config_form)
  }
}

const userApi = new UserApi()

export default userApi
