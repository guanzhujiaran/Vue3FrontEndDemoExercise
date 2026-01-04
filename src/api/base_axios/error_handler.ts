/*
 * @Author: 星瞳 1944637830@qq.com
 * @Date: 2025-12-18 00:00:00
 * @Description: API错误处理工具类
 */
import emitter from '@/utils/mitt.ts'

export interface ApiError {
  code: number
  msg: string
  data?: any
}

export interface ErrorHandlerOptions {
  /** 是否自动显示错误消息，默认 true */
  showToast?: boolean
  /** 是否 emit 错误事件，默认 false */
  emitError?: boolean
  /** 自定义错误消息处理函数 */
  customHandler?: (error: ApiError) => void
}

/**
 * API错误处理类
 */
export class ApiErrorHandler {
  private static instance: ApiErrorHandler
  private defaultOptions: ErrorHandlerOptions = {
    showToast: true,
    emitError: false
  }

  static getInstance(): ApiErrorHandler {
    if (!ApiErrorHandler.instance) {
      ApiErrorHandler.instance = new ApiErrorHandler()
    }
    return ApiErrorHandler.instance
  }

  /**
   * 处理API错误
   * @param error 错误对象
   * @param options 错误处理选项
   */
  handleError(error: any, options: ErrorHandlerOptions = {}): void {
    const finalOptions = { ...this.defaultOptions, ...options }
    
    // 统一错误格式
    const apiError: ApiError = this.normalizeError(error)
    
    // 自定义处理函数
    if (finalOptions.customHandler) {
      finalOptions.customHandler(apiError)
    }
    
    // 显示错误消息
    if (finalOptions.showToast && apiError.msg) {
      this.showErrorToast(apiError.msg)
    }
    
    // Emit错误事件
    if (finalOptions.emitError) {
      this.emitErrorEvent(apiError)
    }
  }

  /**
   * 标准化错误对象
   */
  private normalizeError(error: any): ApiError {
    // 如果已经是标准格式
    if (error && typeof error === 'object' && 'code' in error && 'msg' in error) {
      return error as ApiError
    }
    
    // Axios错误
    if (error?.response?.data) {
      const response = error.response.data
      return {
        code: response.code || error.response.status || -9999,
        msg: response.msg || response.message || error.message || '请求失败',
        data: response.data
      }
    }
    
    // 网络错误或其他错误
    return {
      code: error?.code || -9999,
      msg: error?.msg || error?.message || '网络错误，请检查网络连接',
      data: error?.data
    }
  }

  /**
   * 显示错误消息
   */
  private showErrorToast(message: string): void {
    emitter.emit('toast', { t: message, e: 'error' })
  }

  /**
   * Emit错误事件
   */
  private emitErrorEvent(error: ApiError): void {
    emitter.emit('apiError', error)
  }
}

/**
 * 默认错误处理器实例
 */
export const apiErrorHandler = ApiErrorHandler.getInstance()

/**
 * 处理API错误的便捷函数
 */
export function handleApiError(error: any, options?: ErrorHandlerOptions): void {
  apiErrorHandler.handleError(error, options)
}

/**
 * 带错误处理的API包装器
 */
export function withErrorHandler<T extends (...args: any[]) => Promise<any>>(
  apiFunction: T,
  options?: ErrorHandlerOptions
): T {
  return (async (...args: Parameters<T>): Promise<ReturnType<T>> => {
    try {
      const result = await apiFunction(...args)
      
      // 检查返回结果是否包含错误
      if (result && typeof result === 'object' && 'code' in result && result.code !== 0) {
        handleApiError(result, options)
        return result
      }
      
      return result
    } catch (error) {
      handleApiError(error, options)
      throw error
    }
  }) as T
}