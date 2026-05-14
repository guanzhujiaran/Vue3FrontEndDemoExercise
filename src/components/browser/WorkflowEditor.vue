<!--
 * @FilePath: \Vue3FrontEndDemoExercise\src\components\browser\WorkflowEditor.vue
 * @Description: 可视化工作流编辑器 - 支持拖拽编排、嵌套子步骤、{{变量}}补全、插件配置、执行日志
-->
<template>
  <div class="flex flex-col h-full overflow-hidden">
    <!-- 主布局：工具箱 + 内容区 -->
    <div class="flex flex-1 min-h-0 gap-3">
      <!-- 左侧：工具箱 (类似 WinForms Toolbox) -->
      <div class="w-60 shrink-0 flex flex-col rounded-lg border border-[var(--el-border-color-lighter)] bg-[var(--el-fill-color-blank)] overflow-hidden">
        <!-- 工具箱标题栏 -->
        <div class="flex items-center gap-2 px-3 py-2 bg-[var(--el-fill-color-light)] border-b border-[var(--el-border-color-lighter)]">
          <el-icon class="text-primary"><SetUp /></el-icon>
          <span class="text-sm font-semibold">工具箱</span>
          <el-tag v-if="registeredActions.length > 0" size="small" type="info" effect="plain" class="ml-auto">{{ registeredActions.length }}</el-tag>
        </div>

        <!-- 搜索框 -->
        <div class="px-2 py-2 border-b border-[var(--el-border-color-lighter)]">
          <el-input
            v-model="searchQuery"
            placeholder="搜索控件..."
            size="small"
            :prefix-icon="Search"
            clearable
          />
        </div>

        <!-- 工具箱内容区 -->
        <div class="flex-1 overflow-y-auto p-2">
          <!-- 加载状态 -->
          <div v-if="loadingActions" class="flex items-center justify-center py-6">
            <el-icon class="is-loading"><Loading /></el-icon>
            <span class="ml-2 text-xs text-[var(--el-text-color-secondary)]">加载中...</span>
          </div>

          <!-- 空状态 -->
          <div v-else-if="Object.keys(sortedGroupedActions).length === 0" class="text-center py-6 text-xs text-[var(--el-text-color-placeholder)]">
            未找到匹配的操作
          </div>

          <!-- 类别分组 -->
          <template v-else>
            <!-- 工具类别 (放在最外侧，不分公开私有) -->
            <div class="mb-2">
              <!-- 工具类别标题 -->
              <div
                class="flex items-center gap-1.5 px-2 py-1.5 rounded cursor-pointer hover:bg-[var(--el-fill-color-light)] transition-colors"
                @click="toggleCategory('utility')"
              >
                <el-icon
                  class="text-[var(--el-text-color-secondary)] transition-transform"
                  :class="{ 'rotate-90': !collapsedCategories.has('utility') }"
                  :size="12"
                >
                  <ArrowRight />
                </el-icon>
                <span class="text-xs font-semibold">{{ getCategoryIcon('utility') }} {{ getCategoryLabel('utility') }}</span>
                <el-tag size="small" type="info" effect="plain" class="ml-auto !text-[10px]">{{ sortedGroupedActions.utility?.length || 0 }}</el-tag>
              </div>
              <!-- 工具项列表 -->
              <div v-show="!collapsedCategories.has('utility')" class="ml-2 mt-1 space-y-0.5">
                <div
                  v-for="action in sortedGroupedActions.utility"
                  :key="action.id || action.action_id"
                  class="toolbox-item flex items-center gap-2 px-2 py-1.5 rounded cursor-grab active:cursor-grabbing hover:bg-[var(--el-fill-color-light)] border border-transparent hover:border-[var(--el-color-primary-light-7)] transition-all text-xs"
                  draggable="true"
                  @dragstart="onToolboxDragStart($event, action)"
                  @dblclick="handleAddStep(action.id || action.action_id)"
                >
                  <el-icon :size="14" class="text-[var(--el-color-primary)] shrink-0">
                    <component :is="getActionIcon(action.type || action.action_id)" />
                  </el-icon>
                  <div class="flex-1 min-w-0">
                    <div class="font-medium truncate">{{ action.name || action.action_id }}</div>
                    <div v-if="action.description" class="text-[var(--el-text-color-placeholder)] truncate text-[10px]">{{ action.description }}</div>
                  </div>
                </div>
                <!-- 空状态提示 -->
                <div v-if="(!sortedGroupedActions.utility || sortedGroupedActions.utility.length === 0)" class="px-2 py-2 text-[10px] text-[var(--el-text-color-placeholder)] italic">
                  暂无操作
                </div>
              </div>
            </div>

            <!-- 公开分组 -->
            <div class="mb-2">
              <!-- 公开标题 (可折叠) -->
              <div
                class="flex items-center gap-1.5 px-2 py-1.5 rounded cursor-pointer hover:bg-[var(--el-fill-color-light)] transition-colors bg-blue-50"
                @click="toggleCategory('public')"
              >
                <el-icon
                  class="text-blue-500 transition-transform"
                  :class="{ 'rotate-90': !collapsedCategories.has('public') }"
                  :size="12"
                >
                  <ArrowRight />
                </el-icon>
                <span class="text-xs font-semibold text-blue-600">🌐 公开</span>
              </div>
              <!-- 公开类别 -->
              <div v-show="!collapsedCategories.has('public')" class="ml-2 mt-1 space-y-2">
                <!-- 自定义操作 -->
                <div class="mb-2">
                  <div
                    class="flex items-center gap-1.5 px-2 py-1.5 rounded cursor-pointer hover:bg-[var(--el-fill-color-light)] transition-colors"
                    @click="toggleCategory('public_custom')"
                  >
                    <el-icon
                      class="text-[var(--el-text-color-secondary)] transition-transform"
                      :class="{ 'rotate-90': !collapsedCategories.has('public_custom') }"
                      :size="12"
                    >
                      <ArrowRight />
                    </el-icon>
                    <span class="text-xs font-semibold">{{ getCategoryIcon('custom') }} {{ getCategoryLabel('custom') }}</span>
                    <el-tag size="small" type="info" effect="plain" class="ml-auto !text-[10px]">{{ sortedGroupedActions.custom?.length || 0 }}</el-tag>
                  </div>
                  <div v-show="!collapsedCategories.has('public_custom')" class="ml-2 mt-1 space-y-0.5">
                    <div
                      v-for="action in sortedGroupedActions.custom"
                      :key="action.id || action.action_id"
                      class="toolbox-item flex items-center gap-2 px-2 py-1.5 rounded cursor-grab active:cursor-grabbing hover:bg-[var(--el-fill-color-light)] border border-transparent hover:border-[var(--el-color-primary-light-7)] transition-all text-xs"
                      draggable="true"
                      @dragstart="onToolboxDragStart($event, action)"
                      @dblclick="handleAddStep(action.id || action.action_id)"
                    >
                      <el-icon :size="14" class="text-[var(--el-color-primary)] shrink-0">
                        <component :is="getActionIcon('custom')" />
                      </el-icon>
                      <div class="flex-1 min-w-0">
                        <div class="font-medium truncate">{{ action.name || action.action_id }}</div>
                        <div v-if="action.description" class="text-[var(--el-text-color-placeholder)] truncate text-[10px]">{{ action.description }}</div>
                      </div>
                      <el-tag v-if="action.is_custom" size="small" type="warning" effect="plain" class="!text-[9px] !px-1 shrink-0">自定义</el-tag>
                    </div>
                    <div v-if="(!sortedGroupedActions.custom || sortedGroupedActions.custom.length === 0)" class="px-2 py-2 text-[10px] text-[var(--el-text-color-placeholder)] italic">
                      暂无自定义操作
                    </div>
                  </div>
                </div>

                <!-- 插件 -->
                <div class="mb-2">
                  <div
                    class="flex items-center gap-1.5 px-2 py-1.5 rounded cursor-pointer hover:bg-[var(--el-fill-color-light)] transition-colors"
                    @click="toggleCategory('public_plugin')"
                  >
                    <el-icon
                      class="text-[var(--el-text-color-secondary)] transition-transform"
                      :class="{ 'rotate-90': !collapsedCategories.has('public_plugin') }"
                      :size="12"
                    >
                      <ArrowRight />
                    </el-icon>
                    <span class="text-xs font-semibold">{{ getCategoryIcon('plugin') }} {{ getCategoryLabel('plugin') }}</span>
                    <el-tag size="small" type="info" effect="plain" class="ml-auto !text-[10px]">{{ sortedGroupedActions.plugin?.length || 0 }}</el-tag>
                  </div>
                  <div v-show="!collapsedCategories.has('public_plugin')" class="ml-2 mt-1 space-y-0.5">
                    <div
                      v-for="action in sortedGroupedActions.plugin"
                      :key="action.id || action.action_id"
                      class="toolbox-item flex items-center gap-2 px-2 py-1.5 rounded cursor-grab active:cursor-grabbing hover:bg-[var(--el-fill-color-light)] border border-transparent hover:border-[var(--el-color-primary-light-7)] transition-all text-xs"
                      draggable="true"
                      @dragstart="onToolboxDragStart($event, action)"
                      @dblclick="handleAddStep(action.id || action.action_id)"
                    >
                      <el-icon :size="14" class="text-[var(--el-color-primary)] shrink-0">
                        <component :is="getActionIcon('plugin')" />
                      </el-icon>
                      <div class="flex-1 min-w-0">
                        <div class="font-medium truncate">{{ action.name || action.action_id }}</div>
                        <div v-if="action.description" class="text-[var(--el-text-color-placeholder)] truncate text-[10px]">{{ action.description }}</div>
                      </div>
                      <el-tag v-if="action.is_plugin" size="small" type="success" effect="plain" class="!text-[9px] !px-1 shrink-0">插件</el-tag>
                    </div>
                    <div v-if="(!sortedGroupedActions.plugin || sortedGroupedActions.plugin.length === 0)" class="px-2 py-2 text-[10px] text-[var(--el-text-color-placeholder)] italic">
                      暂无插件
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- 私有分组 -->
            <div>
              <!-- 私有标题 (可折叠) -->
              <div
                class="flex items-center gap-1.5 px-2 py-1.5 rounded cursor-pointer hover:bg-[var(--el-fill-color-light)] transition-colors bg-purple-50"
                @click="toggleCategory('private')"
              >
                <el-icon
                  class="text-purple-500 transition-transform"
                  :class="{ 'rotate-90': !collapsedCategories.has('private') }"
                  :size="12"
                >
                  <ArrowRight />
                </el-icon>
                <span class="text-xs font-semibold text-purple-600">🔒 私有</span>
              </div>
              <!-- 私有内容 -->
              <div v-show="!collapsedCategories.has('private')" class="ml-2 mt-1 space-y-2">
                <!-- 私有自定义操作 -->
                <div class="mb-2">
                  <div
                    class="flex items-center gap-1.5 px-2 py-1.5 rounded cursor-pointer hover:bg-[var(--el-fill-color-light)] transition-colors"
                    @click="toggleCategory('private_custom')"
                  >
                    <el-icon
                      class="text-[var(--el-text-color-secondary)] transition-transform"
                      :class="{ 'rotate-90': !collapsedCategories.has('private_custom') }"
                      :size="12"
                    >
                      <ArrowRight />
                    </el-icon>
                    <span class="text-xs font-semibold">{{ getCategoryIcon('custom') }} {{ getCategoryLabel('custom') }}</span>
                    <el-tag size="small" type="info" effect="plain" class="ml-auto !text-[10px]">0</el-tag>
                  </div>
                  <div v-show="!collapsedCategories.has('private_custom')" class="ml-2 mt-1 space-y-0.5">
                    <div class="px-2 py-2 text-[10px] text-[var(--el-text-color-placeholder)] italic">
                      暂无私有自定义操作
                    </div>
                  </div>
                </div>
                <!-- 私有插件 -->
                <div>
                  <div
                    class="flex items-center gap-1.5 px-2 py-1.5 rounded cursor-pointer hover:bg-[var(--el-fill-color-light)] transition-colors"
                    @click="toggleCategory('private_plugin')"
                  >
                    <el-icon
                      class="text-[var(--el-text-color-secondary)] transition-transform"
                      :class="{ 'rotate-90': !collapsedCategories.has('private_plugin') }"
                      :size="12"
                    >
                      <ArrowRight />
                    </el-icon>
                    <span class="text-xs font-semibold">{{ getCategoryIcon('plugin') }} {{ getCategoryLabel('plugin') }}</span>
                    <el-tag size="small" type="info" effect="plain" class="ml-auto !text-[10px]">0</el-tag>
                  </div>
                  <div v-show="!collapsedCategories.has('private_plugin')" class="ml-2 mt-1 space-y-0.5">
                    <div class="px-2 py-2 text-[10px] text-[var(--el-text-color-placeholder)] italic">
                      暂无私有插件
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </template>
        </div>
      </div>

      <!-- 右侧：步骤编辑区 -->
      <div class="flex-1 flex flex-col min-w-0 overflow-hidden">
        <!-- 顶部工具栏 -->
        <div class="flex flex-wrap items-center gap-2 p-3 rounded-lg border border-[var(--el-border-color-lighter)] bg-[var(--el-fill-color-lighter)] mb-3">
          <span class="text-sm font-semibold">工作流步骤</span>
          <el-divider direction="vertical" />
          <span class="text-xs text-[var(--el-text-color-secondary)]">{{ internalSteps.length }} 步</span>
          <div class="ml-auto flex gap-2">
            <el-button size="small" type="primary" :icon="Plus" @click="showActionPicker = true">
              添加步骤
            </el-button>
            <el-button size="small" :icon="Refresh" @click="fetchRegisteredActions">
              刷新
            </el-button>
          </div>
        </div>

        <!-- 步骤列表区域 (可接收拖拽) -->
        <div
          class="flex-1 overflow-y-auto min-h-0 rounded-lg border-2 border-dashed transition-all"
          :class="isDragOver ? 'border-[var(--el-color-primary)] bg-[var(--el-color-primary-light-9)]' : 'border-[var(--el-border-color-lighter)] bg-[var(--el-fill-color-blank)]'"
          @dragover.prevent="onStepsDragOver"
          @dragleave="onStepsDragLeave"
          @drop="onStepsDrop"
        >
          <!-- 空状态 -->
          <div v-if="internalSteps.length === 0" class="flex flex-col items-center justify-center py-16 text-[var(--el-text-color-placeholder)]">
            <el-icon :size="48"><SetUp /></el-icon>
            <p class="mt-4 text-sm">从左侧工具箱拖拽或双击添加步骤</p>
            <p class="text-xs mt-1">支持循环、条件分支等嵌套结构</p>
          </div>

          <!-- 步骤列表 -->
          <div v-else class="space-y-2 p-2">
            <div
              v-for="(step, index) in internalSteps"
              :key="step._uid"
              class="group"
            >
              <StepCard
                :step="step"
                :index="index"
                :available-variables="availableVariables"
                :execution-error="getStepError(step._uid)"
                :execution-time="getStepTime(step._uid)"
                @remove="removeStep(step._uid)"
                @move-up="index > 0 && moveStep(index, index - 1)"
                @move-down="index < internalSteps.length - 1 && moveStep(index, index + 1)"
                @add-child="handleAddChild"
                @remove-child="handleRemoveChild"
                @update:step="handleStepUpdate(index, $event)"
              />
            </div>
          </div>
        </div>

        <!-- 插件和日志 Tab -->
        <el-tabs v-model="activeMainTab" class="workflow-editor-tabs mt-3">
          <el-tab-pane name="plugins">
            <template #label>
              <span class="flex items-center gap-1">
                <el-icon><Clock /></el-icon>
                插件配置
                <el-badge v-if="workflowPlugins.length > 0" :value="workflowPlugins.length" type="primary" />
              </span>
            </template>
            <div class="py-3">
              <PluginSelector v-model="workflowPlugins" />
            </div>
          </el-tab-pane>

          <el-tab-pane name="logs">
            <template #label>
              <span class="flex items-center gap-1">
                <el-icon><List /></el-icon>
                执行日志
                <el-badge v-if="executionResults.length > 0" :value="executionResults.length" :type="allResultsSuccess ? 'success' : 'danger'" />
              </span>
            </template>
            <ExecutionLogsPanel
              :results="executionResults"
              @clear="clearExecutionResults"
            />
          </el-tab-pane>
        </el-tabs>
      </div>
    </div>

    <!-- 添加步骤弹窗 -->
    <el-dialog
      v-model="showActionPicker"
      title="选择操作"
      width="500px"
      :close-on-click-modal="true"
    >
      <el-input
        v-model="pickerSearchQuery"
        placeholder="搜索操作..."
        size="default"
        :prefix-icon="Search"
        clearable
        class="mb-3"
      />
      <div class="max-h-[400px] overflow-y-auto">
        <template v-for="(group, category) in pickerGroupedActions" :key="category">
          <div class="text-xs font-semibold text-[var(--el-text-color-secondary)] px-2 py-1 bg-[var(--el-fill-color-light)]">
            {{ getCategoryIcon(category) }} {{ getCategoryLabel(category) }}
          </div>
          <div
            v-for="action in group"
            :key="action.id || action.action_id"
            class="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-[var(--el-fill-color-light)] border-b border-[var(--el-border-color-lighter)]"
            @click="handleAddStep(action.id || action.action_id); showActionPicker = false"
          >
            <el-icon :size="16" class="text-[var(--el-color-primary)]">
              <component :is="getActionIcon(action.type || action.action_id)" />
            </el-icon>
            <div class="flex-1">
              <div class="font-medium text-sm">{{ action.name || action.action_id }}</div>
              <div v-if="action.description" class="text-xs text-[var(--el-text-color-placeholder)]">{{ action.description }}</div>
            </div>
            <el-tag v-if="action.is_custom" size="small" type="warning" effect="plain">自定义</el-tag>
          </div>
        </template>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { Plus, SetUp, Search, Loading, Clock, List, Link, Pointer, Edit, Select, Rank, Camera, Monitor, ChatDotRound, Refresh, Switch, DocumentAdd, Star, ArrowRight, Box } from '@element-plus/icons-vue'
