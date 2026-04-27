<!--
 * @Author: 星瞳 1944637830@qq.com
 * @Date: 2026-04-11 00:00:00
 * @FilePath: \Vue3FrontEndDemoExercise\src\components\browser\DebugPanel.vue
 * @Description: Debug调试面板 - 提供操作预览、参数验证和单步执行功能
-->
<template>
  <div class="debug-panel">
    <!-- 左侧: 操作选择和参数配置 -->
    <el-row :gutter="20">
      <el-col :xs="24" :md="12">
        <el-card class="mb-5" shadow="hover">
          <template #header>
            <div class="flex items-center gap-2 font-bold">
              <el-icon><Setting /></el-icon>
              <span>操作配置</span>
            </div>
          </template>

          <!-- 操作选择 -->
          <el-tabs v-model="actionTab" class="mb-4">
            <el-tab-pane label="系统操作" name="system">
              <el-select
                v-model="selectedActionId"
                placeholder="选择系统操作"
                style="width: 100%"
                @change="handleActionChange"
              >
                <el-option
                  v-for="action in registeredActions"
                  :key="action.id"
                  :label="`${action.name} (${action.id})`"
                  :value="action.id"
                >
                  <div class="option-content">
                    <span>{{ action.name }}</span>
                    <el-tag size="small">{{ action.type }}</el-tag>
                  </div>
                </el-option>
              </el-select>
            </el-tab-pane>

            <el-tab-pane label="自定义操作" name="custom">
              <el-select
                v-model="selectedActionId"
                placeholder="选择自定义操作"
                style="width: 100%"
                @change="handleActionChange"
              >
                <el-option
                  v-for="action in customActions"
                  :key="action.action_id"
                  :label="`${action.name} (${action.action_id})`"
                  :value="action.action_id"
                />
              </el-select>
            </el-tab-pane>
          </el-tabs>

          <!-- 当前操作信息 -->
          <div v-if="currentAction" class="mb-4">
            <el-descriptions :column="1" size="small" border>
              <el-descriptions-item label="名称">
                {{ currentAction.name }}
              </el-descriptions-item>
              <el-descriptions-item label="ID">
                {{ currentAction.id || currentAction.action_id }}
              </el-descriptions-item>
              <el-descriptions-item label="描述">
                {{ currentAction.description || '暂无描述' }}
              </el-descriptions-item>
            </el-descriptions>
          </div>

          <!-- 参数配置 -->
          <div class="mb-4">
            <h4 class="text-sm font-bold text-[var(--el-text-color-primary)] mt-0 mb-3">参数配置</h4>

            <!-- 动态参数表单 -->
            <el-form
              v-if="currentActionParams.length > 0"
              :model="paramForm"
              label-width="120px"
              size="small"
            >
              <el-form-item
                v-for="param in currentActionParams"
                :key="param.name"
                :label="param.name"
                :required="param.required"
              >
                <el-input
                  v-model="paramForm[param.name]"
                  :placeholder="param.description || param.name"
                  clearable
                />
                <div v-if="param.description" class="text-xs text-[var(--el-text-color-secondary)] mt-1">
                  {{ param.description }}
                </div>
              </el-form-item>
            </el-form>

            <!-- JSON编辑器 -->
            <div v-else>
              <el-input
                v-model="paramsJson"
                type="textarea"
                :rows="8"
                placeholder='{"key": "value"}'
              />
              <div class="flex gap-2 mt-2">
                <el-button size="small" @click="formatJson">
                  <el-icon><DocumentChecked /></el-icon>
                  格式化
                </el-button>
                <el-button size="small" @click="clearParams">
                  <el-icon><Delete /></el-icon>
                  清空
                </el-button>
              </div>
            </div>
          </div>

          <!-- 调试操作按钮 -->
          <div class="grid grid-cols-2 gap-2">
            <el-button
              type="primary"
              @click="previewAction"
              :loading="previewing"
              :disabled="!selectedActionId"
            >
              <el-icon><View /></el-icon>
              预览参数
            </el-button>

            <el-button
              type="success"
              @click="validateAction"
              :loading="validating"
              :disabled="!selectedActionId"
            >
              <el-icon><CircleCheck /></el-icon>
              验证参数
            </el-button>

            <el-button
              type="warning"
              @click="executeStep"
              :loading="executingStep"
              :disabled="!selectedActionId"
            >
              <el-icon><CaretRight /></el-icon>
              单步执行
            </el-button>

            <el-button
              type="danger"
              @click="executeAction"
              :loading="executing"
              :disabled="!selectedActionId"
            >
              <el-icon><VideoPlay /></el-icon>
              执行操作
            </el-button>
          </div>
        </el-card>
      </el-col>

      <!-- 右侧: 调试信息和结果 -->
      <el-col :xs="24" :md="12">
        <!-- 预览结果 -->
        <el-card v-if="previewResult" class="mb-5" shadow="hover">
          <template #header>
            <div class="flex items-center gap-2 font-bold">
              <el-icon><View /></el-icon>
              <span>参数预览</span>
              <el-tag :type="previewResult.is_composite ? 'warning' : 'success'" size="small">
                {{ previewResult.is_composite ? '复合操作' : '单一操作' }}
              </el-tag>
            </div>
          </template>

          <div>
            <el-descriptions :column="2" size="small" border>
              <el-descriptions-item label="操作ID">
                {{ previewResult.action_id }}
              </el-descriptions-item>
              <el-descriptions-item label="操作名称">
                {{ previewResult.action_name }}
              </el-descriptions-item>
            </el-descriptions>

            <el-divider content-position="left">找到的参数</el-divider>
            <el-tag
              v-for="param in previewResult.found_params"
              :key="param"
              size="small"
              style="margin: 4px"
            >
              {{ param }}
            </el-tag>
            <el-empty v-if="previewResult.found_params.length === 0" description="无参数" :image-size="60" />

            <el-divider content-position="left">步骤预览</el-divider>
            <div
              v-for="(step, index) in previewResult.steps_preview"
              :key="index"
              class="mb-3 p-3 border border-[var(--el-border-color-lighter)] rounded bg-[var(--el-fill-color-lighter)]"
            >
              <div class="flex justify-between items-center mb-2">
                <el-tag size="small" type="info">步骤 {{ step.step_index + 1 }}</el-tag>
                <span class="text-xs text-[var(--el-text-color-secondary)]">{{ step.action_id }}</span>
              </div>
              <div>
                <div class="mb-2">
                  <label class="block text-xs text-[var(--el-text-color-regular)] mb-1">原始参数:</label>
                  <pre class="bg-[var(--el-fill-color-light)] p-2 rounded text-xs leading-relaxed m-0 overflow-x-auto">{{ JSON.stringify(step.original_params, null, 2) }}</pre>
                </div>
                <div class="mb-2">
                  <label class="block text-xs text-[var(--el-text-color-regular)] mb-1">替换后参数:</label>
                  <pre class="bg-[var(--el-fill-color-light)] p-2 rounded text-xs leading-relaxed m-0 overflow-x-auto">{{ JSON.stringify(step.replaced_params, null, 2) }}</pre>
                </div>
              </div>
            </div>
          </div>
        </el-card>

        <!-- 验证结果 -->
        <el-card v-if="validationResult" class="mb-5" shadow="hover">
          <template #header>
            <div class="flex items-center gap-2 font-bold">
              <el-icon><CircleCheck /></el-icon>
              <span>参数验证</span>
              <el-tag :type="validationResult.valid ? 'success' : 'danger'" size="small">
                {{ validationResult.valid ? '通过' : '失败' }}
              </el-tag>
            </div>
          </template>

          <div>
            <el-alert
              :title="validationResult.valid ? '参数验证通过' : '参数验证失败'"
              :type="validationResult.valid ? 'success' : 'error'"
              :closable="false"
              show-icon
            />

            <div v-if="validationResult.errors.length > 0">
              <h4 class="mt-3 mb-2 text-sm text-[var(--el-text-color-primary)]">错误列表:</h4>
              <ul class="m-0 pl-5">
                <li v-for="(error, index) in validationResult.errors" :key="index" class="text-[13px] text-[var(--el-color-danger)] my-1">
                  {{ error }}
                </li>
              </ul>
            </div>

            <div v-if="validationResult.missing_params.length > 0">
              <h4 class="mt-3 mb-2 text-sm text-[var(--el-text-color-primary)]">缺失参数:</h4>
              <el-tag
                v-for="param in validationResult.missing_params"
                :key="param"
                type="warning"
                size="small"
                style="margin: 4px"
              >
                {{ param }}
              </el-tag>
            </div>

            <div v-if="validationResult.invalid_params.length > 0">
              <h4 class="mt-3 mb-2 text-sm text-[var(--el-text-color-primary)]">无效参数:</h4>
              <el-tag
                v-for="param in validationResult.invalid_params"
                :key="param"
                type="danger"
                size="small"
                style="margin: 4px"
              >
                {{ param }}
              </el-tag>
            </div>
          </div>
        </el-card>

        <!-- 执行结果 -->
        <el-card v-if="executionResult" class="mb-5" shadow="hover">
          <template #header>
            <div class="flex items-center gap-2 font-bold">
              <el-icon><VideoPlay /></el-icon>
              <span>执行结果</span>
              <el-tag :type="executionResult.success ? 'success' : 'danger'" size="small">
                {{ executionResult.success ? '成功' : '失败' }}
              </el-tag>
            </div>
          </template>

          <div>
            <el-descriptions :column="2" size="small" border>
              <el-descriptions-item label="操作ID">
                {{ executionResult.action_id }}
              </el-descriptions-item>
              <el-descriptions-item label="操作名称">
                {{ executionResult.action_name }}
              </el-descriptions-item>
              <el-descriptions-item label="执行时间">
                {{ executionResult.execution_time?.toFixed(2) || 'N/A' }}s
              </el-descriptions-item>
            </el-descriptions>

            <el-divider v-if="executionResult.data" content-position="left">返回数据</el-divider>
            <pre v-if="executionResult.data" class="bg-[var(--el-fill-color-light)] p-3 rounded text-xs leading-relaxed m-0 overflow-x-auto">{{ JSON.stringify(executionResult.data, null, 2) }}</pre>

            <el-divider v-if="executionResult.error" content-position="left">错误信息</el-divider>
            <pre v-if="executionResult.error" class="bg-[var(--el-color-danger-light-9)] text-[var(--el-color-danger)] p-3 rounded text-xs leading-relaxed m-0 overflow-x-auto">{{ executionResult.error }}</pre>
          </div>
        </el-card>

        <!-- 空状态提示 -->
        <el-empty
          v-if="!previewResult && !validationResult && !executionResult"
          description="选择操作并执行调试操作"
          :image-size="120"
        >
          <template #description>
            <p>1. 选择要调试的操作</p>
            <p>2. 配置相关参数</p>
            <p>3. 点击预览、验证或执行按钮</p>
          </template>
        </el-empty>
      </el-col>
    </el-row>

    <!-- 执行日志面板 -->
    <el-card shadow="never">
      <template #header>
        <div class="flex items-center gap-2">
          <el-icon><Memo /></el-icon>
          <span>执行日志</span>
          <div class="ml-auto flex gap-2">
            <el-button size="small" @click="clearLogs">
              <el-icon><Delete /></el-icon>
              清空
            </el-button>
            <el-button size="small" @click="exportLogs">
              <el-icon><Download /></el-icon>
              导出
            </el-button>
          </div>
        </div>
      </template>

      <div>
        <el-scrollbar max-height="300px">
          <div v-if="logs.length === 0" class="text-center">
            <el-empty description="暂无日志" :image-size="60" />
          </div>
          <div v-else>
            <div
              v-for="(log, index) in logs"
              :key="index"
              class="flex items-center gap-2 px-2 py-2 border-b border-[#f0f0f0] font-mono text-[13px] last:border-b-0"
              :class="{
                'bg-[var(--el-color-danger-light-9)]': log.type === 'error',
                'bg-[#f0f9ff]': log.type === 'success',
                'bg-[var(--el-color-warning-light-9)]': log.type === 'warning'
              }"
            >
              <span class="text-[var(--el-text-color-secondary)] whitespace-nowrap">{{ log.time }}</span>
              <el-tag size="small" :type="getLogTagType(log.type)" class="min-w-[60px] text-center">
                {{ log.type.toUpperCase() }}
              </el-tag>
              <span class="flex-1 text-[var(--el-text-color-primary)]">{{ log.message }}</span>
              <span v-if="log.duration" class="text-[var(--el-color-success)] whitespace-nowrap">{{ log.duration.toFixed(2) }}s</span>
            </div>
          </div>
        </el-scrollbar>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import {
  Setting,
  View,
  CircleCheck,
  CaretRight,
  VideoPlay,
  Delete,
  DocumentChecked,
  Memo,
  Download
} from '@element-plus/icons-vue'
import { browserLiveControlApi } from '@/api/browser/browser_api'
import type {
  ActionMetadataResponse,
  CustomActionListItem,
  ActionPreviewResponse,
  ActionValidateResponse,
  ActionResultResponse,
  ExecuteStepResponse
} from '@/types/browser-automation-api'

