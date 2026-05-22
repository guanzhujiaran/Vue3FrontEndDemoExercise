<script setup lang="ts">
import { ref, watch, onUnmounted } from 'vue'
import { VideoPlay, VideoPause, Plus, Close } from '@element-plus/icons-vue'

interface Props {
  browserId: string
  isStreaming: boolean
}

const props = defineProps<Props>()

const localStream = ref<MediaStream | null>(null)
const peerConnection = ref<RTCPeerConnection | null>(null)
const currentPageIndex = ref(0)
const pageTabs = ref([{ index: 0, title: '页面 1' }])
const videoRef = ref<HTMLVideoElement | null>(null)

const initWebRTC = async () => {
  if (!props.isStreaming || !videoRef.value) return

  try {
    peerConnection.value = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    })

    peerConnection.value.ontrack = (event) => {
      if (videoRef.value && event.streams[0]) {
        videoRef.value.srcObject = event.streams[0]
        localStream.value = event.streams[0]
      }
    }

    peerConnection.value.onicecandidate = (event) => {
      if (event.candidate) {
        console.log('ICE candidate:', event.candidate)
      }
    }

  } catch (error) {
    console.error('Failed to initialize WebRTC:', error)
  }
}

const handleStartStream = () => {
  initWebRTC()
}

const handleStopStream = () => {
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

const handleAddPage = () => {
  const newIndex = pageTabs.value.length
  pageTabs.value.push({ index: newIndex, title: `页面 ${newIndex + 1}` })
  currentPageIndex.value = newIndex
  handleStopStream()
  if (props.isStreaming) {
    handleStartStream()
  }
}

const handleClosePage = (index: number) => {
  if (pageTabs.value.length <= 1) return
  const tabIndex = pageTabs.value.findIndex(tab => tab.index === index)
  pageTabs.value.splice(tabIndex, 1)
  if (currentPageIndex.value === index) {
    currentPageIndex.value = pageTabs.value[0].index
  }
}

const handleSwitchPage = (index: number) => {
  currentPageIndex.value = index
  handleStopStream()
  if (props.isStreaming) {
    handleStartStream()
  }
}

watch(() => props.isStreaming, (newVal) => {
  if (newVal) {
    handleStartStream()
  } else {
    handleStopStream()
  }
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

      <el-button size="small" :icon="Plus" @click="handleAddPage">新建</el-button>

      <el-button v-if="!isStreaming" size="small" type="primary" :icon="VideoPlay" @click="$emit('toggle-stream')">
        启动直播
      </el-button>
      <el-button v-else size="small" type="danger" :icon="VideoPause" @click="$emit('toggle-stream')">
        停止
      </el-button>
    </div>

    <div class="flex-1 relative bg-black">
      <video ref="videoRef" class="w-full h-full object-contain" autoplay playsinline></video>

      <div v-if="!isStreaming" class="absolute inset-0 flex items-center justify-center bg-black/50">
        <el-empty description="点击启动直播开始监控">
          <el-button type="primary" @click="$emit('toggle-stream')">启动直播</el-button>
        </el-empty>
      </div>
    </div>
  </div>
</template>
