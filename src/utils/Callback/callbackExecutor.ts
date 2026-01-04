/**
 * 回调执行工具 - 不使用 async await，使用 Promise 链式调用
 * 提供错误日志记录和消息气泡提示功能
 */

import { ElMessage } from 'element-plus'

/**
 * 执行回调函数并处理错误
 * @param callback 要执行的回调函数，可以返回 Promise
 * @param errorMessage 自定义错误消息，默认为 '操作失败'
 * @param successMessage 成功消息，如果不提供则不显示成功提示
 * @param showSuccess 是否显示成功提示，默认为 true
 */
export function executeCallback<T = any>(
  callback: (() => T | Promise<T>) | undefined,
  errorMessage: string = '操作失败',
  successMessage?: string,
  showSuccess: boolean = true
): void {
  if (!callback) {
    console.error('Callback is undefined');
    ElMessage({
      type: 'error',
      message: 'Callback is undefined',
      duration: 5000
    });
    return;
  }
  
  try {
    const result = callback()
    
    // 检查是否是 Promise
    if (result && typeof result === 'object' && 'then' in result) {
      // 处理异步操作
      (result as Promise<T>)
        .then((data: T) => {
          console.log('操作成功:', data)
          if (showSuccess && successMessage) {
            ElMessage({
              type: 'success',
              message: successMessage,
              duration: 3000
            })
          }
        })
        .catch((error: any) => {
          // 网络错误（HTTP 非 200）
          if (error.isNetworkError || !error.response) {
            console.error('网络异常:', error)
            ElMessage({
              type: 'error',
              message: '网络异常，请检查网络连接',
              duration: 5000
            })
            return
          }
          // 业务错误（code !== 0）
          if (error.isBusinessError) {
            console.error(`业务错误 [${error.businessCode}]:`, error.businessMessage)
            ElMessage({
              type: 'error',
              message: error.businessMessage || '操作失败',
              duration: 5000
            })
            return
          }
          // 其他错误
          console.error(`${errorMessage}:`, error)
          ElMessage({
            type: 'error',
            message: `${errorMessage}: ${error.message || error}`,
            duration: 5000
          })
        })
    } else {
      // 处理同步操作
      console.log('操作成功:', result)
      if (showSuccess && successMessage) {
        ElMessage({
          type: 'success',
          message: successMessage,
          duration: 3000
        })
      }
    }
  } catch (error: any) {
    // 处理同步错误
    console.error(`${errorMessage}:`, error)
    ElMessage({
      type: 'error',
      message: `${errorMessage}: ${error.message || error}`,
      duration: 5000
    })
  }
}

/**
 * 创建一个带回调执行器的事件处理器
 * @param callback 回调函数
 * @param options 配置选项
 * @returns 包装后的事件处理函数
 */
export function createCallbackHandler<T = any>(
  callback: (...args: any[]) => T | Promise<T>,
  options: {
    errorMessage?: string
    successMessage?: string
    showSuccess?: boolean
    errorHandler?: (error: any) => void
    successHandler?: (result: T) => void
  } = {}
) {
  const {
    errorMessage = '操作失败',
    successMessage,
    showSuccess = true,
    errorHandler,
    successHandler
  } = options

  return (...args: any[]) => {
    try {
      const result = callback(...args)
      
      if (result && typeof result === 'object' && 'then' in result) {
        // 异步处理
        (result as Promise<T>)
          .then((data: T) => {
            console.log('操作成功:', data)
            
            if (successHandler) {
              successHandler(data)
            }
            
            if (showSuccess && successMessage) {
              ElMessage({
                type: 'success',
                message: successMessage,
                duration: 3000
              })
            }
          })
          .catch((error: any) => {
            // 网络错误（HTTP 非 200）
            if (error.isNetworkError || !error.response) {
              console.error('网络异常:', error)
              if (errorHandler) {
                errorHandler(error)
              } else {
                ElMessage({
                  type: 'error',
                  message: '网络异常，请检查网络连接',
                  duration: 5000
                })
              }
              return
            }
            // 业务错误（code !== 0）
            if (error.isBusinessError) {
              console.error(`业务错误 [${error.businessCode}]:`, error.businessMessage)
              if (errorHandler) {
                errorHandler(error)
              } else {
                ElMessage({
                  type: 'error',
                  message: error.businessMessage || '操作失败',
                  duration: 5000
                })
              }
              return
            }
            // 其他错误
            console.error(`${errorMessage}:`, error)
            if (errorHandler) {
              errorHandler(error)
            } else {
              ElMessage({
                type: 'error',
                message: `${errorMessage}: ${error.message || error}`,
                duration: 5000
              })
            }
          })
      } else {
        // 同步处理
        console.log('操作成功:', result)
        
        if (successHandler) {
          successHandler(result)
        }
        
        if (showSuccess && successMessage) {
          ElMessage({
            type: 'success',
            message: successMessage,
            duration: 3000
          })
        }
      }
    } catch (error: any) {
      console.error(`${errorMessage}:`, error)
      
      if (errorHandler) {
        errorHandler(error)
      } else {
        ElMessage({
          type: 'error',
          message: `${errorMessage}: ${error.message || error}`,
          duration: 5000
        })
      }
    }
  }
}

