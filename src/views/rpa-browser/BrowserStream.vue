<script setup lang="ts">
import { ref, onMounted, onUnmounted, provide } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { VideoPlay, VideoPause, Refresh, Camera, ArrowLeft } from '@element-plus/icons-vue'
import { ElMessageBox } from 'element-plus'
import BiliPageHeader from '@/components/CommonCompo/Bili-Container-Compo/BiliPageHeader.vue'
import { readFingerprintRouterApiV1RpaBrowserReadFingerprintPost, createBrowserSessionApiV1RpaBrowserControlCreatePost, closeBrowserSessionApiV1RpaBrowserControlClosePost, browserSessionStatusApiV1RpaBrowserControlStatusPost } from '@/api/browser/hey-api'
import { useUserNavStore } from '@/stores/user_nav'
import biliMessage from '@/utils/message'
import LiveBox from '@/components/rpa-browser/LiveBox.vue'
import DebugBox from '@/components/rpa-browser/DebugBox.vue'

const route = useRoute()
const router = useRouter()
const userNavStore = useUserNavStore()

const browserId = route.params.browserId as string
const isStreaming = ref(false)
const isLoading = ref(false)
const browserInfo = ref<any>(null)
const browserSessionStatus = ref<string>('disconnected')
const uploadSpeed = ref('0')
const downloadSpeed = ref('0')
const splitterSize = ref(50)

const loadBrowserInfo = async () => {
  try {
    const response = await readFingerprintRouterApiV1RpaBrowserReadFingerprintPost({
      query: { browser_id: browserId },
      headers: {
        'x-bili-mid': userNavStore.user_nav.uid,
        'x-bili-level': userNavStore.user_nav.level_info.current_level
      }
    })

    if (response.data?.code === 0 && response.data?.data) {
      browserInfo.value = response.data.data
    } else {
      biliMessage.error(response.data?.msg || '获取指纹信息失败')
      router.push('/app/rpa-browser')
    }
  } catch (error) {
    biliMessage.error('网络异常，请稍后重试')
    router.push('/app/rpa-browser')
  }
}

const handleStartSession = async () => {
  isLoading.value = true
  try {
    const response = await createBrowserSessionApiV1RpaBrowserControlCreatePost({
      query: { browser_id: browserId },
      headers: {
        'x-bili-mid': userNavStore.user_nav.uid,
        'x-bili-level': userNavStore.user_nav.level_info.current_level
      }
    })

    if (response.data?.code === 0) {
      biliMessage.success('会话创建成功')
      browserSessionStatus.value = 'connected'
    } else {
      biliMessage.error(response.data?.msg || '创建会话失败')
    }
  } catch (error) {
    biliMessage.error('网络异常，请稍后重试')
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

const handleRefreshStatus = async () => {
  try {
    const response = await browserSessionStatusApiV1RpaBrowserControlStatusPost({
      query: { browser_id: browserId },
      headers: {
        'x-bili-mid': userNavStore.user_nav.uid,
        'x-bili-level': userNavStore.user_nav.level_info.current_level
      }
    })

    if (response.data?.code === 0) {
      browserSessionStatus.value = response.data.data?.status || 'disconnected'
    }
  } catch (error) {
    console.error('Failed to refresh status')
  }
}

const handleBack = () => {
  router.push('/app/rpa-browser')
}

provide('browserId', browserId)
provide('isStreaming', isStreaming)
provide('browserSessionStatus', browserSessionStatus)
provide('uploadSpeed', uploadSpeed)
provide('downloadSpeed', downloadSpeed)

onMounted(() => {
  loadBrowserInfo()
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
  <div class="h-screen flex flex-col bg-[var(--el-bg-color)]">
    <BiliPageHeader :title="browserInfo?.custom_name || `指纹 ${browserId.slice(0, 8)}...`" description="浏览器控制台">
      <template #extra>
        <div class="flex items-center gap-4">
          <el-tag :type="browserSessionStatus === 'connected' ? 'success' : 'info'">
            {{ browserSessionStatus === 'connected' ? '已连接' : '未连接' }}
          </el-tag>

          <div class="flex items-center gap-2 text-sm">
            <span class="text-[var(--el-text-color-secondary)]">网速:</span>
            <span class="text-green-500">↑ {{ uploadSpeed }}/s</span>
            <span class="text-blue-500">↓ {{ downloadSpeed }}/s</span>
          </div>

          <el-button-group>
            <el-button v-if="browserSessionStatus !== 'connected'" type="primary" :icon="VideoPlay" :loading="isLoading" @click="handleStartSession">
              启动
            </el-button>
            <el-button v-else type="danger" :icon="VideoPause" @click="handleStopSession">
              停止
            </el-button>
            <el-button :icon="Refresh" @click="handleRefreshStatus" />
          </el-button-group>

          <el-button :icon="Camera">截图</el-button>

          <el-button :icon="ArrowLeft" @click="handleBack">返回</el-button>
        </div>
      </template>
    </BiliPageHeader>

    <div class="flex-1 min-h-0 p-4">
      <el-splitter v-model="splitterSize" class="h-full">
        <template #primary>
          <LiveBox :browser-id="browserId" :is-streaming="isStreaming" />
        </template>
        <template #secondary>
          <DebugBox :browser-id="browserId" :is-session-connected="browserSessionStatus === 'connected'" />
        </template>
      </el-splitter>
    </div>
  </div>
</template>
