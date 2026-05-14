<!--
 * @FilePath: \Vue3FrontEndDemoExercise\src\components\browser\WorkflowPanel.vue
 * @Description: 工作流管理面板（私有模式）- 仅管理当前用户的私有工作流
-->
<template>
  <div class="flex flex-col h-full overflow-hidden">
    <!-- 工具栏 -->
    <div class="flex flex-wrap gap-2 mb-4 p-3 rounded-xl border border-[var(--el-border-color-lighter)] bg-[var(--el-fill-color-lighter)]">
      <el-button type="primary" size="small" @click="openCreateDialog()">
        <el-icon><Plus /></el-icon>
        新建工作流
      </el-button>
      <el-button size="small" @click="fetchWorkflows" :loading="loading">
        <el-icon><Refresh /></el-icon>
        刷新
      </el-button>

      <div class="ml-auto flex items-center gap-2 text-xs text-[var(--el-text-color-secondary)]">
        <span>共 {{ workflows.length }} 个工作流</span>
      </div>
    </div>

    <!-- 工作流列表 -->
    <div class="flex-1 overflow-y-auto min-h-0">
      <div v-if="loading" class="flex justify-center py-10">
        <el-skeleton :rows="4" animated />
      </div>

      <div v-else-if="workflows.length === 0" class="flex flex-col items-center justify-center py-16 text-[var(--el-text-color-placeholder)]">
        <el-icon :size="48"><SetUp /></el-icon>
        <p class="mt-4 text-sm">暂无工作流</p>
        <el-button type="primary" size="small" class="mt-4" @click="openCreateDialog()">创建第一个工作流</el-button>
      </div>

      <div v-else class="space-y-3">
        <el-card
          v-for="wf in workflows"
          :key="wf.id"
          class="transition-all duration-200 hover:shadow-sm"
          shadow="hover"
        >
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3 min-w-0">
              <el-icon :size="20" class="text-primary shrink-0"><SetUp /></el-icon>
              <div class="min-w-0">
                <div class="font-medium text-sm flex items-center gap-1.5">
                  <span class="truncate">{{ wf.name }}</span>
                  <el-tag v-if="!wf.is_enabled" size="small" type="info" effect="plain">已禁用</el-tag>
                </div>
                <div class="text-xs text-[var(--el-text-color-secondary)] mt-0.5">
                  {{ wf.description || '暂无描述' }} · {{ wf.step_count }} 步
                </div>
              </div>
            </div>

            <div class="flex items-center gap-2 shrink-0">
              <el-tag v-if="wf.tags?.length" v-for="tag in wf.tags.slice(0, 2)" :key="tag" size="small" type="info" effect="plain">{{ tag }}</el-tag>
              <el-switch v-model="wf.is_enabled" size="small" @change="toggleWorkflowEnabled(wf)" />
              <el-button size="small" type="primary" @click="executeWorkflow(wf)" :disabled="!isBrowserRunning" :loading="wf._executing">
                执行
              </el-button>
              <el-dropdown trigger="click" @command="(cmd: string) => handleCommand(cmd, wf)">
                <el-button text size="small"><el-icon><MoreFilled /></el-icon></el-button>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item command="edit"><el-icon><Edit /></el-icon> 编辑</el-dropdown-item>
                    <el-dropdown-item command="duplicate"><el-icon><CopyDocument /></el-icon> 复制</el-dropdown-item>
                    <el-dropdown-item command="delete" divided danger><el-icon><Delete /></el-icon> 删除</el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
            </div>
          </div>
        </el-card>
      </div>
    </div>

    <!-- 创建/编辑对话框 -->
    <el-dialog
      v-model="showCreateDialog"
      :title="editingWorkflow ? '编辑工作流' : '新建工作流'"
      width="850px"
      :close-on-click-modal="false"
      destroy-on-close
    >
      <el-form :model="wfFormData" label-width="80px" size="small" label-position="top">
        <div class="grid grid-cols-2 gap-x-4">
          <el-form-item label="工作流名称" required>
            <el-input v-model="wfFormData.name" placeholder="例: 自动评论工作流" />
          </el-form-item>
          <el-form-item label="描述">
            <el-input v-model="wfFormData.description" placeholder="简要描述" />
          </el-form-item>
        </div>

        <el-form-item label="标签">
          <el-select v-model="wfFormData.tags" multiple filterable allow-create placeholder="添加标签" class="w-full">
            <el-option v-for="tag in ['bilibili', '自动化', '评论', '点赞']" :key="tag" :label="tag" :value="tag" />
          </el-select>
        </el-form-item>

        <el-form-item label="错误处理">
          <el-radio-group v-model="wfFormData.on_error">
            <el-radio value="stop">停止</el-radio>
            <el-radio value="skip">跳过</el-radio>
            <el-radio value="retry">重试</el-radio>
          </el-radio-group>
        </el-form-item>

        <!-- 步骤编排 -->
        <el-divider content-position="left">
          步骤编排
          <el-tag size="small" type="info" effect="plain">支持循环、条件分支嵌套</el-tag>
        </el-divider>
        <WorkflowEditor v-model="wfFormData.steps" :browser-id="props.browserId" />
      </el-form>

      <template #footer>
        <el-button @click="showCreateDialog = false">取消</el-button>
        <el-button type="primary" @click="handleSubmitWorkflow" :loading="submitting">
          {{ editingWorkflow ? '保存修改' : '创建' }}
        </el-button>
      </template>
    </el-dialog>

    <!-- 执行结果 -->
    <el-dialog v-model="showResultDialog" title="执行结果" width="600px" destroy-on-close>
      <div v-if="executionResult">
        <el-alert
          :title="executionResult.success ? '执行成功' : '执行失败'"
          :type="executionResult.success ? 'success' : 'error'"
          :closable="false"
          show-icon
        />
        <div v-if="executionResult.total_time" class="mt-3 text-sm">
          总耗时: {{ (executionResult.total_time / 1000).toFixed(2) }}s
        </div>
        <el-divider />
        <div v-if="executionResult.results?.length">
          <h4 class="text-sm font-medium mb-2">步骤结果:</h4>
          <div v-for="(r, idx) in executionResult.results" :key="idx" class="flex items-center gap-2 py-1 text-xs">
            <el-tag :type="r.success ? 'success' : 'danger'" size="small">步骤 {{ r.step_index + 1 }}</el-tag>
            <span class="text-[var(--el-text-color-secondary)]">{{ r.action_id }}</span>
            <span v-if="r.execution_time" class="text-[var(--el-text-color-placeholder)]">{{ r.execution_time.toFixed(0) }}ms</span>
            <span v-if="r.error" class="text-[var(--el-color-danger)] truncate">{{ r.error }}</span>
          </div>
        </div>
        <pre v-if="executionResult.state" class="mt-3 bg-[var(--el-fill-color-light)] p-3 rounded text-xs overflow-x-auto max-h-40">{{ JSON.stringify(executionResult.state, null, 2) }}</pre>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Refresh, SetUp, Edit, Delete, MoreFilled, CopyDocument } from '@element-plus/icons-vue'
