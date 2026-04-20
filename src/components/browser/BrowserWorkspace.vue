<!--
 * @Author: 星瞳 1944637830@qq.com
 * @Date: 2024-12-24 00:00:00
 * @LastEditors: 星瞳 1944637830@qq.com
 * @LastEditTime: 2024-12-24 00:00:00
 * @FilePath: \Vue3FrontEndDemoExercise\src\components\browser\BrowserWorkspace.vue
 * @Description: RPA浏览器控制台 - 响应式卡片布局，适配移动端
-->
<template>
  <div class="p-2.5">
    <!-- 功能说明 -->
    <el-alert
      v-if="showAlert"
      title="浏览器工作区"
      type="info"
      closable
      show-icon
      @close="showAlert = false"
      class="mb-4"
    >
      <template #default>
        <p>管理所有浏览器实例，支持实时控制和视频流预览。</p>
        <p>移动端友好的响应式设计，点击卡片进行操作。</p>
      </template>
    </el-alert>

    <!-- 筛选和搜索区域 -->
    <el-card class="mb-4 [&_.el-card\_\_body]:p-4">
      <div class="flex flex-wrap gap-3 items-center">
        <el-select v-model="filterStatus" placeholder="筛选状态" clearable class="flex-1 min-w-[150px]">
          <el-option label="全部状态" value="" />
          <el-option label="运行中" value="running" />
          <el-option label="已停止" value="stopped" />
          <el-option label="未启动" value="initializing" />
          <el-option label="异常" value="error" />
        </el-select>
        <el-input v-model="searchKeyword" placeholder="搜索浏览器..." clearable class="flex-1 min-w-[150px]" @clear="handleSearch" @keyup.enter="handleSearch">
          <template #prefix>
            <el-icon>
              <Search />
            </el-icon>
          </template>
        </el-input>
        <el-button type="success" :disabled="selectedInstances.length === 0" @click="batchStartSessions" :loading="batchOperating" class="whitespace-nowrap">
          <el-icon>
            <VideoPlay />
          </el-icon>
          批量启动 ({{ selectedInstances.length }})
        </el-button>
        <el-button @click="$emit('refresh')" class="whitespace-nowrap">
          <el-icon>
            <Refresh />
          </el-icon>
          刷新
        </el-button>
      </div>
    </el-card>

    <!-- 统计信息 -->
    <el-row :gutter="16" class="stats-section mb-4">
      <el-col :xs="6" :sm="6" :md="6" :lg="6">
        <el-card class="stat-card">
          <div class="stat-content">
            <el-icon class="stat-icon fill-primary"><Monitor /></el-icon>
            <div class="stat-info">
              <div class="stat-value">{{ stats.total }}</div>
              <div class="stat-label">总数</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :xs="6" :sm="6" :md="6" :lg="6">
        <el-card class="stat-card">
          <div class="stat-content">
            <el-icon class="stat-icon fill-success"><CircleCheck /></el-icon>
            <div class="stat-info">
              <div class="stat-value">{{ stats.running }}</div>
              <div class="stat-label">运行中</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :xs="6" :sm="6" :md="6" :lg="6">
        <el-card class="stat-card">
          <div class="stat-content">
            <el-icon class="stat-icon fill-text-secondary"><CircleClose /></el-icon>
            <div class="stat-info">
              <div class="stat-value">{{ stats.stopped }}</div>
              <div class="stat-label">已停止</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :xs="6" :sm="6" :md="6" :lg="6">
        <el-card class="stat-card">
          <div class="stat-content">
            <el-icon class="stat-icon fill-danger"><Warning /></el-icon>
            <div class="stat-info">
              <div class="stat-value">{{ stats.error }}</div>
              <div class="stat-label">异常</div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 实例卡片列表 -->
    <div v-loading="loading" class="instance-cards">
      <el-row :gutter="16">
        <el-col 
          v-for="instance in filteredInstances" 
          :key="instance.id"
          :xs="24" 
          :sm="12" 
          :md="8" 
          :lg="8" 
          :xl="6"
          class="mb-4"
        >
          <el-card 
            :class="['cursor-pointer transition-all duration-[var(--transition-base)] relative mb-4 flex-1', { 'border-[var(--color-primary)] shadow-[0_0_0_2px_rgba(64,158,255,0.2)]': selectedBrowserId === Number(instance.id) }]"
            @click="handleRowClick(instance)"
          >
            <!-- 卡片选择框（仅在批量选择模式显示） -->
            <div class="absolute top-2 left-2 z-10 bg-white/90 rounded-lg p-1" v-if="batchSelectMode">
              <el-checkbox
                :model-value="selectedInstances.some(item => item.id === instance.id)"
                @change="(checked: boolean) => handleInstanceSelect(instance, checked)"
                @click.stop
              />
            </div>

            <!-- 卡片头部 -->
            <div class="flex items-center justify-between mb-2">
              <div class="flex items-center gap-2">
                <el-icon :size="24" class="fill-primary">
                  <Monitor />
                </el-icon>
                <div>
                  <div class="font-medium text-sm">{{ instance.fingerprint_browser || '未知浏览器' }}</div>
                  <div class="text-xs text-[var(--el-text-color-secondary)]">ID: {{ instance.id }}</div>
                </div>
              </div>
              <div class="flex items-center">
                <el-icon 
                  :size="12" 
                  :color="instance.sessionStatus?.is_running ? 'var(--color-success)' : 'var(--color-text-secondary)'"
                >
                  <CircleCheck />
                </el-icon>
              </div>
            </div>

            <!-- 平台信息 -->
            <div class="mb-2">
              <el-tag type="info" size="small" :effect="themeStore.themeEffectString">{{ instance.fingerprint_platform || '未知平台' }}</el-tag>
            </div>

            <!-- 状态信息 -->
            <div class="mb-2 space-y-1">
              <div class="flex items-center gap-2">
                <span class="text-xs text-[var(--el-text-color-secondary)]">会话:</span>
                <el-tag :type="getSessionStatusType(instance.sessionStatus)" size="small">
                  {{ getSessionStatusText(instance.sessionStatus) }}
                </el-tag>
                <el-tag :effect="themeStore.themeEffectString" type="info" size="small" :effect="themeStore.themeEffectString"></el-tag>
              </div>
              <div class="flex items-center gap-2">
                <span class="text-xs text-[var(--el-text-color-secondary)]">运行:</span>
                <el-tag :effect="themeStore.themeEffectString" :type="instance.sessionStatus?.is_running ? 'success' : 'info'" size="small">
                  {{ instance.sessionStatus?.is_running ? '运行中' : '未运行' }}
                </el-tag>
              </div>
              <div class="flex items-center gap-2">
                <span class="text-xs text-[var(--el-text-color-secondary)]">视频:</span>
                <el-tag  :effect="themeStore.themeEffectString" :type="instance.sessionStatus?.video_stream_active ? 'success' : 'info'" size="small">
                  {{ instance.sessionStatus?.video_stream_active ? '启用' : '未启用' }}
                </el-tag>
              </div>
              <div class="flex items-center gap-2">
                <span class="text-xs text-[var(--el-text-color-secondary)]">连接:</span>
                <span class="text-xs font-medium">{{ instance.sessionStatus?.connected_clients || 0 }}</span>
              </div>
            </div>

            <!-- 操作按钮 -->
            <div class="flex gap-2 flex-wrap">
              <el-button
                v-if="!instance.sessionStatus?.is_running"
                type="primary"
                size="small"
                @click.stop="startSession(Number(instance.id))"
                :loading="instance.operationLoading"
                class="flex-1 min-w-0 text-xs"
              >
                <el-icon><VideoPlay /></el-icon>
                启动
              </el-button>
              <el-button
                v-else
                type="success"
                size="small"
                @click.stop="refreshSessionStatus(Number(instance.id))"
                :loading="instance.statusLoading"
                class="flex-1 min-w-0 text-xs"
              >
                <el-icon><Refresh /></el-icon>
                刷新
              </el-button>
              <el-button
                type="info"
                size="small"
                @click.stop="controlInstance(instance)"
                class="flex-1 min-w-0 text-xs"
              >
                <el-icon><Setting /></el-icon>
                管理
              </el-button>
            </div>
          </el-card>
        </el-col>
      </el-row>

      <!-- 批量选择模式切换 -->
      <div class="text-center mt-4 pt-4 border-t border-[var(--el-border-color-lighter)]">
        <el-button 
          link
          @click="batchSelectMode = !batchSelectMode"
          class="text-[var(--el-text-color-secondary)] hover:text-[var(--el-color-primary)]"
        >
          <el-icon><Select /></el-icon>
          {{ batchSelectMode ? '退出批量选择' : '批量选择模式' }}
        </el-button>
      </div>
    </div>

    <!-- 空状态 -->
    <el-empty 
      v-if="!loading && filteredInstances.length === 0"
      description="暂无浏览器实例"
      :image-size="120"
    >
      <el-button type="primary" @click="$emit('refresh')">刷新列表</el-button>
    </el-empty>

    <!-- 控制面板（悬浮或侧边抽屉） -->
    <!-- 移动端使用抽屉，桌面端使用固定面板 -->
    
    <!-- 移动端抽屉 -->
    <el-drawer
      v-model="showControlPanel"
      direction="rtl"
      size="80%"
      class="control-drawer"
      :with-header="false"
      v-if="isMobile"
    >
      <ControlPanelContent
        :selected-browser-id="selectedBrowserId"
        :current-browser-info="currentBrowserInfo"
        :session-status="sessionStatus"
        :session-creating="sessionCreating"
        :session-status-loading="sessionStatusLoading"
        :stream-url="streamUrl"
        :screenshot-url="screenshotUrl"
        :last-screenshot-time="lastScreenshotTime"
        :video-loading="videoLoading"
        :screenshot-loading="screenshotLoading"
        :is-browser-started="isBrowserStarted"
        :video-paused="videoPaused"
        :tabs-list="tabsList"
        :tabs-loading="tabsLoading"
        :stream-connection-status="streamConnectionStatus"
        @create-session="createBrowserSession"
        @refresh-session="refreshSessionStatus"
        @start-video="startVideoStream"
        @stop-video="stopVideoStream"
        @refresh-screenshot="refreshScreenshot"
        @pause-video="pauseVideoStream"
        @resume-video="resumeVideoStream"
        @refresh-tabs="refreshTabsList"
        @switch-tab="switchTab"
        @video-click="handleVideoClick"
        @close="showControlPanel = false"
      />
    </el-drawer>

    <!-- 桌面端固定面板 -->
    <el-drawer
      v-model="showControlPanel"
      direction="rtl"
      size="400px"
      class="control-drawer"
      :with-header="false"
      :append-to-body="false"
      v-else
    >
      <ControlPanelContent
        :selected-browser-id="selectedBrowserId"
        :current-browser-info="currentBrowserInfo"
        :session-status="sessionStatus"
        :session-creating="sessionCreating"
        :session-status-loading="sessionStatusLoading"
        :stream-url="streamUrl"
        :screenshot-url="screenshotUrl"
        :last-screenshot-time="lastScreenshotTime"
        :video-loading="videoLoading"
        :screenshot-loading="screenshotLoading"
        :is-browser-started="isBrowserStarted"
        :video-paused="videoPaused"
        :tabs-list="tabsList"
        :tabs-loading="tabsLoading"
        :stream-connection-status="streamConnectionStatus"
        @create-session="createBrowserSession"
        @refresh-session="refreshSessionStatus"
        @start-video="startVideoStream"
        @stop-video="stopVideoStream"
        @refresh-screenshot="refreshScreenshot"
        @pause-video="pauseVideoStream"
        @resume-video="resumeVideoStream"
        @refresh-tabs="refreshTabsList"
        @switch-tab="switchTab"
        @video-click="handleVideoClick"
        @close="showControlPanel = false"
      />
    </el-drawer>

    <!-- 实例详情对话框 -->
    <el-dialog title="实例详情" v-model="showDetailDialog" width="90%" :top="'5vh'">
      <div v-if="selectedInstance">
        <el-descriptions :column="isMobile ? 1 : 2" border>
          <el-descriptions-item label="实例ID">{{ selectedInstance.id }}</el-descriptions-item>
          <el-descriptions-item label="用户ID">{{ selectedInstance.mid }}</el-descriptions-item>
          <el-descriptions-item label="浏览器">{{ selectedInstance.fingerprint_browser }}</el-descriptions-item>
          <el-descriptions-item label="平台">{{ selectedInstance.fingerprint_platform }}</el-descriptions-item>
          <el-descriptions-item label="版本">{{ selectedInstance.fingerprint_brand_version }}</el-descriptions-item>
          <el-descriptions-item label="语言">{{ selectedInstance.lang }}</el-descriptions-item>
          <el-descriptions-item label="时区" :span="isMobile ? 1 : 2">{{ selectedInstance.timezone }}</el-descriptions-item>
          <el-descriptions-item label="创建时间">{{ formatTime(selectedInstance.created_at) }}</el-descriptions-item>
          <el-descriptions-item label="更新时间">{{ formatTime(selectedInstance.updated_at) }}</el-descriptions-item>
        </el-descriptions>

        <!-- 会话状态 -->
        <el-card header="会话状态" class="mt-4" v-if="selectedInstance.sessionStatus">
          <el-descriptions :column="isMobile ? 1 : 2" border>
            <el-descriptions-item label="会话ID">
              <span class="text-xs">{{ selectedInstance.sessionStatus.session_id }}</span>
            </el-descriptions-item>
            <el-descriptions-item label="生命周期状态">
              <el-tag :effect="themeStore.themeEffectString" :type="getSessionStatusType(selectedInstance.sessionStatus)">
                {{ selectedInstance.sessionStatus.lifecycle_status }}
              </el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="运行状态">
              <el-tag :effect="themeStore.themeEffectString" :type="selectedInstance.sessionStatus.is_running ? 'success' : 'warning'">
                {{ selectedInstance.sessionStatus.is_running ? '运行中' : '未运行' }}
              </el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="连接数">
              {{ selectedInstance.sessionStatus.connected_clients }}
            </el-descriptions-item>
            <el-descriptions-item label="视频流">
              <el-tag :effect="themeStore.themeEffectString" :type="selectedInstance.sessionStatus.video_stream_active ? 'success' : 'info'">
                {{ selectedInstance.sessionStatus.video_stream_active ? '已启用' : '未启用' }}
              </el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="当前URL" v-if="selectedInstance.sessionStatus.current_url">
              <span class="text-xs truncate block">{{ selectedInstance.sessionStatus.current_url }}</span>
            </el-descriptions-item>
            <el-descriptions-item label="最后心跳" :span="isMobile ? 1 : 2">
              {{ formatTime(selectedInstance.sessionStatus.last_heartbeat) }}
            </el-descriptions-item>
          </el-descriptions>
        </el-card>
      </div>

      <template #footer>
        <span class="dialog-footer">
          <el-button @click="showDetailDialog = false">关闭</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, onUnmounted, onBeforeUpdate } from 'vue'
