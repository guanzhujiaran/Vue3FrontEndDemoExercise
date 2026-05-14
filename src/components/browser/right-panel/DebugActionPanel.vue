<template>
  <div class="debug-action-panel flex flex-col h-full bg-[var(--el-bg-color)]">
    <!-- 顶部工具栏 -->
    <div class="flex items-center gap-2 px-3 py-2 border-b border-[var(--el-border-color-lighter)] shrink-0 bg-[var(--el-fill-color-light)]">
      <span class="text-sm font-medium text-[var(--el-text-color-primary)]">步骤调试</span>
        <el-tag v-if="isSynced" size="small" type="success" effect="plain" class="ml-2">
          <el-icon class="mr-0.5" :size="10"><Connection /></el-icon>
          {{ syncedSourceLabel }}
        </el-tag>
        <div class="ml-auto flex items-center gap-1.5">
        <el-tooltip content="刷新操作列表" placement="bottom">
          <el-button size="small" text :loading="fetchingActions" @click="handleRefreshActions">
            <el-icon><Refresh /></el-icon>
          </el-button>
        </el-tooltip>
        <el-tooltip content="保存当前参数为预设" placement="bottom">
          <el-button size="small" text :icon="FolderAdd" @click="openSavePresetDialog" :disabled="validSteps.length === 0" />
        </el-tooltip>
        <el-tooltip content="保存为自定义操作（服务器）" placement="bottom">
          <el-button size="small" text :icon="Upload" @click="openSaveCustomDialog" :disabled="validSteps.length === 0" />
        </el-tooltip>
        <el-tooltip content="查看执行历史" placement="bottom">
          <el-button size="small" text :icon="Clock" @click="showHistoryDrawer = true" />
        </el-tooltip>
        <el-tag size="small" effect="plain" type="info">{{ actionList.length }} 个操作</el-tag>
      </div>
    </div>

    <!-- 主内容区域：工作流编辑器（与左侧编辑弹窗对齐 + 调试能力） -->
    <div class="flex-1 flex flex-col min-h-0 gap-3 p-3 overflow-y-auto">

      <!-- 区域 1：名称 + 描述（与左侧编辑弹窗一致） -->
      <div class="grid grid-cols-2 gap-x-4 shrink-0">
        <el-form-item label="操作名称" class="!mb-0">
          <el-input v-model="workflowName" placeholder="例: B站自动登录" size="small" />
        </el-form-item>
        <el-form-item label="描述" class="!mb-0">
          <el-input v-model="workflowDescription" type="textarea" :rows="1" placeholder="简要描述此操作的功能" size="small" />
        </el-form-item>
      </div>

      <!-- 区域 2：参数定义 parameters_schema（与左侧编辑弹窗一致） -->
      <div class="rounded-lg border border-[var(--el-border-color-lighter)] p-3 bg-[var(--el-fill-color-blank)] shrink-0">
        <div class="flex items-center justify-between mb-3">
          <span class="text-xs font-medium text-[var(--el-text-color-secondary)] flex items-center gap-1">
            参数定义 (parameters_schema)
            <el-tag size="small" type="info" effect="plain">步骤中可用 &#123;&#123;变量&#125;&#125; 引用</el-tag>
          </span>
          <el-button size="small" text :icon="Plus" @click="addParamDef">添加参数</el-button>
        </div>
        <div v-for="(param, idx) in paramDefs" :key="'pd'+idx" class="flex gap-2 items-start mb-2 p-2 rounded-lg bg-[var(--el-fill-color-lighter)]">
          <el-input v-model="param.name" placeholder="参数名" class="w-28" size="small" />
          <el-select v-model="param.type" class="w-24" size="small">
            <el-option label="字符串" value="string" />
            <el-option label="整数" value="int" />
            <el-option label="浮点" value="float" />
            <el-option label="布尔" value="boolean" />
            <el-option label="数组" value="array" />
          </el-select>
          <el-switch v-model="param.required" active-text="必填" inactive-text="选填" size="small" />
          <el-input v-model="param.default" placeholder="默认值" class="w-28" size="small" />
          <el-button text type="danger" :icon="Delete" size="small" @click="paramDefs.splice(idx, 1)" />
        </div>
        <div v-if="paramDefs.length === 0" class="text-xs text-[var(--el-text-color-placeholder)] py-2 text-center">
          无参数定义，添加后可在步骤中使用 &#123;&#123;参数名&#125;&#125; 模板语法引用
        </div>
      </div>

      <!-- 区域 3：步骤列表 CustomActionStepEditor（debug 模式 = 左侧界面 + 调试按钮） -->
      <CustomActionStepEditor
        ref="stepEditorRef"
        v-model="debugSteps"
        :action-list="actionList"
        mode="debug"
        :disabled="!browserRunning"
        :can-execute="browserRunning"
        title="步骤列表 (steps)"
        :empty-text="'暂无步骤，点击添加按钮开始调试'"
        @execute-step="onExecuteStep"
        @execute-all="onExecuteAllSteps"
        @validate="onValidateStepParam"
        @pick-selector="(data) => emit('pick-selector', data)"
      />

      <!-- 高级选项区域 -->
      <div v-if="hasAdvancedOptions || advancedExpanded" class="rounded-lg border border-[var(--el-border-color-lighter)] p-3 shrink-0 bg-[var(--el-fill-color-blank)]">
        <div
          class="flex items-center justify-between cursor-pointer select-none hover:bg-[var(--el-fill-color-light)] rounded px-1 -mx-1 py-1 transition-colors"
          @click="advancedExpanded = !advancedExpanded"
        >
          <label class="text-xs font-medium text-[var(--el-text-color-secondary)] flex items-center gap-1">
            <el-icon :size="12"><Setting /></el-icon> 高级选项
            <el-badge v-if="hasAdvancedOptions" :value="getActiveAdvancedCount()" :max="99" type="primary" class="ml-1" />
          </label>
          <el-icon :size="12" class="transition-transform duration-200 text-[var(--el-text-color-placeholder)]" :class="{ 'rotate-180': advancedExpanded }"><ArrowDown /></el-icon>
        </div>

        <div v-show="advancedExpanded" class="mt-3 space-y-3 pl-1">
          <div>
            <label class="text-[11px] text-[var(--el-text-color-secondary)] font-mono block mb-1.5 flex items-center gap-1">
              user_data
              <el-tooltip content="传递给操作的额外 JSON 数据" placement="top">
                <el-icon class="text-[var(--el-text-color-placeholder)]" :size="12"><QuestionFilled /></el-icon>
              </el-tooltip>
            </label>
            <el-input
              v-model="advOptions.user_data_raw"
              type="textarea"
              :rows="2"
              placeholder='{"key": "value"}'
              size="small"
              :class="{ 'is-error': userDataParseError }"
              @blur="validateUserData"
            />
            <div v-if="userDataParseError" class="text-[11px] text-red-500 mt-1">{{ userDataParseError }}</div>
          </div>

          <div class="flex items-center justify-between rounded bg-[var(--el-fill-color-light)] px-3 py-2">
            <div class="flex items-center gap-2">
              <el-switch v-model="advOptions.dry_run" size="small" active-text="" inactive-text="" />
              <span class="text-xs text-[var(--el-text-color-secondary)]">dry_run (试运行)</span>
            </div>
            <el-tooltip content="开启后不会实际执行操作，仅验证参数" placement="top">
              <el-icon class="text-[var(--el-text-color-placeholder)]" :size="14"><InfoFilled /></el-icon>
            </el-tooltip>
          </div>

          <div>
            <label class="text-[11px] text-[var(--el-text-color-secondary)] font-mono block mb-1.5 flex items-center gap-1">
              enabled_plugins
              <el-tooltip content="启用的插件 ID 列表" placement="top">
                <el-icon class="text-[var(--el-text-color-placeholder)]" :size="12"><QuestionFilled /></el-icon>
              </el-tooltip>
            </label>
            <el-select
              v-model="advOptions.enabled_plugins"
              multiple
              filterable
              allow-create
              default-first-option
              placeholder="输入插件ID后按回车..."
              class="w-full"
              size="small"
            />
          </div>

          <div>
            <label class="text-[11px] text-[var(--el-text-color-secondary)] font-mono block mb-1.5 flex items-center gap-1">
              page_index
              <el-tooltip content="目标页面索引 (0-99)" placement="top">
                <el-icon class="text-[var(--el-text-color-placeholder)]" :size="12"><QuestionFilled /></el-icon>
              </el-tooltip>
            </label>
            <el-input-number
              v-model="advOptions.page_index"
              :min="0"
              :max="99"
              controls-position="right"
              size="small"
              class="w-full"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- 保存预设对话框 -->
    <el-dialog
      v-model="showSavePreset"
      title="保存参数预设"
      width="420px"
      destroy-on-close
      append-to-body
      :close-on-click-modal="false"
    >
      <el-form label-position="top" :model="presetForm" :rules="presetRules" ref="presetFormRef">
        <el-form-item label="预设名称" prop="name" required>
          <el-input
            v-model="presetForm.name"
            placeholder="如：登录-测试账号A"
            :prefix-icon="Edit"
            maxlength="50"
            show-word-limit
            clearable
          />
        </el-form-item>
        <el-form-item label="备注（可选）">
          <el-input
            v-model="presetForm.description"
            type="textarea"
            :rows="2"
            placeholder="添加一些备注信息..."
            maxlength="200"
            show-word-limit
          />
        </el-form-item>
        <el-alert
          v-if="validSteps.length > 0"
          :title="`当前步骤: ${validSteps[0].action_id}`"
          type="info"
          :closable="false"
          class="mt-2"
          show-icon
        >
          <template #default>
            <div class="text-xs text-[var(--el-text-color-secondary)]">
              将保存 {{ Object.keys(validSteps[0].params).length }} 个参数的当前值（首个有效步骤）
            </div>
          </template>
        </el-alert>
      </el-form>
      <template #footer>
        <div class="flex justify-end gap-2">
          <el-button size="small" @click="showSavePreset = false">取消</el-button>
          <el-button size="small" type="primary" :loading="savingPreset" @click="handleSavePreset">保存预设</el-button>
        </div>
      </template>
    </el-dialog>

    <!-- 保存为自定义操作对话框（服务器端） -->
    <el-dialog
      v-model="showSaveCustom"
      title="保存为自定义操作"
      width="480px"
      destroy-on-close
      append-to-body
      :close-on-click-modal="false"
    >
      <el-form label-position="top" :model="customActionForm" :rules="customActionRules" ref="customActionFormRef">
        <el-form-item label="操作名称" prop="name" required>
          <el-input
            v-model="customActionForm.name"
            :placeholder="'如：' + (validSteps.length > 0 ? validSteps[0].action_id : '步骤')"
          />
        </el-form-item>
        <el-form-item label="描述">
          <el-input
            v-model="customActionForm.description"
            type="textarea"
            :rows="2"
            placeholder="描述这个自定义操作的用途..."
            maxlength="500"
            show-word-limit
          />
        </el-form-item>
        <el-alert type="info" :closable="false" class="mt-2">
          <template #default>
            <div class="text-xs text-[var(--el-text-color-secondary)]">
              <div class="font-medium mb-1">将保存以下内容到服务器：</div>
              <div class="space-y-0.5 font-mono text-[11px]">
                <div>• 步骤数量: <span class="text-primary">{{ validSteps.length }}</span></div>
                <div>• 有效步骤: <span class="text-primary">{{ debugSteps.filter(s => s.action_id).length }}</span></div>
              </div>
            </div>
          </template>
        </el-alert>
        <el-form-item label="标签（可选）" class="mt-3 mb-0">
          <el-select
            v-model="customActionForm.tags"
            multiple
            filterable
            allow-create
            default-first-option
            placeholder="输入标签后按回车..."
            class="w-full"
            size="small"
          />
        </el-form-item>
        <el-form-item class="mt-2 mb-0">
          <el-checkbox v-model="customActionForm.is_public">公开分享（其他用户可见）</el-checkbox>
        </el-form-item>
      </el-form>
      <template #footer>
        <div class="flex justify-end gap-2">
          <el-button size="small" @click="showSaveCustom = false">取消</el-button>
          <el-button size="small" type="primary" :loading="savingCustom" @click="handleSaveCustomAction">保存到服务器</el-button>
        </div>
      </template>
    </el-dialog>

    <!-- 已保存预设抽屉 -->
    <el-drawer
      v-model="showPresetsDrawer"
      title="已保存预设"
      direction="rtl"
      size="380px"
      append-to-body
    >
      <template #header>
        <div class="flex items-center gap-2">
          <el-icon><FolderOpened /></el-icon>
          <span class="font-medium">已保存预设</span>
          <el-tag size="small" effect="plain" type="info">{{ savedPresets.length }}</el-tag>
        </div>
      </template>
      <div class="flex flex-col gap-2 h-full overflow-y-auto">
        <div
          v-for="preset in savedPresets"
          :key="preset.id"
          class="group relative rounded-lg border border-[var(--el-border-color)] p-3 cursor-pointer hover:border-primary hover:shadow-sm transition-all bg-[var(--el-fill-color-blank)]"
          @click="loadPreset(preset)"
        >
          <div class="flex items-start justify-between">
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2">
                <el-icon class="text-primary" :size="16"><Document /></el-icon>
                <span class="text-sm font-medium truncate">{{ preset.name }}</span>
              </div>
              <div class="flex items-center gap-2 mt-1.5 text-[11px] text-[var(--el-text-color-placeholder)]">
                <el-tag size="small" effect="plain" type="info" class="scale-90 origin-left">{{ preset.actionName }}</el-tag>
                <span>{{ Object.keys(preset.params).length }} 个参数</span>
              </div>
              <div v-if="preset.description" class="text-[11px] text-[var(--el-text-color-secondary)] mt-1 truncate">{{ preset.description }}</div>
              <div class="text-[10px] text-[var(--el-text-color-placeholder)] mt-1">{{ formatTimestamp(preset.createdAt) }}</div>
            </div>
            <el-button
              size="small"
              text
              type="danger"
              class="opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-2"
              @click.stop="confirmDeletePreset(preset)"
            >
              <el-icon :size="16"><Delete /></el-icon>
            </el-button>
          </div>
        </div>

        <!-- 预设空状态 -->
        <div v-if="savedPresets.length === 0" class="flex flex-col items-center justify-center py-12 text-[var(--el-text-color-placeholder)]">
          <el-icon :size="48"><FolderAdd /></el-icon>
          <p class="text-sm mt-3 font-medium">暂无保存的预设</p>
          <p class="text-xs mt-1">选择操作并配置参数后，可以保存为预设以便快速复用</p>
        </div>
      </div>
    </el-drawer>

    <!-- 执行历史抽屉 -->
    <el-drawer
      v-model="showHistoryDrawer"
      title="执行历史"
      direction="rtl"
      size="420px"
      append-to-body
    >
      <template #header>
        <div class="flex items-center gap-2 w-full">
          <el-icon><Clock /></el-icon>
          <span class="font-medium">执行历史</span>
          <el-tag size="small" effect="plain" type="info">{{ historyItems.length }} / {{ HISTORY_MAX }}</el-tag>
          <el-button
            size="small"
            text
            :icon="Delete"
            class="ml-auto"
            :disabled="historyItems.length === 0"
            @click="confirmClearHistory"
          >
            清空
          </el-button>
        </div>
      </template>
      <div class="flex flex-col gap-2 h-full overflow-y-auto">
        <div
          v-for="item in historyItems"
          :key="item.id"
          class="rounded-lg border p-3 cursor-pointer transition-all hover:shadow-sm"
          :class="item.success
            ? 'border-green-200 bg-green-50/30 hover:border-green-400'
            : 'border-red-200 bg-red-50/30 hover:border-red-400'"
          @click="loadFromHistory(item)"
        >
          <div class="flex items-start justify-between mb-2">
            <div class="flex items-center gap-2 min-w-0 flex-1">
              <el-icon :size="16" :class="item.success ? 'text-green-500' : 'text-red-500'">
                <component :is="item.success ? 'CircleCheck' : 'CircleClose'" />
              </el-icon>
              <span class="text-sm font-medium truncate max-w-[180px]">{{ item.actionName }}</span>
            </div>
            <el-tag :type="item.success ? 'success' : 'danger'" size="small" effect="dark">
              {{ item.success ? '成功' : '失败' }}
            </el-tag>
          </div>

          <div class="flex items-center gap-2 text-[12px] text-[var(--el-text-color-placeholder)] mb-1.5">
            <el-icon :size="12"><Timer /></el-icon>
            <span>{{ formatTime(item.timestamp) }}</span>
            <span class="text-[var(--el-border-color)]">|</span>
            <el-icon :size="12"><Odometer /></el-icon>
            <span>{{ item.duration }}ms</span>
            <span class="text-[var(--el-border-color)]">|</span>
            <el-icon :size="12"><DataLine /></el-icon>
            <span>{{ Object.keys(item.params).length }} 个参数</span>
          </div>

          <div v-if="item.error" class="text-[12px] text-red-600 bg-red-50 rounded px-2 py-1 mt-1.5 break-all">
            <el-icon :size="12" class="align-middle mr-1"><WarningFilled /></el-icon>
            {{ item.error }}
          </div>

          <div class="mt-2 pt-2 border-t border-dashed border-[var(--el-border-color-lighter)]">
            <div class="text-[10px] text-[var(--el-text-color-placeholder)]">
              点击可加载此历史的参数到编辑器
            </div>
          </div>
        </div>

        <!-- 历史空状态 -->
        <div v-if="historyItems.length === 0" class="flex flex-col items-center justify-center py-12 text-[var(--el-text-color-placeholder)]">
          <el-icon :size="48"><Clock /></el-icon>
          <p class="text-sm mt-3 font-medium">暂无执行历史</p>
          <p class="text-xs mt-1">执行操作后，历史记录将显示在这里</p>
        </div>
      </div>
    </el-drawer>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch, nextTick, provide } from 'vue'