// Props
const props = defineProps({
  browserId: {
    type: String,
    required: true
  }
})

// 状态管理
const actionTab = ref('system')
const selectedActionId = ref('')
const previewing = ref(false)
const validating = ref(false)
const executing = ref(false)
const executingStep = ref(false)

// 数据
const registeredActions = ref<ActionMetadataResponse[]>([])
const customActions = ref<CustomActionListItem[]>([])
const previewResult = ref<ActionPreviewResponse | null>(null)
const validationResult = ref<ActionValidateResponse | null>(null)
const executionResult = ref<ActionResultResponse | null>(null)

// 参数
const paramForm = ref<Record<string, any>>({})
const paramsJson = ref('{}')

// 日志
interface LogEntry {
  time: string
  type: 'info' | 'success' | 'warning' | 'error'
  message: string
  duration?: number
}
const logs = ref<LogEntry[]>([])

// 计算属性
const currentAction = computed(() => {
  if (!selectedActionId.value) return null

  if (actionTab.value === 'system') {
    return registeredActions.value.find(a => a.id === selectedActionId.value) || null
  } else {
    return customActions.value.find(a => a.action_id === selectedActionId.value) || null
  }
})

const currentActionParams = computed(() => {
  if (!currentAction.value || actionTab.value === 'custom') return []
  return (currentAction.value as ActionMetadataResponse).parameters || []
})