import biliMessage from '@/utils/message'
import { browserLiveControlApi } from '@/api/browser/browser_api'
import { businessHandler } from '@/utils/businessHandler'
import type {
  UserBrowserInfoReadResp,
  CreateSessionRequest,
  BrowserSessionStatus
} from '@/types/browser-automation-api'
import ControlPanelContent from './ControlPanelContent.vue'
import { useThemeStore } from '@/stores/theme'

// 定义Props
interface Props {
  fingerprints: UserBrowserInfoReadResp[]
  loading?: boolean
}
const themeStore = useThemeStore()
const props = withDefaults(defineProps<Props>(), {
  loading: false
})

// 定义Emit
const emit = defineEmits<{
  refresh: []
}>()

// 响应式数据
const showAlert = ref(true)
const filterStatus = ref('')
const searchKeyword = ref('')
const selectedInstances = ref<UserBrowserInfoReadResp[]>([])
const batchOperating = ref(false)
const showDetailDialog = ref(false)
const selectedInstance = ref<(UserBrowserInfoReadResp & { sessionStatus?: BrowserSessionStatus | null; operationLoading?: boolean; statusLoading?: boolean }) | null>(null)
const batchSelectMode = ref(false)
const showControlPanel = ref(false)

// 移动端检测
const isMobile = ref(false)
const checkMobile = () => {
  isMobile.value = window.innerWidth < 768
}

