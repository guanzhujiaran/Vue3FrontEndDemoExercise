import { ElMessage, ElMessageBox, ElNotification } from 'element-plus'
import type {
  MessageOptions,
  MessageParams,
  Message
} from 'element-plus/es/components/message/src/types'

// 判断是否为开发环境
const isDev = import.meta.env.DEV

/**
 * 获取带开发环境配置的选项
 * 开发环境下自动设置closable为true，方便调试
 */
function getDevOptions(options?: MessageParams): MessageOptions {
  const baseOptions: MessageOptions = {
    duration: 5000,
    closable: true,
    showClose: true,
    ...(typeof options === 'string' ? { message: options } : options)
  }

  // 开发环境下确保手动关闭
  if (isDev) {
    baseOptions.closable = true
    baseOptions.showClose = true
    baseOptions.duration = 0
  }

  return baseOptions
}

/**
 * 封装的 ElMessage，支持开发环境自动手动关闭
 */
const biliMessage = function (options?: MessageParams): Message {
  return ElMessage(getDevOptions(options))
} as typeof ElMessage

biliMessage.success = function (options?: MessageParams): Message {
  return ElMessage.success(getDevOptions(options))
}
biliMessage.warning = function (options?: MessageParams): Message {
  return ElMessage.warning(getDevOptions(options))
}
biliMessage.error = function (options?: MessageParams): Message {
  return ElMessage.error(getDevOptions(options))
}
biliMessage.info = function (options?: MessageParams): Message {
  return ElMessage.info(getDevOptions(options))
}
biliMessage.closeAll = function (): void {
  ElMessage.closeAll()
}

export default biliMessage
export { ElMessageBox, ElNotification }
