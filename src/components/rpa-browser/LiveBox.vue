<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted, inject, provide } from 'vue'
import { VideoPlay, VideoPause, Plus, Close } from '@element-plus/icons-vue'
import { openPageApiV1RpaBrowserControlOperationOpenPagePost, closePageApiV1RpaBrowserControlOperationClosePagePost, switchPageApiV1RpaBrowserControlOperationSwitchPagePost, getPagesListApiV1RpaBrowserControlPagesListPost } from '@/api/browser/hey-api'
import { useUserNavStore } from '@/stores/user_nav'
import biliMessage from '@/utils/message'

interface Props {
  browserId: string
  isStreaming: boolean
}

const props = defineProps<Props>()
const emit = defineEmits<{
  (e: 'toggle-stream'): void
  (e: 'webrtc-status-change', status: 'disconnected' | 'connecting' | 'connected'): void
}>()

const userNavStore = useUserNavStore()

const localStream = ref<MediaStream | null>(null)
const peerConnection = ref<RTCPeerConnection | null>(null)
const currentPageIndex = ref(0)
const pageTabs = ref<Array<{ index: number; title: string; url?: string }>>([])
const videoRef = ref<HTMLVideoElement | null>(null)
const isLoadingPages = ref(false)
const webrtcStatus = ref<'disconnected' | 'connecting' | 'connected'>('disconnected')
const browserSessionStatus = inject<string>('browserSessionStatus', 'disconnected')

const getHeaders = () => ({
  'x-bili-mid': userNavStore.user_nav.uid,
  'x-bili-level': String(userNavStore.user_nav.level_info.current_level)
})

const loadPagesList = async () => {
  if (!userNavStore.user_nav.uid) {
    console.warn('User not logged in')
    return
  }
  
  isLoadingPages.value = true
  try {
    const response = await getPagesListApiV1RpaBrowserControlPagesListPost({
      query: { browser_id: props.browserId },
      headers: getHeaders()
    })

    if (response.data?.code === 0 && response.data?.data) {
      const data = response.data.data
      if (data && Array.isArray(data.pages)) {
        pageTabs.value = data.pages.map((page: any, idx: number) => ({
          index: idx,
          title: page.title || `页面 ${idx + 1}`,
          url: page.url
        }))
        if (currentPageIndex.value >= pageTabs.value.length) {
          currentPageIndex.value = 0
        }
      } else if (Array.isArray(data)) {
        pageTabs.value = data.map((page: any, idx: number) => ({
          index: idx,
          title: page.title || `页面 ${idx + 1}`,
          url: page.url
        }))
        if (currentPageIndex.value >= pageTabs.value.length) {
          currentPageIndex.value = 0
        }
      } else {
        console.warn('Pages data is not an array:', data)
      }
    } else {
      console.error('Failed to load pages:', response.data)
      biliMessage.error(response.data?.msg || '获取页面列表失败')
    }
  } catch (error) {
    console.error('Failed to load pages:', error)
    biliMessage.error('网络异常，请稍后重试')
  } finally {
    isLoadingPages.value = false
  }
}

const initWebRTC = async () => {
  if (!props.isStreaming || !videoRef.value) return

  webrtcStatus.value = 'connecting'

  try {
    peerConnection.value = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    })

    peerConnection.value.ontrack = (event) => {
      if (videoRef.value && event.streams[0]) {
        videoRef.value.srcObject = event.streams[0]
        localStream.value = event.streams[0]
        webrtcStatus.value = 'connected'
      }
    }

    peerConnection.value.onicecandidate = (event) => {
      if (event.candidate) {
        console.log('ICE candidate:', event.candidate)
      }
    }

    peerConnection.value.onconnectionstatechange = () => {
      if (peerConnection.value) {
        console.log('WebRTC connection state:', peerConnection.value.connectionState)
        if (peerConnection.value.connectionState === 'connected') {
          webrtcStatus.value = 'connected'
        } else if (peerConnection.value.connectionState === 'disconnected' || 
                   peerConnection.value.connectionState === 'closed' ||
                   peerConnection.value.connectionState === 'failed') {
          webrtcStatus.value = 'disconnected'
        }
      }
    }

  } catch (error) {
    console.error('Failed to initialize WebRTC:', error)
    webrtcStatus.value = 'disconnected'
  }
}

const handleStartStream = () => {
  initWebRTC()
}

const handleStopStream = () => {
  webrtcStatus.value = 'disconnected'
  if (localStream.value) {
    localStream.value.getTracks().forEach(track => track.stop())
    localStream.value = null
  }
  if (peerConnection.value) {
    peerConnection.value.close()
    peerConnection.value = null
  }
  if (videoRef.value) {
    videoRef.value.srcObject = null
  }
}

