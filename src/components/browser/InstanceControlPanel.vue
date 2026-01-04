<!--
 * @Author: 星瞳 1944637830@qq.com
 * @Date: 2024-12-24 00:00:00
 * @LastEditors: 星瞳 1944637830@qq.com
 * @LastEditTime: 2024-12-24 00:00:00
 * @FilePath: \Vue3FrontEndDemoExercise\src\components\browser\InstanceControlPanel.vue
 * @Description: 实例控制面板组件
-->
<template>
  <el-dialog 
    title="实例控制面板" 
    v-model="visible" 
    width="90%"
    fullscreen
    class="control-modal"
    @close="handleClose"
  >
    <div class="modal-content" v-if="fingerprint">
      <!-- 基本信息 -->
      <div class="modal-section">
        <h3>基本信息</h3>
        <el-descriptions :column="2" border size="small">
          <el-descriptions-item label="实例ID">{{ fingerprint.id_str || fingerprint.id }}</el-descriptions-item>
          <el-descriptions-item label="用户ID">{{ fingerprint.mid }}</el-descriptions-item>
          <el-descriptions-item label="浏览器">{{ fingerprint.fingerprint_browser }}</el-descriptions-item>
          <el-descriptions-item label="平台">{{ fingerprint.fingerprint_platform }}</el-descriptions-item>
          <el-descriptions-item label="创建时间">{{ formatTime(fingerprint.created_at) }}</el-descriptions-item>
        </el-descriptions>
      </div>

      <!-- 会话状态 -->
      <div class="modal-section">
        <h3>会话状态</h3>
        <div v-if="sessionStatus" class="session-status">
          <el-descriptions :column="2" border size="small">
            <el-descriptions-item label="状态">
              <el-tag :type="getSessionStatusType(sessionStatus)">
                {{ getSessionStatusText(sessionStatus) }}
              </el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="运行状态">
              <el-tag :type="isRunning ? 'success' : 'info'">
                {{ isRunning ? '运行中' : '未运行' }}
              </el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="连接数">
              {{ connectedClients }}
            </el-descriptions-item>
            <el-descriptions-item label="视频流">
              <el-tag :type="videoStreamActive ? 'success' : 'info'">
                {{ videoStreamActive ? '已启用' : '未启用' }}
              </el-tag>
            </el-descriptions-item>
          </el-descriptions>
        </div>
        <div v-else class="no-session">
          <el-alert title="暂无会话" type="info" :closable="false" show-icon>
            <p>该实例尚未启动，点击"启动"按钮开始使用。</p>
          </el-alert>
        </div>
      </div>

      <!-- 视频流控制 -->
      <div class="modal-section" v-if="isRunning">
        <h3>视频直播</h3>
        <div class="modal-video-stream">
          <!-- 视频播放器 -->
          <div class="modal-video-player-wrapper" @click="handleVideoPlay" v-if="videoStreamActive">
            <video 
              v-if="videoStreamUrl"
              ref="videoPlayer"
              :src="videoStreamUrl"
              class="modal-video-player"
              :class="{ 'playing': isPlaying }"
            >
              您的浏览器不支持视频播放
            </video>
            
            <!-- 播放按钮覆盖层 -->
            <div v-if="!isPlaying" class="modal-video-play-overlay">
              <el-button type="primary" circle size="large" class="modal-play-button">
                <el-icon size="32"><VideoPlay /></el-icon>
              </el-button>
              <p>点击播放视频流</p>
            </div>
            
            <!-- 播放状态显示 -->
            <div v-if="isPlaying" class="modal-video-status-overlay">
              <el-tag type="success" size="small">播放中</el-tag>
            </div>
          </div>
          
          <!-- 视频流未启动状态 -->
          <div v-else class="modal-video-not-started">
            <div class="modal-video-placeholder">
              <el-icon size="64" color="#909399"><VideoCamera /></el-icon>
              <p>视频流未启动</p>
            </div>
          </div>
          
          <!-- 视频控制按钮 -->
          <div class="modal-video-controls">
            <el-button 
              v-if="videoStreamActive"
              type="danger" 
              size="small" 
              @click="$emit('stop-video', fingerprint)"
              :loading="videoOperationLoading"
            >
              <el-icon><VideoPause /></el-icon>
              停止视频流
            </el-button>
            <el-button 
              v-else
              type="primary" 
              @click="$emit('start-video', fingerprint)"
              :loading="videoOperationLoading"
            >
              <el-icon><VideoPlay /></el-icon>
              启动视频流
            </el-button>
            
            <!-- 调试按钮 -->
            <el-button 
              type="info" 
              size="small" 
              @click="debugVideoStream"
            >
              <el-icon><InfoFilled /></el-icon>
              调试
            </el-button>
          </div>
        </div>
      </div>

      <!-- 控制操作 -->
      <div class="modal-section">
        <h3>控制操作</h3>
        <div class="modal-control-actions">
          <el-button 
            v-if="!sessionStatus?.is_running"
            type="primary" 
            @click="$emit('start-session', fingerprint)"
            :loading="operationLoading"
          >
            <el-icon><VideoPlay /></el-icon>
            启动会话
          </el-button>
          <el-button 
            v-else
            type="success" 
            @click="$emit('refresh-status', fingerprint)"
            :loading="statusLoading"
          >
            <el-icon><Refresh /></el-icon>
            刷新状态
          </el-button>
        </div>
      </div>
    </div>

    <template #footer>
      <span class="dialog-footer">
        <el-button @click="handleClose">关闭</el-button>
      </span>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue'
