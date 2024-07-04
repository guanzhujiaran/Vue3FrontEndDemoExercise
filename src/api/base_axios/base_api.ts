/*
 * @Author: 星瞳 1944637830@qq.com
 * @Date: 2024-05-30 23:47:00
 * @LastEditors: 星瞳 1944637830@qq.com
 * @LastEditTime: 2024-06-04 18:26:55
 * @FilePath: \Vue3FrontEndDemoExercise\src\api\base_axios\base_api.ts
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import ajax from '@/api/base_axios/base_axios'

class BaseApi {
  path: String //路由路径
  constructor() {
    this.path = ''
  }
  async _get(uri: string, params?: Object) {
    return await ajax.get(this.path.concat(uri), {
      params: params
    })
  }
  async _post(uri: string, data?: Object) {
    return await ajax.post(this.path.concat(uri), { ...data })
  }
}

export default BaseApi