import {
  Search,
  Refresh,
  InfoFilled,
  Document,
  Delete,
  FolderAdd,
  FolderOpened,
  Clock,
  Setting,
  ArrowDown,
  Warning,
  QuestionFilled,
  Edit,
  Timer,
  Odometer,
  DataLine,
  CircleCheck,
  CircleClose,
  WarningFilled,
  Upload,
  Plus,
  CaretRight,
  Top,
  Bottom,
  Connection
} from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox, FormInstance, FormRules } from 'element-plus'
import type { ActionRule } from 'async-validator'
import debugApi from '@/api/browser/debug_api'
import actionsApi, { ActionsApi } from '@/api/browser/actions_api'
import customActionsApi from '@/api/browser/custom_actions_api'
import ActionStepRenderer from './components/ActionStepRenderer.vue'
import CustomActionStepEditor from './components/CustomActionStepEditor.vue'
import type { StepItem } from './components/CustomActionStepEditor.vue'

// ==================== 类型定义 ====================

interface ActionParameter {
  name: string
  type?: string
  required?: boolean
  description?: string
  default?: any
  pattern?: string
  pattern_message?: string
  min?: number
  max?: number
  min_length?: number
  max_length?: number
  enum?: any[]
  format?: string
}

interface RegisteredAction {
  action_id: string
  name: string
  description?: string
  category?: string
  parameters?: ActionParameter[]
}