// 统计数据
const stats = reactive({
  total: 0,
  running: 0,
  stopped: 0,
  error: 0
})

// 扩展的实例数据（包含会话状态）
const instances = ref<(UserBrowserInfoReadResp & { sessionStatus?: BrowserSessionStatus | null; operationLoading?: boolean; statusLoading?: boolean })[]>([])

// 浏览器控制相关
const selectedBrowserId = ref<number | null>(null)
const sessionCreating = ref(false)
const sessionStatusLoading = ref(false)
const sessionStatus = ref<BrowserSessionStatus | null>(null)
const videoLoading = ref(false)
const screenshotLoading = ref(false)
const streamUrl = ref('')
const screenshotUrl = ref('')
const lastScreenshotTime = ref('')
const videoPaused = ref(false)
const tabsList = ref<Array<{ id: string; title: string; url: string; active: boolean }>>([])
const tabsLoading = ref(false)
const streamConnectionStatus = ref<'connected' | 'connecting' | 'disconnected' | 'failed'>('disconnected')

const heartbeatInterval = ref<NodeJS.Timeout | null>(null)
const statusCheckInterval = ref<NodeJS.Timeout | null>(null)
const screenshotRefreshInterval = ref<NodeJS.Timeout | null>(null)
const streamHealthCheckInterval = ref<NodeJS.Timeout | null>(null)