import { useWorkflowEditor, CATEGORY_CONFIG, type StepNode } from '@/composables/useWorkflowEditor'
import StepCard from './workflow/StepCard.vue'
import PluginSelector from './workflow/PluginSelector.vue'
import ExecutionLogsPanel from './workflow/ExecutionLogsPanel.vue'
import actionsApi from '@/api/browser/actions_api'
import customActionsApi from '@/api/browser/custom_actions_api'
import pluginsApi from '@/api/browser/plugins_api'
import type { ActionMetadataResponse, PredefinedActionId, EnabledPlugin, StepExecutionResult, WorkflowStepRequest } from '@/types/browser-automation-api'

const stepsModel = defineModel<WorkflowStepRequest[]>({ default: [] })

const {
  steps: internalSteps,
  exportSteps,
  availableVariables = computed(() => []),
  addStep,
  removeStep,
  moveStep,
  addChildStep,
  removeChildStep,
  initFromSteps
} = useWorkflowEditor()

const activeMainTab = ref('plugins')
const workflowPlugins = ref<EnabledPlugin[]>([])
const executionResults = ref<StepExecutionResult[]>([])
const showActionPicker = ref(false)
const pickerSearchQuery = ref('')

const allResultsSuccess = computed(() =>
  executionResults.value.length > 0 && executionResults.value.every(r => r.success)
)

