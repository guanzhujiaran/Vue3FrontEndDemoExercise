// 通知配置API测试工具
import browserApi, { browserLiveControlApi } from '@/api/browser/browser_api'
import type {
  NotifyConfigReadRequest,
  // BrowserEffectiveNotifyRequest 已删除,不在新API中
  NotificationConfigCreate
} from '@/api/browser/browser_api'

/**
 * 测试通知配置API的正确调用方式
 */
export async function testNotificationApi() {
  try {
    console.log('=== 测试通知配置API ===')

    // 1. 测试读取全局通知配置
    console.log('1. 读取全局通知配置...')
    const globalConfig = await browserApi.readGlobalNotifyConfig()
    console.log('全局配置:', globalConfig)

    // 2. 测试读取浏览器通知配置
    console.log('2. 读取浏览器通知配置...')
    const browserConfig = await browserApi.readNotifyConfig({
      browser_id: 'test_browser_123'
    })
    console.log('浏览器配置:', browserConfig)

    // 3. 测试兼容性方法
    console.log('3. 测试兼容性方法...')
    const compatConfig = await browserApi.readNotifyConfigCompat('test_browser_123')
    console.log('兼容性配置:', compatConfig)

    // 4. 测试获取有效配置（已删除,不在新API中）
    console.log('4. 获取有效配置(已删除)...')
    // const effectiveConfig = await browserApi.getGlobalEffectiveNotifyConfig()
    // console.log('有效配置:', effectiveConfig)

    // 5. 测试浏览器特定有效配置（已删除,不在新API中）
    console.log('5. 获取浏览器有效配置(已删除)...')
    // const browserEffective = await browserApi.getBrowserEffectiveNotifyConfig({
    //   browser_id: 'test_browser_123'
    // })
    // console.log('浏览器有效配置:', browserEffective)

    // 6. 测试创建/更新配置
    console.log('6. 创建通知配置...')
    const newConfig: NotificationConfigCreate = {
      hitokoto: true,
      bark_push: 'test_bark_key',
      webhook_url: 'https://test-webhook.com',
      browser_id: 'test_browser_123'
    }
    const upsertResult = await browserApi.upsertNotifyConfig(newConfig)
    console.log('创建结果:', upsertResult)

    console.log('=== 所有测试完成 ===')
    return true

  } catch (error) {
    console.error('API测试失败:', error)
    return false
  }
}

/**
 * 测试错误的调用方式（用于对比）
 */
export async function testWrongWay() {
  try {
    console.log('=== 测试错误调用方式 ===')

    // 错误方式1：传递undefined
    console.log('1. 测试传递undefined...')
    // const result1 = await browserApi.readNotifyConfig(undefined as any)
    // 这会在我们的修复中正常工作

    // 错误方式2：直接调用fetch（如果有的话）
    console.log('2. 如果直接fetch而不传递body...')
    // const result2 = await fetch('/api/v1/rpa/browser/notify/conf/read', {
    //   method: 'POST',
    //   headers: {
    //     'Content-Type': 'application/json',
    //     'Authorization': `Bearer ${token}`
    //   },
    //   // 缺少body
    // })
    // 这会返回400错误

  } catch (error) {
    console.error('错误方式测试:', error)
  }
}

/**
 * 验证请求体格式
 */
export function validateRequestBody(request: any): boolean {
  if (!request || typeof request !== 'object') {
    console.error('请求体无效:', request)
    return false
  }
  return true
}

/**
 * 构建正确的通知配置请求
 */
export function buildNotifyConfigRequest(browserId?: string): NotifyConfigReadRequest {
  return {
    browser_id: browserId || undefined
  }
}

/**
 * 构建浏览器有效通知请求（已删除,不在新API中）
 */
// export function buildBrowserEffectiveRequest(browserId: string): BrowserEffectiveNotifyRequest { ... }

// 使用示例
export const usageExamples = {
  // 正确的调用方式
  correct: {
    readGlobal: 'await browserApi.readGlobalNotifyConfig()',
    readBrowser: 'await browserApi.readNotifyConfig({ browser_id: "browser_123" })',
    readCompat: 'await browserApi.readNotifyConfigCompat("browser_123")',
    upsert: 'await browserApi.upsertNotifyConfig({ hitokoto: true, bark_push: "key" })',
    test: 'await browserApi.testNotifyConfig({ title: "测试", content: "内容" })'
  },

  // 错误的调用方式
  wrong: {
    missingBody: 'POST /api/v1/rpa/browser/notify/conf/read (没有body)',
    getMethod: 'GET /api/v1/rpa/browser/notify/conf/read (应该是POST)',
    undefinedParam: 'await browserApi.readNotifyConfig(undefined) (应该用{}或{ browser_id })'
  }
}