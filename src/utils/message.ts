import { ElMessage, ElMessageBox, ElNotification } from 'element-plus'

// 判断是否为开发环境
const isDev = import.meta.env.DEV

/**
 * 获取带开发环境配置的选项
 * 开发环境下自动设置duration为0，方便调试
 */
function getDevOptions(options: any): any {
  const baseOptions: any = typeof options === 'string' ? { message: options } : { ...options }
  
  // 默认配置
  if (baseOptions.duration === undefined) {
    baseOptions.duration = 5000
  }
  if (baseOptions.showClose === undefined) {
    baseOptions.showClose = true
  }

  // 开发环境下确保手动关闭
  if (isDev) {
    baseOptions.showClose = true
    baseOptions.duration = 0
  }

  return baseOptions
}

/**
 * SSR（预渲染）环境没有 DOM：Element Plus 消息组件会访问 document 直接抛错，
 * 这里统一退化为控制台日志，保证「接口报错」不会把服务端渲染一起打挂。
 */
const isSsr = import.meta.env.SSR
const ssrLog = (level: string, options?: any) => {
  const text = typeof options === 'string' ? options : (options?.message ?? '')
  if (level === 'error') console.error(`[SSR][message:${level}]`, text)
  else console.log(`[SSR][message:${level}]`, text)
  return undefined as unknown as ReturnType<typeof ElMessage>
}

/**
 * 封装的 ElMessage，支持开发环境自动手动关闭
 */
const biliMessage = function (options?: any) {
  if (isSsr) return ssrLog('info', options)
  return ElMessage(getDevOptions(options))
}

biliMessage.success = function (options?: any) {
  if (isSsr) return ssrLog('success', options)
  return ElMessage.success(getDevOptions(options))
}
biliMessage.warning = function (options?: any) {
  if (isSsr) return ssrLog('warning', options)
  return ElMessage.warning(getDevOptions(options))
}
biliMessage.error = function (options?: any) {
  if (isSsr) return ssrLog('error', options)
  return ElMessage.error(getDevOptions(options))
}
biliMessage.info = function (options?: any) {
  if (isSsr) return ssrLog('info', options)
  return ElMessage.info(getDevOptions(options))
}
biliMessage.closeAll = function (): void {
  if (isSsr) return
  ElMessage.closeAll()
}

export default biliMessage
export { ElMessageBox, ElNotification }
