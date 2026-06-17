<script setup lang="ts">
import { ref, onMounted, onUnmounted, provide } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { VideoPlay, VideoPause, Refresh, Camera, ArrowLeft, Tools, FolderChecked, SwitchFilled, Plus } from '@element-plus/icons-vue'
import { useDebounceFn } from '@vueuse/core'
import { ElMessageBox } from 'element-plus'
import BiliPageHeader from '@/components/CommonCompo/Bili-Container-Compo/BiliPageHeader.vue'
import FlexContainer from '@/components/CommonCompo/Bili-Container-Compo/FlexContainer.vue'
import { readFingerprintRouterApiV1RpaBrowserReadFingerprintPost, createBrowserSessionApiV1RpaBrowserControlCreatePost, closeBrowserSessionApiV1RpaBrowserControlClosePost, browserSessionStatusApiV1RpaBrowserControlStatusPost, openPageApiV1RpaBrowserControlOperationOpenPagePost, getWebrtcStatusApiV1RpaBrowserControlWebrtcStatusPost } from '@/api/browser/hey-api'
import { useUserNavStore } from '@/stores/user_nav'
import biliMessage from '@/utils/message'
import LiveBox from '@/components/rpa-browser/LiveBox.vue'
import DebugBox from '@/components/rpa-browser/DebugBox.vue'
import { RouteName } from '@/models/router/index.ts'

const route = useRoute()
const router = useRouter()
const userNavStore = useUserNavStore()

const browserId = String(route.params.browserId)
const isStreaming = ref(false)
const isLoading = ref(false)
const browserInfo = ref<any>(null)
const browserSessionStatus = ref<string>('disconnected')
const uploadSpeed = ref('0')
const downloadSpeed = ref('0')
const splitterSize = ref(50)
const isLoadingInfo = ref(true)
const webrtcStatus = ref<'disconnected' | 'connecting' | 'connected'>('disconnected')

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
  browserSessionStatus.value = 'connecting'
  
  try {
    const response = await createBrowserSessionApiV1RpaBrowserControlCreatePost({
      query: { browser_id: browserId },
      headers: {
        'x-bili-mid': userNavStore.user_nav.uid,
        'x-bili-level': userNavStore.user_nav.level_info.current_level
      }
    })

    if (response.data?.code === 0) {
      const data = response.data.data
      
      if (data.browser_started) {
        biliMessage.info(data.message || '会话已存在，返回现有会话信息')
        // 将 running 状态映射为 connected
        browserSessionStatus.value = data.status === 'running' ? 'connected' : (data.status || 'connected')
      } else {
        biliMessage.info('会话创建请求已提交，正在连接...')
        await pollSessionStatus()
      }
    } else {
      biliMessage.error(response.data?.msg || '创建会话失败')
      browserSessionStatus.value = 'disconnected'
    }
  } catch (error) {
    biliMessage.error('网络异常，请稍后重试')
    browserSessionStatus.value = 'disconnected'
  } finally {
    isLoading.value = false
  }
}

const pollSessionStatus = async () => {
  const maxWaitTime = 90 * 1000 // 90秒超时
  const pollInterval = 2 * 1000 // 每2秒轮询一次
  const startTime = Date.now()

  return new Promise<void>((resolve) => {
    const poll = async () => {
      const elapsed = Date.now() - startTime
      
      if (elapsed >= maxWaitTime) {
        biliMessage.error('连接超时，启动会话失败')
        browserSessionStatus.value = 'disconnected'
        resolve()
        return
      }

      try {
        const response = await browserSessionStatusApiV1RpaBrowserControlStatusPost({
          query: { browser_id: browserId },
          headers: {
            'x-bili-mid': userNavStore.user_nav.uid,
            'x-bili-level': userNavStore.user_nav.level_info.current_level
          }
        })

        if (response.data?.code === 0 && response.data?.data) {
          const status = response.data.data?.status
          // 将 running 状态映射为 connected
          const mappedStatus = status === 'running' ? 'connected' : status
          if (mappedStatus === 'connected') {
            biliMessage.success('会话连接成功')
            browserSessionStatus.value = 'connected'
            resolve()
            return
          } else if (status === 'failed' || status === 'error') {
            biliMessage.error('会话启动失败')
            browserSessionStatus.value = 'disconnected'
            resolve()
            return
          } else if (status === 'running') {
            // 继续轮询
          }
        } else {
          biliMessage.error(response.data?.msg || '获取会话状态失败')
        }
      } catch (error) {
        console.error('Poll session status error:', error)
      }

      setTimeout(poll, pollInterval)
    }

    setTimeout(poll, pollInterval)
  })
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
      browserSessionStatus.value = 'disconnected'
      isStreaming.value = false
    } else {
      biliMessage.error(response.data?.msg || '关闭会话失败')
    }
  } catch (error: any) {
    if (error !== 'cancel') {
      biliMessage.error('关闭会话失败')
    }
  }
}

