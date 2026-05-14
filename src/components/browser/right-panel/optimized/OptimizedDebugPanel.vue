<template>
  <div class="optimized-debug-panel flex flex-col h-full bg-[#f5f5f5] overflow-hidden">
    <!-- 1. 顶部控制区 (Top Control Bar) -->
    <header class="top-control-bar bg-white border-b border-[var(--el-border-color-lighter)] px-3 py-2 shrink-0 shadow-sm">
      <div class="flex items-center justify-between">
        <!-- 左侧：模式切换器 -->
        <div class="mode-switcher flex items-center gap-1 bg-base-200/50 rounded-lg p-0.5">
          <button
            v-for="mode in debugModes"
            :key="mode.key"
            :class="[
              'mode-btn flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all duration-200',
              currentMode === mode.key
                ? 'bg-white text-primary shadow-sm'
                : 'text-[var(--el-text-color-secondary)] hover:bg-base-300 hover:text-[var(--el-text-color-primary)]'
            ]"
            @click="switchMode(mode.key)"
          >
            <el-icon :size="14"><component :is="mode.icon" /></el-icon>
            <span class="hidden sm:inline">{{ mode.label }}</span>
          </button>
        </div>

        <!-- 右侧：快速操作按钮组 -->
        <div class="quick-actions flex items-center gap-1.5">
          <template v-if="currentMode === 'action'">
            <el-tooltip content="执行操作" placement="bottom">
              <el-button size="small" type="primary" :icon="VideoPlay" circle @click="executeAction" :disabled="!canExecuteAction" />
            </el-tooltip>
            <el-tooltip content="跳过当前步骤" placement="bottom">
              <el-button size="small" :icon="DArrowRight" circle :disabled="!browserRunning" />
            </el-tooltip>
            <el-tooltip content="重置参数" placement="bottom">
              <el-button size="small" :icon="RefreshRight" circle @click="resetCurrentMode" />
            </el-tooltip>
            <el-divider direction="vertical" />
            <el-tooltip content="获取截图" placement="bottom">
              <el-button size="small" :icon="Camera" circle @click="takeScreenshot" :disabled="!browserRunning" />
            </el-tooltip>
          </template>

          <template v-if="currentMode === 'workflow'">
            <el-tooltip :content="workflowStatus === 'idle' ? '开始调试' : workflowStatus === 'running' ? '暂停' : '继续'" placement="bottom">
              <el-button
                size="small"
                :type="workflowStatus === 'running' ? 'warning' : 'primary'"
                :icon="workflowStatus === 'running' ? VideoPause : VideoPlay"
                circle
                @click="toggleWorkflowExecution"
                :disabled="!canExecuteWorkflow"
              />
            </el-tooltip>
            <el-tooltip content="单步执行" placement="bottom">
              <el-button size="small" :icon="DArrowRight" circle :disabled="workflowStatus !== 'paused'" @click="stepOverWorkflow" />
            </el-tooltip>
            <el-tooltip content="停止调试" placement="bottom">
              <el-button size="small" danger :icon="SwitchButton" circle :disabled="workflowStatus === 'idle'" @click="stopWorkflow" />
            </el-tooltip>
          </template>

          <template v-if="currentMode === 'plugin'">
            <el-tooltip content="刷新插件列表" placement="bottom">
              <el-button size="small" :icon="Refresh" circle @click="refreshPlugins" :loading="pluginsLoading" />
            </el-tooltip>
            <el-tooltip content="新建插件" placement="bottom">
              <el-button size="small" type="success" :icon="Plus" circle />
            </el-tooltip>
          </template>
        </div>
      </div>
    </header>

    <!-- 2. 上下文工作区 (Contextual Working Area) -->
    <main class="contextual-work-area flex-1 min-h-0 overflow-hidden">
      <!-- 操作调试模式 -->
      <ActionDebugWorkspace
        v-if="currentMode === 'action'"
        ref="actionWorkspaceRef"
        :browser-id="browserId"
        :browser-running="browserRunning"
        :registered-actions="registeredActions"
        :loading-actions="loadingActions"
        :compact-mode="viewMode === 'compact'"
        @log="(msg, t) => emit('log', msg, t)"
        @screenshot-updated="(url) => lastScreenshot = url"
        @variables-updated="(vars) => watchVariables = vars"
      />

      <!-- 工作流调试模式 -->
      <WorkflowDebugWorkspace
        v-if="currentMode === 'workflow'"
        ref="workflowWorkspaceRef"
        :browser-id="browserId"
        :browser-running="browserRunning"
        :registered-actions="registeredActions"
        :loading-actions="loadingActions"
        :compact-mode="viewMode === 'compact'"
        @log="(msg, t) => emit('log', msg, t)"
        @screenshot-updated="(url) => lastScreenshot = url"
        @variables-updated="(vars) => watchVariables = vars"
        @status-changed="(status) => workflowStatus = status"
      />

      <!-- 插件管理模式 -->
      <PluginManagementWorkspace
        v-if="currentMode === 'plugin'"
        ref="pluginWorkspaceRef"
        :browser-id="browserId"
        :browser-running="browserRunning"
        :compact-mode="viewMode === 'compact'"
        @log="(msg, t) => emit('log', msg, t)"
      />
    </main>

    <!-- 3. 底部信息区 (Bottom Info Panel) - 可折叠设计 -->
    <footer
      class="bottom-info-panel bg-white border-t border-[var(--el-border-color-lighter)] transition-all duration-300"
      :class="{ 'max-h-[40%]': bottomPanelExpanded, 'max-h-12': !bottomPanelExpanded }"
    >
      <!-- 标签栏 -->
      <div class="panel-tabs flex items-center justify-between px-3 py-2 border-b border-[var(--el-border-color-lighter)] cursor-pointer hover:bg-base-50/50" @click="toggleBottomPanel">
        <div class="flex items-center gap-2">
          <button
            v-for="tab in bottomTabs"
            :key="tab.key"
            :class="[
              'tab-btn px-2 py-1 text-xs rounded transition-all',
              activeBottomTab === tab.key
                ? 'bg-primary/10 text-primary font-medium'
                : 'text-[var(--el-text-color-secondary)] hover:text-[var(--el-text-color-primary)]'
            ]"
            @click.stop="activeBottomTab = tab.key"
          >
            {{ tab.label }}
            <el-badge
              v-if="tab.badge > 0"
              :value="tab.badge"
              :max="99"
              class="ml-1"
            />
          </button>
        </div>

        <div class="flex items-center gap-2">
          <span class="text-[10px] text-[var(--el-text-color-placeholder)]">
            {{ bottomPanelExpanded ? '点击收起' : '点击展开' }}
          </span>
          <el-icon :class="{ 'rotate-180': bottomPanelExpanded }" class="transition-transform"><ArrowDown /></el-icon>
        </div>
      </div>

      <!-- 面板内容（可折叠） -->
      <transition name="slide-up">
        <div v-show="bottomPanelExpanded" class="panel-content overflow-hidden" style="height: calc(100% - 41px)">
          <!-- 日志面板 -->
          <LogPanel
            v-if="activeBottomTab === 'logs'"
            ref="logPanelRef"
            :logs="allLogs"
            :compact="true"
          />

          <!-- 变量监控面板 -->
          <VariableWatchPanel
            v-if="activeBottomTab === 'variables'"
            :variables="watchVariables"
            :last-update="variableUpdateTime"
          />

          <!-- 网络请求面板 -->
          <NetworkPanel
            v-if="activeBottomTab === 'network'"
            :requests="networkRequests"
          />
        </div>
      </transition>
    </footer>

    <!-- 视图模式切换按钮（悬浮在右下角） -->
    <div class="view-mode-switcher absolute bottom-16 right-2 flex flex-col gap-1 z-10">
      <el-tooltip :content="viewMode === 'compact' ? '标准视图' : '紧凑视图'" placement="left">
        <el-button
          size="small"
          :icon="viewMode === 'compact' ? 'FullScreen' : 'ScaleToOriginal'"
          circle
          class="!shadow-md"
          @click="toggleViewMode"
        />
      </el-tooltip>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, provide, reactive } from 'vue'