/**
 * 批量执行回调函数
 * @param callbacks 回调函数数组
 * @param options 配置选项
 */
export function executeBatchCallbacks<T = any>(
  callbacks: Array<() => T | Promise<T>>,
  options: {
    errorMessage?: string
    successMessage?: string
    showSuccess?: boolean
    parallel?: boolean // 是否并行执行，默认为 false
  } = {}
): void {
  const {
    errorMessage = '批量操作失败',
    successMessage = '批量操作完成',
    showSuccess = true,
    parallel = false
  } = options

  if (parallel) {
    // 并行执行
    Promise.all(callbacks.map(cb => {
      try {
        const result = cb()
        return result && typeof result === 'object' && 'then' in result 
          ? result as Promise<T> 
          : Promise.resolve(result)
      } catch (error) {
        return Promise.reject(error)
      }
    }))
      .then((results) => {
        console.log('批量操作成功:', results)
        if (showSuccess) {
          ElMessage({
            type: 'success',
            message: successMessage,
            duration: 3000
          })
        }
      })
      .catch((error: any) => {
        // 网络错误（HTTP 非 200）
        if (error.isNetworkError || !error.response) {
          console.error('网络异常:', error)
          ElMessage({
            type: 'error',
            message: '网络异常，请检查网络连接',
            duration: 5000
          })
          return
        }
        // 业务错误（code !== 0）
        if (error.isBusinessError) {
          console.error(`业务错误 [${error.businessCode}]:`, error.businessMessage)
          ElMessage({
            type: 'error',
            message: error.businessMessage || '操作失败',
            duration: 5000
          })
          return
        }
        // 其他错误
        console.error(`${errorMessage}:`, error)
        ElMessage({
          type: 'error',
          message: `${errorMessage}: ${error.message || error}`,
          duration: 5000
        })
      })
  } else {
    // 串行执行
    let currentIndex = 0
    
    const executeNext = () => {
      if (currentIndex >= callbacks.length) {
        if (showSuccess) {
          ElMessage({
            type: 'success',
            message: successMessage,
            duration: 3000
          })
        }
        return
      }
      
      const callback = callbacks[currentIndex]
      currentIndex++
      
      if (!callback) {
        console.error('Callback is undefined');
        ElMessage({
          type: 'error',
          message: 'Callback is undefined',
          duration: 5000
        });
        return;
      }
      
      try {
        const result = callback()
        
        if (result && typeof result === 'object' && 'then' in result) {
          (result as Promise<T>)
            .then(() => executeNext())
            .catch((error: any) => {
              // 网络错误（HTTP 非 200）
              if (error.isNetworkError || !error.response) {
                console.error('网络异常:', error)
                ElMessage({
                  type: 'error',
                  message: '网络异常，请检查网络连接',
                  duration: 5000
                })
                return
              }
              // 业务错误（code !== 0）
              if (error.isBusinessError) {
                console.error(`业务错误 [${error.businessCode}]:`, error.businessMessage)
                ElMessage({
                  type: 'error',
                  message: error.businessMessage || '操作失败',
                  duration: 5000
                })
                return
              }
              // 其他错误
              console.error(`${errorMessage}:`, error)
              ElMessage({
                type: 'error',
                message: `${errorMessage}: ${error.message || error}`,
                duration: 5000
              })
            })
        } else {
          executeNext()
        }
      } catch (error: any) {
        console.error(`${errorMessage}:`, error)
        ElMessage({
          type: 'error',
          message: `${errorMessage}: ${error.message || error}`,
          duration: 5000
        })
      }
    }
    
    executeNext()
  }
}