// 添加日志
const addLog = (type: LogEntry['type'], message: string, duration?: number) => {
  const now = new Date()
  const time = now.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    fractionalSecondDigits: 3
  })

  logs.value.unshift({
    time,
    type,
    message,
    duration
  })

  // 限制日志数量
  if (logs.value.length > 100) {
    logs.value = logs.value.slice(0, 100)
  }
}

// 获取系统操作列表
const fetchRegisteredActions = async () => {
  try {
    const res = await browserLiveControlApi.listRegisteredActions()
    if (res.code === 0 && res.data) {
      registeredActions.value = res.data
    }
  } catch (error) {
    console.error('获取系统操作失败:', error)
  }
}

// 获取自定义操作列表
const fetchCustomActions = async () => {
  try {
    const res = await browserLiveControlApi.listCustomActions()
    if (res.code === 0 && res.data) {
      customActions.value = res.data
    }
  } catch (error) {
    console.error('获取自定义操作失败:', error)
  }
}

// 处理操作选择变化
const handleActionChange = () => {
  paramForm.value = {}
  paramsJson.value = '{}'
  previewResult.value = null
  validationResult.value = null
  executionResult.value = null
  addLog('info', `选择操作: ${selectedActionId.value}`)
}

// 预览参数
const previewAction = async () => {
  if (!selectedActionId.value) return

  previewing.value = true
  const startTime = Date.now()

  try {
    let params = {}
    if (currentActionParams.value.length > 0) {
      params = { ...paramForm.value }
    } else {
      try {
        params = JSON.parse(paramsJson.value || '{}')
      } catch (e: any) {
        ElMessage.error('JSON格式错误，请检查输入')
        addLog('error', 'JSON解析失败')
        return
      }
    }

    const res = await browserLiveControlApi.previewActionParams({
      browser_id: props.browserId,
      req: {
        action_id: selectedActionId.value,
        params
      }
    })

    const duration = (Date.now() - startTime) / 1000

    if (res.code === 0 && res.data) {
      previewResult.value = res.data
      addLog('success', `参数预览成功: ${res.data.action_name}`, duration)
    } else {
      addLog('error', `预览失败: ${res.msg}`, duration)
      ElMessage.error(res.msg || '预览失败')
    }
  } catch (error: any) {
    const duration = (Date.now() - startTime) / 1000
    addLog('error', `预览异常: ${error.message}`, duration)
    ElMessage.error(error.message || '预览失败')
    console.error(error)
  } finally {
    previewing.value = false
  }
}