import { VideoPlay, VideoPause, VideoCamera, Refresh, InfoFilled } from '@element-plus/icons-vue'
import type { 
  UserBrowserInfoReadResp, 
  BrowserSessionStatus,
  SessionStatusResponse
} from '@/types/browser-automation-api'

// 定义Model
const visible = defineModel<boolean>('visible', { default: false })

// 定义Props
interface Props {
  fingerprint: UserBrowserInfoReadResp | null
  sessionStatus?: BrowserSessionStatus | SessionStatusResponse | null
  videoStreamUrl?: string
  operationLoading?: boolean
  statusLoading?: boolean
  videoOperationLoading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  fingerprint: null,
  sessionStatus: null,
  videoStreamUrl: '',
  operationLoading: false,
  statusLoading: false,
  videoOperationLoading: false
})

// 定义Emit
const emit = defineEmits<{
  'update:visible': [visible: boolean]
  'start-session': [fingerprint: UserBrowserInfoReadResp]
  'refresh-status': [fingerprint: UserBrowserInfoReadResp]
  'start-video': [fingerprint: UserBrowserInfoReadResp]
  'stop-video': [fingerprint: UserBrowserInfoReadResp]
  close: []
}>()

// 本地状态
const videoPlayer = ref<HTMLVideoElement | null>(null)
const isPlaying = ref(false)
const fingerprintId = computed(() => props.fingerprint?.id || 0)

// 计算属性
const sessionStatusComputed = computed(() => {
  if (!props.sessionStatus) {
    console.log('sessionStatusComputed: props.sessionStatus is null')
    return null
  }
  
  console.log('sessionStatusComputed: props.sessionStatus =', props.sessionStatus)
  
  // 如果是新的API响应格式，转换为兼容格式
  if ('session_exists' in props.sessionStatus || 'browser_running' in props.sessionStatus) {
    const status = props.sessionStatus as any
    const convertedStatus = {
      // 兼容字段映射
      is_running: status.browser_running || false,
      connected_clients: status.active_connections || 0,
      video_stream_active: status.video_streaming || false,
      lifecycle_status: status.lifecycle_state || 'unknown',
      stream_url: status.stream_url || null,
      
      // 保留原始字段
      ...status
    } as Partial<BrowserSessionStatus>
    
    console.log('sessionStatusComputed: converted status =', convertedStatus)
    return convertedStatus
  }
  
  console.log('sessionStatusComputed: using original status')
  return props.sessionStatus as BrowserSessionStatus
})

const isRunning = computed(() => {
  if (!sessionStatusComputed.value) return false
  
  // 检查是否是兼容格式（包含is_running字段）
  if ('is_running' in sessionStatusComputed.value) {
    return sessionStatusComputed.value.is_running || false
  }
  
  // 检查是否是新的API格式（包含browser_running字段）
  if ('browser_running' in sessionStatusComputed.value) {
    return sessionStatusComputed.value.browser_running || false
  }
  
  return false
})

const videoStreamActive = computed(() => {
  if (!sessionStatusComputed.value) return false
  
  // 检查是否是兼容格式（包含video_stream_active字段）
  if ('video_stream_active' in sessionStatusComputed.value) {
    return sessionStatusComputed.value.video_stream_active || false
  }
  
  // 检查是否是新的API格式（包含video_streaming字段）
  if ('video_streaming' in sessionStatusComputed.value) {
    return sessionStatusComputed.value.video_streaming || false
  }
  
  return false
})

const connectedClients = computed(() => {
  if (!sessionStatusComputed.value) return 0
  return 'connected_clients' in sessionStatusComputed.value 
    ? sessionStatusComputed.value.connected_clients
    : sessionStatusComputed.value.active_connections || 0
})

// 方法
const handleClose = () => {
  emit('update:visible', false)
  emit('close')
}