const getStepError = (uid: string): string | null => {
  const index = internalSteps.value.findIndex(s => s._uid === uid)
  if (index >= 0 && executionResults.value[index]) {
    return executionResults.value[index].error || null
  }
  return null
}

const getStepTime = (uid: string): number | null => {
  const index = internalSteps.value.findIndex(s => s._uid === uid)
  if (index >= 0 && executionResults.value[index]) {
    return executionResults.value[index].execution_time || null
  }
  return null
}

const clearExecutionResults = () => {
  executionResults.value = []
}

const setExecutionResults = (results: StepExecutionResult[]) => {
  executionResults.value = results
}

const getWorkflowPlugins = () => workflowPlugins.value

const setWorkflowPlugins = (plugins: EnabledPlugin[]) => {
  workflowPlugins.value = plugins
}

// API 获取的操作列表
const registeredActions = ref<any[]>([])
const loadingActions = ref(false)
const searchQuery = ref('')

// 类别折叠状态
const collapsedCategories = ref<Set<string>>(new Set())

const toggleCategory = (category: string) => {
  if (collapsedCategories.value.has(category)) {
    collapsedCategories.value.delete(category)
  } else {
    collapsedCategories.value.add(category)
  }
}

// 拖拽状态
const isDragOver = ref(false)
let draggedAction: any = null

