import biliMessage from './message'

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
      biliMessage.success(successMessage)
    }
    return { data, error: false }
  } catch (error: any) {
    const errorMsg = errorMessage ? errorMessage.concat(error?.message || '') : error?.message
    if (showErrorToast) {
      console.error(errorMsg)
      biliMessage.error(errorMsg)
    }
    return { error: true, msg: errorMsg }
  }
}