interface ExecutionResult {
  success: boolean | null
  error?: string
  result?: any
  duration: number
}

interface HistoryItem {
  id: string
  actionId: string
  actionName: string
  params: Record<string, any>
  success: boolean
  duration: number
  timestamp: number
  error?: string
}

interface SavedPreset {
  id: string
  name: string
  description?: string
  actionId: string
  actionName: string
  params: Record<string, any>
  createdAt: number
}

// ==================== Props & Emits ====================

const props = defineProps<{
  browserId: string
  browserRunning: boolean
  registeredActions: RegisteredAction[]
  loadingActions?: boolean
  sharedWorkflowData?: {
    steps: StepItem[]
    source: 'edit' | 'debug' | null
    actionInfo: { name: string; description: string; parameters_schema: any[]; actionId?: number } | null
  } | null
}>()

const emit = defineEmits<{
  log: [message: string, type: 'info' | 'success' | 'warning' | 'error']
  refreshActions: []
  'pick-selector': [data: { actionType: string; paramName: string }]
  'workflow-debug-change': [steps: StepItem[]]
}>()

defineExpose({ loadData, loadFromCustomAction, getActionFormData, getDebugSteps, setDebugSteps })

// ==================== 常量 ====================

const HISTORY_MAX = 50
const PRESET_STORAGE_KEY = 'debug_action_presets'
const HISTORY_STORAGE_KEY = 'debug_action_history'

