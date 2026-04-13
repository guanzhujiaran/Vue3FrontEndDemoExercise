import biliMessage from './message'
import type { RootObject } from '@/models/api/base_model'

/**
 * 异步操作处理器，统一处理异步操作的结果和错误
 * 支持网络错误和业务错误（code !== 0）的统一处理
 * @param asyncFn 异步函数
 * @param options 配置选项
 */
export const asyncHandler = async <T>(
  asyncFn: Promise<RootObject<T> | T>,
  options?: {
    successMessage?: string
    errorMessage?: string
    showSuccessToast?: boolean
    showErrorToast?: boolean
    /** 是否检查业务错误码，默认 true。如果响应包含 code 字段且 code !== 0，则视为业务错误 */
    checkBusinessError?: boolean
  }
): Promise<{ data?: T; error?: boolean; msg?: string; response?: RootObject<T> }> => {
  const {
    successMessage = '操作成功',
    errorMessage = '操作失败',
    showSuccessToast = false,
    showErrorToast = true,
    checkBusinessError = true
  } = options || {}
  
  try {
    const response = await asyncFn
    
    // 检查是否是标准响应格式（包含 code 字段）
    if (checkBusinessError && response && typeof response === 'object' && 'code' in response) {
      const rootResponse = response as RootObject<T>
      
      // 业务错误处理（code !== 0）
      if (rootResponse.code !== 0) {
        const errorMsg = rootResponse.msg || errorMessage
        if (showErrorToast) {
          console.error('业务错误:', errorMsg)
          biliMessage.error(errorMsg)
        }
        return { 
          error: true, 
          msg: errorMsg,
          response: rootResponse
        }
      }
      
      // 业务成功
      if (showSuccessToast) {
        biliMessage.success(successMessage)
      }
      return { 
        data: rootResponse.data, 
        error: false,
        response: rootResponse
      }
    }
    
    // 非标准响应格式，直接返回
    if (showSuccessToast) {
      biliMessage.success(successMessage)
    }
    return { data: response as T, error: false }
  } catch (error: any) {
    // 网络错误或其他异常
    const errorMsg = error?.response?.data?.msg || error?.response?.data?.message || 
                     error?.message || errorMessage
    if (showErrorToast) {
      console.error('网络错误或异常:', errorMsg)
      biliMessage.error(errorMsg)
    }
    return { error: true, msg: errorMsg }
  }
}