const handleToggleStream = () => {
  if (!isStreaming.value) {
    ElMessageBox.confirm('启动直播会消耗流量，是否继续？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    }).then(() => {
      isStreaming.value = true
    }).catch(() => {})
  } else {
    isStreaming.value = false
  }
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

    if (response.data?.code === 0 && response.data?.data) {
      const status = response.data.data?.status || 'disconnected'
      // 将 running 状态映射为 connected
      browserSessionStatus.value = status === 'running' ? 'connected' : status
      biliMessage.success('浏览器状态刷新成功')
    } else {
      biliMessage.error(response.data?.msg || '浏览器状态刷新失败')
    }
  } catch (error) {
    console.error('Failed to load browser session status', error)
    biliMessage.error('浏览器状态刷新失败')
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
      webrtcStatus.value = response.data.data?.status || 'disconnected'
      biliMessage.success('WebRTC状态刷新成功')
    } else {
      biliMessage.error(response.data?.msg || 'WebRTC状态刷新失败')
    }
  } catch (error) {
    console.error('Failed to load webrtc status', error)
    biliMessage.error('WebRTC状态刷新失败')
  }
}

const handleRefreshStatus = useDebounceFn(async () => {
  try {
    await Promise.all([
      loadBrowserSessionStatus(),
      loadWebrtcStatus()
    ])
    biliMessage.success('状态刷新成功')
  } catch (error) {
    console.error('Refresh status failed', error)
    biliMessage.error('状态刷新失败')
  }
}, 500)

const handleAddPage = async () => {
  if (!userNavStore.user_nav.uid) {
    biliMessage.warning('请先登录')
    return
  }

  try {
    const response = await openPageApiV1RpaBrowserControlOperationOpenPagePost({
      query: { browser_id: browserId },
      headers: {
        'x-bili-mid': userNavStore.user_nav.uid,
        'x-bili-level': String(userNavStore.user_nav.level_info.current_level)
      },
      body: { url: 'about:blank', page_index: -1 }
    })

    if (response.data?.code === 0) {
      biliMessage.success('新建页面成功')
    } else {
      biliMessage.error(response.data?.msg || '新建页面失败')
    }
  } catch (error) {
    console.error('Failed to open page:', error)
    biliMessage.error('网络异常，请稍后重试')
  }
}

const handleBack = () => {
  router.push({ name: RouteName.RPA_BROWSER_FINGERPRINT_LIST })
}

provide('browserId', browserId)
provide('isStreaming', isStreaming)
provide('browserSessionStatus', browserSessionStatus)
provide('uploadSpeed', uploadSpeed)
provide('downloadSpeed', downloadSpeed)

onMounted(() => {
  loadBrowserInfo()
  loadBrowserSessionStatus()
  loadWebrtcStatus()
})