// 计算属性
const filteredInstances = computed(() => {
  let result = instances.value

  // 按状态过滤
  if (filterStatus.value) {
    result = result.filter((item) => {
      const status = item.sessionStatus?.lifecycle_status
      return status === filterStatus.value
    })
  }

  // 按关键词搜索
  if (searchKeyword.value) {
    const keyword = searchKeyword.value.toLowerCase()
    result = result.filter((item) =>
      item.fingerprint_browser?.toLowerCase().includes(keyword) ||
      item.fingerprint_platform?.toLowerCase().includes(keyword) ||
      item.mid?.toLowerCase().includes(keyword) ||
      item.id.includes(keyword)
    )
  }

  return result
})

const currentBrowserInfo = computed(() => {
  return instances.value.find(i => Number(i.id) === selectedBrowserId.value)
})

const isBrowserStarted = computed(() => {
  return sessionStatus.value?.is_running || false
})

// 方法
const handleSearch = () => {
  // 搜索逻辑已在计算属性中实现
}

const handleSelectionChange = (selection: any[]) => {
  selectedInstances.value = selection
}

const handleRowClick = (row: any) => {
  handleBrowserSelect(Number(row.id))
}

const handleInstanceSelect = (instance: any, checked: boolean) => {
  if (checked) {
    selectedInstances.value.push(instance)
  } else {
    selectedInstances.value = selectedInstances.value.filter(item => item.id !== instance.id)
  }
}

