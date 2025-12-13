import BaseAPI from '@/api/base_axios/base_api'

// 浏览器指纹相关接口

// 用户浏览器信息创建参数
export interface UserBrowserInfoCreateParams {
  is_desktop?: boolean
}

// 用户浏览器信息读取参数
export interface UserBrowserInfoReadParams {
  // 根据实际API需求添加参数
}

// 用户浏览器信息更新参数
export interface UserBrowserInfoUpdateParams {
  // 根据实际API需求添加参数
}

// 用户浏览器信息删除参数
export interface UserBrowserInfoDeleteParams {
  // 根据实际API需求添加参数
}

// 标准响应格式
export interface StandardResponse<T> {
  code: number
  data: T | null
  msg: string
}

// 浏览器指纹信息
export interface BaseFingerprintBrowserInitParams {
  // 根据实际API响应结构添加字段
  [key: string]: any
}

// 用户浏览器信息创建响应
export interface UserBrowserInfoCreateResp {
  // 根据实际API响应结构添加字段
  [key: string]: any
}

// 用户浏览器信息读取响应
export interface UserBrowserInfoReadResp {
  // 根据实际API响应结构添加字段
  [key: string]: any
}

// 用户浏览器信息更新响应
export interface UserBrowserInfoUpdateResp {
  // 根据实际API响应结构添加字段
  [key: string]: any
}

// 用户浏览器信息删除响应
export interface UserBrowserInfoDeleteResp {
  // 根据实际API响应结构添加字段
  [key: string]: any
}

class BrowserFingerprintAPI extends BaseAPI {
  // 生成随机浏览器指纹
  async genRandFingerprint(params: UserBrowserInfoCreateParams) {
    return await this._post(
      '/rpa/browser/gen_rand_fingerprint',
      params
    )
  }

  // 创建浏览器指纹
  async createFingerprint(params: UserBrowserInfoCreateParams) {
    return await this._post(
      '/rpa/browser/create_fingerprint',
      params
    )
  }

  // 读取浏览器指纹
  async readFingerprint(params: UserBrowserInfoReadParams) {
    return await this._post(
      '/rpa/browser/read_fingerprint',
      params
    )
  }

  // 更新浏览器指纹
  async updateFingerprint(params: UserBrowserInfoUpdateParams) {
    return await this._post(
      '/rpa/browser/update_fingerprint',
      params
    )
  }

  // 删除浏览器指纹
  async deleteFingerprint(params: UserBrowserInfoDeleteParams) {
    return await this._post(
      '/rpa/browser/delete_fingerprint',
      params
    )
  }
}

export default new BrowserFingerprintAPI()