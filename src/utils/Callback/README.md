# 回调执行工具 (Callback Executor)

一个不使用 `async/await`，而是使用 Promise 链式调用的回调执行工具，提供统一的错误处理和消息提示功能。

## 特性

- 🚫 **不使用 async/await**：使用 Promise 的 `.then()` 和 `.catch()` 方法
- 📝 **错误日志记录**：自动打印错误信息到控制台
- 💬 **消息气泡提示**：使用 Element Plus 的 ElMessage 显示错误和成功信息
- 🔄 **支持同步和异步操作**：自动检测回调函数类型
- 🎯 **灵活的配置选项**：可自定义错误消息、成功消息等
- 📦 **批量操作支持**：支持并行和串行批量执行
- 🎨 **Vue组件友好**：提供便捷的事件处理器创建函数

## 基础用法

### 1. executeCallback - 基础执行器

```typescript
import { executeCallback } from '@/utils/Callback/callbackExecutor'
import { browserApi } from '@/api/browser/browser_api'

// 同步操作
executeCallback(
  () => {
    const result = 1 + 1
    return result
  },
  '计算失败',
  '计算成功'
)

// 异步操作
executeCallback(
  () => browserApi.getAllBrowsers(),
  '获取浏览器列表失败',
  '获取浏览器列表成功'
)

// 带参数的异步操作
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
```

### 2. createCallbackHandler - 事件处理器

```typescript
import { createCallbackHandler } from '@/utils/Callback/callbackExecutor'

// 创建按钮点击处理器
const handleCreateBrowser = createCallbackHandler(
  (browserInfo: any) => browserApi.createBrowser(browserInfo),
  {
    errorMessage: '创建浏览器失败',
    successMessage: '浏览器创建成功',
    showSuccess: true
  }
)

// 带自定义处理的处理器
const handleDeleteBrowser = createCallbackHandler(
  (browserId: string, mid: string) => browserApi.deleteBrowser(browserId, mid),
  {
    errorMessage: '删除浏览器失败',
    successMessage: '浏览器已删除',
    errorHandler: (error) => {
      console.error('自定义错误处理:', error)
      if (error.response?.status === 404) {
        console.log('浏览器不存在')
      }
    },
    successHandler: (result) => {
      console.log('自定义成功处理:', result)
    }
  }
)
```

## Vue组件中的使用

```vue
<template>
  <div>
    <button @click="handleStartStream">开始推流</button>
    <button @click="handleStopStream('stream123')">停止推流</button>
    <button @click="handleSubmitForm(formData)">提交表单</button>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { executeCallback, createCallbackHandler } from '@/utils/Callback/callbackExecutor'
import { browserApi } from '@/api/browser/browser_api'

export default defineComponent({
  methods: {
    // 直接使用executeCallback
    handleStartStream() {
      executeCallback(
        () => browserApi.startVideoStream('user123', 'browser456'),
        '推流启动失败',
        '推流已成功启动'
      )
    },
    
    // 使用预创建的处理器
    handleStopStream: createCallbackHandler(
      (streamId: string) => browserApi.stopVideoStream(streamId),
      {
        errorMessage: '推流停止失败',
        successMessage: '推流已停止'
      }
    ),
    
    // 复杂的Promise链操作
    handleSubmitForm(formData: any) {
      executeCallback(
        () => {
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
})
</script>
```

## 批量操作

### 并行执行

```typescript
import { executeBatchCallbacks } from '@/utils/Callback/callbackExecutor'

function batchCreateBrowsers(browserInfos: any[]) {
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
```

### 串行执行

```typescript
function batchDeleteBrowsers(browserIds: string[], mid: string) {
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
```

## 复杂Promise链示例

```typescript
function complexOperation(mid: string, browserInfo: any) {
  executeCallback(
    () => {
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
          // 等待2秒
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
```

## API参考

### executeCallback

```typescript
function executeCallback<T = any>(
  callback: () => T | Promise<T>,
  errorMessage?: string,
  successMessage?: string,
  showSuccess?: boolean
): void
```

**参数：**
- `callback`: 要执行的回调函数
- `errorMessage`: 自定义错误消息（默认: '操作失败'）
- `successMessage`: 成功消息（可选）
- `showSuccess`: 是否显示成功提示（默认: true）

### createCallbackHandler

```typescript
function createCallbackHandler<T = any>(
  callback: (...args: any[]) => T | Promise<T>,
  options?: {
    errorMessage?: string
    successMessage?: string
    showSuccess?: boolean
    errorHandler?: (error: any) => void
    successHandler?: (result: T) => void
  }
): (...args: any[]) => void
```

**参数：**
- `callback`: 回调函数
- `options`: 配置选项
  - `errorMessage`: 错误消息
  - `successMessage`: 成功消息
  - `showSuccess`: 是否显示成功提示
  - `errorHandler`: 自定义错误处理函数
  - `successHandler`: 自定义成功处理函数

### executeBatchCallbacks

```typescript
function executeBatchCallbacks<T = any>(
  callbacks: Array<() => T | Promise<T>>,
  options?: {
    errorMessage?: string
    successMessage?: string
    showSuccess?: boolean
    parallel?: boolean
  }
): void
```

**参数：**
- `callbacks`: 回调函数数组
- `options`: 配置选项
  - `errorMessage`: 错误消息
  - `successMessage`: 成功消息
  - `showSuccess`: 是否显示成功提示
  - `parallel`: 是否并行执行（默认: false）

## 注意事项

1. **依赖Element Plus**: 需要项目中安装并正确配置Element Plus
2. **错误处理**: 所有错误都会自动记录到控制台并显示用户友好的消息
3. **类型安全**: 支持TypeScript类型推断
4. **性能考虑**: 大量批量操作时建议使用并行执行以提高性能
5. **Promise链**: 复杂操作可以使用Promise的`.then()`方法链式调用

## 迁移指南

如果你现在使用的是 async/await 语法，可以按以下方式迁移：

**之前：**
```typescript
async function handleOperation() {
  try {
    const result = await browserApi.createBrowser(data)
    console.log('成功:', result)
    ElMessage.success('操作成功')
  } catch (error) {
    console.error('失败:', error)
    ElMessage.error('操作失败')
  }
}
```

**之后：**
```typescript
function handleOperation() {
  executeCallback(
    () => browserApi.createBrowser(data),
    '操作失败',
    '操作成功'
  )
}
```