// ==================== 响应式状态 ====================

const stepEditorRef = ref<InstanceType<typeof CustomActionStepEditor> | null>(null)
const debugSteps = ref<StepItem[]>([{ _uid: 1, action_id: '', params: {} }])
const executingAll = ref(false)
const advancedExpanded = ref(false)

// 工作流基本信息（与左侧编辑弹窗对齐）
const workflowName = ref('')
const workflowDescription = ref('')
const paramDefs = ref<Array<{ name: string; type: string; required: boolean; default: string }>>([])

function addParamDef() {
  paramDefs.value.push({ name: '', type: 'string', required: false, default: '' })
}

const advOptions = reactive({
  user_data_raw: '',
  dry_run: false,
  enabled_plugins: [] as string[],
  page_index: 0
})

const userDataParseError = ref('')

const showSavePreset = ref(false)
const savingPreset = ref(false)
const presetFormRef = ref<FormInstance>()
const presetForm = reactive({
  name: '',
  description: ''
})
const presetRules: FormRules = {
  name: [
    { required: true, message: '请输入预设名称', trigger: 'blur' },
    { min: 1, max: 50, message: '长度在 1 到 50 个字符', trigger: 'blur' }
  ]
}

const showPresetsDrawer = ref(false)
const savedPresets = ref<SavedPreset[]>([])