const handleAddPage = async () => {
  if (!userNavStore.user_nav.uid) {
    biliMessage.warning('请先登录')
    return
  }

  try {
    const response = await openPageApiV1RpaBrowserControlOperationOpenPagePost({
      query: { browser_id: props.browserId },
      headers: getHeaders(),
      body: { url: 'about:blank', page_index: -1 }
    })

    if (response.data?.code === 0) {
      biliMessage.success('新建页面成功')
      await loadPagesList()
    } else {
      biliMessage.error(response.data?.msg || '新建页面失败')
    }
  } catch (error) {
    console.error('Failed to open page:', error)
    biliMessage.error('网络异常，请稍后重试')
  }
}

const handleClosePage = async (index: number) => {
  if (pageTabs.value.length <= 1) {
    biliMessage.warning('至少保留一个页面')
    return
  }

  if (!userNavStore.user_nav.uid) {
    biliMessage.warning('请先登录')
    return
  }

  try {
    const response = await closePageApiV1RpaBrowserControlOperationClosePagePost({
      query: { browser_id: props.browserId },
      headers: getHeaders(),
      body: { page_index: index }
    })

    if (response.data?.code === 0) {
      biliMessage.success('关闭页面成功')
      await loadPagesList()
    } else {
      biliMessage.error(response.data?.msg || '关闭页面失败')
    }
  } catch (error) {
    console.error('Failed to close page:', error)
    biliMessage.error('网络异常，请稍后重试')
  }
}

const handleSwitchPage = async (index: number) => {
  if (currentPageIndex.value === index) return

  if (!userNavStore.user_nav.uid) {
    biliMessage.warning('请先登录')
    return
  }

  try {
    const response = await switchPageApiV1RpaBrowserControlOperationSwitchPagePost({
      query: { browser_id: props.browserId },
      headers: getHeaders(),
      body: { page_index: index }
    })

    if (response.data?.code === 0) {
      currentPageIndex.value = index
      await loadPagesList()
    } else {
      biliMessage.error(response.data?.msg || '切换页面失败')
    }
  } catch (error) {
    console.error('Failed to switch page:', error)
    biliMessage.error('网络异常，请稍后重试')
  }
}

watch(() => props.isStreaming, (newVal) => {
  if (newVal) {
    handleStartStream()
  } else {
    handleStopStream()
  }
})

watch(webrtcStatus, (newVal) => {
  emit('webrtc-status-change', newVal)
})

provide('webrtcStatus', webrtcStatus)

onMounted(() => {
  loadPagesList()
})

onUnmounted(() => {
  handleStopStream()
})
</script>

<template>
  <div class="h-full flex flex-col bg-[var(--el-bg-color)] border border-[var(--el-border-color)] rounded-lg overflow-hidden">
    <div class="flex items-center gap-2 px-4 py-2 border-b border-[var(--el-border-color)] bg-[var(--el-fill-color-light)]">
      <el-tabs v-model="currentPageIndex" type="card" class="flex-1" @tab-click="(tab: any) => handleSwitchPage(tab.index)">
        <el-tab-pane v-for="tab in pageTabs" :key="tab.index" :label="tab.title" :name="tab.index">
          <template #label>
            <div class="flex items-center gap-1">
              <span>{{ tab.title }}</span>
              <el-button v-if="pageTabs.length > 1" size="small" circle :icon="Close" class="!p-1" @click.stop="handleClosePage(tab.index)" />
            </div>
          </template>
        </el-tab-pane>
      </el-tabs>

      <el-button size="small" :icon="Plus" @click="handleAddPage" :loading="isLoadingPages" :disabled="browserSessionStatus !== 'connected'">新建页面</el-button>
      <el-button v-if="!isStreaming" size="small" type="primary" :icon="VideoPlay" @click="emit('toggle-stream')" :disabled="browserSessionStatus !== 'connected'">
        启动直播
      </el-button>
      <el-button v-else size="small" type="danger" :icon="VideoPause" @click="emit('toggle-stream')">
        停止直播
      </el-button>
    </div>

    <div class="flex-1 relative bg-black">
      <video ref="videoRef" class="w-full h-full object-contain" autoplay playsinline></video>

      <div v-if="!isStreaming" class="absolute inset-0 flex items-center justify-center bg-black/50">
        <el-empty description="点击上方启动直播开始监控" />
      </div>
    </div>
  </div>
</template>
