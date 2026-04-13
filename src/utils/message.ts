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
 * 封装的 ElMessage，支持开发环境自动手动关闭
 */
const biliMessage = function (options?: any) {
  return ElMessage(getDevOptions(options))
}

biliMessage.success = function (options?: any) {
  return ElMessage.success(getDevOptions(options))
}
biliMessage.warning = function (options?: any) {
  return ElMessage.warning(getDevOptions(options))
}
biliMessage.error = function (options?: any) {
  return ElMessage.error(getDevOptions(options))
}
biliMessage.info = function (options?: any) {
  return ElMessage.info(getDevOptions(options))
}
biliMessage.closeAll = function (): void {
  ElMessage.closeAll()
}

export default biliMessage
export { ElMessageBox, ElNotification }
