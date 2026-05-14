<template>
  <div class="debug-panel flex flex-col gap-3 h-full overflow-hidden">
    <!-- ===== 面板头部：标题 + 操作栏 ===== -->
    <div class="flex items-center justify-between pb-2 border-b border-[var(--el-border-color-lighter)] shrink-0">
      <span class="text-sm font-medium flex items-center gap-1.5 text-[var(--el-text-color-primary)]">
        <el-icon class="text-primary"><Tools /></el-icon>
        调试工作台
      </span>
      <div class="flex items-center gap-2">
        <!-- 全局刷新按钮 -->
        <el-tooltip content="刷新所有面板数据" placement="bottom">
          <el-button size="small" text :loading="globalLoading" @click="handleRefreshAll">
            <el-icon><Refresh /></el-icon>
          </el-button>
        </el-tooltip>
        <!-- 日志计数徽标 -->
        <el-badge v-if="logCount > 0" :value="logCount" :max="99" type="info" class="!align-middle">
          <el-icon :size="14" class="text-[var(--el-text-color-secondary)]"><Bell /></el-icon>
        </el-badge>
      </div>
    </div>

    <!-- ===== Tab 导航栏（带图标 + 现代化样式） ===== -->
    <div role="tablist" class="flex gap-0.5 bg-[var(--el-fill-color-light)] rounded-lg p-1 shrink-0 relative">
      <button
        v-for="sub in subTabs"
        :key="sub.key"
        role="tab"
        :aria-selected="activeSub === sub.key"
        :class="[
          'relative flex-1 flex items-center justify-center gap-1.5 text-xs px-3 py-2 rounded-md cursor-pointer',
          'transition-all duration-200 ease-out select-none outline-none',
          activeSub === sub.key
            ? 'bg-white text-primary font-semibold shadow-sm'
            : 'text-[var(--el-text-color-secondary)] hover:text-[var(--el-text-color-primary)] hover:bg-white/60'
        ]"
        @click="handleTabSwitch(sub.key)"
      >
        <!-- 激活指示条 -->
        <span
          v-if="activeSub === sub.key"
          class="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-primary rounded-full transition-all duration-200"
        />
        <!-- 图标 -->
        <el-icon :size="14">
          <component :is="sub.icon" />
        </el-icon>
        <!-- 标签文字 -->
        <span>{{ sub.label }}</span>
        <!-- 子面板加载中指示器 -->
        <el-icon
          v-if="panelLoadingMap[sub.key]"
          :size="12"
          class="animate-spin text-[var(--el-color-primary-light-3)]"
        >
          <Loading />
        </el-icon>
      </button>
    </div>

    <!-- ===== 面板内容区（带过渡动画） ===== -->
    <div class="flex-1 min-h-0 relative overflow-hidden">
      <Transition name="panel-fade" mode="out-in">
        <!-- 操作调试面板 -->
        <DebugActionPanel
          v-show="activeSub === 'action'"
          v-if="activeSub === 'action'"
          key="action-panel"
          ref="actionRef"
          :browser-id="browserId"
          :browser-running="browserRunning"
          :registered-actions="registeredActions"
          :loading-actions="loadingActions"
          :shared-workflow-data="sharedWorkflowData"
          @log="handleLogEvent"
          @update:loading="(v: boolean) => setPanelLoading('action', v)"
          @workflow-debug-change="(steps: any[]) => emit('workflow-debug-change', steps)"
        />

        <!-- 插件调试面板 -->
        <DebugPluginPanel
          v-show="activeSub === 'plugin'"
          v-if="activeSub === 'plugin'"
          key="plugin-panel"
          ref="pluginRef"
          :browser-id="browserId"
          :browser-running="browserRunning"
          @log="handleLogEvent"
          @update:loading="(v: boolean) => setPanelLoading('plugin', v)"
        />
      </Transition>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, watch, onMounted } from 'vue'
import {
  Tools,
  Refresh,
  VideoPlay,
  Connection,
  Box,
  Setting,
  Bell,
  Loading
} from '@element-plus/icons-vue'
import DebugActionPanel from './DebugActionPanel.vue'
import DebugPluginPanel from './DebugPluginPanel.vue'

