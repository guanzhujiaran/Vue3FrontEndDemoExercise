/**
 * 回调执行工具类型声明
 */

export interface CallbackExecutorOptions {
  errorMessage?: string
  successMessage?: string
  showSuccess?: boolean
}

export interface CallbackHandlerOptions<T = any> extends CallbackExecutorOptions {
  errorHandler?: (error: any) => void
  successHandler?: (result: T) => void
}

export interface BatchCallbackOptions extends CallbackExecutorOptions {
  parallel?: boolean
}

export type CallbackFunction<T = any> = () => T | Promise<T>
export type CallbackFunctionWithArgs<T = any> = (...args: any[]) => T | Promise<T>

export type ErrorHandler = (error: any) => void
export type SuccessHandler<T = any> = (result: T) => void