const formatTime = (time: string | undefined) => {
  if (!time) return '未知'
  return new Date(time).toLocaleString('zh-CN')
}

const getSessionStatusText = (status: BrowserSessionStatus | null | undefined) => {
  if (!status) return '未知'
  const statusMap: Record<string, string> = {
    initializing: '初始化中',
    running: '运行中',
    paused: '已暂停',
    stopping: '停止中',
    stopped: '已停止',
    error: '异常'
  }
  return statusMap[status.lifecycle_status] || status.lifecycle_status || '未知'
}

const getSessionStatusType = (status: BrowserSessionStatus | null | undefined) => {
  if (!status) return 'info'
  const typeMap: Record<string, 'primary' | 'success' | 'warning' | 'danger' | 'info'> = {
    initializing: 'info',
    running: 'success',
    paused: 'warning',
    stopping: 'warning',
    stopped: 'info',
    error: 'danger'
  }
  return typeMap[status.lifecycle_status] || 'info'
}

// 启动会话
const startSession = async (instanceId: number) => {
  const instance = instances.value.find(i => Number(i.id) === instanceId)
  if (!instance) return

  instance.operationLoading = true

  try {
    const request: CreateSessionRequest = {
      headless: false,
      auto_cleanup: true,
      expiration_time: 3600
    }

    const result = await businessHandler(
      browserLiveControlApi.createBrowserSession(instanceId, request),
      {
        successMessage: `实例 ${instanceId} 启动成功`,
        errorMessage: `实例 ${instanceId} 启动失败`
      }
    )

    if (result.success) {
      await refreshInstanceStatus(instanceId)
    }
  } catch (error: any) {
    console.error('启动会话失败', error)
  } finally {
    instance.operationLoading = false
  }
}

// 刷新实例状态
const refreshInstanceStatus = async (instanceId: number) => {
  const instance = instances.value.find(i => Number(i.id) === instanceId)
  if (!instance) return

  instance.statusLoading = true

  try {
    const result = await businessHandler(
      browserLiveControlApi.getBrowserSessionStatus({ browser_id: String(instanceId) }),
      {
        showSuccessToast: false,
        showErrorToast: false // 静默失败，不显示错误提示
      }
    )
    
    if (result.success && result.data) {
      instance.sessionStatus = result.data
    } else {
      instance.sessionStatus = null
    }
  } catch (error) {
    console.error('获取实例状态失败', error)
    instance.sessionStatus = null
  } finally {
    instance.statusLoading = false
  }
}

