/*
 * @Author: 星瞳 1944637830@qq.com
 * @Date: 2024-05-30 23:47:00
 * @LastEditors: 星瞳 1944637830@qq.com
 * @LastEditTime: 2024-06-04 18:26:55
 * @FilePath: \Vue3FrontEndDemoExercise\src\api\base_axios\base_api.ts
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import ajax from '@/api/base_axios/base_axios'
import type { AxiosRequestConfig } from 'axios'
import { handleApiError, type ErrorHandlerOptions, withErrorHandler } from './error_handler'

class BaseApi {
  path: String //路由路径
  constructor() {
    this.path = ''
  }

  async _get(uri: string, params?: Object, config?: AxiosRequestConfig) {
    return await ajax.get(this.path.concat(uri), {
      params: params,
      ...config
    })
  }

  async _post(uri: string, data?: Object, config?: AxiosRequestConfig) {
    return await ajax.post(this.path.concat(uri), data, config)
  }

  /**
   * 带错误处理的GET请求
   */
  async _getWithError(uri: string, params?: Object, config?: AxiosRequestConfig, errorOptions?: ErrorHandlerOptions) {
    try {
      const result = await this._get(uri, params, config)
      
      // 检查业务错误
      if (result.code !== 0) {
        handleApiError(result, errorOptions)
      }
      
      return result
    } catch (error) {
      handleApiError(error, errorOptions)
      throw error
    }
  }

  /**
   * 带错误处理的POST请求
   */
  async _postWithError(uri: string, data?: Object, config?: AxiosRequestConfig, errorOptions?: ErrorHandlerOptions) {
    try {
      const result = await this._post(uri, data, config)
      
      // 检查业务错误
      if (result.code !== 0) {
        handleApiError(result, errorOptions)
      }
      
      return result
    } catch (error) {
      handleApiError(error, errorOptions)
      throw error
    }
  }

  /**
   * 包装API方法，自动处理错误
   */
  protected withErrorHandling<T extends (...args: any[]) => Promise<any>>(
    apiMethod: T,
    errorOptions?: ErrorHandlerOptions
  ): T {
    return withErrorHandler(apiMethod, errorOptions)
  }
}

export default BaseApi
