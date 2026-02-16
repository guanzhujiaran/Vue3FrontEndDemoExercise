<!--
 * @Author: 星瞳 1944637830@qq.com
 * @Date: 2024-12-23 00:00:00
 * @LastEditors: 星瞳 1944637830@qq.com
 * @LastEditTime: 2024-12-23 00:00:00
 * @FilePath: \Vue3FrontEndDemoExercise\src\components\browser\JavaScriptExecutor.vue
 * @Description: JavaScript代码执行器组件 - 提供安全的JavaScript代码执行和结果展示
-->
<template>
  <div class="javascript-executor">
    <!-- 执行器头部 -->
    <div class="flex items-center justify-between mb-4">
      <h4 class="font-medium">JavaScript 执行器</h4>
      <div class="flex items-center gap-2">
        <el-switch 
          v-model="safeMode" 
          active-text="安全模式" 
          inactive-text="直接执行"
          @change="handleModeChange" />
        <el-tooltip content="安全模式会进行代码安全检查和沙箱限制">
          <el-icon class="text-gray-400 cursor-help">
            <QuestionFilled />
          </el-icon>
        </el-tooltip>
      </div>
    </div>

    <!-- 代码编辑器 -->
    <div class="mb-4">
      <div class="flex items-center justify-between mb-2">
        <label class="block text-sm font-medium">JavaScript 代码</label>
        <div class="flex gap-2">
          <el-button size="small" @click="insertExample('click')" :disabled="props.disabled">
            点击示例
          </el-button>
          <el-button size="small" @click="insertExample('scroll')" :disabled="props.disabled">
            滚动示例
          </el-button>
          <el-button size="small" @click="insertExample('input')" :disabled="props.disabled">
            输入示例
          </el-button>
        </div>
      </div>
      
      <div class="relative">
        <el-input
          v-model="jsCode"
          type="textarea"
          :rows="6"
          placeholder="// 在此输入JavaScript代码
// 示例: document.querySelector('button').click()
// 返回值将作为执行结果"
          :disabled="props.disabled"
          @input="handleCodeChange"
          class="mb-2" />

        <!-- 安全检查按钮 -->
        <el-button
          v-if="jsCode.trim() && safeMode"
          size="small"
          type="info"
          :loading="checkingSecurity"
          :disabled="props.disabled"
          @click="checkCodeSecurity"
          class="absolute top-2 right-2">
          <el-icon>
            <Lock />
          </el-icon>
          安全检查
        </el-button>
      </div>

      <!-- 安全检查结果 -->
      <div v-if="showSecurityChecker && securityResult" class="mb-3">
        <SecurityChecker :security-result="securityResult" />
      </div>

      <!-- 执行选项 -->
      <div class="flex items-center gap-4 mb-3">
        <div class="flex items-center gap-2">
          <label class="text-sm">超时时间(ms):</label>
          <el-input-number
            v-model="timeout"
            :min="1000"
            :max="30000"
            :step="1000"
            :disabled="props.disabled"
            size="small"
            style="width: 120px" />
        </div>
        <el-checkbox v-model="awaitResult" :disabled="props.disabled">
          等待执行结果
        </el-checkbox>
      </div>

      <!-- 执行按钮 -->
      <el-button
        type="primary"
        @click="executeCode"
        :loading="executing"
        :disabled="!jsCode.trim() || props.disabled"
        class="w-full">
        <el-icon>
          <VideoPlay />
        </el-icon>
        {{ executing ? '执行中...' : '执行代码' }}
      </el-button>
    </div>

    <!-- 执行结果 -->
    <div v-if="executionResult" class="border rounded-lg p-3 bg-gray-50">
      <div class="flex items-center justify-between mb-2">
        <h5 class="font-medium text-sm">执行结果</h5>
        <el-tag 
          :type="executionResult.success ? 'success' : 'danger'" 
          size="small">
          {{ executionResult.success ? '成功' : '失败' }}
        </el-tag>
      </div>
      
      <!-- 结果内容 -->
      <div v-if="executionResult.success" class="space-y-2">
        <div v-if="executionResult.result !== undefined">
          <label class="text-xs text-gray-500">返回值:</label>
          <pre class="text-xs bg-white p-2 rounded border overflow-x-auto">{{ 
            typeof executionResult.result === 'object' 
              ? JSON.stringify(executionResult.result, null, 2) 
              : executionResult.result 
          }}</pre>
        </div>
        <div v-if="executionResult.execution_time" class="text-xs text-gray-500">
          执行耗时: {{ executionResult.execution_time }}ms
        </div>
      </div>
      
      <!-- 错误信息 -->
      <div v-else-if="executionResult.error">
        <label class="text-xs text-red-500">错误信息:</label>
        <pre class="text-xs bg-red-50 p-2 rounded border text-red-700 overflow-x-auto">{{ 
          executionResult.error 
        }}</pre>
      </div>
    </div>

    <!-- 安全警告 -->
    <div v-if="safeMode" class="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded">
      <div class="flex items-start gap-2">
        <el-icon class="text-yellow-600 mt-0.5">
          <Warning />
        </el-icon>
        <div class="text-xs text-yellow-800">
          <p class="font-medium mb-1">安全模式已启用</p>
          <ul class="list-disc list-inside space-y-0.5">
            <li>禁止访问文件系统和网络请求</li>
            <li>限制DOM操作和全局变量访问</li>
            <li>代码将在沙箱环境中执行</li>
            <li>执行时间限制为设定值</li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { browserLiveControlApi } from '@/api/browser/browser_api'
