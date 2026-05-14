<!--
 * @Author: 星瞳 1944637830@qq.com
 * @Date: 2026-05-06
 * @FilePath: \Vue3FrontEndDemoExercise\src\components\browser\CustomActionPanel.vue
 * @Description: 自定义操作管理面板（私有模式）- 仅管理当前用户的私有操作
-->
<template>
  <div class="flex flex-col h-full overflow-hidden">
    <!-- 操作栏 -->
    <div class="flex flex-wrap gap-2 mb-4 p-3 rounded-xl border border-[var(--el-border-color-lighter)] bg-[var(--el-fill-color-lighter)]">
      <el-button type="primary" size="small" @click="openCreateDialog()">
        <el-icon><Plus /></el-icon>
        新建操作
      </el-button>
      <el-button size="small" @click="refreshActions" :loading="loading">
        <el-icon><Refresh /></el-icon>
        刷新
      </el-button>

      <div class="ml-auto flex items-center gap-2 text-xs text-[var(--el-text-color-secondary)]">
        <span>共 {{ customActions.length }} 个操作</span>
      </div>
    </div>

    <!-- 卡片列表 -->
    <div class="flex-1 overflow-y-auto min-h-0 p-4">
      <div v-if="loading" class="flex justify-center py-10">
        <el-skeleton :rows="4" animated />
      </div>

      <div v-else class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div
          v-for="action in customActions"
          :key="action.id"
          :class="[
            'group rounded-xl border p-4 transition-all duration-200',
            expandedId === action.id
              ? 'border-primary bg-primary/5 shadow-sm'
              : 'border-[var(--el-border-color-lighter)] bg-[var(--el-bg-color)] hover:border-[var(--el-border-color)] hover:shadow-md'
          ]"
        >
          <!-- 卡片头部：标签 + 操作菜单 -->
          <div class="flex items-center justify-between mb-2.5">
            <div class="flex items-center gap-1.5 flex-wrap">
              <el-tag size="small" :type="action.is_composite ? 'warning' : 'success'" effect="plain" round>
                {{ action.is_composite ? '复合' : '单一' }}
              </el-tag>
              <el-tag v-if="action.action_type" size="small" type="info" effect="plain" round>
                {{ action.action_type }}
              </el-tag>
              <el-tag v-if="action.is_verified" size="small" type="success" effect="plain" round>✓ 官方</el-tag>
              <el-tag v-if="action.forked_from_id" size="small" type="warning" effect="plain" round>Fork</el-tag>
              <el-tag size="small" :type="action.is_public ? 'primary' : 'info'" effect="plain" round>
                {{ action.is_public ? '公开' : '私有' }}
              </el-tag>
            </div>

            <el-dropdown trigger="click" @command="(cmd: string) => handleCommand(cmd, action)" @click.stop>
              <el-button text size="small" class="!opacity-0 group-hover:!opacity-100 transition-opacity">
                <el-icon><MoreFilled /></el-icon>
              </el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item command="view"><el-icon><View /></el-icon> 查看完整详情</el-dropdown-item>
                  <el-dropdown-item command="edit"><el-icon><Edit /></el-icon> 编辑</el-dropdown-item>
                  <el-dropdown-item command="execute" divided><el-icon><CaretRight /></el-icon> 执行</el-dropdown-item>
                  <el-dropdown-item command="delete" divided danger><el-icon><Delete /></el-icon> 删除</el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>

          <!-- 名称 + 描述 -->
          <h4 class="text-sm font-semibold m-0 mb-1 truncate">{{ action.name }}</h4>
          <p class="text-xs text-[var(--el-text-color-secondary)] m-0 mb-2.5 line-clamp-2 leading-relaxed">{{ action.description || '暂无描述' }}</p>

          <!-- 底部栏：统计 + 按钮 -->
          <div class="flex items-center gap-3 pt-2.5 border-t border-dashed border-[var(--el-border-color-lighter)]">
            <!-- 左侧统计 -->
            <div class="flex items-center gap-2.5 text-[11px] text-[var(--el-text-color-secondary)]">
              <span v-if="action.likes_count != null">❤️ {{ action.likes_count }}</span>
              <span v-if="action.forks_count != null">🔀 {{ action.forks_count }}</span>
              <span v-if="action.steps_count != null">{{ action.steps_count }} 步</span>
              <span v-if="action.tags?.length" class="flex items-center gap-0.5">
                <el-tag v-for="tag in action.tags.slice(0, 2)" :key="tag" size="small" type="info" effect="plain" class="!text-[10px] !py-0 !px-1">{{ tag }}</el-tag>
              </span>
            </div>

            <!-- 右侧按钮组 -->
            <div class="flex items-center gap-1 ml-auto">
              <el-button
                size="small"
                text
                class="!text-xs"
                :type="expandedId === action.id ? 'primary' : undefined"
                @click="toggleDetail(action.id)"
              >{{ expandedId === action.id ? '收起' : '详情' }}</el-button>
              <el-button
                size="small"
                type="primary"
                class="!text-xs"
                @click.stop="executeAction(action)"
                :disabled="!isBrowserRunning"
              >执行</el-button>
            </div>
          </div>

          <!-- 展开的详情区域（卡片内） -->
          <div v-if="expandedId === action.id" class="mt-3 pt-3 border-t border-[var(--el-border-color-lighter)]">
            <div class="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[11px]">
              <div><span class="text-[var(--el-text-color-placeholder)]">ID:</span> <span class="font-mono">{{ action.id }}</span></div>
              <div><span class="text-[var(--el-text-color-placeholder)]">Action ID:</span> <span class="font-mono truncate block">{{ action.action_id }}</span></div>
              <div><span class="text-[var(--el-text-color-placeholder)]">类型:</span> {{ action.action_type || '-' }}</div>
              <div><span class="text-[var(--el-text-color-placeholder)]">复合操作:</span> {{ action.is_composite ? '是' : '否' }}</div>
              <div><span class="text-[var(--el-text-color-placeholder)]">举报数:</span> <span :class="action.reports_count > 0 ? 'text-orange-500' : ''">{{ action.reports_count ?? 0 }}</span></div>
              <div><span class="text-[var(--el-text-color-placeholder)]">作者:</span> {{ action.author_name || '-' }}</div>
              <div><span class="text-[var(--el-text-color-placeholder)]">创建:</span> {{ action.created_at?.split('T')[0] || '-' }}</div>
              <div><span class="text-[var(--el-text-color-placeholder)]">更新:</span> {{ action.updated_at?.split('T')[0] || '-' }}</div>
            </div>
            <p v-if="action.forked_from_id" class="text-[10px] text-orange-400 mt-1.5 m-0 italic flex items-center gap-1">
              🔀 Fork 自其他资源 (ID: {{ action.forked_from_id }})
            </p>
          </div>
        </div>
      </div>

      <!-- 空状态 -->
      <el-empty v-if="!loading && customActions.length === 0" description="暂无自定义操作">
        <el-button type="primary" size="small" @click="openCreateDialog()">创建第一个操作</el-button>
      </el-empty>

      <!-- 分页 -->
      <div v-if="totalCount > 0" class="flex justify-center pt-4">
        <el-pagination
          v-model:current-page="pageNum"
          :page-size="pageSize"
          :total="totalCount"
          layout="prev, pager, next, total"
          size="small"
          background
          @current-change="onPageChange"
        />
      </div>
    </div>

    <!-- 创建/编辑对话框 -->
    <el-dialog
      v-model="showCreateDialog"
      :title="editingAction ? '编辑操作' : '新建操作'"
      width="960px"
      :close-on-click-modal="false"
      destroy-on-close
      class="!max-h-[90vh]"
    >
      <div class="flex flex-col gap-4 max-h-[70vh] overflow-y-auto">
        <div class="grid grid-cols-2 gap-x-4">
          <el-form-item label="操作名称" required class="!mb-0">
            <el-input v-model="formData.name" placeholder="例: B站自动登录" />
          </el-form-item>
          <el-form-item label="描述" class="!mb-0">
            <el-input v-model="formData.description" type="textarea" :rows="1" placeholder="简要描述此操作的功能" />
          </el-form-item>
        </div>

        <div class="rounded-lg border border-[var(--el-border-color-lighter)] p-3 bg-[var(--el-fill-color-blank)]">
          <div class="flex items-center justify-between mb-3">
            <span class="text-xs font-medium text-[var(--el-text-color-secondary)] flex items-center gap-1">
              参数定义 (parameters_schema)
              <el-tag size="small" type="info" effect="plain">步骤中可用 &#123;&#123;变量&#125;&#125; 引用</el-tag>
            </span>
            <el-button size="small" text :icon="Plus" @click="addParameter">添加参数</el-button>
          </div>
          <div v-for="(param, idx) in formData.parameters_schema" :key="'p'+idx" class="flex gap-2 items-start mb-2 p-2 rounded-lg bg-[var(--el-fill-color-lighter)]">
            <el-input v-model="param.name" placeholder="参数名" class="w-28" />
            <el-select v-model="param.type" class="w-24">
              <el-option label="字符串" value="string" />
              <el-option label="整数" value="int" />
              <el-option label="浮点" value="float" />
              <el-option label="布尔" value="boolean" />
              <el-option label="数组" value="array" />
            </el-select>
            <el-switch v-model="param.required" active-text="必填" inactive-text="选填" />
            <el-input v-model="param.default" placeholder="默认值" class="w-28" />
            <el-button text type="danger" :icon="Delete" @click="formData.parameters_schema.splice(idx, 1)" />
          </div>
          <div v-if="formData.parameters_schema.length === 0" class="text-xs text-[var(--el-text-color-placeholder)] py-2 text-center">
            无参数定义，添加后可在步骤中使用 &#123;&#123;参数名&#125;&#125; 模板语法引用
          </div>
        </div>

        <div class="rounded-lg border border-[var(--el-border-color-lighter)] p-3 bg-[var(--el-fill-color-blank)]">
          <CustomActionStepEditor
            v-model="editorSteps"
            :action-list="localRegisteredActions"
            mode="edit"
            title="步骤列表 (steps)"
            empty-text="暂无步骤，点击添加按钮开始编排"
          />
        </div>
      </div>

      <template #footer>
        <el-button @click="showCreateDialog = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit" :loading="submitting">
          {{ editingAction ? '保存修改' : '创建' }}
        </el-button>
      </template>
    </el-dialog>

    <!-- 查看详情对话框 -->
    <el-dialog v-model="showDetailDialog" title="操作详情" width="700px" destroy-on-close>
      <div v-if="currentDetail">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="操作ID">{{ currentDetail.action_id }}</el-descriptions-item>
          <el-descriptions-item label="名称">{{ currentDetail.name }}</el-descriptions-item>
          <el-descriptions-item label="类型">{{ currentDetail.action_type }}</el-descriptions-item>
          <el-descriptions-item label="复合操作">
            <el-tag :type="currentDetail.is_composite ? 'warning' : 'success'" size="small">
              {{ currentDetail.is_composite ? '是' : '否' }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="可见性">
            <VisibilityBadge :resource="currentDetail" />
          </el-descriptions-item>
          <el-descriptions-item label="作者">{{ currentDetail.author_name || '未知' }}</el-descriptions-item>
          <el-descriptions-item label="描述" :span="2">{{ currentDetail.description || '暂无描述' }}</el-descriptions-item>
        </el-descriptions>

        <el-divider content-position="left">参数定义</el-divider>
        <el-table :data="currentDetail.parameters_schema" size="small" v-if="currentDetail.parameters_schema?.length">
          <el-table-column prop="name" label="参数名" />
          <el-table-column prop="type" label="类型" width="80" />
          <el-table-column prop="required" label="必填" width="60">
            <template #default="{ row }">
              <el-tag :type="row.required ? 'danger' : 'info'" size="small">{{ row.required ? '是' : '否' }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="default" label="默认值" />
        </el-table>
        <div v-else class="text-xs text-[var(--el-text-color-placeholder)] py-2 text-center">无参数定义</div>

        <el-divider content-position="left">执行步骤</el-divider>
        <pre class="bg-[var(--el-fill-color-light)] p-3 rounded text-xs leading-relaxed overflow-x-auto max-h-60">{{ JSON.stringify(currentDetail.steps, null, 2) }}</pre>
      </div>
    </el-dialog>

    <!-- 执行结果对话框 -->
    <el-dialog v-model="showResultDialog" title="执行结果" width="600px" destroy-on-close>
      <div v-if="executionResult">
        <el-alert
          :title="executionResult.success ? '执行成功' : '执行失败'"
          :type="executionResult.success ? 'success' : 'error'"
          :closable="false"
          show-icon
        />
        <div v-if="executionResult.execution_time" class="mt-3 text-sm">
          执行时间: {{ executionResult.execution_time.toFixed(2) }}s
        </div>
        <el-divider />
        <pre v-if="executionResult.data" class="bg-[var(--el-fill-color-light)] p-3 rounded text-xs overflow-x-auto">{{ JSON.stringify(executionResult.data, null, 2) }}</pre>
        <pre v-if="executionResult.error" class="bg-[var(--el-color-danger-light-9)] text-[var(--el-color-danger)] p-3 rounded text-xs overflow-x-auto">{{ executionResult.error }}</pre>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Plus, Refresh, RefreshRight, MoreFilled, View, Edit, CaretRight, Delete
} from '@element-plus/icons-vue'
import customActionsApi from '@/api/browser/custom_actions_api'
import CustomActionStepEditor from './right-panel/components/CustomActionStepEditor.vue'
import type {
  CustomActionListItem,
  CustomActionDetail,
  ActionResultResponse,
  ActionParameterDef,
  CompositeActionStep
} from '@/types/browser-automation-api'
import type { StepItem } from './right-panel/components/CustomActionStepEditor.vue'
import actionsApi, { ActionsApi } from '@/api/browser/actions_api'

const props = defineProps<{
  browserId: string
  registeredActions?: any[]
  sharedWorkflowData?: {
    steps: StepItem[]
    source: 'edit' | 'debug' | null
    actionInfo: { name: string; description: string; parameters_schema: any[]; actionId?: number } | null
  } | null
}>()

const emit = defineEmits<{
  'workflow-edit-open': [payload: { steps: StepItem[]; actionInfo: { name: string; description: string; parameters_schema: any[]; actionId?: number } | null }]
  'workflow-edit-change': [steps: StepItem[]]
  'workflow-edit-close': []
}>()

// 本地缓存注册操作列表（优先用 prop，prop 为空时自己调 API）
const localRegisteredActions = ref<any[]>([])
const loadingActions = ref(false)

watch(() => props.registeredActions, (val) => {
  if (val && val.length > 0) {
    localRegisteredActions.value = val
  }
}, { immediate: true })

async function ensureActionList() {
  if (localRegisteredActions.value.length > 0) return
  loadingActions.value = true
  try {
    const res = await actionsApi.getRegisteredActions({ browser_id: props.browserId })
    if (res.code === 0 && res.data) {
      const rawData = Array.isArray(res.data) ? res.data : (res.data.actions || [])
      localRegisteredActions.value = rawData.map((a: any) => ActionsApi.normalizeActionMetadata(a))
    }
  } catch (e) {
    console.warn('[CustomActionPanel] 获取注册操作失败:', e)
  } finally {
    loadingActions.value = false
  }
}

// 状态
const loading = ref(false)
const submitting = ref(false)
const isBrowserRunning = ref(false)
const showCreateDialog = ref(false)
const showDetailDialog = ref(false)
const showResultDialog = ref(false)

// 分页状态
const pageNum = ref(1)
const pageSize = ref(8)
const totalCount = ref(0)
const totalPages = ref(0)

// 展开详情
const expandedId = ref<number | null>(null)

// 数据
const customActions = ref<CustomActionListItem[]>([])
const currentDetail = ref<CustomActionDetail | null>(null)
const executionResult = ref<ActionResultResponse | null>(null)
const editingAction = ref<CustomActionListItem | null>(null)

// 表单
const formData = ref<{
  name: string
  action_type: string
  description: string
  parameters_schema: ActionParameterDef[]
  steps: CompositeActionStep[]
  is_public: boolean
}>({
  name: '',
  action_type: 'interaction',
  description: '',
  parameters_schema: [],
  steps: [],
  is_public: false
})

let stepUidCounter = 0

interface EditorStep {
  _uid: number
  action_id: string
  params: Record<string, any>
}

const editorSteps = ref<EditorStep[]>([])

// 获取列表
const fetchCustomActions = async (silent = false) => {
  loading.value = true
  try {
    const res = await customActionsApi.listCustomActions({
      page: pageNum.value,
      per_page: pageSize.value,
      filter_type: 'private'
    })
    if (res.code === 0 && res.data) {
      // 新版分页响应：data 是 { items, total, pages, ... } 对象
      const paginatedData = res.data as any
      customActions.value = paginatedData.items || paginatedData || []
      totalCount.value = paginatedData.total ?? 0
      totalPages.value = paginatedData.pages ?? 0
      expandedId.value = null
    } else if (!silent) {
      ElMessage.error(res.msg || '获取操作列表失败')
    }
  } catch (error: any) {
    if (!silent) ElMessage.error(error.message || '获取操作列表失败')
  } finally {
    loading.value = false
  }
}

// 切换详情展开
const toggleDetail = (id: number) => {
  expandedId.value = expandedId.value === id ? null : id
}

// 分页变化
const onPageChange = (page: number) => {
  pageNum.value = page
  expandedId.value = null
  fetchCustomActions()
}

// 刷新
const refreshActions = () => fetchCustomActions()

// 打开创建/编辑对话框
const openCreateDialog = async (action?: CustomActionListItem | null) => {
  stepUidCounter = 0
  await ensureActionList()
  if (action) {
    editingAction.value = action
    const res = await customActionsApi.getCustomAction(action.id)
    if (res.code === 0 && res.data) {
      const detail = res.data
      formData.value = {
        name: detail.name,
        action_type: detail.action_type || 'composite',
        description: detail.description,
        parameters_schema: detail.parameters_schema || [],
        steps: detail.steps || [],
        is_public: !!detail.is_public
      }
      editorSteps.value = (detail.steps || []).map((s: any) => ({
        _uid: ++stepUidCounter,
        action_id: s.action_id || '',
        params: { ...(s.params || {}) }
      }))
      if (editorSteps.value.length === 0) {
        editorSteps.value = [{ _uid: ++stepUidCounter, action_id: action.action_id || '', params: {} }]
      }
    } else {
      editorSteps.value = [{ _uid: ++stepUidCounter, action_id: action.action_id || '', params: {} }]
    }
    showCreateDialog.value = true

    emit('workflow-edit-open', {
      steps: editorSteps.value.map(s => ({ ...s })),
      actionInfo: editingAction.value ? {
        name: formData.value.name,
        description: formData.value.description,
        parameters_schema: formData.value.parameters_schema,
        actionId: editingAction.value.id
      } : null
    })
  } else {
    editingAction.value = null
    formData.value = {
      name: '',
      action_type: 'composite',
      description: '',
      parameters_schema: [],
      steps: [],
      is_public: false
    }
    editorSteps.value = [{ _uid: ++stepUidCounter, action_id: '', params: {} }]
    showCreateDialog.value = true
  }
}

// 参数定义：添加
const addParameter = () => {
  formData.value.parameters_schema.push({
    name: '',
    type: 'string',
    required: false,
    description: ''
  })
}

// 提交
const handleSubmit = async () => {
  if (!formData.value.name.trim()) {
    ElMessage.warning('请输入操作名称')
    return
  }

  const validSteps = editorSteps.value.filter(s => s.action_id)
  if (validSteps.length === 0) {
    ElMessage.warning('请至少添加一个有效步骤')
    return
  }

  submitting.value = true
  try {
    const builtSteps: CompositeActionStep[] = validSteps.map(step => {
      const cleanParams: Record<string, any> = {}
      for (const [key, value] of Object.entries(step.params)) {
        if (value !== null && value !== undefined && value !== '') {
          cleanParams[key] = value
        }
      }
      return {
        action_id: step.action_id,
        params: cleanParams
      } as CompositeActionStep
    })

    const requestData = {
      name: formData.value.name.trim(),
      action_type: 'composite',
      description: formData.value.description,
      parameters_schema: formData.value.parameters_schema.length > 0 ? formData.value.parameters_schema : undefined,
      steps: builtSteps,
      is_public: formData.value.is_public
    }

    let res
    if (editingAction.value) {
      res = await customActionsApi.updateCustomAction({
        id: editingAction.value.id,
        ...requestData
      })
    } else {
      res = await customActionsApi.createCustomAction(requestData)
    }

    if (res.code === 0) {
      ElMessage.success(editingAction.value ? '更新成功' : '创建成功')
      showCreateDialog.value = false
      await fetchCustomActions(true)
    } else {
      ElMessage.error(res.msg || (editingAction.value ? '更新失败' : '创建失败'))
    }
  } catch (error: any) {
    ElMessage.error(error.message || '操作失败')
  } finally {
    submitting.value = false
  }
}

// 查看详情
const viewDetail = async (action: CustomActionListItem) => {
  try {
    const res = await customActionsApi.getCustomAction(action.id)
    if (res.code === 0 && res.data) {
      currentDetail.value = res.data
      showDetailDialog.value = true
    }
  } catch (error: any) {
    ElMessage.error(error.message || '获取详情失败')
  }
}

// 执行
const executeAction = async (action: CustomActionListItem) => {
  try {
    const { browserLiveControlApi } = await import('@/api/browser/browser_api')
    const res = await browserLiveControlApi.executeAction({
      browser_id: props.browserId,
      req: { action_id: action.action_id, params: {} }
    })
    if (res.code === 0 && res.data) {
      executionResult.value = res.data
      showResultDialog.value = true
    } else {
      ElMessage.error(res.msg || '执行失败')
    }
  } catch (error: any) {
    ElMessage.error(error.message || '执行失败')
  }
}

// 克隆
const handleCloneAction = async (action: CustomActionListItem) => {
  const ok = await cloneAction(action.id)
  if (ok) {
    await fetchCustomActions(true)
  }
}

// 删除
const deleteAction = async (action: CustomActionListItem) => {
  try {
    await ElMessageBox.confirm(`确定要删除操作 "${action.name}" 吗?`, '删除确认', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    const res = await customActionsApi.deleteCustomAction(action.id)
    if (res.code === 0) {
      ElMessage.success('删除成功')
      await fetchCustomActions(true)
    } else {
      ElMessage.error(res.msg || '删除失败')
    }
  } catch { /* cancelled */ }
}

// 命令处理
const handleCommand = (command: string, action: CustomActionListItem) => {
  switch (command) {
    case 'view': viewDetail(action); break
    case 'edit': openCreateDialog(action); break
    case 'execute': executeAction(action); break
    case 'clone': handleCloneAction(action); break
    case 'delete': deleteAction(action); break
  }
}

// 格式化日期
const formatDate = (dateStr: string) => {
  const date = new Date(dateStr)
  return date.toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
}

let syncingFromShared = false

watch(editorSteps, (val) => {
  if (!showCreateDialog.value || syncingFromShared) return
  emit('workflow-edit-change', val.map(s => ({ ...s })))
}, { deep: true })

watch(() => props.sharedWorkflowData, (data) => {
  if (!data || !showCreateDialog.value || data.source === 'edit') return
  if (data.steps && data.steps.length > 0) {
    syncingFromShared = true
    stepUidCounter = Math.max(...data.steps.map(s => s._uid), 0)
    editorSteps.value = data.steps.map(s => ({ ...s }))
    syncingFromShared = false
  }
}, { deep: true })

watch(showCreateDialog, (val) => {
  if (!val) emit('workflow-edit-close')
})

onMounted(() => {
  fetchCustomActions()
})
</script>