import workflowsApi from '@/api/browser/workflows_api'
import WorkflowEditor from './WorkflowEditor.vue'
import type {
  WorkflowStepRequest,
  WorkflowExecuteResponse,
  WorkflowListItem
} from '@/types/browser-automation-api'

const props = defineProps<{
  browserId: string
}>()

const loading = ref(false)
const submitting = ref(false)
const isBrowserRunning = ref(true)
const showCreateDialog = ref(false)
const showResultDialog = ref(false)

interface WorkflowItem extends Partial<WorkflowListItem> {
  id: number
  workflow_id: string
  name: string
  description: string
  step_count: number
  tags: string[]
  is_enabled: boolean
  _executing?: boolean
}

const workflows = ref<WorkflowItem[]>([])
const editingWorkflow = ref<WorkflowItem | null>(null)
const executionResult = ref<WorkflowExecuteResponse | null>(null)

const wfFormData = ref<{
  name: string
  description: string
  tags: string[]
  on_error: string
  steps: WorkflowStepRequest[]
  is_public: boolean
}>({
  name: '',
  description: '',
  tags: [],
  on_error: 'stop',
  steps: [],
  is_public: false
})

// 获取工作流列表
const fetchWorkflows = async () => {
  loading.value = true
  try {
    const res = await workflowsApi.getWorkflowsList({
      browser_id: props.browserId,
      filter_type: 'private'
    })
    if (res.code === 0 && res.data) {
      workflows.value = (res.data.items || res.data).map((wf: any) => ({
        ...wf,
        _executing: false
      }))
    }
  } catch (error: any) {
    ElMessage.error(error.message || '获取工作流列表失败')
  } finally {
    loading.value = false
  }
}

