import ajax from './base_axios'

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
    return await ajax.post(this.path.concat(uri), {
      data: JSON.stringify(data)
    })
  }
}

export default BaseApi