// 验证参数
const validateAction = async () => {
  if (!selectedActionId.value) return

  validating.value = true
  const startTime = Date.now()

  try {
    let params = {}
    if (currentActionParams.value.length > 0) {
      params = { ...paramForm.value }
    } else {
      try {
        params = JSON.parse(paramsJson.value || '{}')
      } catch (e: any) {
        ElMessage.error('JSON格式错误，请检查输入')
        addLog('error', 'JSON解析失败')
        return
      }
    }

    const res = await browserLiveControlApi.validateActionParams({
      browser_id: props.browserId,
      req: {
        action_id: selectedActionId.value,
        params
      }
    })

    const duration = (Date.now() - startTime) / 1000

    if (res.code === 0 && res.data) {
      validationResult.value = res.data
      if (res.data.valid) {
        addLog('success', `参数验证通过: ${res.data.action_name}`, duration)
      } else {
        addLog('warning', `参数验证失败: ${res.data.errors.length}个错误`, duration)
        ElMessage.warning('验证失败，请检查参数')
      }
    } else {
      addLog('error', `验证失败: ${res.msg}`, duration)
      ElMessage.error(res.msg || '验证失败')
    }
  } catch (error: any) {
    const duration = (Date.now() - startTime) / 1000
    addLog('error', `验证异常: ${error.message}`, duration)
    ElMessage.error(error.message || '验证失败')
    console.error(error)
  } finally {
    validating.value = false
  }
}