const showSaveCustom = ref(false)
const savingCustom = ref(false)
const customActionFormRef = ref<FormInstance>()
const customActionForm = reactive({
  name: '',
  description: '',
  tags: [] as string[],
  is_public: false
})
const customActionRules: FormRules = {
  name: [
    { required: true, message: '请输入操作名称', trigger: 'blur' },
    { min: 1, max: 80, message: '长度在 1 到 80 个字符', trigger: 'blur' }
  ]
}

const showHistoryDrawer = ref(false)
const historyItems = ref<HistoryItem[]>([])

const fetchingActions = ref(false)
const actionList = ref<RegisteredAction[]>([...props.registeredActions])

provide('registeredActions', actionList)

// ==================== 计算属性 ====================

const validSteps = computed(() => debugSteps.value.filter(s => s.action_id))

const hasAdvancedOptions = computed(() => {
  return (
    advOptions.user_data_raw.trim() !== '' ||
    advOptions.dry_run ||
    advOptions.enabled_plugins.length > 0 ||
    advOptions.page_index !== 0
  )
})

const isSynced = computed(() => props.sharedWorkflowData?.source != null)
const syncedSourceLabel = computed(() => {
  if (!props.sharedWorkflowData?.source) return ''
  return props.sharedWorkflowData.source === 'edit' ? '已同步: 编辑面板' : '已同步: 调试面板'
})

let syncingFromShared = false

watch(() => props.sharedWorkflowData, (data) => {
  if (!data || data.source === 'debug') return
  syncingFromShared = true
  if (data.steps && data.steps.length > 0) {
    stepEditorRef.value?.setSteps(data.steps.map(s => ({ ...s })))
  }
  if (data.actionInfo) {
    workflowName.value = data.actionInfo.name || ''
    workflowDescription.value = data.actionInfo.description || ''
    if (data.actionInfo.parameters_schema?.length) {
      paramDefs.value = data.actionInfo.parameters_schema.map((p: any) => ({
        name: p.name || '',
        type: p.type || 'string',
        required: !!p.required,
        default: p.default ?? ''
      }))
    }
  }
  nextTick(() => { syncingFromShared = false })
}, { deep: true })

watch(debugSteps, (val) => {
  if (syncingFromShared) return
  emit('workflow-debug-change', val.map(s => ({ ...s })))
}, { deep: true })

// ==================== 方法：步骤执行 ====================