import {
  VideoPlay, VideoPause, DArrowRight, RefreshRight,
  SwitchButton, Camera, Refresh, Plus, ArrowDown,
  FullScreen, ScaleToOriginal, Pointer, Connection, Box
} from '@element-plus/icons-vue'
import ActionDebugWorkspace from './workspace/ActionDebugWorkspace.vue'
import WorkflowDebugWorkspace from './workspace/WorkflowDebugWorkspace.vue'
import PluginManagementWorkspace from './workspace/PluginManagementWorkspace.vue'
import LogPanel from './panels/LogPanel.vue'
import VariableWatchPanel from './panels/VariableWatchPanel.vue'
import NetworkPanel from './panels/NetworkPanel.vue'

interface LogEntry {
  level: 'info' | 'success' | 'warn' | 'error' | 'plugin'
  message: string
  timestamp: number
  source?: string
}

interface NetworkRequest {
  method: string
  url: string
  status: number
  duration: number
  timestamp: number
}

const props = defineProps<{
  browserId: string
  browserRunning: boolean
  registeredActions: Array<any>
  loadingActions: boolean
}>()

const emit = defineEmits<{
  log: [message: string, type: 'info' | 'success' | 'warning' | 'error']
}>()

// 调试模式定义
const debugModes = [
  { key: 'action', label: '操作', icon: Pointer },
  { key: 'workflow', label: '工作流', icon: Connection },
  { key: 'plugin', label: '插件', icon: Box }
]

// 状态管理
const currentMode = ref<'action' | 'workflow' | 'plugin'>('action')
const viewMode = ref<'compact' | 'standard' | 'detailed'>('standard')
const bottomPanelExpanded = ref(false)
const activeBottomTab = ref<'logs' | 'variables' | 'network'>('logs')

// 工作流状态
const workflowStatus = ref<'idle' | 'running' | 'paused' | 'completed' | 'error'>('idle')

// 插件状态
const pluginsLoading = ref(false)