const onToolboxDragStart = (event: DragEvent, action: any) => {
  draggedAction = action
  event.dataTransfer?.setData('application/json', JSON.stringify(action))
  event.dataTransfer!.effectAllowed = 'copy'
}

const onStepsDragOver = (event: DragEvent) => {
  isDragOver.value = true
  event.dataTransfer!.dropEffect = 'copy'
}

const onStepsDragLeave = () => {
  isDragOver.value = false
}

const onStepsDrop = (event: DragEvent) => {
  isDragOver.value = false
  const data = event.dataTransfer?.getData('application/json')
  if (data) {
    try {
      const action = JSON.parse(data)
      const actionId = action.id || action.action_id
      if (actionId) {
        handleAddStep(actionId)
      }
    } catch (e) {
      console.error('[WorkflowEditor] 解析拖拽数据失败:', e)
    }
  }
  draggedAction = null
}

// 类别配置
const CATEGORY_MAP: Record<string, string> = {}

const CATEGORY_LABELS: Record<string, string> = {
  utility: '工具',
  custom: '自定义操作',
  plugin: '插件'
}

const CATEGORY_ICONS: Record<string, string> = {
  utility: '🔧',
  custom: '⭐',
  plugin: '🔌'
}

const getActionCategory = (action: any): string => {
  if (action?.is_custom || action?.category === 'custom') return 'custom'
  if (action?.is_plugin || action?.category === 'plugin') return 'plugin'
  return 'utility'
}