// ==================== 类型定义 ====================

type SubTabKey = 'action' | 'workflow' | 'plugin'

interface SubTabItem {
  key: SubTabKey
  label: string
  icon: ReturnType<typeof Tools>
}

type LogType = 'info' | 'success' | 'warning' | 'error'

// ==================== Props ====================

const props = withDefaults(
  defineProps<{
    browserId: string
    browserRunning: boolean
    registeredActions: Array<any>
    loadingActions?: boolean
    sharedWorkflowData?: {
      steps: Array<any>
      source: 'edit' | 'debug' | null
      actionInfo: { name: string; description: string; parameters_schema: any[]; actionId?: number } | null
    } | null
  }>(),
  {
    loadingActions: false
  }
)

// ==================== Emits ====================

const emit = defineEmits<{
  log: [message: string, type: LogType]
  'workflow-debug-change': [steps: Array<any>]
}>()

// ==================== Tab 配置 ====================

const subTabs: SubTabItem[] = [
  { key: 'action', label: '操作', icon: VideoPlay },
  { key: 'plugin', label: '插件', icon: Box }
]

// ==================== 响应式状态 ====================

/** 当前激活的子面板 */
const activeSub = ref<SubTabKey>('action')

/** 全局加载状态 */
const globalLoading = ref(false)

/** 各子面板的独立加载状态 */
const panelLoadingMap = reactive<Record<SubTabKey, boolean>>({
  action: false,
  workflow: false,
  plugin: false
})

/** 日志事件计数 */
const logCount = ref(0)

// ==================== 子面板 Refs ====================

const actionRef = ref<InstanceType<typeof DebugActionPanel> | null>(null)
const pluginRef = ref<InstanceType<typeof DebugPluginPanel> | null>(null)

// ==================== 方法 ====================

/** 设置指定面板的加载状态 */
function setPanelLoading(key: SubTabKey, loading: boolean): void {
  panelLoadingMap[key] = loading
}

/** 处理日志事件转发，同时维护计数器 */
function handleLogEvent(message: string, type: LogType): void {
  emit('log', message, type)
  logCount.value++
  // 超过阈值后自动重置计数，避免数字过大
  if (logCount.value > 999) {
    logCount.value = 1
  }
}

/** Tab 切换处理 */
function handleTabSwitch(key: SubTabKey): void {
  if (activeSub.value !== key) {
    activeSub.value = key
  }
}

/** 全局刷新：依次调用所有子面板的 loadData */
async function handleRefreshAll(): Promise<void> {
  globalLoading.value = true
  try {
    await fetchAllData()
  } finally {
    globalLoading.value = false
  }
}

/** 加载所有子面板数据（expose 给父组件） */
async function fetchAllData(): Promise<void> {
  const loaders: Array<Promise<void>> = []

  try {
    actionRef.value?.loadData?.()
  } catch (e) {
    console.warn('[DebugPanel] ActionPanel loadData error:', e)
  }

  try {
    pluginRef.value?.loadData?.()
  } catch (e) {
    console.warn('[DebugPanel] PluginPanel loadData error:', e)
  }

  await Promise.allSettled(loaders)
}

// ==================== 监听浏览器运行状态变化自动刷新 ====================

watch(
  () => props.browserRunning,
  (running, prevRunning) => {
    // 浏览器从非运行变为运行时，自动加载数据
    if (running && !prevRunning && props.browserId) {
      fetchAllData()
    }
  }
)

// ==================== 暴露接口 ====================

defineExpose({ fetchAllData })
</script>

<!-- ========== 样式 ========== -->

<style scoped>
/* 面板切换过渡动画 */
.panel-fade-enter-active,
.panel-fade-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}
.panel-fade-enter-from {
  opacity: 0;
  transform: translateY(4px);
}
.panel-fade-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

/* Tab 按钮 focus 样式（无障碍） */
button[role='tab']:focus-visible {
  box-shadow: 0 0 0 2px var(--el-color-primary-light-5);
}
</style>