// 数据状态
const watchVariables = ref<Record<string, any>>({})
const variableUpdateTime = ref(0)
const lastScreenshot = ref<string>()
const allLogs = ref<LogEntry[]>([])
const networkRequests = ref<NetworkRequest[]>([])

// 子组件引用
const actionWorkspaceRef = ref<InstanceType<typeof ActionDebugWorkspace> | null>(null)
const workflowWorkspaceRef = ref<InstanceType<typeof WorkflowDebugWorkspace> | null>(null)
const pluginWorkspaceRef = ref<InstanceType<typeof PluginManagementWorkspace> | null>(null)
const logPanelRef = ref<InstanceType<typeof LogPanel> | null>(null)

// 计算属性
const canExecuteAction = computed(() => props.browserRunning && currentMode.value === 'action')
const canExecuteWorkflow = computed(() => props.browserRunning && currentMode.value === 'workflow')

const bottomTabs = computed(() => [
  {
    key: 'logs' as const,
    label: '日志',
    badge: allLogs.value.filter(l => l.level === 'error').length
  },
  {
    key: 'variables' as const,
    label: '变量',
    badge: 0
  },
  {
    key: 'network' as const,
    label: '网络',
    badge: networkRequests.value.filter(r => r.status >= 400).length
  }
])

// 方法
const switchMode = (mode: 'action' | 'workflow' | 'plugin') => {
  if (currentMode.value === mode) return
  currentMode.value = mode
  emit('log', `切换到${debugModes.find(m => m.key === mode)?.label}调试模式`, 'info')

  // 加载对应模式的数据
  setTimeout(() => {
    if (mode === 'action') actionWorkspaceRef.value?.loadData()
    else if (mode === 'workflow') workflowWorkspaceRef.value?.loadData()
    else if (mode === 'plugin') pluginWorkspaceRef.value?.loadData()
  }, 100)
}

const toggleViewMode = () => {
  const modes: Array<'compact' | 'standard' | 'detailed'> = ['compact', 'standard', 'detailed']
  const currentIndex = modes.indexOf(viewMode.value)
  viewMode.value = modes[(currentIndex + 1) % modes.length]
  emit('log', `切换到${viewMode.value === 'compact' ? '紧凑' : viewMode.value === 'standard' ? '标准' : '详细'}视图`, 'info')
}

const toggleBottomPanel = () => {
  bottomPanelExpanded.value = !bottomPanelExpanded.value
}

// 操作相关方法
const executeAction = () => {
  actionWorkspaceRef.value?.execute()
}

const resetCurrentMode = () => {
  if (currentMode.value === 'action') actionWorkspaceRef.value?.reset()
  else if (currentMode.value === 'workflow') workflowWorkspaceRef.value?.reset()
}

const takeScreenshot = async () => {
  emit('log', '正在获取截图...', 'info')
  // 实现截图逻辑
}

// 工作流相关方法
const toggleWorkflowExecution = () => {
  workflowWorkspaceRef.value?.toggleExecution()
}

const stepOverWorkflow = () => {
  workflowWorkspaceRef.value?.stepOver()
}

const stopWorkflow = () => {
  workflowWorkspaceRef.value?.stop()
}

// 插件相关方法
const refreshPlugins = () => {
  pluginWorkspaceRef.value?.loadData()
}

// 全局日志方法（供子组件调用）
const addGlobalLog = (level: LogEntry['level'], message: string, source?: string) => {
  allLogs.value.push({ level, message, timestamp: Date.now(), source })

  // 自动滚动到底部
  if (bottomPanelExpanded.value && activeBottomTab.value === 'logs') {
    setTimeout(() => {
      logPanelRef.value?.scrollToBottom()
    }, 10)
  }

  emit('log', message, level === 'error' ? 'error' : level === 'warn' ? 'warning' : 'info')
}

// 提供给子组件使用的方法
provide('addGlobalLog', addGlobalLog)
provide('updateVariables', (vars: Record<string, any>) => {
  watchVariables.value = vars
  variableUpdateTime.value = Date.now()
})
provide('addNetworkRequest', (req: NetworkRequest) => {
  networkRequests.value.push(req)
})

// 暴露给父组件的方法
defineExpose({
  switchMode,
  addLog: addGlobalLog,
  refreshAll: () => {
    actionWorkspaceRef.value?.loadData()
    workflowWorkspaceRef.value?.loadData()
    pluginWorkspaceRef.value?.loadData()
  }
})
</script>

<style scoped>
.optimized-debug-panel {
  position: relative;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
}

.mode-btn {
  user-select: none;
}

.mode-btn:hover {
  transform: translateY(-1px);
}

.panel-tabs {
  user-select: none;
}

.tab-btn {
  position: relative;
}

.slide-up-enter-active,
.slide-up-leave-active {
  transition: all 0.3s ease;
}

.slide-up-enter-from,
.slide-up-leave-to {
  opacity: 0;
  transform: translateY(10px);
}

.view-mode-switcher {
  opacity: 0.8;
  transition: opacity 0.2s;
}

.view-mode-switcher:hover {
  opacity: 1;
}
</style>