// 批量启动会话
const batchStartSessions = async () => {
  if (selectedInstances.value.length === 0) return

  batchOperating.value = true

  try {
    for (const instance of selectedInstances.value) {
      await startSession(Number(instance.id))
    }
    biliMessage.success(`批量启动 ${selectedInstances.value.length} 个实例成功`)
  } catch (error: any) {
    biliMessage.error('批量启动部分失败')
  } finally {
    batchOperating.value = false
    selectedInstances.value = []
    batchSelectMode.value = false
  }
}

// 控制实例
const controlInstance = (instance: any) => {
  selectedInstance.value = instance
  showDetailDialog.value = true
}

// 更新统计
const updateStats = () => {
  stats.total = instances.value.length
  stats.running = instances.value.filter(i => i.sessionStatus?.lifecycle_status === 'running').length
  stats.stopped = instances.value.filter(i => i.sessionStatus?.lifecycle_status === 'stopped' || !i.sessionStatus).length
  stats.error = instances.value.filter(i => i.sessionStatus?.lifecycle_status === 'error').length
}

// 初始化实例数据
const initializeInstances = () => {
  instances.value = props.fingerprints.map(fingerprint => ({
    ...fingerprint,
    sessionStatus: null,
    operationLoading: false,
    statusLoading: false
  }))
  updateStats()
}

// 浏览器选择处理
const handleBrowserSelect = async (browserId: number) => {
  selectedBrowserId.value = browserId

  // 清理之前的定时器
  clearIntervals()
  streamUrl.value = ''
  screenshotUrl.value = ''
  videoPaused.value = false
  tabsList.value = []

  try {
    // 获取会话状态
    await refreshSessionStatus()

    // 如果会话正在运行，开始心跳
    if (sessionStatus.value?.is_running) {
      startHeartbeat()
      startStatusCheck()
      await refreshScreenshot()
      await refreshTabsList()
    }
  } catch (error) {
    console.error('选择浏览器失败', error)
    biliMessage.error('获取浏览器状态失败')
  }

  // 显示控制面板
  showControlPanel.value = true
}

// 创建浏览器会话
const createBrowserSession = async () => {
  if (!selectedBrowserId.value) return

  sessionCreating.value = true
  try {
    const request: CreateSessionRequest = {
      headless: false,
      auto_cleanup: true,
      expiration_time: 3600
    }

    const result = await businessHandler(
      browserLiveControlApi.createBrowserSession({
        browser_id: String(selectedBrowserId.value),
        request
      }),
      {
        successMessage: '浏览器会话创建成功',
        errorMessage: '创建浏览器会话失败'
      }
    )

    if (result.success) {
      await refreshSessionStatus()
      
      // 如果会话正在运行，开始心跳
      if (sessionStatus.value?.is_running) {
        startHeartbeat()
        startStatusCheck()
        await refreshScreenshot()
      }
    }
  } catch (error: any) {
    console.error('创建浏览器会话失败', error)
  }
  sessionCreating.value = false
}

// 获取会话状态
const refreshSessionStatus = async () => {
  if (!selectedBrowserId.value) return

  sessionStatusLoading.value = true
  try {
    const result = await businessHandler(
      browserLiveControlApi.getBrowserSessionStatus({
        browser_id: String(selectedBrowserId.value)
      }),
      {
        showSuccessToast: false,
        showErrorToast: false // 静默失败
      }
    )

    if (result.success && result.data) {
      sessionStatus.value = result.data
    } else {
      sessionStatus.value = null
    }
  } catch (error: any) {
    console.error('获取会话状态失败', error)
    sessionStatus.value = null
  }
  sessionStatusLoading.value = false
}

// 视频流相关
const startVideoStream = async () => {
  if (!selectedBrowserId.value) return

  videoLoading.value = true
  streamConnectionStatus.value = 'connecting'
  try {
    // 使用 WebRTC 连接替代旧的 startVideoStream 方法
    const response = await businessHandler(
      browserLiveControlApi.createWebrtcOffer({ browser_id: String(selectedBrowserId.value) }),
      { errorMessage: '启动视频流失败' }
    )

    if (response.data?.sdp) {
      // 这里可以添加 WebRTC 连接逻辑
      // 目前暂时使用截图作为替代
      streamConnectionStatus.value = 'connected'
      // 启动视频流健康检查
      startStreamHealthCheck()
      // 启动心跳,说明正在观看直播
      if (!heartbeatInterval.value) {
        startHeartbeat()
      }
    }
  } catch (error) {
    console.error('启动视频流失败', error)
    streamConnectionStatus.value = 'failed'
    biliMessage.error('视频流连接失败')
  }
  videoLoading.value = false
}

