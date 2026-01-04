/**
 * 回调执行工具使用示例
 * 展示如何不使用 async await，而是使用 Promise 链式调用
 */

import { executeCallback, createCallbackHandler, executeBatchCallbacks } from './callbackExecutor'
import { browserApi } from '@/api/browser/browser_api'

// ===== 基础使用示例 =====

/**
 * 示例1：同步操作
 */
export function example1() {
  executeCallback(
    () => {
      const result = 1 + 1
      return result
    },
    '计算失败',
    '计算成功'
  )
}

/**
 * 示例2：异步操作
 */
export function example2() {
  executeCallback(
    () => {
      return browserApi.getAllBrowsers()
    },
    '获取浏览器列表失败',
    '获取浏览器列表成功'
  )
}

/**
 * 示例3：带参数的异步操作
 */
export function example3(mid: string) {
  executeCallback(
    () => {
      return browserApi.startVideoStream(mid, 'browser-123', {
        name: '测试直播间',
        push_rtmp_url: 'rtmp://example.com/live'
      })
    },
    '开始视频推流失败',
    '视频推流已开始'
  )
}

// ===== 事件处理器示例 =====

/**
 * 示例4：创建按钮点击处理器
 */
export const handleCreateBrowser = createCallbackHandler(
  (browserInfo: any) => {
    return browserApi.createBrowser(browserInfo)
  },
  {
    errorMessage: '创建浏览器失败',
    successMessage: '浏览器创建成功',
    showSuccess: true
  }
)

/**
 * 示例5：带自定义错误处理的处理器
 */
export const handleDeleteBrowser = createCallbackHandler(
  (browserId: string, mid: string) => {
    return browserApi.deleteBrowser(browserId, mid)
  },
  {
    errorMessage: '删除浏览器失败',
    successMessage: '浏览器已删除',
    errorHandler: (error) => {
      console.error('自定义错误处理:', error)
      // 可以添加额外的错误处理逻辑
      if (error.response?.status === 404) {
        console.log('浏览器不存在')
      }
    },
    successHandler: (result) => {
      console.log('自定义成功处理:', result)
      // 可以添加额外的成功处理逻辑
    }
  }
)

// ===== Vue组件中的使用示例 =====

/**
 * 示例6：在Vue组件中使用
 */
export const vueComponentExample = {
  methods: {
    // 方法1：直接使用executeCallback
    handleStartStream() {
      executeCallback(
        () => browserApi.startVideoStream('user123', 'browser456'),
        '推流启动失败',
        '推流已成功启动'
      )
    },
    
    // 方法2：使用预创建的处理器
    handleStopStream: createCallbackHandler(
      (streamId: string) => browserApi.stopVideoStream(streamId),
      {
        errorMessage: '推流停止失败',
        successMessage: '推流已停止'
      }
    ),
    
    // 方法3：带表单数据的复杂操作
    handleSubmitForm(formData: any) {
      executeCallback(
        async () => {
          // 这里不能使用async await，改用Promise链
          return browserApi.createBrowser(formData)
            .then(browser => {
              console.log('浏览器创建成功:', browser)
              return browserApi.startVideoStream(formData.mid, browser.id)
            })
            .then(stream => {
              console.log('推流启动成功:', stream)
              return stream
            })
        },
        '提交表单失败',
        '表单提交成功'
      )
    }
  }
}

// ===== 批量操作示例 =====

/**
 * 示例7：批量创建浏览器
 */
export function example7(browserInfos: any[]) {
  const callbacks = browserInfos.map(info => 
    () => browserApi.createBrowser(info)
  )
  
  executeBatchCallbacks(
    callbacks,
    {
      errorMessage: '批量创建浏览器失败',
      successMessage: '所有浏览器创建成功',
      parallel: true // 并行执行
    }
  )
}

/**
 * 示例8：批量删除浏览器
 */
export function example8(browserIds: string[], mid: string) {
  const callbacks = browserIds.map(id => 
    () => browserApi.deleteBrowser(id, mid)
  )
  
  executeBatchCallbacks(
    callbacks,
    {
      errorMessage: '批量删除浏览器失败',
      successMessage: '所有浏览器已删除',
      parallel: false // 串行执行
    }
  )
}

// ===== 高级示例：Promise链式调用 =====

/**
 * 示例9：复杂的Promise链操作（不使用async await）
 */
export function example9(mid: string, browserInfo: any) {
  executeCallback(
    () => {
      // 创建Promise链
      return browserApi.createBrowser(browserInfo)
        .then(browser => {
          console.log('步骤1: 浏览器创建成功', browser)
          return browserApi.startVideoStream(mid, browser.id, {
            name: '直播间',
            push_rtmp_url: 'rtmp://example.com/live'
          })
        })
        .then(stream => {
          console.log('步骤2: 视频流启动成功', stream)
          // 等待2秒后更新配置
          return new Promise(resolve => {
            setTimeout(() => resolve(stream), 2000)
          })
        })
        .then(stream => {
          console.log('步骤3: 更新配置')
          return browserApi.updateVideoStream(stream.id, {
            name: '更新后的直播间'
          })
        })
    },
    '复杂操作失败',
    '所有步骤执行成功'
  )
}

/**
 * 示例10：带条件判断的操作
 */
export function example10(mid: string, useAdvancedConfig: boolean) {
  executeCallback(
    () => {
      return browserApi.getAllBrowsers()
        .then(browsers => {
          const activeBrowser = browsers.find(b => b.status === 'active')
          
          if (!activeBrowser) {
            throw new Error('没有活跃的浏览器')
          }
          
          if (useAdvancedConfig) {
            return browserApi.startVideoStream(mid, activeBrowser.id, {
              name: '高级配置直播间',
              push_rtmp_url: 'rtmp://advanced.com/live',
              video_bitrate: 5000,
              audio_bitrate: 192
            })
          } else {
            return browserApi.startVideoStream(mid, activeBrowser.id, {
              name: '基础配置直播间',
              push_rtmp_url: 'rtmp://basic.com/live'
            })
          }
        })
    },
    '条件操作失败',
    '条件操作执行成功'
  )
}