const getCategoryIcon = (category: string) => CATEGORY_ICONS[category] || '📦'

const getCategoryLabel = (category: string) => CATEGORY_LABELS[category] || category

const ACTION_ICON_MAP: Record<string, any> = {
  navigate: Link,
  click: Pointer,
  double_click: Pointer,
  input: Edit,
  clear_input: Edit,
  hover: Pointer,
  select: Select,
  scroll: Rank,
  wait: Clock,
  screenshot: Camera,
  evaluate: Monitor,
  llm: ChatDotRound,
  loop: Refresh,
  if_else: Switch,
  new_page: DocumentAdd,
  custom: Star,
  plugin: Box
}

const getActionIcon = (type: string) => {
  return ACTION_ICON_MAP[type] || SetUp
}

const fetchRegisteredActions = async () => {
  if (loadingActions.value) return
  loadingActions.value = true
  try {
    const [registeredRes, customRes, pluginsRes] = await Promise.allSettled([
      actionsApi.listRegisteredActions(),
      customActionsApi.listCustomActions({ per_page: 100 }),
      pluginsApi.listPlugins({ per_page: 100 })
    ])

    const allActions: any[] = []

    if (registeredRes.status === 'fulfilled' && registeredRes.value.code === 0) {
      const data = registeredRes.value.data
      if (Array.isArray(data)) {
        allActions.push(...data)
      } else if (data && Array.isArray((data as any).actions)) {
        allActions.push(...(data as any).actions)
      }
    } else if (registeredRes.status === 'rejected') {
      console.warn('[WorkflowEditor] 获取预注册操作失败:', registeredRes.reason)
    }

    if (customRes.status === 'fulfilled' && customRes.value.code === 0) {
      const data = customRes.value.data
      if (data && data.items) {
        const customActions = data.items.map((item: any) => ({
          action_id: `custom_${item.id}`,
          id: `custom_${item.id}`,
          name: item.name,
          description: item.description || '',
          parameters: item.parameters_schema || [],
          is_custom: true,
          category: 'custom'
        }))
        allActions.push(...customActions)
      }
    } else if (customRes.status === 'rejected') {
      console.warn('[WorkflowEditor] 获取 custom actions 失败:', customRes.reason)
    }

    if (pluginsRes.status === 'fulfilled' && pluginsRes.value.code === 0) {
      const data = pluginsRes.value.data
      if (data && data.items) {
        const pluginActions = data.items.map((item: any) => ({
          action_id: `plugin_${item.plugin_id || item.id}`,
          id: `plugin_${item.plugin_id || item.id}`,
          name: item.name || item.plugin_id,
          description: item.description || '',
          parameters: item.input_schema || [],
          is_plugin: true,
          category: 'plugin'
        }))
        allActions.push(...pluginActions)
      }
    } else if (pluginsRes.status === 'rejected') {
      console.warn('[WorkflowEditor] 获取插件列表失败:', pluginsRes.reason)
    }

    registeredActions.value = allActions
    console.log(`[WorkflowEditor] 加载了 ${allActions.length} 个操作（预注册 + custom + 插件）`)
  } catch (e) {
    console.error('[WorkflowEditor] 获取操作列表失败:', e)
  } finally {
    loadingActions.value = false
  }
}

