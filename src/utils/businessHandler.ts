import biliMessage, { ElNotification } from './message'
import type { RootObject } from '@/models/api/base_model'

/**
 * 显示错误通知
 * 简单错误用 ElMessage，带换行（含请求信息）的错误用 ElNotification 展示更丰富的内容
 */
function showErrorNotification(msg: string) {
  if (msg.includes('\n')) {
    const [title, ...detailLines] = msg.split('\n')
    const detail = detailLines.join('\n').trim()
    ElNotification({
      type: 'error',
      title,
      message: detail,
      duration: 0,
      showClose: true
    })
  } else {
    biliMessage.error(msg)
  }
}

/**
 * 统一的业务响应契约。
 *
 * 后端所有接口（不论基于 axios 还是 hey-api / fetch）的响应体都遵循此结构：
 * - code === 0 表示业务成功，data 为业务数据；
 * - code !== 0 表示业务失败，msg 为错误描述。
 * 调用方应将接口返回的「响应对象（或 SDK 解包后的响应对象）」直接传给 businessHandler。
 */
export interface BusinessResponse<T = any> {
  code: number
  data?: T
  msg?: string
}

/**
 * businessHandler 的配置项，用于控制提示文案与错误是否自动弹窗。
 */
export interface BusinessHandlerOptions {
  /** 业务成功时展示的 toast 文案，默认「操作成功」 */
  successMessage?: string
  /** 业务/网络失败时展示的兜底文案，默认「操作失败」 */
  errorMessage?: string
  /** 是否展示成功 toast，默认 true */
  showSuccessToast?: boolean
  /** 是否展示错误 toast，默认 true */
  showErrorToast?: boolean
  /** 是否自动弹错误通知（无需在各处手动 catch），默认 true */
  autoHandleError?: boolean
}

/**
 * businessHandler 的归一化返回值，供调用方与回调使用。
 */
export interface BusinessHandlerResult<T = any> {
  /** 是否成功（网络成功且业务 code === 0） */
  success: boolean
  /** 业务数据，失败时可能为空 */
  data?: T
  /** 是否发生错误（与 success 互补，便于错误分支判断） */
  error?: boolean
  /** 错误文案（业务失败或网络异常时填充） */
  msg?: string
  /** 原始响应对象，便于需要读取额外字段的调用方使用 */
  response?: BusinessResponse<T>
}

/**
 * 全项目统一的接口调用入口。
 *
 * 所有接口（列表、详情、增删改、心跳、未读汇总等）都应通过本函数发起，
 * 由其统一完成三件事：
 *   1. 等待接口响应并解包出业务数据；
 *   2. 判断业务码：code === 0 视为成功，否则视为业务失败；
 *   3. 统一错误与成功提示（错误自动弹窗，无需调用方各自 try/catch 弹错）。
 *
 * 调用方约定：
 *   - asyncFn 必须是「已发起且尚未 await 的」Promise（即直接传入 SDK 调用结果，
 *     如 `sdkApiXxx(opts)`，不要提前 await），这样网络异常也能被本函数捕获；
 *   - 响应体需满足 BusinessResponse / RootObject 契约（含 code / data / msg）。
 *
 * @param asyncFn       接口调用的 Promise（网络层或业务层失败时都会被捕获）
 * @param options       可选配置：提示文案、是否弹成功/错误 toast、是否自动处理错误
 * @param callbacks     成功回调数组，仅当「网络成功且业务 code === 0」时按序执行，
 *                     入参为 { success:true, data, response }
 * @param errorCallbacks 错误回调数组，当「业务失败或网络异常」时按序执行，
 *                     入参为 { success:false, error:true, msg, response? }
 * @returns BusinessHandlerResult<T> 归一化的调用结果，调用方可据此决定后续逻辑
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

      console.error(`[businessHandler] 业务错误: ${errorMsg}`, '响应数据:', response)

      if (autoHandleError && showErrorToast) {
        showErrorNotification(errorMsg)
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
    console.error('[businessHandler] 网络/异常错误:', error)

    // error 可能是 axios error 回调返回的 { code, msg } 对象，msg 中已包含请求信息
    let errorMsg: string
    if (error?.msg) {
      // axios error 回调已格式化好 msg（含请求信息）
      errorMsg = error.msg
    } else if (errorMessage && error?.message) {
      errorMsg = `${errorMessage}: ${error.message}`
    } else {
      debugger
      errorMsg = errorMessage || error?.message || '请求失败'
    }

    if (autoHandleError && showErrorToast) {
      showErrorNotification(errorMsg)
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