import type {
  JavaScriptExecuteParams,
  JavaScriptExecuteResponse,
  SecurityCheckResult,
  SimplifiedJavaScriptExecuteWithParamsRequest
} from '@/types/browser-automation-api'
import SecurityChecker from './SecurityChecker.vue'

// 定义Props
interface Props {
  browserId: number | null
  disabled?: boolean
}

const props = defineProps<Props>()

// 定义Emit
const emit = defineEmits<{
  executed: [result: JavaScriptExecuteResponse]
}>()

// 响应式数据
const jsCode = ref('')
const timeout = ref(5000)
const awaitResult = ref(true)
const safeMode = ref(true)
const executing = ref(false)
const executionResult = ref<JavaScriptExecuteResponse | null>(null)
const securityResult = ref<SecurityCheckResult | null>(null)
const checkingSecurity = ref(false)
const showSecurityChecker = ref(false)

// 代码示例
const codeExamples = {
  click: `// 点击页面上的按钮
const button = document.querySelector('button');
if (button) {
  button.click();
  return '按钮已点击';
} else {
  return '未找到按钮';
}`,

  scroll: `// 滚动到页面底部
window.scrollTo({
  top: document.body.scrollHeight,
  behavior: 'smooth'
});
return '已滚动到页面底部';`,

  input: `// 在输入框中输入文本
const input = document.querySelector('input[type="text"], textarea');
if (input) {
  input.value = 'Hello World';
  input.dispatchEvent(new Event('input', { bubbles: true }));
  return '文本已输入';
} else {
  return '未找到输入框';
}`
}

// 方法
const handleModeChange = (enabled: boolean) => {
  ElMessage.info(enabled ? '已切换到安全模式' : '已切换到直接执行模式')
  if (enabled && jsCode.value.trim()) {
    // 切换到安全模式时自动检查代码
    checkCodeSecurity()
  }
}

// 处理代码变化
const handleCodeChange = () => {
  // 清空之前的安全检查结果
  securityResult.value = null
  showSecurityChecker.value = false
}

// 检查代码安全性
const checkCodeSecurity = async () => {
  if (!jsCode.value.trim()) {
    securityResult.value = null
    return
  }

  checkingSecurity.value = true
  try {
    const params = {
      code: jsCode.value.trim(),
      strict_mode: safeMode.value,
      timeout: 3000 // 安全检查超时3秒
    }

    const response = await browserLiveControlApi.checkCodeSecurity(params)
    if (response.data) {
      securityResult.value = response.data
      showSecurityChecker.value = true
      
      // 如果检测到高风险，显示警告
      if (response.data.level === 'high') {
        ElMessage.warning('检测到高风险代码，建议修改后再执行')
      }
    }
  } catch (error: any) {
    console.error('安全检查失败', error)
    ElMessage.error('安全检查失败: ' + error.message)
    securityResult.value = null
  } finally {
    checkingSecurity.value = false
  }
}

const insertExample = (type: keyof typeof codeExamples) => {
  jsCode.value = codeExamples[type]
  ElMessage.success('示例代码已插入')
}

const executeCode = async () => {
  if (!props.browserId || !jsCode.value.trim()) return

  // 安全模式下的预检查
  if (safeMode.value) {
    // 如果还没有安全检查结果，先进行检查
    if (!securityResult.value) {
      await checkCodeSecurity()
    }
    
    // 如果有高风险，需要用户确认
    if (securityResult.value && securityResult.value.level === 'high') {
      try {
        await ElMessageBox.confirm(
          '检测到高风险代码，可能包含不安全操作。确定要继续执行吗？',
          '安全警告',
          {
            confirmButtonText: '继续执行',
            cancelButtonText: '取消',
            type: 'warning',
          }
        )
      } catch {
        return // 用户取消执行
      }
    }
  }

  executing.value = true
  executionResult.value = null

  try {
    const request: SimplifiedJavaScriptExecuteWithParamsRequest = {
      code: jsCode.value.trim(),
      timeout: timeout.value
    }

    let response
    if (safeMode.value) {
      response = await browserLiveControlApi.safeExecuteJavaScript(props.browserId, request)
    } else {
      response = await browserLiveControlApi.executeJavaScript(props.browserId, request)
    }

    if (response.data) {
      executionResult.value = response.data
      emit('executed', response.data)

      if (response.data.success) {
        ElMessage.success('代码执行成功')
      } else {
        ElMessage.error('代码执行失败: ' + (response.data.error || '未知错误'))
      }
    } else {
      throw new Error('执行接口返回空结果')
    }
  } catch (error: any) {
    console.error('JavaScript执行失败', error)
    executionResult.value = {
      success: false,
      error: error.message || '执行请求失败'
    }
    ElMessage.error('代码执行失败: ' + error.message)
  } finally {
    executing.value = false
  }
}

// 清空结果
const clearResult = () => {
  executionResult.value = null
}

// 暴露方法给父组件
defineExpose({
  clearResult,
  executeCode
})
</script>

<style scoped>
.javascript-executor {
  padding: 16px;
}

pre {
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  white-space: pre-wrap;
  word-break: break-all;
}
</style>