const stopVideoStream = async () => {
  if (!selectedBrowserId.value) return

  try {
    await businessHandler(
      browserLiveControlApi.closeWebrtcConnection(String(selectedBrowserId.value)),
      { errorMessage: '停止视频流失败' }
    )
    streamUrl.value = ''
    streamConnectionStatus.value = 'disconnected'
    stopStreamHealthCheck()
    // 停止视频流时也停止心跳
    if (heartbeatInterval.value) {
      clearInterval(heartbeatInterval.value)
      heartbeatInterval.value = null
    }
    await refreshScreenshot()
  } catch (error) {
    console.error('停止视频流失败', error)
  }
}

const refreshScreenshot = async () => {
  if (!selectedBrowserId.value) return

  screenshotLoading.value = true
  try {
    // 注意：截图接口已在后端移除，请使用 executeAction 接口执行截图操作
    biliMessage.warning('截图功能已移除，请使用自定义操作执行截图')
    // const blob = await browserLiveControlApi.getScreenshot(selectedBrowserId.value, {
    //   quality: 80,
    //   format: 'jpeg'
    // })
    // const url = URL.createObjectURL(blob)
    // screenshotUrl.value = url
    // lastScreenshotTime.value = new Date().toLocaleString('zh-CN')
    // biliMessage.success('截图已更新')
  } catch (error) {
    console.error('获取截图失败', error)
    biliMessage.error('获取截图失败')
  }
  screenshotLoading.value = false
}

// 暂停视频流（已删除，后端不再提供此接口）
const pauseVideoStream = async () => {
  if (!selectedBrowserId.value) return

  try {
    // 注意：暂停视频流接口已在后端移除
    biliMessage.warning('暂停视频流功能已移除')
    // await businessHandler(
    //   browserLiveControlApi.pauseVideoStream(selectedBrowserId.value.toString()),
    //   { errorMessage: '暂停视频流失败' }
    // )
    // videoPaused.value = true
    // streamUrl.value = ''
    // await refreshScreenshot()
  } catch (error) {
    console.error('暂停视频流失败', error)
  }
}

// 恢复视频流（已删除，后端不再提供此接口）
const resumeVideoStream = async () => {
  if (!selectedBrowserId.value) return

  try {
    // 注意：恢复视频流接口已在后端移除
    biliMessage.warning('恢复视频流功能已移除')
    // await businessHandler(
    //   browserLiveControlApi.resumeVideoStream(selectedBrowserId.value.toString()),
    //   { errorMessage: '恢复视频流失败' }
    // )
    // videoPaused.value = false
    // await startVideoStream()
  } catch (error) {
    console.error('恢复视频流失败', error)
  }
}

// 刷新标签页列表（已删除，后端不再提供此接口）
const refreshTabsList = async () => {
  if (!selectedBrowserId.value) return

  tabsLoading.value = true
  try {
    // 注意：标签页列表接口已在后端移除
    biliMessage.warning('标签页列表功能已移除')
    // const response = await businessHandler(
    //   browserLiveControlApi.listTabs(selectedBrowserId.value.toString()),
    //   { errorMessage: '获取标签页列表失败' }
    // )
    // if (response.success && response.data) {
    //   tabsList.value = response.data
    // }
  } catch (error) {
    console.error('获取标签页列表失败', error)
  }
  tabsLoading.value = false
}

// 切换标签页（已删除，后端不再提供此接口）
const switchTab = async (tabId: string) => {
  if (!selectedBrowserId.value) return

  try {
    // 注意：切换标签页接口已在后端移除
    biliMessage.warning('切换标签页功能已移除')
    // await businessHandler(
    //   browserLiveControlApi.switchTab({
    //     browser_id: selectedBrowserId.value.toString(),
    //     tab_id: tabId
    //   }),
    //   { errorMessage: '切换标签页失败' }
    // )
    // biliMessage.success('切换标签页成功')
    // await refreshTabsList()
    // await refreshScreenshot()
  } catch (error) {
    console.error('切换标签页失败', error)
  }
}

