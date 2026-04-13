<!--
 * @Author: 星瞳 1944637830@qq.com
 * @Date: 2026-04-11 00:00:00
 * @FilePath: \Vue3FrontEndDemoExercise\src\components\browser\CustomActionPanel.vue
 * @Description: 自定义操作管理面板 - 卡片式展示和管理用户自定义操作
-->
<template>
  <div class="custom-action-panel">
    <!-- 操作栏 -->
    <div class="action-toolbar">
      <el-button type="primary" @click="showCreateDialog = true">
        <el-icon><Plus /></el-icon>
        新建操作
      </el-button>
      <el-button @click="refreshActions" :loading="loading">
        <el-icon><Refresh /></el-icon>
        刷新列表
      </el-button>
      <el-button @click="reloadCache">
        <el-icon><RefreshRight /></el-icon>
        重载缓存
      </el-button>
    </div>

    <!-- 自定义操作卡片列表 -->
    <div class="action-cards">
      <el-row :gutter="16">
        <el-col
          v-for="action in customActions"
          :key="action.id"
          :xs="24"
          :sm="12"
          :md="8"
          :lg="6"
        >
          <el-card class="action-card" shadow="hover">
            <div class="card-header">
              <div class="header-left">
                <el-tag size="small" :type="action.is_composite ? 'warning' : 'success'">
                  {{ action.is_composite ? '复合' : '单一' }}
                </el-tag>
                <span class="action-type">{{ action.action_type }}</span>
              </div>
              <el-dropdown trigger="click" @command="(cmd) => handleActionCommand(cmd, action)">
                <el-button text>
                  <el-icon><MoreFilled /></el-icon>
                </el-button>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item command="view">
                      <el-icon><View /></el-icon>
                      查看详情
                    </el-dropdown-item>
                    <el-dropdown-item command="edit">
                      <el-icon><Edit /></el-icon>
                      编辑
                    </el-dropdown-item>
                    <el-dropdown-item command="execute" divided>
                      <el-icon><CaretRight /></el-icon>
                      执行
                    </el-dropdown-item>
                    <el-dropdown-item command="delete" divided danger>
                      <el-icon><Delete /></el-icon>
                      删除
                    </el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
            </div>

            <div class="card-body">
              <h4 class="action-name">{{ action.name }}</h4>
              <p class="action-desc">{{ action.description || '暂无描述' }}</p>
              <div class="action-meta">
                <span class="meta-item">
                  <el-icon><Clock /></el-icon>
                  {{ formatDate(action.created_at) }}
                </span>
              </div>
            </div>

            <div class="card-footer">
              <el-button
                size="small"
                type="primary"
                @click="executeAction(action)"
                :disabled="!isBrowserRunning"
              >
                执行
              </el-button>
            </div>
          </el-card>
        </el-col>
      </el-row>

      <el-empty
        v-if="customActions.length === 0 && !loading"
        description="暂无自定义操作"
      >
        <el-button type="primary" @click="showCreateDialog = true">
          创建第一个操作
        </el-button>
      </el-empty>
    </div>

    <!-- 创建/编辑对话框 -->
    <el-dialog
      v-model="showCreateDialog"
      :title="editingAction ? '编辑操作' : '新建操作'"
      width="700px"
      destroy-on-close
    >
      <el-form
        ref="formRef"
        :model="formData"
        :rules="formRules"
        label-width="100px"
      >
        <el-form-item label="操作名称" prop="name">
          <el-input v-model="formData.name" placeholder="请输入操作名称" />
        </el-form-item>

        <el-form-item label="操作ID" prop="action_id">
          <el-input
            v-model="formData.action_id"
            placeholder="例如: my_custom_action"
            :disabled="!!editingAction"
          />
          <div class="form-tip">唯一标识符,只能包含字母、数字和下划线</div>
        </el-form-item>

        <el-form-item label="操作类型" prop="action_type">
          <el-select v-model="formData.action_type" placeholder="选择类型" style="width: 100%">
            <el-option label="导航 (navigation)" value="navigation" />
            <el-option label="交互 (interaction)" value="interaction" />
            <el-option label="提取 (extraction)" value="extraction" />
            <el-option label="工具 (utility)" value="utility" />
            <el-option label="其他 (other)" value="other" />
          </el-select>
        </el-form-item>

        <el-form-item label="是否复合操作">
          <el-switch v-model="formData.is_composite" />
          <div class="form-tip">复合操作可包含多个步骤</div>
        </el-form-item>

        <el-form-item label="描述">
          <el-input
            v-model="formData.description"
            type="textarea"
            :rows="3"
            placeholder="简要描述此操作的功能"
          />
        </el-form-item>

        <el-form-item label="超时时间">
          <el-input-number
            v-model="formData.timeout"
            :min="1"
            :max="300"
            placeholder="秒"
          />
          <span class="form-tip">操作执行的超时时间(秒)</span>
        </el-form-item>

        <el-form-item label="启用状态">
          <el-switch v-model="formData.is_enabled" />
        </el-form-item>

        <!-- 简单模式: 单步操作 -->
        <template v-if="!formData.is_composite">
          <el-divider content-position="left">操作步骤</el-divider>

          <el-form-item label="目标操作" prop="target_action_id">
            <el-select
              v-model="formData.target_action_id"
              placeholder="选择系统操作"
              style="width: 100%"
            >
              <el-option
                v-for="action in registeredActions"
                :key="action.id"
                :label="action.name"
                :value="action.id"
              />
            </el-select>
          </el-form-item>

          <el-form-item label="参数配置">
            <el-input
              v-model="formData.params_json"
              type="textarea"
              :rows="6"
              placeholder='{"key": "value"}'
            />
            <div class="form-tip">JSON格式的参数配置</div>
          </el-form-item>
        </template>

        <!-- 复合模式: 多步骤操作 -->
        <template v-else>
          <el-divider content-position="left">
            步骤列表
            <el-button size="small" type="primary" @click="addStep" style="margin-left: 10px">
              <el-icon><Plus /></el-icon>
              添加步骤
            </el-button>
          </el-divider>

          <div v-for="(step, index) in formData.steps" :key="index" class="step-item">
            <div class="step-header">
              <span class="step-number">步骤 {{ index + 1 }}</span>
              <el-button
                text
                type="danger"
                size="small"
                @click="removeStep(index)"
                :disabled="formData.steps.length <= 1"
              >
                <el-icon><Delete /></el-icon>
              </el-button>
            </div>

            <el-form-item :label="`目标操作`" :prop="`steps.${index}.action_id`">
              <el-select
                v-model="step.action_id"
                placeholder="选择操作"
                style="width: 100%"
              >
                <el-option
                  v-for="action in registeredActions"
                  :key="action.id"
                  :label="action.name"
                  :value="action.id"
                />
              </el-select>
            </el-form-item>

            <el-form-item label="参数配置">
              <el-input
                v-model="step.params_json"
                type="textarea"
                :rows="4"
                placeholder='{"key": "value"}'
              />
            </el-form-item>
          </div>
        </template>
      </el-form>

      <template #footer>
        <el-button @click="showCreateDialog = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit" :loading="submitting">
          保存
        </el-button>
      </template>
    </el-dialog>

    <!-- 查看详情对话框 -->
    <el-dialog
      v-model="showDetailDialog"
      title="操作详情"
      width="700px"
      destroy-on-close
    >
      <div v-if="currentDetail" class="detail-content">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="操作ID">
            {{ currentDetail.action_id }}
          </el-descriptions-item>
          <el-descriptions-item label="名称">
            {{ currentDetail.name }}
          </el-descriptions-item>
          <el-descriptions-item label="类型">
            {{ currentDetail.action_type }}
          </el-descriptions-item>
          <el-descriptions-item label="复合操作">
            <el-tag :type="currentDetail.is_composite ? 'warning' : 'success'" size="small">
              {{ currentDetail.is_composite ? '是' : '否' }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="启用状态">
            <el-tag :type="currentDetail.is_enabled ? 'success' : 'info'" size="small">
              {{ currentDetail.is_enabled ? '已启用' : '已禁用' }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="超时时间">
            {{ currentDetail.timeout || '默认' }} 秒
          </el-descriptions-item>
          <el-descriptions-item label="创建时间" :span="2">
            {{ formatDate(currentDetail.created_at) }}
          </el-descriptions-item>
          <el-descriptions-item label="更新时间" :span="2">
            {{ formatDate(currentDetail.updated_at) }}
          </el-descriptions-item>
          <el-descriptions-item label="描述" :span="2">
            {{ currentDetail.description || '暂无描述' }}
          </el-descriptions-item>
        </el-descriptions>

        <el-divider content-position="left">参数定义</el-divider>
        <pre class="json-viewer">{{ JSON.stringify(currentDetail.parameters_schema, null, 2) }}</pre>

        <el-divider content-position="left">执行步骤</el-divider>
        <pre class="json-viewer">{{ JSON.stringify(currentDetail.steps, null, 2) }}</pre>
      </div>
    </el-dialog>

    <!-- 执行结果对话框 -->
    <el-dialog
      v-model="showResultDialog"
      title="执行结果"
      width="600px"
      destroy-on-close
    >
      <div v-if="executionResult" class="result-content">
        <el-alert
          :title="executionResult.success ? '执行成功' : '执行失败'"
          :type="executionResult.success ? 'success' : 'error'"
          :closable="false"
          show-icon
        />

        <div v-if="executionResult.execution_time" class="result-meta">
          <span>执行时间: {{ executionResult.execution_time.toFixed(2) }}s</span>
        </div>

        <el-divider />

        <div v-if="executionResult.data" class="result-data">
          <h4>返回数据:</h4>
          <pre class="json-viewer">{{ JSON.stringify(executionResult.data, null, 2) }}</pre>
        </div>

        <div v-if="executionResult.error" class="result-error">
          <h4>错误信息:</h4>
          <pre class="error-viewer">{{ executionResult.error }}</pre>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import {
  Plus,
  Refresh,
  RefreshRight,
  MoreFilled,
  View,
  Edit,
  CaretRight,
  Delete,
  Clock
} from '@element-plus/icons-vue'
import { browserLiveControlApi } from '@/api/browser/browser_api'
import type {
  CustomActionListItem,
  CustomActionDetail,
  ActionMetadataResponse,
  ActionResultResponse
} from '@/types/browser-automation-api'

// Props
const props = defineProps({
  browserId: {
    type: String,
    required: true
  }
})

// 状态管理
const loading = ref(false)
const submitting = ref(false)
const showCreateDialog = ref(false)
const showDetailDialog = ref(false)
const showResultDialog = ref(false)
const isBrowserRunning = ref(false)

// 数据
const customActions = ref<CustomActionListItem[]>([])
const registeredActions = ref<ActionMetadataResponse[]>([])
const currentDetail = ref<CustomActionDetail | null>(null)
const executionResult = ref<ActionResultResponse | null>(null)
const editingAction = ref<CustomActionListItem | null>(null)

// 表单
const formRef = ref<FormInstance>()
const formData = ref({
  name: '',
  action_id: '',
  action_type: 'interaction',
  is_composite: false,
  description: '',
  timeout: 30,
  is_enabled: true,
  target_action_id: '',
  params_json: '{}',
  steps: [
    {
      action_id: '',
      params_json: '{}'
    }
  ]
})

const formRules: FormRules = {
  name: [{ required: true, message: '请输入操作名称', trigger: 'blur' }],
  action_id: [
    { required: true, message: '请输入操作ID', trigger: 'blur' },
    { pattern: /^[a-zA-Z0-9_]+$/, message: '只能包含字母、数字和下划线', trigger: 'blur' }
  ],
  action_type: [{ required: true, message: '请选择操作类型', trigger: 'change' }],
  target_action_id: [
    {
      required: true,
      message: '请选择目标操作',
      trigger: 'change',
      validator: (rule, value, callback) => {
        if (!formData.value.is_composite && !value) {
          callback(new Error('请选择目标操作'))
        } else {
          callback()
        }
      }
    }
  ]
}

// 检查浏览器运行状态
const checkBrowserStatus = async () => {
  try {
    const res = await browserLiveControlApi.getBrowserSessionStatus({
      browser_id: props.browserId
    })
    if (res.code === 0 && res.data) {
      isBrowserRunning.value = res.data.is_running
    }
  } catch (error) {
    console.error(error)
  }
}

// 获取自定义操作列表
const fetchCustomActions = async (silent = false) => {
  loading.value = true
  try {
    const res = await browserLiveControlApi.listCustomActions()
    if (res.code === 0 && res.data) {
      customActions.value = res.data
    } else if (!silent) {
      ElMessage.error(res.msg || '获取操作列表失败')
    }
  } catch (error: any) {
    if (!silent) {
      ElMessage.error(error.message || '获取操作列表失败')
    }
    console.error(error)
  } finally {
    loading.value = false
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
    console.error(error)
  }
}

// 刷新列表
const refreshActions = () => {
  fetchCustomActions()
  checkBrowserStatus()
}

// 重载缓存
const reloadCache = async () => {
  try {
    const res = await browserLiveControlApi.reloadCustomActions()
    if (res.code === 0) {
      // 静默成功，仅刷新列表
      await fetchCustomActions(true)
    } else {
      ElMessage.error(res.msg || '重载失败')
    }
  } catch (error: any) {
    ElMessage.error(error.message || '重载失败')
    console.error(error)
  }
}

// 添加步骤
const addStep = () => {
  formData.value.steps.push({
    action_id: '',
    params_json: '{}'
  })
}

// 删除步骤
const removeStep = (index: number) => {
  if (formData.value.steps.length > 1) {
    formData.value.steps.splice(index, 1)
  }
}

// 处理操作命令
const handleActionCommand = async (command: string, action: CustomActionListItem) => {
  switch (command) {
    case 'view':
      await viewDetail(action)
      break
    case 'edit':
      editAction(action)
      break
    case 'execute':
      await executeAction(action)
      break
    case 'delete':
      await deleteAction(action)
      break
  }
}

// 查看详情
const viewDetail = async (action: CustomActionListItem) => {
  try {
    const res = await browserLiveControlApi.getCustomAction(action.id)
    if (res.code === 0 && res.data) {
      currentDetail.value = res.data
      showDetailDialog.value = true
    } else {
      ElMessage.error(res.msg || '获取详情失败')
    }
  } catch (error: any) {
    ElMessage.error(error.message || '获取详情失败')
    console.error(error)
  }
}

// 编辑操作
const editAction = async (action: CustomActionListItem) => {
  try {
    const res = await browserLiveControlApi.getCustomAction(action.id)
    if (res.code === 0 && res.data) {
      editingAction.value = action
      formData.value = {
        name: res.data.name,
        action_id: res.data.action_id,
        action_type: res.data.action_type,
        is_composite: res.data.is_composite,
        description: res.data.description,
        timeout: res.data.timeout || 30,
        is_enabled: res.data.is_enabled,
        target_action_id: res.data.steps[0]?.action_id || '',
        params_json: JSON.stringify(res.data.steps[0]?.parameters || {}),
        steps: res.data.steps.map((step: any) => ({
          action_id: step.action_id,
          params_json: JSON.stringify(step.parameters || {})
        }))
      }
      showCreateDialog.value = true
    } else {
      ElMessage.error(res.msg || '获取操作详情失败')
    }
  } catch (error: any) {
    ElMessage.error(error.message || '获取操作详情失败')
    console.error(error)
  }
}

// 执行操作
const executeAction = async (action: CustomActionListItem) => {
  try {
    const res = await browserLiveControlApi.executeAction({
      browser_id: props.browserId,
      req: {
        action_id: action.action_id,
        params: {}
      }
    })

    if (res.code === 0 && res.data) {
      executionResult.value = res.data
      showResultDialog.value = true

      // 不在这里显示 ElMessage，由对话框展示结果
    } else {
      ElMessage.error(res.msg || '执行失败')
    }
  } catch (error: any) {
    ElMessage.error(error.message || '执行失败')
    console.error(error)
  }
}

// 删除操作
const deleteAction = async (action: CustomActionListItem) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除操作 "${action.name}" 吗?此操作不可恢复。`,
      '删除确认',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    const res = await browserLiveControlApi.deleteCustomAction(action.id)
    if (res.code === 0) {
      ElMessage.success('删除成功')
      await fetchCustomActions(true)
    } else {
      ElMessage.error(res.msg || '删除失败')
    }
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error(error.message || '删除失败')
      console.error(error)
    }
  }
}

// 提交表单
const handleSubmit = async () => {
  if (!formRef.value) return

  await formRef.value.validate(async (valid) => {
    if (!valid) return

    submitting.value = true
    try {
      // 构建请求数据
      const requestData: any = {
        name: formData.value.name,
        action_id: formData.value.action_id,
        action_type: formData.value.action_type,
        is_composite: formData.value.is_composite,
        description: formData.value.description,
        timeout: formData.value.timeout,
        is_enabled: formData.value.is_enabled
      }

      if (formData.value.is_composite) {
        // 复合操作
        requestData.steps = formData.value.steps.map((step) => ({
          action_id: step.action_id,
          parameters: JSON.parse(step.params_json || '{}')
        }))
      } else {
        // 简单操作
        requestData.steps = [
          {
            action_id: formData.value.target_action_id,
            parameters: JSON.parse(formData.value.params_json || '{}')
          }
        ]
      }

      let res
      if (editingAction.value) {
        // 更新
        res = await browserLiveControlApi.updateCustomAction({
          id: editingAction.value.id,
          ...requestData
        })
      } else {
        // 创建
        res = await browserLiveControlApi.createCustomAction(requestData)
      }

      if (res.code === 0) {
        ElMessage.success(editingAction.value ? '更新成功' : '创建成功')
        showCreateDialog.value = false
        resetForm()
        await fetchCustomActions(true)
      } else {
        ElMessage.error(res.msg || (editingAction.value ? '更新失败' : '创建失败'))
      }
    } catch (error: any) {
      if (error.message?.includes('JSON') || error.message?.includes('parse')) {
        ElMessage.error('参数JSON格式错误，请检查输入')
      } else {
        ElMessage.error(error.message || (editingAction.value ? '更新失败' : '创建失败'))
      }
      console.error(error)
    } finally {
      submitting.value = false
    }
  })
}

// 重置表单
const resetForm = () => {
  editingAction.value = null
  formData.value = {
    name: '',
    action_id: '',
    action_type: 'interaction',
    is_composite: false,
    description: '',
    timeout: 30,
    is_enabled: true,
    target_action_id: '',
    params_json: '{}',
    steps: [
      {
        action_id: '',
        params_json: '{}'
      }
    ]
  }
  formRef.value?.clearValidate()
}

// 格式化日期
const formatDate = (dateStr: string) => {
  const date = new Date(dateStr)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// 初始化
onMounted(() => {
  fetchCustomActions()
  fetchRegisteredActions()
  checkBrowserStatus()
})
</script>

<style scoped lang="scss">
.custom-action-panel {
  .action-toolbar {
    display: flex;
    gap: 8px;
    margin-bottom: 20px;
  }

  .action-cards {
    .action-card {
      margin-bottom: 16px;
      height: 100%;
      transition: all 0.3s;

      &:hover {
        transform: translateY(-4px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      }

      .card-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 12px;

        .header-left {
          display: flex;
          align-items: center;
          gap: var(--spacing-2);

          .action-type {
            /* 样式已移至 tailwind.css */
          }
        }
      }

      .card-body {
        margin-bottom: var(--spacing-3);

        .action-name {
          /* 样式已移至 tailwind.css */
        }

        .action-desc {
          /* 样式已移至 tailwind.css */
        }

        .action-meta {
          .meta-item {
            /* 样式已移至 tailwind.css */
          }
        }
      }

      .card-footer {
        display: flex;
        justify-content: flex-end;
        padding-top: var(--spacing-3);
        border-top: 1px solid var(--el-border-color-lighter);
      }
    }
  }

  .form-tip {
    margin-top: var(--spacing-1);
    font-size: var(--component-font-size-xs);
    color: var(--el-text-color-secondary);
  }

  .step-item {
    /* 样式已移至 tailwind.css */

    .step-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: var(--spacing-3);

      .step-number {
        font-weight: bold;
        color: var(--el-color-primary);
      }
    }
  }

  .detail-content {
    .json-viewer {
      background-color: #f5f7fa;
      padding: 12px;
      border-radius: 4px;
      overflow-x: auto;
      font-size: 12px;
      line-height: 1.6;
    }
  }

  .result-content {
    .result-meta {
      margin-top: 12px;
      font-size: 14px;
      color: #606266;
    }

    .result-data,
    .result-error {
      h4 {
        margin: 12px 0 8px 0;
        font-size: 14px;
        color: #303133;
      }

      .json-viewer,
      .error-viewer {
        background-color: #f5f7fa;
        padding: 12px;
        border-radius: 4px;
        overflow-x: auto;
        font-size: 12px;
        line-height: 1.6;
      }

      .error-viewer {
        background-color: #fef0f0;
        color: #f56c6c;
      }
    }
  }
}
</style>