async function onExecuteStep(payload: { index: number; step: StepItem }): Promise<void> {
  const { index, step } = payload
  if (!props.browserRunning) {
    ElMessage.warning('浏览器未运行，无法执行操作')
    return
  }
  if (!step.action_id) return

  step._executing = true
  step._result = undefined
  step._errors = {}
  const startTime = Date.now()

  try {
    const cleanParams: Record<string, any> = {}
    for (const [key, value] of Object.entries(step.params)) {
      if (value !== null && value !== undefined && value !== '') {
        cleanParams[key] = value
      }
    }

    let userData: any = undefined
    if (advOptions.user_data_raw.trim()) {
      try { userData = JSON.parse(advOptions.user_data_raw) } catch { /* ignore */ }
    }

    emit(`log`, `正在执行步骤 ${index + 1}: ${step.action_id}...`, 'info')

    const response = await debugApi.executeAction({
      browser_id: props.browserId,
      action_id: step.action_id,
      params: cleanParams,
      user_data: userData
    })

    const elapsed = Date.now() - startTime
    const data = response.code === 0 ? response.data : null

    step._result = {
      success: data?.success ?? false,
      error: data?.error ?? (response.code !== 0 ? response.msg : undefined),
      result: data?.data ?? data?.result,
      duration: elapsed
    }

    if (step._result.success) {
      emit('log', `步骤 ${index + 1} [${step.action_id}] 执行成功 (${elapsed}ms)`, 'success')
    } else {
      emit('log', `步骤 ${index + 1} [${step.action_id}] 执行失败: ${step._result.error}`, 'error')
    }

    addHistoryEntry({
      actionId: step.action_id,
      actionName: actionList.value.find(a => a.action_id === step.action_id)?.name || step.action_id,
      params: { ...cleanParams },
      success: !!step._result.success,
      duration: elapsed,
      error: step._result.error
    })
  } catch (error: any) {
    const elapsed = Date.now() - startTime
    step._result = { success: false, error: error.message || '未知错误', duration: elapsed }
    emit('log', `步骤 ${index + 1} [${step.action_id}] 执行异常: ${error.message}`, 'error')
  } finally {
    step._executing = false
  }
}

async function onExecuteAllSteps(steps: StepItem[]): Promise<void> {
  if (!props.browserRunning) {
    ElMessage.warning('浏览器未运行，无法执行操作')
    return
  }

  executingAll.value = true
  stepEditorRef.value?.setExecutingAll(true)
  stepEditorRef.value?.clearResults()

  for (let i = 0; i < steps.length; i++) {
    if (!steps[i].action_id) continue
    await onExecuteStep({ index: i, step: steps[i] })
  }

  executingAll.value = false
  stepEditorRef.value?.setExecutingAll(false)
  ElMessage.info('全部步骤执行完毕')
}

function onValidateStepParam(payload: { index: number; name: string }): void {
  const { index, name } = payload
  const step = debugSteps.value[index]
  if (!step || !step.action_id) return

  const meta = actionList.value.find(a => a.action_id === step.action_id)
  const param = meta?.parameters?.find(p => p.name === name)
  if (!param) return

  if (!step._errors) step._errors = {}
  const val = step.params[name]
  delete step._errors[name]

  if (param.required && (val === undefined || val === null || val === '')) {
    step._errors[name] = '此参数为必填项'
    return
  }
}

function getDebugSteps(): StepItem[] { return debugSteps.value }

function setDebugSteps(steps: StepItem[]): void { debugSteps.value = steps }

function formatResult(result: any): string {
  if (!result) return ''
  try { return typeof result === 'string' ? result : JSON.stringify(result, null, 2) }
  catch { return String(result) }
}

// ==================== 方法：参数验证（工具函数） ====================

function validateUserData(): void {
  const raw = advOptions.user_data_raw.trim()
  if (!raw) {
    userDataParseError.value = ''
    return
  }

  try {
    JSON.parse(raw)
    userDataParseError.value = ''
  } catch (e: any) {
    userDataParseError.value = `JSON 格式错误: ${e.message}`
  }
}

