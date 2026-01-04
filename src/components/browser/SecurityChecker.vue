<!--
 * @Author: 星瞳 1944637830@qq.com
 * @Date: 2024-12-23 00:00:00
 * @LastEditors: 星瞳 1944637830@qq.com
 * @LastEditTime: 2024-12-23 00:00:00
 * @FilePath: \Vue3FrontEndDemoExercise\src\components\browser\SecurityChecker.vue
 * @Description: 代码安全检查组件 - 提供JavaScript代码的安全检查和风险评估
-->
<template>
  <div class="security-checker">
    <div class="flex items-center justify-between mb-4">
      <h4 class="font-medium">代码安全检查</h4>
      <el-tooltip content="分析JavaScript代码的安全风险">
        <el-icon class="text-gray-400 cursor-help">
          <InfoFilled />
        </el-icon>
      </el-tooltip>
    </div>

    <!-- 安全检查结果 -->
    <div v-if="securityResult" class="space-y-3">
      <!-- 安全等级 -->
      <div class="flex items-center justify-between p-3 rounded-lg" :class="getSecurityLevelClass()">
        <div class="flex items-center gap-2">
          <el-icon :size="20">
            <Warning v-if="securityResult.level === 'high'" />
            <InfoFilled v-else-if="securityResult.level === 'medium'" />
            <SuccessFilled v-else />
          </el-icon>
          <span class="font-medium">{{ getSecurityLevelText() }}</span>
        </div>
        <el-tag :type="getSecurityLevelTagType()" size="small">
          {{ securityResult.score }}/100
        </el-tag>
      </div>

      <!-- 风险详情 -->
      <div v-if="securityResult.risks && securityResult.risks.length > 0" class="space-y-2">
        <h5 class="text-sm font-medium text-gray-700">检测到的风险：</h5>
        <div class="space-y-1">
          <div 
            v-for="risk in securityResult.risks" 
            :key="risk.type"
            class="flex items-start gap-2 p-2 rounded border"
            :class="getRiskLevelClass(risk.level)">
            <el-icon class="mt-0.5" :size="16">
              <Warning v-if="risk.level === 'high'" />
              <InfoFilled v-else />
            </el-icon>
            <div class="flex-1">
              <div class="text-sm font-medium">{{ risk.title }}</div>
              <div class="text-xs text-gray-600">{{ risk.description }}</div>
              <div v-if="risk.suggestion" class="text-xs text-blue-600 mt-1">
                建议: {{ risk.suggestion }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 允许的操作 -->
      <div class="p-3 bg-green-50 border border-green-200 rounded">
        <h5 class="text-sm font-medium text-green-800 mb-2">允许的操作：</h5>
        <div class="flex flex-wrap gap-2">
          <el-tag v-for="operation in securityResult.allowed_operations" :key="operation" size="small" type="success">
            {{ operation }}
          </el-tag>
        </div>
      </div>

      <!-- 禁止的操作 -->
      <div v-if="securityResult.blocked_operations && securityResult.blocked_operations.length > 0" class="p-3 bg-red-50 border border-red-200 rounded">
        <h5 class="text-sm font-medium text-red-800 mb-2">禁止的操作：</h5>
        <div class="flex flex-wrap gap-2">
          <el-tag v-for="operation in securityResult.blocked_operations" :key="operation" size="small" type="danger">
            {{ operation }}
          </el-tag>
        </div>
      </div>
    </div>

    <!-- 安全规则说明 -->
    <div v-else class="text-center text-gray-500 py-8">
      <el-icon :size="48" class="mb-2">
        <Lock />
      </el-icon>
      <p class="text-sm">输入代码后将自动进行安全检查</p>
    </div>

    <!-- 安全规则 -->
    <details class="mt-4">
      <summary class="cursor-pointer text-sm font-medium text-gray-700 hover:text-gray-900">
        安全规则说明 ▼
      </summary>
      <div class="mt-2 text-xs text-gray-600 space-y-1">
        <div class="p-2 bg-gray-50 rounded">
          <p class="font-medium mb-1">🚫 禁止的操作：</p>
          <ul class="list-disc list-inside space-y-0.5">
            <li>文件系统访问 (fs, file等)</li>
            <li>网络请求 (fetch, XMLHttpRequest, axios等)</li>
            <li>进程执行 (child_process, exec等)</li>
            <li>系统信息获取 (os, process等)</li>
            <li>危险的全局变量修改</li>
            <li>无限循环或递归调用</li>
            <li>eval() 或 Function() 构造函数</li>
          </ul>
        </div>
        <div class="p-2 bg-gray-50 rounded">
          <p class="font-medium mb-1">✅ 允许的操作：</p>
          <ul class="list-disc list-inside space-y-0.5">
            <li>DOM操作和元素选择</li>
            <li>页面导航和滚动</li>
            <li>表单输入和事件触发</li>
            <li>数据计算和字符串处理</li>
            <li>控制台输出 (console.log等)</li>
          </ul>
        </div>
      </div>
    </details>
  </div>
</template>

<script setup lang="ts">

// 定义Props
interface Props {
  securityResult: SecurityCheckResult | null
}

const props = defineProps<Props>()

// 安全检查结果类型
export interface SecurityCheckResult {
  level: 'low' | 'medium' | 'high'
  score: number
  risks: SecurityRisk[]
  allowed_operations: string[]
  blocked_operations: string[]
}

export interface SecurityRisk {
  type: string
  level: 'low' | 'medium' | 'high'
  title: string
  description: string
  suggestion?: string
  line?: number
  column?: number
}

// 计算安全等级样式类
const getSecurityLevelClass = () => {
  if (!props.securityResult) return ''
  
  switch (props.securityResult.level) {
    case 'high':
      return 'bg-red-50 border border-red-200 text-red-800'
    case 'medium':
      return 'bg-yellow-50 border border-yellow-200 text-yellow-800'
    case 'low':
      return 'bg-green-50 border border-green-200 text-green-800'
    default:
      return 'bg-gray-50 border border-gray-200 text-gray-800'
  }
}

// 获取安全等级文本
const getSecurityLevelText = () => {
  if (!props.securityResult) return ''
  
  switch (props.securityResult.level) {
    case 'high':
      return '高风险'
    case 'medium':
      return '中等风险'
    case 'low':
      return '低风险'
    default:
      return '未知'
  }
}

// 获取安全等级标签类型
const getSecurityLevelTagType = () => {
  if (!props.securityResult) return 'info'
  
  switch (props.securityResult.level) {
    case 'high':
      return 'danger'
    case 'medium':
      return 'warning'
    case 'low':
      return 'success'
    default:
      return 'info'
  }
}

// 获取风险等级样式类
const getRiskLevelClass = (level: string) => {
  switch (level) {
    case 'high':
      return 'bg-red-50 border-red-200'
    case 'medium':
      return 'bg-yellow-50 border-yellow-200'
    case 'low':
      return 'bg-blue-50 border-blue-200'
    default:
      return 'bg-gray-50 border-gray-200'
  }
}
</script>

<style scoped>
.security-checker {
  padding: 16px;
}

details summary {
  outline: none;
}

details[open] summary {
  margin-bottom: 8px;
}
</style>