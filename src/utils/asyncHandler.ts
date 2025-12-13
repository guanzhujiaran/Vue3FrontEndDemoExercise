import emitter from '@/utils/mitt'

/**
 * 异步操作处理器，统一处理异步操作的结果和错误
 * @param asyncFn 异步函数
 * @param options 配置选项
 */
export const asyncHandler = async <T>(
  asyncFn: Promise<T>,
  options?: {
    successMessage?: string
    errorMessage?: string
    showSuccessToast?: boolean
    showErrorToast?: boolean
  }
): Promise<{ data?: T; error?: boolean; msg?: string }> => {
  const {
    successMessage = '操作成功',
    errorMessage = '操作失败',
    showSuccessToast = false,
    showErrorToast = true
  } = options || {}
  try {
    const data = await asyncFn
    if (showSuccessToast) {
      emitter.emit('toast', { t: successMessage, e: 'success' })
    }
    return { data, error: false }
  } catch (error: any) {
    const errorMsg = errorMessage ? errorMessage.concat(error?.message || '') : error?.message
    if (showErrorToast) {
      console.error(errorMsg)
      emitter.emit('toast', { t: errorMsg, e: 'error' })
    }
    return { error: true, msg: errorMsg }
  }
}
