<script setup lang="ts">
import { ref, computed, onMounted, provide } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { VideoPlay, VideoPause, Refresh, Camera, ArrowLeft, Tools, Minus, Close } from '@element-plus/icons-vue'
import { useDebounceFn } from '@vueuse/core'
import { ElMessageBox, ElDialog } from 'element-plus'
import BiliPageHeader from '@/components/CommonCompo/Bili-Container-Compo/BiliPageHeader.vue'
import FlexContainer from '@/components/CommonCompo/Bili-Container-Compo/FlexContainer.vue'
import { WebRtc视频流Service, 执行引擎Service, 浏览器会话控制Service, 浏览器指纹管理Service } from '@/api/browser/hey-api'
import { useUserNavStore } from '@/stores/user_nav'
import biliMessage from '@/utils/message'
import { businessHandler } from '@/utils/businessHandler'
import LiveBox from '@/components/rpa-browser/LiveBox.vue'
import DebugBox from '@/components/rpa-browser/DebugBox.vue'
import ToolboxPanel from '@/components/rpa-browser/ToolboxPanel.vue'
import EditCustomActionDialog from '@/components/rpa-browser/EditCustomActionDialog.vue'
import MinimizeBar from '@/components/rpa-browser/MinimizeBar.vue'
import ResourceInteractionBar from '@/components/interaction/ResourceInteractionBar.vue'
import { RouteName } from '@/models/router/index.ts'
import { useBrowserSessionState } from '@/composables/useBrowserSessionState'
import { useI18n } from 'vue-i18n'

const route = useRoute()
const router = useRouter()
const userNavStore = useUserNavStore()
const { t } = useI18n()

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
const toolboxMinimized = ref(false)
const toolboxDialogVisible = computed({
  get: () => toolboxVisible.value && !toolboxMinimized.value,
  set: (val: boolean) => {
    if (!val && !toolboxMinimized.value) {
      toolboxVisible.value = false
    }
  },
})

function handleToolboxMinimize() {
  toolboxMinimized.value = true
}

function handleToolboxRestore() {
  toolboxMinimized.value = false
}

function handleToolboxClose() {
  toolboxMinimized.value = false
  toolboxVisible.value = false
}

function openToolbox() {
  toolboxVisible.value = true
  toolboxMinimized.value = false
}

provide('isStreaming', isStreaming)
provide('browserSessionStatus', browserSessionStatus)
provide('isSessionConnected', isConnected)
provide('uploadSpeed', uploadSpeed)
provide('downloadSpeed', downloadSpeed)

const loadBrowserInfo = async () => {
  isLoadingInfo.value = true
  
  if (!userNavStore.user_nav.uid) {
    console.warn('User uid is empty, please login first')
    biliMessage.warning(t('rpa.pleaseLogin'))
    router.push({ name: RouteName.HOME })
    isLoadingInfo.value = false
    return
  }

  const result = await businessHandler<BrowserInfo>(
    浏览器指纹管理Service.readFingerprintRouterApiV1RpaBrowserReadFingerprintPost({
      query: { browser_id: browserId },
          }) as any,
    { successMessage: '', errorMessage: t('rpa.getFingerprintFailed'), showSuccessToast: false }
  )

  if (result.success && result.data) {
    browserInfo.value = result.data
  } else {
    router.push({ name: RouteName.RPA_BROWSER_FINGERPRINT_LIST })
  }
  
  isLoadingInfo.value = false
}

const handleStartSession = async () => {
  isLoading.value = true
  onSessionStarting()
  
  try {
    const response = await 浏览器会话控制Service.createBrowserSessionApiV1RpaBrowserControlCreatePost({
      query: { browser_id: browserId },
      timeout: 300000 // 5分钟超时，浏览器启动可能需要较长时间
    }) as any  // responseStyle='data' → 直接返回 {code, data, msg}

    if (response?.code === 0) {
      const data = response.data

      if (data.browser_started) {
        biliMessage.info(data.message || t('rpa.sessionExists'))
      } else {
        biliMessage.success(t('rpa.sessionStartSuccess'))
      }
      onSessionCreated(data)
    } else {
      const msg = response?.msg || t('rpa.sessionStartFailed')
      biliMessage.error(msg)
      onSessionStartFailed(msg)
    }
  } catch (error) {
    const msg = t('rpa.networkError')
    biliMessage.error(msg)
    onSessionStartFailed(msg)
  } finally {
    isLoading.value = false
  }
}