// 过滤后的操作列表
const filteredActions = computed(() => {
  if (!searchQuery.value.trim()) {
    return registeredActions.value
  }
  const query = searchQuery.value.toLowerCase()
  return registeredActions.value.filter(action =>
    (action.name || '').toLowerCase().includes(query) ||
    (action.id || '').toLowerCase().includes(query) ||
    (action.action_id || '').toLowerCase().includes(query) ||
    (action.description || '').toLowerCase().includes(query)
  )
})

// 弹窗中的过滤操作
const pickerFilteredActions = computed(() => {
  if (!pickerSearchQuery.value.trim()) {
    return registeredActions.value
  }
  const query = pickerSearchQuery.value.toLowerCase()
  return registeredActions.value.filter(action =>
    (action.name || '').toLowerCase().includes(query) ||
    (action.id || '').toLowerCase().includes(query) ||
    (action.action_id || '').toLowerCase().includes(query) ||
    (action.description || '').toLowerCase().includes(query)
  )
})

// 按类别分组（始终包含所有类别）
const groupedActions = computed(() => {
  const groups: Record<string, any[]> = {}
  // 先初始化所有类别为空数组
  for (const cat of sortedCategoryOrder) {
    groups[cat] = []
  }
  // 然后填充数据
  for (const action of filteredActions.value) {
    const category = getActionCategory(action)
    if (groups[category] !== undefined) {
      groups[category].push(action)
    }
  }
  return groups
})