// 执行操作
const executeAction = async () => {
  if (!selectedActionId.value) return

  executing.value = true
  const startTime = Date.now()

  try {
    let params = {}
    if (currentActionParams.value.length > 0) {
      params = { ...paramForm.value }
    } else {
      try {
        params = JSON.parse(paramsJson.value || '{}')
      } catch (e: any) {
        ElMessage.error('JSON格式错误，请检查输入')
        addLog('error', 'JSON解析失败')
        return
      }
    }

    const res = await browserLiveControlApi.executeAction({
      browser_id: props.browserId,
      req: {
        action_id: selectedActionId.value,
        params
      }
    })

    const duration = (Date.now() - startTime) / 1000

    if (res.code === 0 && res.data) {
      executionResult.value = res.data
      if (res.data.success) {
        addLog('success', `执行成功: ${res.data.action_name}`, duration)
      } else {
        addLog('error', `执行失败: ${res.data.error}`, duration)
        ElMessage.error(res.data.error || '执行失败')
      }
    } else {
      addLog('error', `执行失败: ${res.msg}`, duration)
      ElMessage.error(res.msg || '执行失败')
    }
  } catch (error: any) {
    const duration = (Date.now() - startTime) / 1000
    addLog('error', `执行异常: ${error.message}`, duration)
    ElMessage.error(error.message || '执行失败')
    console.error(error)
  } finally {
    executing.value = false
  }
}

// 单步执行
const executeStep = async () => {
  if (!selectedActionId.value) return

  executingStep.value = true
  const startTime = Date.now()

  try {
    let params = {}
    if (currentActionParams.value.length > 0) {
      params = { ...paramForm.value }
    } else {
      try {
        params = JSON.parse(paramsJson.value || '{}')
      } catch (e: any) {
        ElMessage.error('JSON格式错误，请检查输入')
        addLog('error', 'JSON解析失败')
        return
      }
    }

    const res = await browserLiveControlApi.executeActionStep({
      browser_id: props.browserId,
      req: {
        action_id: selectedActionId.value,
        params,
        step_index: 0,
        plugin_ids: []
      }
    })

    const duration = (Date.now() - startTime) / 1000

    if (res.code === 0 && res.data) {
      executionResult.value = res.data.result
      if (res.data.result.success) {
        addLog('success', `单步执行成功: 步骤${res.data.step_index + 1}`, duration)
      } else {
        addLog('error', `单步执行失败: ${res.data.result.error}`, duration)
        ElMessage.error(res.data.result.error || '单步执行失败')
      }
    } else {
      addLog('error', `单步执行失败: ${res.msg}`, duration)
      ElMessage.error(res.msg || '单步执行失败')
    }
  } catch (error: any) {
    const duration = (Date.now() - startTime) / 1000
    addLog('error', `单步执行异常: ${error.message}`, duration)
    ElMessage.error(error.message || '单步执行失败')
    console.error(error)
  } finally {
    executingStep.value = false
  }
}

// 格式化JSON
const formatJson = () => {
  try {
    const obj = JSON.parse(paramsJson.value || '{}')
    paramsJson.value = JSON.stringify(obj, null, 2)
  } catch (e: any) {
    ElMessage.error('JSON格式错误，请检查输入')
  }
}

// 清空参数
const clearParams = () => {
  paramForm.value = {}
  paramsJson.value = '{}'
}

// 清空日志
const clearLogs = () => {
  logs.value = []
  ElMessage.success('日志已清空')
}

// 导出日志
const exportLogs = () => {
  if (logs.value.length === 0) {
    ElMessage.warning('没有可导出的日志')
    return
  }

  const json = JSON.stringify(logs.value, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `debug-logs-${Date.now()}.json`
  a.click()
  URL.revokeObjectURL(url)
  ElMessage.success('日志已导出')
}

// 获取日志标签类型
const getLogTagType = (type: LogEntry['type']) => {
  const typeMap: Record<string, any> = {
    info: 'info',
    success: 'success',
    warning: 'warning',
    error: 'danger'
  }
  return typeMap[type] || ''
}

// 初始化
onMounted(() => {
  fetchRegisteredActions()
  fetchCustomActions()
  addLog('info', 'Debug面板已就绪')
})
</script>


