/**
 * Vue组件集成示例
 * 展示如何将回调执行工具集成到现有的Vue组件中
 */

import { ref } from 'vue'
import { executeCallback, createCallbackHandler } from './callbackExecutor'
import { browserApi } from '@/api/browser/browser_api'

// ===== 示例1：重写RPA控制面板的方法 =====

export const useRPAControl = () => {
  const isConnected = ref(false)
  const messages = ref<Array<{ type: string; content: string; timestamp: string }>>([])
  const liveId = ref('')

  const addMessage = (type: string, content: string) => {
    const now = new Date()
    const timestamp = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`

    messages.value.push({
      type,
      content,
      timestamp
    })
  }

  // 使用回调执行工具重写连接方法
  const connect = createCallbackHandler(
    () => {
      if (!liveId.value) {
        throw new Error('请输入 Live ID')
      }
      
      // 这里替换为实际的API调用
      return new Promise((resolve) => {
        setTimeout(() => {
          isConnected.value = true
          addMessage('success', `已连接到 ${liveId.value}`)
          resolve(true)
        }, 1000)
      })
    },
    {
      errorMessage: '连接失败',
      successMessage: '连接成功',
      errorHandler: (error) => {
        addMessage('error', `连接错误: ${error.message}`)
      },
      successHandler: () => {
        addMessage('info', 'RPA连接已建立')
      }
    }
  )

  // 断开连接
  const disconnect = createCallbackHandler(
    () => {
      return new Promise((resolve) => {
        setTimeout(() => {
          isConnected.value = false
          addMessage('warning', '连接已断开')
          resolve(true)
        }, 500)
      })
    },
    {
      errorMessage: '断开连接失败',
      successMessage: '已断开连接',
      errorHandler: (error) => {
        addMessage('error', `断开错误: ${error.message}`)
      }
    }
  )

  // 清空控制台
  const clearConsole = () => {
    executeCallback(
      () => {
        messages.value = []
        return true
      },
      '清空控制台失败',
      '控制台已清空'
    )
  }

  return {
    isConnected,
    messages,
    liveId,
    connect,
    disconnect,
    clearConsole,
    addMessage
  }
}

// ===== 示例2：浏览器管理面板 =====

export const useBrowserManagement = () => {
  const browsers = ref<any[]>([])
  const loading = ref(false)

  // 获取浏览器列表
  const fetchBrowsers = createCallbackHandler(
    () => {
      loading.value = true
      return browserApi.getAllBrowsers()
        .then(response => {
          browsers.value = response.data
          return response
        })
        .finally(() => {
          loading.value = false
        })
    },
    {
      errorMessage: '获取浏览器列表失败',
      successMessage: '浏览器列表已更新',
      errorHandler: (error) => {
        loading.value = false
        console.error('浏览器列表获取失败:', error)
      }
    }
  )

  // 创建浏览器
  const createBrowser = createCallbackHandler(
    (browserInfo: any) => {
      loading.value = true
      return browserApi.createBrowser(browserInfo)
        .then(response => {
          browsers.value.push(response.data)
          return response
        })
        .finally(() => {
          loading.value = false
        })
    },
    {
      errorMessage: '创建浏览器失败',
      successMessage: '浏览器创建成功',
      successHandler: (response) => {
        console.log('新浏览器创建成功:', response.data)
      },
      errorHandler: (error) => {
        loading.value = false
        console.error('浏览器创建失败:', error)
      }
    }
  )

  // 删除浏览器
  const deleteBrowser = createCallbackHandler(
    (browserId: string, mid: string) => {
      loading.value = true
      return browserApi.deleteBrowser(browserId, mid)
        .then(response => {
          browsers.value = browsers.value.filter(b => b.id !== browserId)
          return response
        })
        .finally(() => {
          loading.value = false
        })
    },
    {
      errorMessage: '删除浏览器失败',
      successMessage: '浏览器已删除',
      errorHandler: (error) => {
        loading.value = false
        console.error('浏览器删除失败:', error)
      }
    }
  )

  // 启动视频流
  const startVideoStream = createCallbackHandler(
    (mid: string, browserId: string, params: any) => {
      return browserApi.startVideoStream(mid, browserId, params)
        .then(response => {
          // 更新对应浏览器的状态
          const browserIndex = browsers.value.findIndex(b => b.id === browserId)
          if (browserIndex !== -1) {
            browsers.value[browserIndex].streaming = true
            browsers.value[browserIndex].streamInfo = response.data
          }
          return response
        })
    },
    {
      errorMessage: '启动视频流失败',
      successMessage: '视频流已启动',
      successHandler: (response) => {
        console.log('视频流启动成功:', response.data)
      }
    }
  )

  // 停止视频流
  const stopVideoStream = createCallbackHandler(
    (streamId: string) => {
      return browserApi.stopVideoStream(streamId)
        .then(response => {
          // 更新对应浏览器的状态
          const browserIndex = browsers.value.findIndex(b => b.streamInfo?.id === streamId)
          if (browserIndex !== -1) {
            browsers.value[browserIndex].streaming = false
            browsers.value[browserIndex].streamInfo = null
          }
          return response
        })
    },
    {
      errorMessage: '停止视频流失败',
      successMessage: '视频流已停止'
    }
  )

  // 批量操作
  const batchDeleteBrowsers = (browserIds: string[], mid: string) => {
    const callbacks = browserIds.map(id => () => browserApi.deleteBrowser(id, mid))
    
    executeCallback(
      () => {
        loading.value = true
        return new Promise((resolve, reject) => {
          let completed = 0
          let errors: any[] = []

          callbacks.forEach((callback, index) => {
            callback()
              .then(() => {
                completed++
                browsers.value = browsers.value.filter(b => b.id !== browserIds[index])
                
                if (completed === browserIds.length) {
                  loading.value = false
                  if (errors.length > 0) {
                    reject(new Error(`部分删除失败: ${errors.length}个错误`))
                  } else {
                    resolve(true)
                  }
                }
              })
              .catch((error) => {
                completed++
                errors.push(error)
                
                if (completed === browserIds.length) {
                  loading.value = false
                  if (errors.length === browserIds.length) {
                    reject(new Error('所有删除操作都失败了'))
                  } else {
                    resolve(true)
                  }
                }
              })
          })
        })
      },
      '批量删除浏览器失败',
      '批量删除完成'
    )
  }

  return {
    browsers,
    loading,
    fetchBrowsers,
    createBrowser,
    deleteBrowser,
    startVideoStream,
    stopVideoStream,
    batchDeleteBrowsers
  }
}

// ===== 示例3：表单提交处理 =====

export const useFormSubmission = () => {
  const isSubmitting = ref(false)

  const submitForm = createCallbackHandler(
    (formData: any, submitFunction: (data: any) => Promise<any>) => {
      isSubmitting.value = true
      
      return submitFunction(formData)
        .then(response => {
          // 重置表单逻辑可以在这里处理
          return response
        })
        .finally(() => {
          isSubmitting.value = false
        })
    },
    {
      errorMessage: '表单提交失败',
      successMessage: '表单提交成功',
      errorHandler: (error) => {
        isSubmitting.value = false
        // 可以根据错误类型进行特殊处理
        if (error.response?.status === 422) {
          console.error('表单验证失败:', error.response.data)
        }
      }
    }
  )

  // 复杂的多步骤表单提交
  const submitMultiStepForm = (formData: any, steps: Array<() => Promise<any>>) => {
    executeCallback(
      () => {
        isSubmitting.value = true
        
        // 使用Promise链执行多个步骤
        return steps.reduce((promise, step) => {
          return promise.then(() => step())
        }, Promise.resolve())
          .then(() => {
            isSubmitting.value = false
            return true
          })
          .catch((error) => {
            isSubmitting.value = false
            throw error
          })
      },
      '多步骤表单提交失败',
      '所有步骤提交成功'
    )
  }

  return {
    isSubmitting,
    submitForm,
    submitMultiStepForm
  }
}

// ===== 示例4：数据获取和缓存管理 =====

export const useDataCache = <T>() => {
  const cache = ref<Map<string, { data: T; timestamp: number }>>(new Map())
  const loading = ref(false)

  const getCachedData = createCallbackHandler(
    (key: string, fetchFunction: () => Promise<T>, cacheTime: number = 300000) => { // 5分钟缓存
      // 检查缓存
      const cached = cache.value.get(key)
      const now = Date.now()
      
      if (cached && (now - cached.timestamp) < cacheTime) {
        return Promise.resolve(cached.data)
      }

      loading.value = true
      
      return fetchFunction()
        .then(data => {
          cache.value.set(key, { data, timestamp: now })
          return data
        })
        .finally(() => {
          loading.value = false
        })
    },
    {
      errorMessage: '数据获取失败',
      successMessage: '数据已更新'
    }
  )

  const clearCache = (key?: string) => {
    executeCallback(
      () => {
        if (key) {
          cache.value.delete(key)
        } else {
          cache.value.clear()
        }
        return true
      },
      '清除缓存失败',
      '缓存已清除'
    )
  }

  return {
    cache,
    loading,
    getCachedData,
    clearCache
  }
}