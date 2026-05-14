import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { ApiError } from './error_handler'

interface RedirectOnErrorOptions {
  /** 需要检查的 URL 路径（支持部分匹配） */
  urlPattern?: string | RegExp
  /** 自定义错误码列表，默认处理所有非0错误码 */
  errorCodes?: number[]
  /** 是否显示确认对话框，默认 false（直接跳转） */
  showConfirm?: boolean
  /** 确认对话框标题 */
  confirmTitle?: string
  /** 确认对话框内容 */
  confirmMessage?: string
  /** 跳转目标路径，默认 '/' */
  redirectPath?: string
  /** 跳转前的回调 */
  beforeRedirect?: (error: ApiError) => void | Promise<void>
  /** 跳转后的回调 */
  afterRedirect?: () => void
}

const DEFAULT_OPTIONS: Required<RedirectOnErrorOptions> = {
  urlPattern: '',
  errorCodes: [],
  showConfirm: false,
  confirmTitle: '操作失败',
  confirmMessage: '请求出现错误，是否返回首页？',
  redirectPath: '/',
  beforeRedirect: async () => {},
  afterRedirect: () => {}
}

class ApiRedirectHandler {
  private router: ReturnType<typeof useRouter> | null = null

  constructor() {
    if (typeof window !== 'undefined') {
      try {
        this.router = useRouter()
      } catch {
        console.warn('[ApiRedirectHandler] Router not available in this context')
      }
    }
  }

  async checkAndRedirect(response: any, options?: RedirectOnErrorOptions): Promise<boolean> {
    const opts = { ...DEFAULT_OPTIONS, ...options }

    // 检查是否有业务错误
    if (!response || response.code === 0 || response.code === undefined) {
      return false
    }

    // 检查 URL 匹配（如果指定了）
    if (opts.urlPattern) {
      const url = response._url || ''
      const isMatch =
        typeof opts.urlPattern === 'string'
          ? url.includes(opts.urlPattern)
          : opts.urlPattern.test(url)

      if (!isMatch) return false
    }

    // 检查错误码（如果指定了）
    if (opts.errorCodes.length > 0 && !opts.errorCodes.includes(response.code)) {
      return false
    }

    // 构建错误对象
    const apiError: ApiError = {
      code: response.code,
      msg: response.msg || `API 错误 (code: ${response.code})`,
      data: response.data
    }

    console.warn(`[ApiRedirectHandler] 检测到错误响应:`, {
      code: apiError.code,
      msg: apiError.msg,
      url: response._url || 'unknown'
    })

    // 执行前置回调
    await opts.beforeRedirect(apiError)

    // 显示错误消息
    ElMessage.error(apiError.msg)

    // 根据配置决定是直接跳转还是显示确认框
    if (opts.showConfirm) {
      try {
        await ElMessageBox.confirm(opts.confirmMessage, opts.confirmTitle, {
          confirmButtonText: '返回首页',
          cancelButtonText: '留在当前页',
          type: 'warning'
        })

        await this.doRedirect(opts.redirectPath, opts.afterRedirect)
        return true
      } catch {
        console.log('[ApiRedirectHandler] 用户取消跳转')
        return false
      }
    } else {
      // 直接跳转
      setTimeout(async () => {
        await this.doRedirect(opts.redirectPath, opts.afterRedirect)
      }, 1500)

      return true
    }
  }

  private async doRedirect(path: string, callback?: () => void): Promise<void> {
    if (this.router) {
      this.router.push(path)
    } else {
      window.location.href = path
    }

    callback?.()
  }
}

const apiRedirectHandler = new ApiRedirectHandler()

export default apiRedirectHandler

export function useApiRedirect() {
  return {
    checkAndRedirect: (response: any, options?: RedirectOnErrorOptions) =>
      apiRedirectHandler.checkAndRedirect(response, options),

    // 常用的预设配置
    presets: {
      fingerprintError: (): RedirectOnErrorOptions => ({
        urlPattern: '/read_fingerprint',
        confirmTitle: '浏览器会话异常',
        confirmMessage: '无法读取浏览器指纹信息，会话可能已过期或失效。\n\n是否返回首页重新开始？',
        showConfirm: true,
        redirectPath: '/'
      }),

      authError: (): RedirectOnErrorOptions => ({
        errorCodes: [401, 403],
        confirmTitle: '身份验证失败',
        confirmMessage: '您的登录状态已过期，需要重新登录。\n\n是否返回登录页面？',
        showConfirm: true,
        redirectPath: '/login'
      }),

      serverError: (): RedirectOnErrorOptions => ({
        errorCodes: [500, 502, 503, 504],
        confirmTitle: '服务器错误',
        confirmMessage: '服务器暂时无法处理请求，请稍后重试。\n\n是否返回首页？',
        showConfirm: true,
        redirectPath: '/'
      }),

      anyError: (): RedirectOnErrorOptions => ({
        showConfirm: false,
        redirectPath: '/'
      })
    }
  }
}