// 打开创建对话框
const openCreateDialog = async (wf?: WorkflowItem) => {
  if (wf) {
    editingWorkflow.value = wf
    try {
      const res = await workflowsApi.getWorkflow({ browser_id: props.browserId, workflow_id: wf.id })
      if (res.code === 0 && res.data) {
        const detail = res.data
        wfFormData.value = {
          name: detail.name,
          description: detail.description,
          tags: detail.tags || [],
          on_error: detail.on_error || 'stop',
          steps: detail.steps || [],
          is_public: !!detail.is_public
        }
      }
    } catch { /* ignore */ }
  } else {
    editingWorkflow.value = null
    wfFormData.value = {
      name: '',
      description: '',
      tags: [],
      on_error: 'stop',
      steps: [],
      is_public: false
    }
  }
  showCreateDialog.value = true
}

// 提交
const handleSubmitWorkflow = async () => {
  if (!wfFormData.value.name.trim()) {
    ElMessage.warning('请输入工作流名称')
    return
  }

  submitting.value = true
  try {
    if (editingWorkflow.value) {
      const res = await workflowsApi.updateWorkflow({
        browser_id: props.browserId,
        workflow_id: editingWorkflow.value.id,
        name: wfFormData.value.name,
        description: wfFormData.value.description,
        tags: wfFormData.value.tags,
        on_error: wfFormData.value.on_error,
        steps: wfFormData.value.steps,
        is_public: wfFormData.value.is_public
      })
      if (res.code === 0) {
        ElMessage.success('更新成功')
        showCreateDialog.value = false
        await fetchWorkflows()
      } else {
        ElMessage.error(res.msg || '更新失败')
      }
    } else {
      const res = await workflowsApi.createWorkflow({
        browser_id: props.browserId,
        name: wfFormData.value.name,
        description: wfFormData.value.description,
        tags: wfFormData.value.tags,
        on_error: wfFormData.value.on_error,
        steps: wfFormData.value.steps,
        is_public: wfFormData.value.is_public
      })
      if (res.code === 0) {
        ElMessage.success('创建成功')
        showCreateDialog.value = false
        await fetchWorkflows()
      } else {
        ElMessage.error(res.msg || '创建失败')
      }
    }
  } catch (error: any) {
    ElMessage.error(error.message || '操作失败')
  } finally {
    submitting.value = false
  }
}

// 执行
const executeWorkflow = async (wf: WorkflowItem) => {
  wf._executing = true
  try {
    const res = await workflowsApi.executeWorkflow({
      browser_id: props.browserId,
      workflow_id: wf.id
    })
    if (res.code === 0 && res.data) {
      executionResult.value = res.data
      showResultDialog.value = true
    } else {
      ElMessage.error(res.msg || '执行失败')
    }
  } catch (error: any) {
    ElMessage.error(error.message || '执行失败')
  } finally {
    wf._executing = false
  }
}

// 切换启用
const toggleWorkflowEnabled = async (wf: WorkflowItem) => {
  try {
    await workflowsApi.updateWorkflow({
      browser_id: props.browserId,
      workflow_id: wf.id,
      is_enabled: wf.is_enabled
    })
  } catch { /* ignore */ }
}

// 删除
const deleteWorkflow = async (wf: WorkflowItem) => {
  try {
    await ElMessageBox.confirm(`确定要删除工作流 "${wf.name}" 吗?`, '删除确认', { type: 'warning' })
    const res = await workflowsApi.deleteWorkflow({ browser_id: props.browserId, workflow_id: wf.id })
    if (res.code === 0) {
      ElMessage.success('删除成功')
      await fetchWorkflows()
    }
  } catch { /* cancelled */ }
}

// 复制(自己的)
const duplicateWorkflow = async (wf: WorkflowItem) => {
  try {
    const res = await workflowsApi.duplicateWorkflow({ browser_id: props.browserId, workflow_id: wf.id })
    if (res.code === 0) {
      ElMessage.success('复制成功')
      await fetchWorkflows()
    }
  } catch (error: any) {
    ElMessage.error(error.message || '复制失败')
  }
}

// 克隆(他人的公开资源)
const cloneWorkflow = async (wf: WorkflowItem) => {
  try {
    // workflow 暂时用 duplicate 接口模拟 clone
    const res = await workflowsApi.duplicateWorkflow({ browser_id: props.browserId, workflow_id: wf.id })
    if (res.code === 0) {
      ElMessage.success('已克隆到我的空间')
      await fetchWorkflows()
    }
  } catch (error: any) {
    ElMessage.error(error.message || '克隆失败')
  }
}

// 命令处理
const handleCommand = (command: string, wf: WorkflowItem) => {
  switch (command) {
    case 'edit': openCreateDialog(wf); break
    case 'duplicate': duplicateWorkflow(wf); break
    case 'clone': cloneWorkflow(wf); break
    case 'delete': deleteWorkflow(wf); break
  }
}

onMounted(() => {
  fetchWorkflows()
})
</script>
