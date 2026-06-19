<script setup lang="ts">
import { ref, onMounted, provide } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { VideoPlay, VideoPause, Refresh, Camera, ArrowLeft, Tools } from '@element-plus/icons-vue'
import { useDebounceFn } from '@vueuse/core'
import { ElMessageBox, ElDialog } from 'element-plus'
import BiliPageHeader from '@/components/CommonCompo/Bili-Container-Compo/BiliPageHeader.vue'
import FlexContainer from '@/components/CommonCompo/Bili-Container-Compo/FlexContainer.vue'
import { readFingerprintRouterApiV1RpaBrowserReadFingerprintPost, createBrowserSessionApiV1RpaBrowserControlCreatePost, closeBrowserSessionApiV1RpaBrowserControlClosePost, browserSessionStatusApiV1RpaBrowserControlStatusPost, getWebrtcStatusApiV1RpaBrowserControlWebrtcStatusPost, executeActionApiV1RpaBrowserControlActionsExecutePost, getPageInfoApiV1RpaBrowserControlOperationGetPageInfoPost } from '@/api/browser/hey-api'
import { useUserNavStore } from '@/stores/user_nav'
import biliMessage from '@/utils/message'
import LiveBox from '@/components/rpa-browser/LiveBox.vue'
import DebugBox from '@/components/rpa-browser/DebugBox.vue'
import ToolboxPanel from '@/components/rpa-browser/ToolboxPanel.vue'
import { RouteName } from '@/models/router/index.ts'
import { useBrowserSessionState } from '@/composables/useBrowserSessionState'

const route = useRoute()
const router = useRouter()
const userNavStore = useUserNavStore()

interface BrowserInfo {
  browser_id: number
  browser_id_str: string
  custom_name?: string | null
  fingerprint_platform?: string | null
  fingerprint_browser?: string | null
  fingerprint_brand_version?: string | null
  fingerprint_hardware_concurrency?: number | null
  fingerprint_gpu_vendor?: string | null
  fingerprint_gpu_renderer?: string | null
  lang?: string | null
  timezone?: string | null
  proxy_server?: string | null
  created_at?: string
  updated_at?: string
  [key: string]: unknown
}

const browserId = String(route.params.browserId)

// ===== 状态机 =====
const {
  browserSessionStatus,
  isConnected,
  isConnecting,
  hasError,
  statusLabel,
  errorMessage,
  onSessionStarting,
  onSessionCreated,
  onSessionStartFailed,
  onSessionStopped,
  onSessionStopFailed,
  onStatusResponse,
} = useBrowserSessionState()

const isStreaming = ref(false)
const uploadSpeed = ref('0')
const downloadSpeed = ref('0')
const browserInfo = ref<BrowserInfo | null>(null)
const webrtcStatus = ref<'disconnected' | 'connecting' | 'connected'>('disconnected')
const isLoading = ref(false)
const splitterSize = ref(50)
const isLoadingInfo = ref(true)
const toolboxVisible = ref(false)

provide('isStreaming', isStreaming)
provide('browserSessionStatus', browserSessionStatus)
provide('isSessionConnected', isConnected)
provide('uploadSpeed', uploadSpeed)
provide('downloadSpeed', downloadSpeed)

const loadBrowserInfo = async () => {
  isLoadingInfo.value = true
  try {
    if (!userNavStore.user_nav.uid) {
      console.warn('User uid is empty, please login first')
      biliMessage.warning('请先登录')
      router.push({ name: RouteName.HOME })
      return
    }
    
    const response = await readFingerprintRouterApiV1RpaBrowserReadFingerprintPost({
      query: { browser_id: browserId },
      headers: {
        'x-bili-mid': userNavStore.user_nav.uid,
        'x-bili-level': String(userNavStore.user_nav.level_info.current_level)
      }
    })

    if (response.data?.code === 0 && response.data?.data) {
      browserInfo.value = response.data.data
    } else {
      console.error('Failed to load browser info:', response.data)
      biliMessage.error(response.data?.msg || '获取指纹信息失败')
      router.push({ name: RouteName.RPA_BROWSER_FINGERPRINT_LIST })
    }
  } catch (error) {
    console.error('Failed to load browser info:', error)
    biliMessage.error('网络异常，请稍后重试')
    router.push({ name: RouteName.RPA_BROWSER_FINGERPRINT_LIST })
  } finally {
    isLoadingInfo.value = false
  }
}