// 处理视频点击（已删除，请使用 executeAction 接口）
const handleVideoClick = async (x: number, y: number) => {
  if (!selectedBrowserId.value || !isBrowserStarted.value) return

  try {
    // 注意：点击接口已在后端移除，请使用 executeAction 接口执行点击操作
    biliMessage.warning('点击功能已移除，请使用自定义操作执行点击')
    // await businessHandler(
    //   browserLiveControlApi.clickElement({
    //     browser_id: selectedBrowserId.value.toString(),
    //     request: {
    //       x,
    //       y,
    //       button: 'left',
    //       double: false,
    //       wait_after: 100
    //     }
    //   }),
    //   { errorMessage: '点击失败' }
    // )
  } catch (error) {
    console.error('点击失败', error)
  }
}

// 视频流健康检查
const checkStreamHealth = async () => {
  if (!selectedBrowserId.value || !streamUrl.value) return

  try {
    const response = await businessHandler(
      browserLiveControlApi.getVideoStreamStatus({
        browser_id: selectedBrowserId.value.toString()
      }),
      { silent: true }  // 静默模式,不显示错误提示
    )

    if (response.success && response.data) {
      const isActive = response.data.active || response.data.streaming
      if (!isActive && streamConnectionStatus.value === 'connected') {
        streamConnectionStatus.value = 'disconnected'
        biliMessage.warning('视频流连接已断开')
      } else if (isActive && streamConnectionStatus.value === 'disconnected') {
        streamConnectionStatus.value = 'connected'
        biliMessage.success('视频流连接已恢复')
      }
    }
  } catch (error) {
    if (streamConnectionStatus.value === 'connected') {
      console.error('视频流健康检查失败:', error)
      streamConnectionStatus.value = 'disconnected'
      biliMessage.warning('视频流连接异常，请检查网络')
    }
  }
}

// 启动视频流健康检查
const startStreamHealthCheck = () => {
  stopStreamHealthCheck()
  streamHealthCheckInterval.value = setInterval(() => {
    checkStreamHealth()
  }, 5000)  // 每5秒检查一次
}

// 停止视频流健康检查
const stopStreamHealthCheck = () => {
  if (streamHealthCheckInterval.value) {
    clearInterval(streamHealthCheckInterval.value)
    streamHealthCheckInterval.value = null
  }
}

// 心跳相关
const startHeartbeat = () => {
  heartbeatInterval.value = setInterval(async () => {
    if (selectedBrowserId.value) {
      try {
        await businessHandler(
          browserLiveControlApi.sendHeartbeat(selectedBrowserId.value, {
            manual_operation: false,
            operation_priority: 'normal'
          }),
          { silent: true }
        )
      } catch (error) {
        console.error('心跳失败', error)
      }
    }
  }, 30000) // 30秒一次心跳
}

const startStatusCheck = () => {
  statusCheckInterval.value = setInterval(async () => {
    if (selectedBrowserId.value) {
      await refreshSessionStatus()
    }
  }, 60000) // 60秒检查一次状态
}

const clearIntervals = () => {
  if (heartbeatInterval.value) {
    clearInterval(heartbeatInterval.value)
    heartbeatInterval.value = null
  }
  if (statusCheckInterval.value) {
    clearInterval(statusCheckInterval.value)
    statusCheckInterval.value = null
  }
  if (screenshotRefreshInterval.value) {
    clearInterval(screenshotRefreshInterval.value)
    screenshotRefreshInterval.value = null
  }
  if (streamHealthCheckInterval.value) {
    clearInterval(streamHealthCheckInterval.value)
    streamHealthCheckInterval.value = null
  }
}

// 生命周期
onMounted(() => {
  initializeInstances()
  
  // 自动关闭alert
  setTimeout(() => {
    showAlert.value = false
  }, 5000)

  // 检测移动端
  checkMobile()
  window.addEventListener('resize', checkMobile)
})

onBeforeUpdate(() => {
  checkMobile()
})

onUnmounted(() => {
  clearIntervals()
  window.removeEventListener('resize', checkMobile)
})
</script>

<style scoped>
/* 实例卡片 hover 效果 */
.cursor-pointer:hover {
  @apply -translate-y-0.5 shadow-lg;
}

/* 抽屉内边距清零 */
.control-drawer :deep(.el-drawer__body) {
  padding: 0;
  overflow: hidden;
}

/* 操作按钮图标间距 */
.action-btn :deep(.el-icon) {
  margin-right: var(--spacing-1);
}
</style>