const handleStopSession = async () => {
  try {
    await ElMessageBox.confirm(t('rpa.sessionCloseConfirm'), t('rpa.sessionCloseTitle'), {
      confirmButtonText: t('common.sure'),
      cancelButtonText: t('common.cancel'),
      type: 'warning'
    })

    const response = await 浏览器会话控制Service.closeBrowserSessionApiV1RpaBrowserControlClosePost({
      query: { browser_id: browserId },
          }) as any  // responseStyle='data' → 直接返回 {code, data, msg}

    if (response?.code === 0) {
      biliMessage.success(t('rpa.sessionClosed'))
      isStreaming.value = false
      onSessionStopped()
    } else {
      const msg = response?.msg || t('rpa.sessionCloseFailed')
      const code = response?.code ?? 0
      biliMessage.error(msg)
      onSessionStopFailed(msg, code)
    }
  } catch (error: unknown) {
    if (error !== 'cancel') {
      const msg = t('rpa.sessionCloseFailed')
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
    const response = await 浏览器会话控制Service.browserSessionStatusApiV1RpaBrowserControlStatusPost({
      query: { browser_id: browserId },
          })

    onStatusResponse(response)
  } catch (error) {
    console.error('Failed to load browser session status', error)
    // 网络异常视为可能断连，尝试过渡到 error 状态
    onSessionStopFailed(t('rpa.sessionStatusUnknown'), 0)
  }
}

// 拉取 WebRTC 状态（静默，返回最新状态供调用方决定是否提示）
const loadWebrtcStatus = async (): Promise<'disconnected' | 'connecting' | 'connected'> => {
  try {
    const response: any = await WebRtc视频流Service.getWebrtcStatusApiV1RpaBrowserControlWebrtcStatusPost({
      query: { browser_id: browserId },
          })  // responseStyle='data' → 直接返回 {code, data, msg}

    if (response?.code === 0 && response?.data) {
      const data = response.data
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
  return webrtcStatus.value
}

// 用户点击「刷新WebRTC状态」：必须给出反馈（此前点击后无任何提示）
const handleRefreshWebrtcStatus = useDebounceFn(async () => {
  const status = await loadWebrtcStatus()
  if (status === 'connected') {
    biliMessage.success(t('rpa.webrtcConnected'))
  } else {
    biliMessage.info(t('rpa.webrtcDisconnected'))
  }
}, 500)

const handleWebrtcStatusChange = (status: 'disconnected' | 'connecting' | 'connected') => {
  webrtcStatus.value = status
}

const handleRefreshStatus = useDebounceFn(async () => {
  await loadBrowserSessionStatus()
  if (hasError.value) {
    biliMessage.warning(errorMessage.value || t('rpa.refreshStatusFailed'))
  } else {
    biliMessage.success(t('rpa.refreshStatusSuccess'))
  }
}, 500)

interface EditDialogInstance {
  id: number
  actionDetail: Record<string, unknown>
}

const editDialogs = ref<EditDialogInstance[]>([])
let editDialogIdCounter = 0

const handleEditAction = (actionDetail: Record<string, unknown>) => {
  editDialogs.value.push({
    id: ++editDialogIdCounter,
    actionDetail,
  })
}

const handleEditDialogClose = (id: number) => {
  const index = editDialogs.value.findIndex(d => d.id === id)
  if (index !== -1) {
    editDialogs.value.splice(index, 1)
  }
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
    const response: any = await 执行引擎Service.executeActionApiV1RpaBrowserControlActionsExecutePost({
      query: { browser_id: browserId },
      body: { action_id: 'screenshot', params: {} }
    })  // responseStyle='data' → 直接返回 {code, data, msg}

    if (response?.code === 0 && response?.data) {
      const result = response.data as Record<string, unknown>
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
        biliMessage.success(t('rpa.screenshotSuccess'))
      } else {
        biliMessage.error(typeof result.error === 'string' ? result.error : t('rpa.screenshotFailed'))
      }
    } else {
      biliMessage.error(response?.msg || t('rpa.screenshotFailed'))
    }
  } catch (error) {
    console.error('截图失败:', error)
    biliMessage.error(t('rpa.screenshotNetworkError'))
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
      :title="isLoadingInfo ? t('common.loading') : (browserInfo?.custom_name || t('rpa.pageTitleFallback', { id: browserId }))" 
      :description="t('rpa.consoleDesc')"
      :tag-text="t('rpa.browserTag')"
    >
      <template #extra>
        <div class="flex flex-wrap items-center gap-4">
          <!-- 收藏/点赞（2.17.0：RPA 浏览器走 be-message 通用互动） -->
          <ResourceInteractionBar biz-type="rpa_browser" :biz-id="browserId" />

          <div class="flex items-center gap-2">
            <span>{{ t('rpa.browserLabel') }}:</span>
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
              {{ t('rpa.sessionStart') }}
            </el-button>
            <el-button v-else type="danger" :icon="VideoPause" @click="handleStopSession">
              {{ t('rpa.sessionStop') }}
            </el-button>
          </el-button-group>

          <el-button :icon="Refresh" @click="handleRefreshStatus">{{ t('rpa.refreshSessionStatus') }}</el-button>

          <el-button :icon="ArrowLeft" @click="handleBack">{{ t('common.back') }}</el-button>
        </div>
      </template>
    </BiliPageHeader>

    <div v-if="isLoadingInfo" class="flex-1 flex items-center justify-center bg-bg rounded-2xl p-4">
      <div class="text-center">
        <el-icon class="animate-spin" size="40" style="color: var(--el-color-primary)">
          <VideoPause />
        </el-icon>
        <div class="mt-4 text-text-secondary">{{ t('common.loading') }}</div>
      </div>
    </div>

    <div v-else class="flex-1 flex flex-col min-h-[70vh] overflow-hidden bg-bg rounded-2xl p-4">
      <div class="flex items-center justify-between px-4 py-2 border-t border-border bg-fill-light">
        <div class="flex items-center gap-4">
          <div class="flex items-center gap-2">
            <span>WebRTC:</span>
            <el-tag :type="webrtcStatus === 'connected' ? 'success' : webrtcStatus === 'connecting' ? 'warning' : 'info'">
              <span class="flex items-center gap-1">
                <span :class="['w-2 h-2 rounded-full', webrtcStatus === 'connected' ? 'bg-green-500 animate-pulse' : webrtcStatus === 'connecting' ? 'bg-yellow-500 animate-pulse' : 'bg-gray-400']"></span>
                {{ webrtcStatus === 'connected' ? t('rpa.statusConnected') : webrtcStatus === 'connecting' ? t('rpa.statusConnecting') : t('rpa.statusDisconnected') }}
              </span>
            </el-tag>
          </div>

          <el-button size="large" :icon="Refresh" @click="handleRefreshWebrtcStatus">{{ t('rpa.refreshWebrtcStatus') }}</el-button>

          <div v-if="isStreaming" class="flex items-center gap-2 text-sm">
            <span class="text-text-secondary">{{ t('rpa.networkSpeed') }}:</span>
            <span class="text-green-500">↑ {{ uploadSpeed }}/s</span>
            <span class="text-blue-500">↓ {{ downloadSpeed }}/s</span>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <el-button size="large" :icon="Camera" :loading="executingScreenshot" @click="handleScreenshot">{{ t('rpa.screenshotBtn') }}</el-button>
          <el-button size="large" type="primary" :icon="Tools" @click="openToolbox">{{ t('rpa.toolbox') }}</el-button>
        </div>
      </div>

      <el-splitter v-model="splitterSize" class="stream-splitter flex-1">
        <el-splitter-panel class="live-box-container" collapsible size="40%" min="30%">
          <LiveBox :browser-id="browserId" :is-streaming="isStreaming" @toggle-stream="handleToggleStream" @webrtc-status-change="handleWebrtcStatusChange"/>
        </el-splitter-panel>
        <el-splitter-panel class="debug-box-container overflow-hidden" collapsible min="30%">
          <DebugBox :browser-id="browserId" />
        </el-splitter-panel>
      </el-splitter>
    </div>

    <div v-if="screenshots.length > 0" class="mx-4 mb-4 rounded-lg border border-border bg-fill-light">
      <div class="flex items-center justify-between px-4 py-2 border-b border-border">
        <span class="text-sm font-medium text-text-primary">{{ t('rpa.screenshotHistory') }} ({{ screenshots.length }})</span>
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
      v-model="toolboxDialogVisible"
      width="520px"
      :modal-penetrable="true"
      :modal="false"
      :lock-scroll="false"
      :draggable="true"
      :close-on-click-modal="false"
      :destroy-on-close="false"
      :append-to-body="true"
      modal-class="toolbox-overlay"
      class="toolbox-dialog"
    >
      <template #header>
        <div class="flex">
          <span class="text-2xl">{{ t('rpa.toolbox') }}</span>
          <button
            class="ml-auto mr-3 cursor-pointer hover:text-color-secondary"
            :title="t('rpa.minimize')"
            @click="handleToolboxMinimize"
          >
            <el-icon :size="14"><Minus /></el-icon>
          </button>
        </div>
      </template>
      <ToolboxPanel :browser-id="browserId" @edit-action="handleEditAction" />
    </el-dialog>

    <!-- 工具箱最小化浮动标签 -->
    <MinimizeBar
      v-if="toolboxMinimized && toolboxVisible"
      :title="t('rpa.toolbox')"
      @restore="handleToolboxRestore"
      @close="handleToolboxClose"
    />

    <!-- 编辑自定义操作弹窗（支持同时开启多个，独立于调试面板） -->
    <EditCustomActionDialog
      v-for="dialog in editDialogs"
      :key="dialog.id"
      :model-value="true"
      :action-detail="dialog.actionDetail"
      :browser-id="browserId"
      @update:model-value="(val: boolean) => { if (!val) handleEditDialogClose(dialog.id) }"
    />
  </FlexContainer>
</template>