function addHistoryEntry(item: Omit<HistoryItem, 'id' | 'timestamp'>): void {
  const entry: HistoryItem = {
    ...item,
    id: `h_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    timestamp: Date.now()
  }

  historyItems.value.unshift(entry)

  if (historyItems.value.length > HISTORY_MAX) {
    historyItems.value = historyItems.value.slice(0, HISTORY_MAX)
  }

  persistHistory()
}

function persistHistory(): void {
  try {
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(historyItems.value))
  } catch (error) {
    console.warn('Failed to persist history:', error)
  }
}

function loadHistoryFromStorage(): void {
  try {
    const raw = localStorage.getItem(HISTORY_STORAGE_KEY)
    if (raw) {
      historyItems.value = JSON.parse(raw)
    }
  } catch (error) {
    console.warn('Failed to load history from storage:', error)
  }
}

function loadFromHistory(item: HistoryItem): void {
  if (debugSteps.value.length > 0 && debugSteps.value[0]) {
    debugSteps.value[0].action_id = item.actionId
    debugSteps.value[0].params = { ...item.params }
    debugSteps.value[0]._result = undefined
    debugSteps.value[0]._errors = {}
  } else {
    debugSteps.value = [{ _uid: Date.now(), action_id: item.actionId, params: { ...item.params } }]
  }
  showHistoryDrawer.value = false

  ElMessage.success(`已从历史加载: ${item.actionName}`)
  emit('log', `从历史加载操作: ${item.actionName}`, 'info')
}

/** 从外部 CustomAction 数据加载（编辑模式） */
function loadFromCustomAction(actionId: string, params: Record<string, any>): void {
  if (debugSteps.value.length > 0 && debugSteps.value[0]) {
    debugSteps.value[0].action_id = actionId
    debugSteps.value[0].params = { ...params }
    debugSteps.value[0]._result = undefined
    debugSteps.value[0]._errors = {}
  } else {
    debugSteps.value = [{ _uid: Date.now(), action_id: actionId, params: { ...params } }]
  }
  advancedExpanded.value = false
  userDataParseError.value = ''
}

/** 获取当前表单数据（供外部读取提交） */
function getActionFormData(): { actionId: string; params: Record<string, any> } {
  const first = debugSteps.value.find(s => s.action_id)
  return {
    actionId: first?.action_id || '',
    params: first ? { ...first.params } : {}
  }
}

function confirmClearHistory(): void {
  ElMessageBox.confirm(
    '确定要清空所有执行历史记录吗？此操作不可恢复。',
    '清空确认',
    {
      confirmButtonText: '确定清空',
      cancelButtonText: '取消',
      type: 'warning'
    }
  ).then(() => {
    clearHistory()
  }).catch(() => {})
}

function clearHistory(): void {
  historyItems.value = []
  persistHistory()
  ElMessage.success('执行历史已清空')
  emit('log', '已清空所有执行历史', 'info')
}

// ==================== 方法：预设管理 ====================

function openSavePresetDialog(): void {
  presetForm.name = ''
  presetForm.description = ''
  showSavePreset.value = true

  nextTick(() => {
    presetFormRef.value?.clearValidate()
  })
}

async function handleSavePreset(): Promise<void> {
  if (!presetFormRef.value) return

  try {
    await presetFormRef.value.validate()
  } catch {
    return
  }

  savingPreset.value = true

  try {
    const preset: SavedPreset = {
      id: `p_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      name: presetForm.name.trim(),
      description: presetForm.description.trim() || undefined,
      actionId: validSteps.value[0]?.action_id || '',
      actionName: validSteps.value[0]?.action_id || '',
      params: validSteps.value[0] ? { ...validSteps.value[0].params } : {},
      createdAt: Date.now()
    }

    savedPresets.value.unshift(preset)
    persistPresets()

    showSavePreset.value = false
    ElMessage.success(`预设 "${preset.name}" 已保存`)
    emit('log', `已保存预设: ${preset.name}`, 'success')
  } catch (error: any) {
    ElMessage.error(`保存预设失败: ${error.message}`)
    emit('log', `保存预设失败: ${error.message}`, 'error')
  } finally {
    savingPreset.value = false
  }
}

function persistPresets(): void {
  try {
    localStorage.setItem(PRESET_STORAGE_KEY, JSON.stringify(savedPresets.value))
  } catch (error) {
    console.warn('Failed to persist presets:', error)
  }
}

function loadPresetsFromStorage(): void {
  try {
    const raw = localStorage.getItem(PRESET_STORAGE_KEY)
    if (raw) {
      savedPresets.value = JSON.parse(raw)
    }
  } catch (error) {
    console.warn('Failed to load presets from storage:', error)
  }
}

function loadPreset(preset: SavedPreset): void {
  if (debugSteps.value.length > 0 && debugSteps.value[0]) {
    debugSteps.value[0].action_id = preset.actionId
    debugSteps.value[0].params = { ...preset.params }
    debugSteps.value[0]._result = undefined
    debugSteps.value[0]._errors = {}
  } else {
    debugSteps.value = [{ _uid: Date.now(), action_id: preset.actionId, params: { ...preset.params } }]
  }
  showPresetsDrawer.value = false

  ElMessage.success(`已加载预设: ${preset.name}`)
  emit('log', `加载预设: ${preset.name}`, 'info')
}

function confirmDeletePreset(preset: SavedPreset): void {
  ElMessageBox.confirm(
    `确定要删除预设 "${preset.name}" 吗？`,
    '删除确认',
    {
      confirmButtonText: '确定删除',
      cancelButtonText: '取消',
      type: 'warning'
    }
  ).then(() => {
    deletePreset(preset)
  }).catch(() => {})
}

function deletePreset(preset: SavedPreset): void {
  savedPresets.value = savedPresets.value.filter(p => p.id !== preset.id)
  persistPresets()
  ElMessage.success(`已删除预设: ${preset.name}`)
  emit('log', `删除预设: ${preset.name}`, 'info')
}