const handleVideoPlay = async () => {
  if (!isPlaying.value && props.videoStreamUrl) {
    try {
      // 使用 WebRTC 视频流（由父组件通过 WebRTC 提供流对象）
      if (videoPlayer.value) {
        // 设置视频源
        videoPlayer.value.src = props.videoStreamUrl

        await videoPlayer.value.play()
        isPlaying.value = true

        // 监听视频播放状态
        videoPlayer.value.addEventListener('pause', () => {
          isPlaying.value = false
        })

        videoPlayer.value.addEventListener('ended', () => {
          isPlaying.value = false
        })
      }
    } catch (error) {
      console.error('Failed to play video:', error)
      isPlaying.value = false
    }
  }
}

// 调试视频流
const debugVideoStream = () => {
  console.log('=== 视频流调试信息 ===')
  console.log('props.fingerprint:', props.fingerprint)
  console.log('props.sessionStatus:', props.sessionStatus)
  console.log('props.videoStreamUrl:', props.videoStreamUrl)
  console.log('sessionStatusComputed:', sessionStatusComputed.value)
  console.log('isRunning:', isRunning.value)
  console.log('videoStreamActive:', videoStreamActive.value)
  console.log('videoPlayer:', videoPlayer.value)
  console.log('isPlaying:', isPlaying.value)
  
  // 测试视频流URL是否可访问
  if (props.videoStreamUrl) {
    console.log('测试视频流URL可访问性...')
    const testImg = new Image()
    testImg.onload = () => {
      console.log('✅ 视频流URL可访问')
    }
    testImg.onerror = () => {
      console.error('❌ 视频流URL无法访问')
    }
    testImg.src = props.videoStreamUrl + '?t=' + Date.now()
  }
}

const formatTime = (time: string | undefined) => {
  if (!time) return '未知'
  return new Date(time).toLocaleString('zh-CN')
}

const getSessionStatusText = (status: BrowserSessionStatus | SessionStatusResponse | null | undefined) => {
  if (!status) return '未知'
  
  // 处理新的API响应格式
  if ('lifecycle_state' in status) {
    const statusMap: Record<string, string> = {
      active: '运行中',
      initializing: '初始化中',
      paused: '已暂停',
      stopping: '停止中',
      stopped: '已停止',
      error: '异常'
    }
    return statusMap[status.lifecycle_state] || status.lifecycle_state || '未知'
  }
  
  // 处理旧的API格式
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

const getSessionStatusType = (status: BrowserSessionStatus | SessionStatusResponse | null | undefined) => {
  if (!status) return 'info'
  
  // 处理新的API响应格式
  if ('lifecycle_state' in status) {
    const typeMap: Record<string, 'primary' | 'success' | 'warning' | 'danger' | 'info'> = {
      active: 'success',
      initializing: 'info',
      paused: 'warning',
      stopping: 'warning',
      stopped: 'info',
      error: 'danger'
    }
    return typeMap[status.lifecycle_state] || 'info'
  }
  
  // 处理旧的API格式
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

// 组件卸载时清理资源
onUnmounted(() => {
  // 清理视频播放器
  if (videoPlayer.value) {
    videoPlayer.value.pause()
    videoPlayer.value.src = ''
  }
})
</script>

<style scoped>
.control-modal {
  --el-dialog-margin-top: 20px;
}

.modal-content {
  padding: 0 20px;
}

.modal-section {
  margin-bottom: 24px;
}

.modal-section h3 {
  margin: 0 0 12px 0;
  color: var(--el-text-color-primary);
  font-weight: 600;
  font-size: 16px;
}

.modal-video-stream {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.modal-video-player-wrapper {
  position: relative;
  width: 100%;
  height: 300px;
  background-color: #000;
  border-radius: 4px;
  overflow: hidden;
  cursor: pointer;
}

.modal-video-player {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.modal-video-player.playing {
  cursor: default;
}

.modal-video-play-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  background-color: rgba(0, 0, 0, 0.5);
  color: white;
  gap: 12px;
}

.modal-play-button {
  transition: transform 0.2s ease;
}

.modal-play-button:hover {
  transform: scale(1.1);
}

.modal-video-status-overlay {
  position: absolute;
  top: 8px;
  right: 8px;
}

.modal-video-not-started {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 200px;
  background-color: var(--el-fill-color-light);
  border-radius: 4px;
}

.modal-video-placeholder {
  text-align: center;
  color: var(--el-text-color-secondary);
}

.modal-video-controls {
  display: flex;
  justify-content: center;
  gap: 8px;
}

.modal-control-actions {
  display: flex;
  justify-content: center;
  gap: 8px;
}

.session-status {
  background-color: var(--el-fill-color-light);
  padding: 12px;
  border-radius: 4px;
}

.no-session {
  text-align: center;
  padding: 20px;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
}
</style>