onUnmounted(() => {
  if (browserSessionStatus.value === 'connected') {
    closeBrowserSessionApiV1RpaBrowserControlClosePost({
      query: { browser_id: browserId },
      headers: {
        'x-bili-mid': userNavStore.user_nav.uid,
        'x-bili-level': userNavStore.user_nav.level_info.current_level
      }
    })
  }
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
            <span class="text-[var(--el-text-color-secondary)] text-sm">浏览器:</span>
            <el-tag :type="{
              connected: 'success',
              connecting: 'warning',
              disconnected: 'info'
            }[browserSessionStatus] || 'info'">
              <span class="flex items-center gap-1">
                <span :class="{
                  'bg-green-500 animate-pulse': browserSessionStatus === 'connected',
                  'bg-yellow-500 animate-pulse': browserSessionStatus === 'connecting',
                  'bg-gray-400': browserSessionStatus !== 'connected' && browserSessionStatus !== 'connecting'
                }" class="w-2 h-2 rounded-full"></span>
                {{ {
                  connected: '运行中',
                  connecting: '连接中',
                  disconnected: '未启动'
                }[browserSessionStatus] || browserSessionStatus }}
              </span>
            </el-tag>
          </div>

          <el-button-group>
            <el-button v-if="browserSessionStatus !== 'connected'" type="primary" :icon="VideoPlay" :loading="isLoading" @click="handleStartSession">
              启动会话
            </el-button>
            <el-button v-else type="danger" :icon="VideoPause" @click="handleStopSession">
              停止会话
            </el-button>
          </el-button-group>

          <el-button :icon="Refresh" @click="loadBrowserSessionStatus">刷新浏览器状态</el-button>

          <el-button :icon="ArrowLeft" @click="handleBack">返回</el-button>
        </div>
      </template>
    </BiliPageHeader>

    <div v-if="isLoadingInfo" class="flex-1 flex items-center justify-center">
      <div class="text-center">
        <el-icon class="animate-spin" size="40" style="color: var(--el-color-primary)">
          <VideoPause />
        </el-icon>
        <div class="mt-4 text-[var(--el-text-color-secondary)]">加载中...</div>
      </div>
    </div>

    <div v-else class="flex-1 flex flex-col overflow-hidden">
      <div class="flex items-center justify-between px-4 py-2 border-t border-[var(--el-border-color)] bg-[var(--el-fill-color-light)]">
        <div class="flex items-center gap-4">
          <div class="flex items-center gap-2">
            <span class="text-[var(--el-text-color-secondary)] text-sm">WebRTC:</span>
            <el-tag :type="webrtcStatus === 'connected' ? 'success' : webrtcStatus === 'connecting' ? 'warning' : 'info'">
              <span class="flex items-center gap-1">
                <span :class="['w-2 h-2 rounded-full', webrtcStatus === 'connected' ? 'bg-green-500 animate-pulse' : webrtcStatus === 'connecting' ? 'bg-yellow-500 animate-pulse' : 'bg-gray-400']"></span>
                {{ webrtcStatus === 'connected' ? '已连接' : webrtcStatus === 'connecting' ? '连接中' : '未连接' }}
              </span>
            </el-tag>
          </div>

          <el-button size="small" :icon="Refresh" @click="loadWebrtcStatus">刷新WebRTC状态</el-button>

          <div v-if="isStreaming" class="flex items-center gap-2 text-sm">
            <span class="text-[var(--el-text-color-secondary)]">网速:</span>
            <span class="text-green-500">↑ {{ uploadSpeed }}/s</span>
            <span class="text-blue-500">↓ {{ downloadSpeed }}/s</span>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <el-button size="small" :icon="Tools">调试</el-button>
          <el-button size="small" :icon="Camera">截图</el-button>
          <el-button size="small" :icon="FolderChecked">保存</el-button>
          <el-button size="small" type="primary" :icon="Tools">工具箱</el-button>
        </div>
      </div>

      <el-splitter v-model="splitterSize" class="flex-1 min-h-0">
        <el-splitter-panel class="live-box-container" collapsible size="40%" min="30%">
          <LiveBox :browser-id="browserId" :is-streaming="isStreaming" @toggle-stream="handleToggleStream" @webrtc-status-change="(status) => webrtcStatus.value = status"/>
        </el-splitter-panel>
        <el-splitter-panel class="debug-box-container" collapsible min="30%"> 
          <DebugBox :browser-id="browserId" :is-session-connected="browserSessionStatus === 'connected'" />
        </el-splitter-panel>
      </el-splitter>
    </div>
  </FlexContainer>
</template>
