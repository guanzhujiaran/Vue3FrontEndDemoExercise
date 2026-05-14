<!--
 * @FilePath: \Vue3FrontEndDemoExercise\src\components\browser\BrowserDebugPanel.vue
 * @Description: RPA浏览器控制台 - 主调试面板，竖向可收起 Tab 布局
-->
<template>
  <div class="flex flex-col h-full w-full">
    <div class="flex flex-1 min-h-0">
      <!-- 左侧导航栏 -->
      <div class="flex flex-col bg-[var(--el-bg-color)] border-r border-[var(--el-border-color-lighter)] transition-all duration-250 ease w-[100px]" :class="{ 'w-[52px]': isCollapsed }">
        <nav class="flex flex-col gap-0.5 p-2 flex-1">
          <button
            v-for="tab in tabs"
            :key="tab.name"
            class="flex flex-col items-center gap-1 py-2.5 px-1 border-none bg-transparent rounded-lg cursor-pointer text-[var(--el-text-color-regular)] transition-all duration-200 whitespace-nowrap"
            :class="{ 'active bg-[var(--el-color-primary-light-9)] text-[var(--el-color-primary)]': activeTab === tab.name, 'hover:bg-[var(--el-fill-color-light)] hover:text-[var(--el-color-primary)]': activeTab !== tab.name }"
            :title="isCollapsed ? tab.label : ''"
            @click="activeTab = tab.name"
          >
            <el-icon :size="20"><component :is="tab.icon" /></el-icon>
            <span v-if="!isCollapsed" class="text-[12px] leading-tight"> {{ tab.label }}</span>
          </button>
        </nav>

        <!-- 收起/展开按钮 -->
        <button
          class="flex items-center justify-center p-2 border-none border-t border-[var(--el-border-color-lighter)] bg-transparent cursor-pointer text-[var(--el-text-color-secondary)] transition-colors duration-200 hover:text-[var(--el-color-primary)]"
          :title="isCollapsed ? '展开侧边栏' : '收起侧边栏'"
          @click="isCollapsed = !isCollapsed"
        >
          <el-icon :size="16">
            <Fold v-if="!isCollapsed" />
            <Expand v-else />
          </el-icon>
        </button>
      </div>

      <!-- 右侧内容区 -->
      <div class="flex-1 min-w-0 min-h-0 flex flex-col">
        <div class="flex-1 min-h-0 overflow-y-auto p-3">
          <!-- 实时视频控制（MJPEG）-->
          <MJPEGStreamPanel
            ref="mjpegPanelRef"
            :browser-id="browserId"
          />

          <!-- 可视化操作连接 -->
          <VisualControlPanel
            v-if="activeTab === 'visual-control'"
            :browser-id="browserId"
            @switch-tab="activeTab = $event"
            @stop-session="handleStopSession"
          />

          <!-- 自定义操作管理 -->
          <CustomActionPanel
            v-if="activeTab === 'custom-actions'"
            :browser-id="browserId"
            :registered-actions="registeredActions"
            :shared-workflow-data="sharedWorkflowData"
            @workflow-edit-open="onWorkflowEditOpen"
            @workflow-edit-change="onWorkflowEditChange"
            @workflow-edit-close="onWorkflowEditClose"
          />

          <!-- Debug调试面板 -->
          <DebugPanel
            v-if="activeTab === 'debug'"
            :browser-id="browserId"
            :registered-actions="registeredActions"
            :shared-workflow-data="sharedWorkflowData"
            @workflow-debug-change="onWorkflowDebugChange"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, markRaw, reactive, watch } from 'vue'
import { Connection, Tools, Cpu, VideoCamera, Fold, Expand } from '@element-plus/icons-vue'
import MJPEGStreamPanel from './MJPEGStreamPanel.vue'
import actionsApi, { ActionsApi } from '@/api/browser/actions_api'
import type { StepItem } from './right-panel/components/CustomActionStepEditor.vue'

export interface SharedWorkflowData {
  steps: StepItem[]
  source: 'edit' | 'debug' | null
  actionInfo: {
    name: string
    description: string
    parameters_schema: any[]
    actionId?: number
  } | null
}

// Props
const props = defineProps({
  browserId: {
    type: String,
    required: true
  }
})

// Tab 定义
const tabs = [
  { name: 'mjpeg', label: '实时控制', icon: markRaw(VideoCamera) },
  { name: 'visual-control', label: '可视化操作', icon: markRaw(Connection) },
  { name: 'custom-actions', label: '自定义操作', icon: markRaw(Tools) },
  { name: 'debug', label: 'Debug 调试', icon: markRaw(Cpu) }
]

// 状态管理
const activeTab = ref('mjpeg')
const isCollapsed = ref(false)

// 注册操作列表（全局共享，只请求一次）
const registeredActions = ref<any[]>([])

// ═══ 共享工作流数据（左右面板同步） ═══
const sharedWorkflowData = reactive<SharedWorkflowData>({
  steps: [],
  source: null,
  actionInfo: null
})

let syncingFromEdit = false
let syncingFromDebug = false

function onWorkflowEditOpen(payload: { steps: StepItem[]; actionInfo: SharedWorkflowData['actionInfo'] }) {
  syncingFromEdit = true
  sharedWorkflowData.steps = payload.steps.map(s => ({ ...s }))
  sharedWorkflowData.actionInfo = payload.actionInfo
  sharedWorkflowData.source = 'edit'
  syncingFromEdit = false
}

function onWorkflowEditChange(steps: StepItem[]) {
  if (syncingFromEdit || syncingFromDebug) return
  syncingFromEdit = true
  sharedWorkflowData.steps = steps.map(s => ({ ...s }))
  sharedWorkflowData.source = 'edit'
  syncingFromEdit = false
}

function onWorkflowEditClose() {
  sharedWorkflowData.source = null
}

function onWorkflowDebugChange(steps: StepItem[]) {
  if (syncingFromEdit || syncingFromDebug) return
  syncingFromDebug = true
  sharedWorkflowData.steps = steps.map(s => ({ ...s }))
  sharedWorkflowData.source = 'debug'
  syncingFromDebug = false
}

// MJPEG面板引用
const mjpegPanelRef = ref<InstanceType<typeof MJPEGStreamPanel> | null>(null)

// 处理停止会话 - 先停止视频流，再触发事件
const handleStopSession = () => {
  if (mjpegPanelRef.value) {
    mjpegPanelRef.value.stopVideoStream()
  }
}

// 加载注册操作列表（全局只请求一次）
const loadRegisteredActions = async () => {
  try {
    const response = await actionsApi.getRegisteredActions({ browser_id: props.browserId })
    if (response.code === 0 && response.data) {
      const rawData = Array.isArray(response.data) ? response.data : (response.data.actions || [])
      registeredActions.value = rawData.map((a: any) => ActionsApi.normalizeActionMetadata(a))
    }
  } catch (e) {
    console.warn('[BrowserDebugPanel] 获取注册操作失败:', e)
  }
}

onMounted(() => {
  loadRegisteredActions()
})
</script>


