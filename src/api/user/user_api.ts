import type { LoginModel, UserNavModel } from '@/models/user/user_model'
import BaseApi from '../base_axios/base_api'
import type { RootObject } from '@/models/base_model'

/*
 * @Author: 星瞳 1944637830@qq.com
 * @Date: 2024-05-30 23:35:42
 * @LastEditors: 星瞳 1944637830@qq.com
 * @LastEditTime: 2024-05-31 12:03:06
 * @FilePath: \Vue3FrontEndDemoExercise\src\api\user\login.ts
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
class UserApi extends BaseApi {
  constructor() {
    super()
    this.path = '/api/v1/user/'
  }
  async Login(user_name: String, pwd: String): Promise<RootObject<LoginModel>> {
    return await this._post('login', { user_name: user_name, pwd: pwd })
  }
  async Nav(): Promise<RootObject<UserNavModel>> {
    return await this._get('nav')
  }
  async Reg(user_name: String, pwd: String): Promise<RootObject<String>> {
    return await this._post('reg', { user_name: user_name, pwd: pwd })
  }
}

const userApi = new UserApi()

export default userApi
