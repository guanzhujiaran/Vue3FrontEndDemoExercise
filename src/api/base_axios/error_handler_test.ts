/*
 * @Author: 星瞳 1944637830@qq.com
 * @Date: 2025-12-18 00:00:00
 * @Description: 错误处理功能测试文件
 */
import { apiErrorHandler, handleApiError, withErrorHandler } from './error_handler'
import emitter from '@/utils/mitt'

// 测试函数
export function testErrorHandler() {
  console.log('🧪 开始测试API错误处理功能...')

  // 1. 测试基本错误处理
  console.log('✅ 测试1: 基本错误处理')
  handleApiError({
    code: -1,
    msg: '测试错误消息'
  })

  // 2. 测试自定义错误处理
  console.log('✅ 测试2: 自定义错误处理')
  handleApiError({
    code: -2,
    msg: '自定义处理错误'
  }, {
    showToast: false,
    emitError: true,
    customHandler: (error: any) => {
      console.log('🔧 自定义错误处理:', error)
    }
  })

  // 3. 测试错误事件监听
  console.log('✅ 测试3: 错误事件监听')
  const errorHandler = (error: any) => {
    console.log('📡 收到错误事件:', error)
  }
  
  emitter.on('apiError', errorHandler)
  
  handleApiError({
    code: -3,
    msg: '事件监听测试'
  }, {
    emitError: true
  })

  // 4. 测试错误标准化
  console.log('✅ 测试4: 错误标准化')
  const axiosError = {
    response: {
      status: 500,
      data: {
        code: -500,
        msg: '服务器错误',
        data: { detail: '内部服务器错误' }
      }
    }
  }
  
  handleApiError(axiosError, {
    customHandler: (error) => {
      console.log('📋 标准化后的错误:', error)
    }
  })

  // 5. 测试包装器函数
  console.log('✅ 测试5: 包装器函数')
  const testApiFunction = async (shouldFail: boolean = false) => {
    if (shouldFail) {
      throw new Error('模拟API失败')
    }
    return { code: 0, data: 'success', msg: '成功' }
  }

  const wrappedFunction = withErrorHandler(testApiFunction, {
    showToast: true,
    emitError: true
  })

  // 测试成功调用
  wrappedFunction(false).then(result => {
    console.log('🎯 包装器成功调用:', result)
  })

  // 测试失败调用
  wrappedFunction(true).catch(error => {
    console.log('❌ 包装器失败调用:', error)
  })

  // 清理事件监听器
  setTimeout(() => {
    emitter.off('apiError', errorHandler)
    console.log('🧹 清理事件监听器')
    console.log('🎉 错误处理功能测试完成!')
  }, 1000)
}

// 测试BrowserApi错误处理
export async function testBrowserApiErrorHandling() {
  console.log('🌐 开始测试BrowserApi错误处理...')
  
  try {
    // 动态导入以避免循环依赖
    const { default: browserApi } = await import('../browser/browser_api')
    
    // 测试错误处理方法
    console.log('✅ 测试listFingerprintWithError')
    await browserApi.listFingerprintWithError(
      { page: 1, per_page: 10 },
      'invalid-mid', // 使用无效的mid来触发错误
      {
        showToast: true,
        emitError: true,
        customHandler: (error) => {
          console.log('🔍 BrowserApi自定义错误处理:', error)
        }
      }
    )
  } catch (error) {
    console.log('❌ BrowserApi测试捕获到异常:', error)
  }
  
  console.log('🌐 BrowserApi错误处理测试完成')
}

// 运行测试的辅助函数
export function runAllTests() {
  console.log('🚀 开始运行所有API错误处理测试...')
  
  testErrorHandler()
  
  // 延迟运行BrowserApi测试，避免依赖问题
  setTimeout(() => {
    testBrowserApiErrorHandling()
  }, 2000)
}

// 导出测试常量
export const ERROR_TEST_CONSTANTS = {
  TEST_ERROR_CODES: [-1, -2, -3, -101, -500, -9999],
  TEST_ERROR_MESSAGES: [
    '参数错误',
    '权限不足',
    '资源不存在',
    '用户未登录',
    '服务器错误',
    '网络连接失败'
  ]
}