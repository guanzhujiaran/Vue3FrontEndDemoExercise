import biliMessage from './message'
import type { RootObject } from '@/models/api/base_model'

/**
 * 业务响应接口定义
 */
export interface BusinessResponse<T = any> {
  code: number
  data?: T
  msg?: string
}

/**
 * 业务处理配置选项
 */
export interface BusinessHandlerOptions {
  successMessage?: string
  errorMessage?: string
  showSuccessToast?: boolean
  showErrorToast?: boolean
  autoHandleError?: boolean
}

/**
 * 业务处理结果
 */
export interface BusinessHandlerResult<T = any> {
  success: boolean
  data?: T
  error?: boolean
  msg?: string
  response?: BusinessResponse<T>
}

/**
 * 通用的业务代码处理方法
 * 统一处理网络错误和业务逻辑错误
 * @param asyncFn 异步函数，返回业务响应
 * @param options 配置选项
 * @param callbacks 回调函数数组,执行成功才会调用，包括网络请求成功和业务逻辑成功
 * @param errorCallbacks 错误回调函数数组,执行失败才会调用，不管网络错误还是业务错误
 */
export const businessHandler = async <T>(
  asyncFn: Promise<BusinessResponse<T> | RootObject<T>>,
  options?: BusinessHandlerOptions,
  callbacks?: Array<(result: BusinessHandlerResult<T>) => any>,
  errorCallbacks?: Array<(result: BusinessHandlerResult<T>) => any>
): Promise<BusinessHandlerResult<T>> => {
  const {
    successMessage = '操作成功',
    errorMessage = '操作失败',
    showSuccessToast = true,
    showErrorToast = true,
    autoHandleError = true
  } = options || {}

  try {
    // 执行异步操作
    const response = await asyncFn

    // 检查业务代码
    if (response.code === 0) {
      // 业务成功
      if (showSuccessToast && successMessage) {
        biliMessage.success(successMessage)
      }

      // 执行成功回调函数
      if (callbacks && callbacks.length > 0) {
        const result: BusinessHandlerResult<T> = {
          success: true,
          data: response.data,
          response
        }
        await Promise.all(callbacks.map(cb => cb(result)))
      }

      return {
        success: true,
        data: response.data,
        response
      }
    } else {
      // 业务失败
      const errorMsg = response.msg || errorMessage

      if (autoHandleError && showErrorToast) {
        biliMessage.error(errorMsg)
      }

      // 执行错误回调函数
      if (errorCallbacks && errorCallbacks.length > 0) {
        const result: BusinessHandlerResult<T> = {
          success: false,
          error: true,
          msg: errorMsg,
          response
        }
        await Promise.all(errorCallbacks.map(cb => cb(result)))
      }

      return {
        success: false,
        error: true,
        msg: errorMsg,
        response
      }
    }
  } catch (error: any) {
    // 网络错误或其他异常
    const errorMsg = errorMessage ? errorMessage.concat(error?.message || '') : error?.message

    if (autoHandleError && showErrorToast) {
      biliMessage.error(errorMsg)
    }
    if (errorCallbacks && errorCallbacks.length > 0) {
      const result: BusinessHandlerResult<T> = {
        success: false,
        error: true,
        msg: errorMsg
      }
      await Promise.all(errorCallbacks.map(cb => cb(result)))
    }
    return {
      success: false,
      error: true,
      msg: errorMsg
    }
  }
}
