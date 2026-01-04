<!--
 * @Author: 星瞳 1944637830@qq.com
 * @Date: 2024-12-24 00:00:00
 * @LastEditors: 星瞳 1944637830@qq.com
 * @LastEditTime: 2024-12-24 00:00:00
 * @FilePath: \Vue3FrontEndDemoExercise\src\components\browser\ControlPanelContent.vue
 * @Description: 控制面板内容组件 - 用于抽屉中显示
-->
<template>
  <div class="control-panel-content">
    <!-- 头部 -->
    <div class="panel-header">
      <h3>浏览器控制</h3>
      <el-button text @click="$emit('close')">
        <el-icon><Close /></el-icon>
      </el-button>
    </div>

    <!-- 未选择时的提示 -->
    <el-empty
      v-if="!selectedBrowserId"
      description="请选择浏览器实例进行控制"
      :image-size="100"
    >
      <template #image>
        <el-icon :size="100" color="#C0C4CC">
          <Monitor />
        </el-icon>
      </template>
    </el-empty>

    <!-- 控制面板内容 -->
    <div v-else class="panel-content">
      <!-- 当前选中实例信息 -->
      <el-card class="current-instance-card mb-4">
        <div class="instance-header">
          <div class="instance-info">
            <h4 class="font-medium">实例 {{ selectedBrowserId }}</h4>
            <div class="instance-details">
              <span>{{ currentBrowserInfo?.fingerprint_browser || '未知' }}</span>
              <span class="separator">|</span>
              <span>{{ currentBrowserInfo?.fingerprint_platform || '未知' }}</span>
            </div>
          </div>
          <el-tag :type="sessionStatus?.is_running ? 'success' : 'warning'" size="large">
            {{ sessionStatus?.is_running ? '运行中' : '未运行' }}
          </el-tag>
        </div>
      </el-card>

      <!-- 会话管理 -->
      <el-card class="mb-4">
        <template #header>
          <span class="font-medium">会话管理</span>
        </template>
        <div class="control-buttons">
          <el-button 
            type="primary" 
            @click="$emit('create-session')" 
            :loading="sessionCreating"
            :disabled="sessionStatus?.lifecycle_status === 'running'"
            block
          >
            <el-icon>
              <VideoPlay />
            </el-icon>
            启动浏览器会话
          </el-button>
          <el-button 
            type="success" 
            @click="$emit('refresh-session')" 
            :loading="sessionStatusLoading"
            block
          >
            <el-icon>
              <Refresh />
            </el-icon>
            刷新会话状态
          </el-button>
        </div>

        <!-- 会话详情 -->
        <div v-if="sessionStatus" class="session-details">
          <el-descriptions :column="1" border size="small">
            <el-descriptions-item label="会话ID">
              <span class="text-xs">{{ sessionStatus.session_id }}</span>
            </el-descriptions-item>
            <el-descriptions-item label="生命周期状态">
              <el-tag :type="getSessionStatusType(sessionStatus)" size="small">
                {{ sessionStatus.lifecycle_status }}
              </el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="连接数">
              {{ sessionStatus.connected_clients }}
            </el-descriptions-item>
            <el-descriptions-item label="创建时间">
              {{ formatTime(sessionStatus.created_at) }}
            </el-descriptions-item>
          </el-descriptions>
        </div>
      </el-card>

      <!-- 视频流预览 -->
      <el-card class="mb-4">
        <template #header>
          <div class="card-header-row">
            <span class="font-medium">视频流预览</span>
            <div class="connection-status">
              <el-tag
                :type="getConnectionStatusType"
                size="small"
                :icon="getConnectionStatusIcon"
                effect="dark"
              >
                {{ getConnectionStatusText }}
              </el-tag>
            </div>
            <el-button
              v-if="streamUrl && !videoPaused"
              type="warning"
              size="small"
              @click="$emit('pause-video')"
              :icon="VideoPause"
            >
              暂停
            </el-button>
            <el-button
              v-if="streamUrl && videoPaused"
              type="success"
              size="small"
              @click="$emit('resume-video')"
              :icon="VideoPlay"
            >
              恢复
            </el-button>
          </div>
        </template>
        <div class="video-preview">
          <div v-if="streamUrl && !videoPaused" class="video-container" ref="videoContainer">
            <video ref="videoElement" :src="streamUrl" autoplay muted playsinline class="w-full rounded" @click="handleVideoClick"></video>
          </div>
          <div v-else-if="videoPaused && screenshotUrl" class="screenshot-container">
            <img :src="screenshotUrl" alt="浏览器截图" class="w-full rounded" @click="handleVideoClick" />
            <div class="screenshot-time">
              <span class="text-xs text-gray-500">最后更新: {{ lastScreenshotTime }}</span>
            </div>
          </div>
          <div v-else-if="screenshotUrl" class="screenshot-container">
            <img :src="screenshotUrl" alt="浏览器截图" class="w-full rounded" @click="handleVideoClick" />
            <div class="screenshot-time">
              <span class="text-xs text-gray-500">最后更新: {{ lastScreenshotTime }}</span>
            </div>
          </div>
          <el-empty
            v-else
            description="暂无画面"
            :image-size="80"
          >
            <el-button
              v-if="isBrowserStarted"
              type="primary"
              size="small"
              @click="$emit('start-video')"
              :loading="videoLoading"
            >
              <el-icon>
                <VideoCamera />
              </el-icon>
              启动视频流
            </el-button>
          </el-empty>
        </div>
        <div class="video-actions mt-3">
          <el-button
            v-if="!streamUrl && isBrowserStarted"
            type="primary"
            size="small"
            @click="$emit('start-video')"
            :loading="videoLoading"
          >
            <el-icon>
              <VideoCamera />
            </el-icon>
            启动视频流
          </el-button>
          <el-button
            v-if="streamUrl"
            type="warning"
            size="small"
            @click="$emit('stop-video')"
          >
            <el-icon>
              <VideoPause />
            </el-icon>
            停止视频流
          </el-button>
          <el-button
            v-if="!streamUrl && isBrowserStarted"
            type="info"
            size="small"
            @click="$emit('refresh-screenshot')"
            :loading="screenshotLoading"
          >
            <el-icon>
              <Picture />
            </el-icon>
            刷新截图
          </el-button>
        </div>
      </el-card>

      <!-- 标签页管理 -->
      <el-card class="mb-4" v-if="isBrowserStarted">
        <template #header>
          <div class="card-header-row">
            <span class="font-medium">标签页管理</span>
            <el-button
              type="primary"
              size="small"
              @click="$emit('refresh-tabs')"
              :loading="tabsLoading"
              :icon="Refresh"
            >
              刷新
            </el-button>
          </div>
        </template>
        <el-scrollbar max-height="200px">
          <div v-if="tabsList.length > 0" class="tabs-list">
            <div
              v-for="tab in tabsList"
              :key="tab.id"
              :class="['tab-item', { 'tab-active': tab.active }]"
              @click="$emit('switch-tab', tab.id)"
            >
              <el-icon><Document /></el-icon>
              <div class="tab-content">
                <div class="tab-title">{{ tab.title || '无标题' }}</div>
                <div class="tab-url">{{ tab.url || '' }}</div>
              </div>
              <el-tag v-if="tab.active" type="success" size="small">当前</el-tag>
            </div>
          </div>
          <el-empty v-else description="暂无标签页" :image-size="60" />
        </el-scrollbar>
      </el-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { VideoPause, VideoPlay, Refresh, Document, VideoCamera, Picture, Connection, Loading, Warning } from '@element-plus/icons-vue'