const pickerGroupedActions = computed(() => {
  const groups: Record<string, any[]> = {}
  for (const action of pickerFilteredActions.value) {
    const category = getActionCategory(action)
    if (!groups[category]) {
      groups[category] = []
    }
    groups[category].push(action)
  }
  return groups
})

const sortedCategoryOrder = ['utility', 'custom', 'plugin']

const sortedGroupedActions = computed(() => {
  const sorted: Record<string, any[]> = {}
  for (const cat of sortedCategoryOrder) {
    if (groupedActions.value[cat]) {
      sorted[cat] = groupedActions.value[cat]
    }
  }
  return sorted
})

// 添加步骤
const handleAddStep = (actionId: string) => {
  addStep(actionId as PredefinedActionId)
  stepsModel.value = exportSteps.value
  searchQuery.value = ''
}

// 添加子步骤
const handleAddChild = ({ parentUid, branchIndex, actionId }: { parentUid: string; branchIndex: number; actionId: string }) => {
  addChildStep(parentUid, branchIndex, actionId as PredefinedActionId)
  stepsModel.value = exportSteps.value
}

// 删除子步骤
const handleRemoveChild = ({ parentUid, branchIndex, childUid }: { parentUid: string; branchIndex: number; childUid: string }) => {
  removeChildStep(parentUid, branchIndex, childUid)
  stepsModel.value = exportSteps.value
}

// 更新步骤
const handleStepUpdate = (index: number, updated: StepNode) => {
  internalSteps.value[index] = updated
  stepsModel.value = exportSteps.value
}

onMounted(() => {
  fetchRegisteredActions()
  if (stepsModel.value?.length) {
    initFromSteps(stepsModel.value)
  }
})

let isMounted = true
onUnmounted(() => { isMounted = false })

watch(() => stepsModel.value, (val) => {
  if (!isMounted || val == null) return
  if (val.length === 0) return
  if (JSON.stringify(val) !== JSON.stringify(exportSteps.value)) {
    initFromSteps(val)
  }
}, { immediate: true, deep: true })

defineExpose({
  setExecutionResults,
  getWorkflowPlugins,
  setWorkflowPlugins
})
</script>

<style scoped>
.toolbox-item:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.workflow-editor-tabs :deep(.el-tabs__header) {
  margin-bottom: 0;
}
</style>