// ==================== 方法：保存为自定义操作（服务器端） ====================

function openSaveCustomDialog(): void {
  const first = debugSteps.value.find(s => s.action_id)
  customActionForm.name = workflowName.value || (first ? actionList.value.find(a => a.action_id === first.action_id)?.name || first.action_id : '')
  customActionForm.description = workflowDescription.value
  customActionForm.tags = []
  customActionForm.is_public = false
  showSaveCustom.value = true
  nextTick(() => {
    customActionFormRef.value?.clearValidate()
  })
}

async function handleSaveCustomAction(): Promise<void> {
  if (!customActionFormRef.value) return
  try {
    await customActionFormRef.value.validate()
  } catch {
    return
  }

  savingCustom.value = true
  try {
    const steps = debugSteps.value
      .filter(s => s.action_id)
      .map(s => ({
        action_id: s.action_id,
        params: { ...s.params }
      }))

    const response = await customActionsApi.createCustomAction({
      name: customActionForm.name.trim() || workflowName.value.trim(),
      description: customActionForm.description.trim() || workflowDescription.value || undefined,
      parameters_schema: paramDefs.value.length > 0 ? paramDefs.value.filter(p => p.name) : undefined,
      steps: steps.length > 0 ? steps : undefined,
      tags: customActionForm.tags.length > 0 ? customActionForm.tags : undefined,
      is_public: customActionForm.is_public
    })

    if (response.code === 0) {
      ElMessage.success(`自定义操作 "${customActionForm.name}" 已保存到服务器`)
      emit('log', `已保存自定义操作到服务器: ${customActionForm.name} (${steps.length} 步骤)`, 'success')
      showSaveCustom.value = false
      emit('refreshActions')
    } else {
      ElMessage.error(`保存失败: ${response.msg}`)
      emit('log', `保存自定义操作失败: ${response.msg}`, 'error')
    }
  } catch (error: any) {
    ElMessage.error(`保存异常: ${error.message}`)
    emit('log', `保存自定义操作异常: ${error.message}`, 'error')
  } finally {
    savingCustom.value = false
  }
}

// ==================== 方法：刷新操作列表 ====================

async function handleRefreshActions(): Promise<void> {
  emit('refreshActions')
  await fetchActions()
}

async function fetchActions(): Promise<void> {
  fetchingActions.value = true

  try {
    const response = await actionsApi.getRegisteredActions({ browser_id: props.browserId })

    if (response.code === 0 && response.data) {
      const rawData = Array.isArray(response.data) ? response.data : (response.data.actions || [])

      actionList.value = rawData.map((action: any) => ActionsApi.normalizeActionMetadata(action))

      emit('log', `已加载 ${actionList.value.length} 个注册操作`, 'info')

      if (rawData.length > 0) {
        const first = rawData[0]
        const firstKeys = Object.keys(first).join(', ')
        const hasSchema = !!first.json_schema
        const hasParams = Array.isArray(first.parameters)
        const paramCount = hasParams ? first.parameters.length : (hasSchema ? Object.keys(first.json_schema.properties || {}).length : '?')
        emit('log', `[DEBUG] 首个操作 keys: ${firstKeys} | json_schema: ${hasSchema} | params: ${hasParams}(${paramCount})`, 'info')
        if (hasSchema) {
          emit('log', `[DEBUG] json_schema.props: ${Object.keys(first.json_schema.properties || {}).join(', ')}`, 'info')
        }
      }
    } else {
      emit('log', `获取操作列表失败: ${response.msg}`, 'warning')
      ElMessage.warning(`获取操作列表失败: ${response.msg}`)
    }
  } catch (error: any) {
    emit('log', `获取操作列表异常: ${error.message}`, 'error')
    ElMessage.error(`获取操作列表异常: ${error.message}`)
  } finally {
    fetchingActions.value = false
  }
}

function handlePickSelector(paramName: string): void {
  const first = debugSteps.value.find(s => s.action_id)
  emit('pick-selector', { actionType: first?.action_id || '', paramName })
}

// ==================== 工具方法 ====================

function formatTime(timestamp: number): string {
  const date = new Date(timestamp)
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const seconds = String(date.getSeconds()).padStart(2, '0')

  return `${month}/${day} ${hours}:${minutes}:${seconds}`
}

function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')

  return `${year}-${month}-${day} ${hours}:${minutes}`
}

function getActiveAdvancedCount(): number {
  let count = 0
  if (advOptions.user_data_raw.trim()) count++
  if (advOptions.dry_run) count++
  if (advOptions.enabled_plugins.length > 0) count++
  if (advOptions.page_index !== 0) count++
  return count
}

// ==================== 公开方法 ====================

function loadData(): void {
  loadHistoryFromStorage()
  loadPresetsFromStorage()
  fetchActions()
}

// ==================== 监听器 ====================

watch(() => props.registeredActions, (newActions) => {
  actionList.value = [...newActions]
}, { deep: true })

// ==================== 生命周期 ====================

onMounted(() => {
  loadData()
})
</script>