import type { BrowserSessionStatus, UserBrowserInfoReadResp } from '@/types/browser-automation-api'

// 定义Props
interface Props {
  selectedBrowserId: number | null
  currentBrowserInfo: UserBrowserInfoReadResp | undefined
  sessionStatus: BrowserSessionStatus | null
  sessionCreating: boolean
  sessionStatusLoading: boolean
  streamUrl: string
  screenshotUrl: string
  lastScreenshotTime: string
  videoLoading: boolean
  screenshotLoading: boolean
  isBrowserStarted: boolean
  videoPaused: boolean
  tabsList: Array<{ id: string; title: string; url: string; active: boolean }>
  tabsLoading: boolean
  streamConnectionStatus: 'connected' | 'connecting' | 'disconnected' | 'failed'
}

const props = withDefaults(defineProps<Props>(), {
  selectedBrowserId: null,
  currentBrowserInfo: undefined,
  sessionStatus: null,
  sessionCreating: false,
  sessionStatusLoading: false,
  streamUrl: '',
  screenshotUrl: '',
  lastScreenshotTime: '',
  videoLoading: false,
  screenshotLoading: false,
  isBrowserStarted: false,
  videoPaused: false,
  tabsList: () => [],
  tabsLoading: false,
  streamConnectionStatus: 'disconnected'
})

// 定义Emit
const emit = defineEmits<{
  close: []
  'create-session': []
  'refresh-session': []
  'start-video': []
  'stop-video': []
  'refresh-screenshot': []
  'pause-video': []
  'resume-video': []
  'refresh-tabs': []
  'switch-tab': [tabId: string]
  'video-click': [x: number, y: number]
}>()

