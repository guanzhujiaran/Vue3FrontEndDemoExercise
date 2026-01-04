/**
 * 回调执行工具测试文件
 * 在浏览器控制台中运行这些测试来验证功能
 */

import { executeCallback, createCallbackHandler, executeBatchCallbacks } from './callbackExecutor'

// ===== 测试函数 =====

// 同步成功测试
export function testSyncSuccess() {
  console.log('=== 测试同步成功操作 ===')
  
  executeCallback(
    () => {
      const result = 2 + 3
      console.log('计算结果:', result)
      return result
    },
    '同步操作失败',
    '同步操作成功'
  )
}

// 同步失败测试
export function testSyncError() {
  console.log('=== 测试同步失败操作 ===')
  
  executeCallback(
    () => {
      throw new Error('这是一个测试错误')
    },
    '同步操作失败',
    '同步操作成功'
  )
}

// 异步成功测试
export function testAsyncSuccess() {
  console.log('=== 测试异步成功操作 ===')
  
  executeCallback(
    () => {
      return new Promise((resolve) => {
        setTimeout(() => {
          console.log('异步操作完成')
          resolve('异步结果')
        }, 1000)
      })
    },
    '异步操作失败',
    '异步操作成功'
  )
}

// 异步失败测试
export function testAsyncError() {
  console.log('=== 测试异步失败操作 ===')
  
  executeCallback(
    () => {
      return new Promise((_, reject) => {
        setTimeout(() => {
          reject(new Error('异步测试错误'))
        }, 1000)
      })
    },
    '异步操作失败',
    '异步操作成功'
  )
}

// 事件处理器测试
export function testCallbackHandler() {
  console.log('=== 测试事件处理器 ===')
  
  const handler = createCallbackHandler(
    (name: string) => {
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve(`你好, ${name}!`)
        }, 500)
      })
    },
    {
      errorMessage: '问候失败',
      successMessage: '问候成功',
      errorHandler: (error) => {
        console.log('自定义错误处理:', error.message)
      },
      successHandler: (result) => {
        console.log('自定义成功处理:', result)
      }
    }
  )
  
  // 测试成功情况
  handler('张三')
  
  // 测试失败情况
  const errorHandler = createCallbackHandler(
    () => {
      throw new Error('处理器测试错误')
    },
    {
      errorMessage: '处理器操作失败',
      errorHandler: (error) => {
        console.log('处理器自定义错误处理:', error.message)
      }
    }
  )
  
  errorHandler()
}

// 批量操作测试
export function testBatchCallbacks() {
  console.log('=== 测试批量操作 ===')
  
  // 并行批量操作
  const parallelCallbacks = [
    () => Promise.resolve('任务1完成'),
    () => Promise.resolve('任务2完成'),
    () => Promise.resolve('任务3完成')
  ]
  
  executeBatchCallbacks(
    parallelCallbacks,
    {
      errorMessage: '并行批量操作失败',
      successMessage: '并行批量操作完成',
      parallel: true
    }
  )
  
  // 串行批量操作
  const serialCallbacks = [
    () => {
      console.log('执行步骤1')
      return Promise.resolve('步骤1完成')
    },
    () => {
      console.log('执行步骤2')
      return Promise.resolve('步骤2完成')
    },
    () => {
      console.log('执行步骤3')
      return Promise.resolve('步骤3完成')
    }
  ]
  
  setTimeout(() => {
    executeBatchCallbacks(
      serialCallbacks,
      {
        errorMessage: '串行批量操作失败',
        successMessage: '串行批量操作完成',
        parallel: false
      }
    )
  }, 2000)
}

// 复杂Promise链测试
export function testComplexPromiseChain() {
  console.log('=== 测试复杂Promise链 ===')
  
  executeCallback(
    () => {
      return Promise.resolve('步骤1')
        .then(result => {
          console.log('步骤1结果:', result)
          return Promise.resolve('步骤2')
        })
        .then(result => {
          console.log('步骤2结果:', result)
          return new Promise(resolve => {
            setTimeout(() => resolve('步骤3'), 1000)
          })
        })
        .then(result => {
          console.log('步骤3结果:', result)
          return Promise.resolve('所有步骤完成')
        })
    },
    '复杂Promise链失败',
    '复杂Promise链成功'
  )
}

// 带条件的操作测试
export function testConditionalOperation() {
  console.log('=== 测试条件操作 ===')
  
  const shouldSucceed = Math.random() > 0.5
  
  executeCallback(
    () => {
      if (shouldSucceed) {
        return Promise.resolve('条件满足，操作成功')
      } else {
        throw new Error('条件不满足，操作失败')
      }
    },
    '条件操作失败',
    '条件操作成功'
  )
}

// ===== 运行所有测试 =====
export function runAllTests() {
  console.log('🧪 开始运行回调执行工具测试')
  
  // 基础测试
  testSyncSuccess()
  
  setTimeout(() => testSyncError(), 500)
  setTimeout(() => testAsyncSuccess(), 1000)
  setTimeout(() => testAsyncError(), 2000)
  setTimeout(() => testCallbackHandler, 3000)
  setTimeout(() => testBatchCallbacks, 4000)
  setTimeout(() => testComplexPromiseChain, 6000)
  setTimeout(() => testConditionalOperation, 8000)
  
  console.log('📋 测试计划已安排，请查看控制台输出和消息提示')
}

// ===== 性能测试 =====
export function testPerformance() {
  console.log('=== 性能测试 ===')
  
  const startTime = Date.now()
  const operations = Array.from({ length: 100 }, (_, i) => 
    () => Promise.resolve(`操作${i}完成`)
  )
  
  executeCallback(
    () => {
      return Promise.all(operations)
    },
    '性能测试失败',
    () => {
      const endTime = Date.now()
      const duration = endTime - startTime
      console.log(`🚀 100个并行操作完成，耗时: ${duration}ms`)
      return `性能测试完成，耗时: ${duration}ms`
    }
  )
}

// 在浏览器控制台中运行：
// import('./callbackExecutor.test').then(test => test.runAllTests())
// import('./callbackExecutor.test').then(test => test.testPerformance())