const handleStartSession = async () => {
  isLoading.value = true
  onSessionStarting()
  
  try {
    const response = await createBrowserSessionApiV1RpaBrowserControlCreatePost({
      query: { browser_id: browserId },
      headers: userNavStore.user_header,
      timeout: 300000 // 5分钟超时，浏览器启动可能需要较长时间
    })

    if (response.data?.code === 0) {
      const data = response.data.data

      if (data.browser_started) {
        biliMessage.info(data.message || '会话已存在，返回现有会话信息')
      } else {
        biliMessage.success('浏览器启动成功')
      }
      onSessionCreated(data)

      // 创建浏览器后获取页面列表
      if (isConnected.value) {
        await fetchPagesList()
      }
    } else {
      const msg = response.data?.msg || '创建会话失败'
      biliMessage.error(msg)
      onSessionStartFailed(msg)
    }
  } catch (error) {
    const msg = '网络异常，请稍后重试'
    biliMessage.error(msg)
    onSessionStartFailed(msg)
  } finally {
    isLoading.value = false
  }
}

const handleStopSession = async () => {
  try {
    await ElMessageBox.confirm('确定要关闭浏览器会话吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })

    const response = await closeBrowserSessionApiV1RpaBrowserControlClosePost({
      query: { browser_id: browserId },
      headers: {
        'x-bili-mid': userNavStore.user_nav.uid,
        'x-bili-level': userNavStore.user_nav.level_info.current_level
      }
    })

    if (response.data?.code === 0) {
      biliMessage.success('会话已关闭')
      isStreaming.value = false
      onSessionStopped()
    } else {
      const msg = response.data?.msg || '关闭会话失败'
      const code = response.data?.code ?? 0
      biliMessage.error(msg)
      onSessionStopFailed(msg, code)
    }
  } catch (error: unknown) {
    if (error !== 'cancel') {
      const msg = '关闭会话失败'
      biliMessage.error(msg)
      onSessionStopFailed(msg, 0)
    }
  }
}

const handleToggleStream = () => {
  isStreaming.value = !isStreaming.value
}

const loadBrowserSessionStatus = async () => {
  try {
    const response = await browserSessionStatusApiV1RpaBrowserControlStatusPost({
      query: { browser_id: browserId },
      headers: {
        'x-bili-mid': userNavStore.user_nav.uid,
        'x-bili-level': userNavStore.user_nav.level_info.current_level
      }
    })

    onStatusResponse(response.data)

    // 如果浏览器已连接，获取页面列表
    if (isConnected.value) {
      await fetchPagesList()
    }
  } catch (error) {
    console.error('Failed to load browser session status', error)
    // 网络异常视为可能断连，尝试过渡到 error 状态
    onSessionStopFailed('网络异常，无法获取会话状态', 0)
  }
}

const loadWebrtcStatus = async () => {
  try {
    const response = await getWebrtcStatusApiV1RpaBrowserControlWebrtcStatusPost({
      query: { browser_id: browserId },
      headers: {
        'x-bili-mid': userNavStore.user_nav.uid,
        'x-bili-level': userNavStore.user_nav.level_info.current_level
      }
    })

    if (response.data?.code === 0 && response.data?.data) {
      const data = response.data.data
      if (data.enabled && data.active_streams && data.active_streams.length > 0) {
        webrtcStatus.value = 'connected'
      } else {
        webrtcStatus.value = 'disconnected'
      }
    } else {
      webrtcStatus.value = 'disconnected'
    }
  } catch (error) {
    console.error('Failed to load webrtc status', error)
    webrtcStatus.value = 'disconnected'
  }
}

const handleWebrtcStatusChange = (status: 'disconnected' | 'connecting' | 'connected') => {
  webrtcStatus.value = status
}

const handleRefreshStatus = useDebounceFn(async () => {
  await loadBrowserSessionStatus()
  if (hasError.value) {
    biliMessage.warning(errorMessage.value || '状态刷新异常')
  } else {
    biliMessage.success('状态刷新成功')
  }
}, 500)

const getHeaders = () => ({
  'x-bili-mid': userNavStore.user_nav.uid,
  'x-bili-level': String(userNavStore.user_nav.level_info.current_level)
})

// 调用 get_page_info API 获取页面信息
const fetchPagesList = async () => {
  try {
    const response = await getPageInfoApiV1RpaBrowserControlOperationGetPageInfoPost({
      headers: getHeaders(),
      query: { browser_id: browserId },
      body: {}
    })
    if (response.data?.code === 0) {
      console.log('获取页面信息成功:', response.data?.data)
      return response.data?.data
    } else {
      const errorCode = response.data?.code
      if (errorCode !== 404) {
        biliMessage.error(response.data?.msg || '获取页面信息失败')
      }
      return null
    }
  } catch (e) {
    console.warn('获取页面信息异常:', e)
    return null
  }
}

const executeAction = async (actionId: string, params: Record<string, unknown> = {}, pageIndex?: number) => {
  try {
    const response = await executeActionApiV1RpaBrowserControlActionsExecutePost({
      query: { browser_id: browserId },
      headers: getHeaders(),
      body: {
        action_id: actionId,
        params,
        page_index: pageIndex
      }
    })

    // 检查操作执行结果，如果失败则显示错误提示
    if (response.data?.code === 0 && response.data?.data) {
      const result = response.data.data
      if (result.success === false) {
        biliMessage.error(result.error || '操作执行失败')
      }
    }

    // 执行操作后刷新页面列表状态
    await fetchPagesList()

    return response
  } catch (error) {
    console.error('Failed to execute action:', error)
    throw error
  }
}

const debugBoxRef = ref<InstanceType<typeof DebugBox> | null>(null)

const handleEditAction = (actionDetail: Record<string, unknown>) => {
  debugBoxRef.value?.startEditCustomAction(actionDetail)
}

const handleBack = () => {
  router.push({ name: RouteName.RPA_BROWSER_FINGERPRINT_LIST })
}

const executingScreenshot = ref(false)
const screenshots = ref<Array<{ id: number; dataUrl: string; format: string; size: number; timestamp: number }>>([])
let screenshotIdCounter = 0

const handleScreenshot = async () => {
  if (executingScreenshot.value) return
  executingScreenshot.value = true

  try {
    const response = await executeActionApiV1RpaBrowserControlActionsExecutePost({
      query: { browser_id: browserId },
      headers: getHeaders(),
      body: { action_id: 'screenshot', params: {} }
    })

    if (response.data?.code === 0 && response.data?.data) {
      const result = response.data.data as Record<string, unknown>
      if (result.success === true && typeof result.data === 'object' && result.data !== null) {
        const screenshotData = result.data as { base64?: string; format?: string; size?: number }
        const format = screenshotData.format || 'png'
        const dataUrl = `data:image/${format};base64,${screenshotData.base64}`
        screenshots.value.unshift({
          id: ++screenshotIdCounter,
          dataUrl,
          format,
          size: screenshotData.size || 0,
          timestamp: Date.now()
        })
        biliMessage.success('截图成功')
      } else {
        biliMessage.error(typeof result.error === 'string' ? result.error : '截图失败')
      }
    } else {
      biliMessage.error(response.data?.msg || '截图请求失败')
    }
  } catch (error) {
    console.error('截图失败:', error)
    biliMessage.error('网络异常，截图失败')
  } finally {
    executingScreenshot.value = false
  }
}

const handleDeleteScreenshot = (id: number) => {
  const index = screenshots.value.findIndex(s => s.id === id)
  if (index !== -1) {
    screenshots.value.splice(index, 1)
  }
}

provide('browserId', browserId)
provide('isStreaming', isStreaming)
provide('browserSessionStatus', browserSessionStatus)

onMounted(() => {
  loadBrowserInfo()
  loadBrowserSessionStatus()
})
</script>

<template>
  <FlexContainer class="flex flex-col h-full">
    <BiliPageHeader 
      :title="isLoadingInfo ? '加载中...' : (browserInfo?.custom_name || `指纹 ${browserId}`)" 
      description="浏览器控制台"
      tag="浏览器"
    >
      <template #extra>
        <div class="flex items-center gap-4">
          <div class="flex items-center gap-2">
            <span class="text-text-secondary text-sm">浏览器:</span>
            <el-tag :type="isConnected ? 'success' : isConnecting ? 'warning' : 'info'">
              <span class="flex items-center gap-1">
                <span
                  :class="{
                    'bg-green-500 animate-pulse': isConnected,
                    'bg-yellow-500 animate-pulse': isConnecting,
                    'bg-gray-400': !isConnected && !isConnecting
                  }"
                  class="w-2 h-2 rounded-full"
                ></span>
                {{ statusLabel }}
              </span>
            </el-tag>
            <span v-if="hasError" class="text-xs text-(--el-color-danger) ml-1" :title="errorMessage">⚠</span>
          </div>

          <el-button-group>
            <el-button v-if="!isConnected" type="primary" :icon="VideoPlay" :loading="isLoading" @click="handleStartSession">
              启动会话
            </el-button>
            <el-button v-else type="danger" :icon="VideoPause" @click="handleStopSession">
              停止会话
            </el-button>
          </el-button-group>

          <el-button :icon="Refresh" @click="handleRefreshStatus">刷新浏览器状态</el-button>

          <el-button :icon="ArrowLeft" @click="handleBack">返回</el-button>
        </div>
      </template>
    </BiliPageHeader>

    <div v-if="isLoadingInfo" class="flex-1 flex items-center justify-center">
      <div class="text-center">
        <el-icon class="animate-spin" size="40" style="color: var(--el-color-primary)">
          <VideoPause />
        </el-icon>
        <div class="mt-4 text-text-secondary">加载中...</div>
      </div>
    </div>

    <div v-else class="flex-1 flex flex-col overflow-hidden">
      <div class="flex items-center justify-between px-4 py-2 border-t border-border bg-[var(--el-fill-color-light)]">
        <div class="flex items-center gap-4">
          <div class="flex items-center gap-2">
            <span class="text-text-secondary text-sm">WebRTC:</span>
            <el-tag :type="webrtcStatus === 'connected' ? 'success' : webrtcStatus === 'connecting' ? 'warning' : 'info'">
              <span class="flex items-center gap-1">
                <span :class="['w-2 h-2 rounded-full', webrtcStatus === 'connected' ? 'bg-green-500 animate-pulse' : webrtcStatus === 'connecting' ? 'bg-yellow-500 animate-pulse' : 'bg-gray-400']"></span>
                {{ webrtcStatus === 'connected' ? '已连接' : webrtcStatus === 'connecting' ? '连接中' : '未连接' }}
              </span>
            </el-tag>
          </div>

          <el-button size="large" :icon="Refresh" @click="loadWebrtcStatus">刷新WebRTC状态</el-button>

          <div v-if="isStreaming" class="flex items-center gap-2 text-sm">
            <span class="text-text-secondary">网速:</span>
            <span class="text-green-500">↑ {{ uploadSpeed }}/s</span>
            <span class="text-blue-500">↓ {{ downloadSpeed }}/s</span>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <el-button size="large" :icon="Camera" :loading="executingScreenshot" @click="handleScreenshot">截图</el-button>
          <el-button size="large" type="primary" :icon="Tools" @click="toolboxVisible = true">工具箱</el-button>
        </div>
      </div>

      <el-splitter v-model="splitterSize" class="stream-splitter h-[80vh]">
        <el-splitter-panel class="live-box-container" collapsible size="40%" min="30%">
          <LiveBox :browser-id="browserId" :is-streaming="isStreaming" @toggle-stream="handleToggleStream" @webrtc-status-change="handleWebrtcStatusChange"/>
        </el-splitter-panel>
        <el-splitter-panel class="debug-box-container overflow-hidden" collapsible min="30%"> 
          <DebugBox ref="debugBoxRef" :browser-id="browserId" />
        </el-splitter-panel>
      </el-splitter>
    </div>

    <div v-if="screenshots.length > 0" class="mx-4 mb-4 rounded-lg border border-border bg-[var(--el-fill-color-light)]">
      <div class="flex items-center justify-between px-4 py-2 border-b border-border">
        <span class="text-sm font-medium text-[var(--el-text-color-primary)]">截图历史 ({{ screenshots.length }})</span>
      </div>
      <div class="flex gap-3 overflow-x-auto p-3">
        <div
          v-for="shot in screenshots"
          :key="shot.id"
          class="group relative shrink-0 w-48 rounded-lg border border-border bg-bg overflow-hidden"
        >
          <el-image
            :src="shot.dataUrl"
            :preview-src-list="[shot.dataUrl]"
            fit="cover"
            class="w-full h-32 cursor-pointer"
            preview-teleported
            :z-index="3000"
          />
          <div class="flex items-center justify-between px-2 py-1 text-xs text-text-secondary">
            <span>{{ new Date(shot.timestamp).toLocaleTimeString() }}</span>
            <span>{{ (shot.size / 1024).toFixed(0) }}KB</span>
          </div>
          <button
            class="absolute top-1 right-1 p-0.5 rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity"
            @click="handleDeleteScreenshot(shot.id)"
          >
            <el-icon :size="14"><Close /></el-icon>
          </button>
        </div>
      </div>
    </div>

    <!-- 工具箱对话框 -->
    <el-dialog
      v-model="toolboxVisible"
      title="工具箱"
      width="520px"
      :modal-penetrable="true"
      :modal="false"
      :lock-scroll="false"
      :draggable="true"
      :close-on-click-modal="false"
      :destroy-on-close="false"
      class="toolbox-dialog"
    >
      <div class="h-[60vh] overflow-auto">
        <ToolboxPanel :browser-id="browserId" @edit-action="handleEditAction" />
      </div>
    </el-dialog>
  </FlexContainer>
</template>