const videoElement = ref<HTMLVideoElement | null>(null)
const videoContainer = ref<HTMLDivElement | null>(null)

// 计算连接状态显示
const getConnectionStatusText = computed(() => {
  const statusMap: Record<typeof props.streamConnectionStatus, string> = {
    connected: '直播中',
    connecting: '连接中',
    disconnected: '已断开',
    failed: '连接失败'
  }
  return statusMap[props.streamConnectionStatus] || '未知'
})

const getConnectionStatusType = computed(() => {
  const typeMap: Record<typeof props.streamConnectionStatus, 'success' | 'warning' | 'info' | 'danger'> = {
    connected: 'success',
    connecting: 'warning',
    disconnected: 'info',
    failed: 'danger'
  }
  return typeMap[props.streamConnectionStatus] || 'info'
})

const getConnectionStatusIcon = computed(() => {
  if (props.streamConnectionStatus === 'connecting') return Loading
  if (props.streamConnectionStatus === 'disconnected') return Warning
  if (props.streamConnectionStatus === 'failed') return Warning
  return Connection
})

// 处理视频/截图点击
const handleVideoClick = (event: MouseEvent) => {
  if (!videoContainer.value) return

  const rect = videoContainer.value.getBoundingClientRect()
  const x = event.clientX - rect.left
  const y = event.clientY - rect.top

  // 计算相对坐标 (0.0 - 1.0)
  const relativeX = x / rect.width
  const relativeY = y / rect.height

  emit('video-click', relativeX, relativeY)
}

// 方法
const formatTime = (time: string | undefined) => {
  if (!time) return '未知'
  return new Date(time).toLocaleString('zh-CN')
}

const getSessionStatusType = (status: BrowserSessionStatus) => {
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
</script>

<style scoped>
.control-panel-content {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid #ebeef5;
}

.panel-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}

.panel-content {
  flex: 1;
  padding: 16px;
  overflow-y: auto;
}

/* 当前实例卡片 */
.current-instance-card :deep(.el-card__body) {
  padding: 16px;
}

.instance-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.instance-info h4 {
  margin: 0 0 6px 0;
  font-size: 16px;
}

.instance-details {
  font-size: 13px;
  color: #909399;
}

.instance-details .separator {
  margin: 0 8px;
}

/* 控制按钮 */
.control-buttons {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 16px;
}

/* 会话详情 */
.session-details {
  border-top: 1px solid #ebeef5;
  padding-top: 16px;
}

/* 视频预览 */
.video-preview {
  min-height: 180px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.video-container video,
.screenshot-container img {
  max-height: 250px;
  object-fit: contain;
  background: #000;
  width: 100%;
}

.screenshot-time {
  margin-top: 8px;
  text-align: center;
}

.video-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.card-header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  gap: 12px;
}

.connection-status {
  display: flex;
  align-items: center;
}

/* 视频点击区域 */
.video-container {
  position: relative;
  cursor: pointer;
}

.video-container video:hover,
.screenshot-container img:hover {
  opacity: 0.9;
}

/* 标签页列表 */
.tabs-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.tab-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border: 1px solid var(--el-border-color);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.3s;
}

.tab-item:hover {
  background: var(--el-fill-color-light);
  border-color: var(--el-color-primary);
}

.tab-item.tab-active {
  background: var(--el-color-primary-light-9);
  border-color: var(--el-color-primary);
}

.tab-content {
  flex: 1;
  min-width: 0;
}

.tab-title {
  font-size: 14px;
  font-weight: 500;
  color: var(--el-text-color-primary);
  margin-bottom: 2px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tab-url {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 响应式调整 */
@media (max-width: 768px) {
  .panel-header {
    padding: 12px;
  }

  .panel-content {
    padding: 12px;
  }

  .instance-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }

  .control-buttons {
    gap: 8px;
  }

  .video-actions {
    flex-direction: column;
    gap: 8px;
  }

  .video-actions .el-button {
    width: 100%;
  }
}

/* 通用样式 */
.text-xs {
  font-size: 12px;
}

.text-sm {
  font-size: 14px;
}

.text-gray-500 {
  color: #909399;
}

.font-medium {
  font-weight: 500;
}

.w-full {
  width: 100%;
}

.rounded {
  border-radius: 4px;
}

.mb-4 {
  margin-bottom: 1rem;
}

.mt-3 {
  margin-top: 0.75rem;
}

.gap-8 {
  gap: 8px;
}
</style>