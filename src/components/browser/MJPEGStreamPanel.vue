<!--
 * @FilePath: \Vue3FrontEndDemoExercise\src\components\browser\MJPEGStreamPanel.vue
 * @Description: MJPEG 实时视频流面板 - 内嵌于 BrowserDebugPanel Tab 中
-->
<template>
  <div class="flex flex-col gap-3 h-full overflow-hidden">
    <!-- 顶部控制栏 -->
    <div class="flex flex-wrap items-center gap-3 p-3 rounded-xl border border-[var(--el-border-color-lighter)] bg-[var(--el-fill-color-lighter)]">
      <!-- 连接状态指示 -->
      <div class="flex items-center gap-2">
        <div :class="[
          'w-2.5 h-2.5 rounded-full transition-all duration-500',
          isStreaming
            ? 'bg-green-500 shadow-[0_0_8px_rgba(74,222,128,0.8)] animate-pulse'
            : 'bg-gray-400'
        ]"></div>
        <span class="text-sm font-semibold">
          {{ isStreaming ? '实时传输中' : '未连接' }}
        </span>
      </div>

      <el-divider direction="vertical" />

      <!-- 连接信息 -->
      <div v-if="sessionState?.lifecycle_state" class="flex items-center gap-3 text-xs text-[var(--el-text-color-secondary)]">
        <span><el-icon><User /></el-icon> {{ activeConnections }} 连接</span>
        <span>
          <el-tag size="small" :type="sessionStatusType" effect="plain">
            {{ sessionStatusText }}
          </el-tag>
        </span>
      </div>

      <div class="ml-auto flex gap-2">
        <!-- 截图按钮 -->
        <el-button
          size="small"
          :icon="Camera"
          plain
          :disabled="!isStreaming"
          :loading="takingScreenshot"
          @click="takeScreenshot"
          round
        >截图</el-button>

        <!-- 开始/停止按钮 -->
        <el-tooltip
          :content="!browserRunning && !isStreaming ? '先启动浏览器' : ''"
          :disabled="browserRunning || isStreaming"
          placement="top"
        >
          <el-button
            v-if="!isStreaming"
            type="primary"
            size="small"
            :icon="VideoPlay"
            :loading="isConnecting"
            :disabled="!browserRunning"
            @click="startVideoStream"
            round
          >
            {{ isConnecting ? '连接中...' : '开始视频' }}
          </el-button>
          <el-button
            v-else
            type="danger"
            size="small"
            :icon="VideoPause"
            @click="stopVideoStream"
            round
          >停止视频</el-button>
        </el-tooltip>
      </div>
    </div>

    <!-- 主内容区：视频 + 控制面板 -->
    <div class="flex gap-3 flex-1 min-h-0">
      <!-- 左侧：视频区域 -->
      <div class="flex-1 flex flex-col min-h-0 min-w-0">
        <!-- 视频容器 - daisyui mockup-browser 样式 -->
        <FlexContainer class="browser border border-base-300 w-full flex-1">
          <!-- 浏览器工具栏 -->
          <div class="browser-toolbar flex flex-col h-auto">
            <!-- 标签页切换栏 - Edge风格 -->
            <div class="flex items-center gap-0.5 px-2 py-1.5 overflow-x-auto scrollbar-thin">
              <!-- 新建页面按钮 -->
              <el-button
                v-if="isStreaming"
                size="small"
                :icon="Plus"
                circle
                class="shrink-0 h-6 w-6 text-xs hover:bg-gray-200/50"
                @click="createNewPage"
                :loading="creatingPage"
              />
              <!-- 标签列表 -->
              <div
                v-for="(page, index) in pagesList"
                :key="page.page_index"
                :class="[
                  'flex items-center gap-1.5 px-3 h-8 rounded-t-lg cursor-pointer transition-all duration-200 shrink-0 group',
                  'border border-b-0 max-w-[200px]',
                  currentPageIndex === page.page_index
                    ? 'bg-[var(--el-fill-color-blank)] border-[var(--el-border-color)] -mb-px z-10'
                    : 'bg-[var(--el-fill-color-light)] border-transparent hover:bg-[var(--el-fill-color)]'
                ]"
                @click="switchToPage(page.page_index)"
              >
                <el-icon class="text-xs shrink-0" :size="14" :class="currentPageIndex === page.page_index ? 'text-[var(--el-color-primary)]' : 'text-[var(--el-text-color-secondary)]'">
                  <Document />
                </el-icon>
                <span class="text-xs truncate max-w-[140px]" :class="currentPageIndex === page.page_index ? 'text-[var(--el-text-color-primary)]' : 'text-[var(--el-text-color-regular)]'">{{ page.title || '新标签页' }}</span>
                <el-icon
                  v-if="pagesList.length > 1"
                  class="text-xs transition-opacity shrink-0"
                  :size="12"
                  @click.stop="closePageByIndex(page.page_index)"
                >
                  <Close />
                </el-icon>
              </div>
            </div>

            <!-- 地址栏 - Edge风格 -->
            <div class="flex items-center gap-2 px-3 py-1.5 border-t border-primary">
              <el-icon class="text-[var(--el-text-color-regular)]" :size="16"><Link /></el-icon>
              <input
                v-model="navigateUrl"
                type="text"
                :placeholder="currentPageUrl || '输入网址或搜索...'"
                class="flex-1 h-7 px-3 text-sm rounded-md border border-primary text-[var(--el-text-color-regular)] placeholder:text-[var(--el-text-color-placeholder)] focus:border-info focus:outline-none focus:ring-1 focus:ring-primary"
                @keyup.enter="handleNavigate"
              />
              <el-button type="primary" size="small" @click="handleNavigate" :loading="navigating" class="h-7 px-3">前往</el-button>
              <el-button
                v-if="isStreaming"
                size="small"
                @click="takeScreenshot"
                :icon="Camera"
                :loading="takingScreenshot"
                class="h-7 rounded-md"
              >截图</el-button>
            </div>
          </div>

          <!-- 浏览器内容区域 -->
          <div
            ref="videoContainer"
            class="relative border-t border-base-300 flex items-center justify-center flex-1"
          >
            <!-- 加载遮罩 -->
            <div v-if="isConnecting" class="absolute inset-0 flex flex-col items-center justify-center bg-base-300/80 z-10 gap-4">
              <el-icon class="is-loading text-base-content" :size="48"><Loading /></el-icon>
              <p class="text-base-content text-sm m-0">正在建立 MJPEG 连接...</p>
            </div>

            <!-- 未连接提示 -->
            <div v-if="!isStreaming && !isConnecting" class="flex flex-col items-center justify-center gap-4 text-base-content/60">
              <el-icon :size="64"><VideoCamera /></el-icon>
              <p class="text-sm m-0">点击"开始视频"建立 MJPEG 连接</p>
              <p class="text-xs m-0 opacity-60">将实时显示浏览器画面</p>
            </div>

            <!-- Canvas 显示视频流 -->
            <canvas
              v-if="isStreaming"
              ref="canvasRef"
              class="max-w-full max-h-full w-full h-full object-contain"
            />
          </div>
        </FlexContainer>
      </div>

      <!-- 右侧：控制面板 -->
      <div class="w-80 flex flex-col min-h-0">
        <!-- 操作面板 -->
        <RealTimeControlModal
          :browser-id="props.browserId"
          @switch-tab="emit('switch-tab', $event)"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { ElMessage as biliMessage, ElMessageBox as biliMessageBox } from 'element-plus'
import {
  VideoPlay,
  VideoPause,
  Camera,
  Document,
  Close,
  Plus,
  Link,
  VideoCamera,
  User,
  Loading
} from '@element-plus/icons-vue'
import RealTimeControlModal from './RealTimeControlModal/RealTimeControlModal.vue'
import FlexContainer from './FlexContainer.vue'
import browserControlApi, { browserLiveControlApi } from '@/api/browser/browser_control_api'
import { useJwtStore } from '@/stores/jwt_token'
import { useUserNavStore } from '@/stores/user_nav'

// Props
const props = defineProps<{
  browserId: string
}>()

const emit = defineEmits(['switch-tab'])

const jwtStore = useJwtStore()
const userNavStore = useUserNavStore()

// === 状态 ===
const isStreaming = ref(false)
const isConnecting = ref(false)
const canvasRef = ref<HTMLCanvasElement>()
const streamAbortController = ref<AbortController | null>(null)

// 会话相关状态
const sessionState = ref<any>(null)
const heartbeatInterval = ref<number | null>(null)
const pageListInterval = ref<number | null>(null)

// 页面相关
const pagesList = ref<any[]>([])
const currentPageIndex = ref(0)
const currentPageUrl = ref('')
const navigateUrl = ref('')
const navigating = ref(false)

// 截图相关
const takingScreenshot = ref(false)

// MJPEG 解析相关
let buffer = new Uint8Array(0)
const SOI = new Uint8Array([0xff, 0xd8]) // JPEG 开始标记
const EOI = new Uint8Array([0xff, 0xd9]) // JPEG 结束标记

// === 计算属性 ===
const browserRunning = computed(() => sessionState.value?.browser_running ?? false)
const activeConnections = computed(() => sessionState.value?.active_connections ?? 0)
const sessionStatusType = computed(() => {
  const state = sessionState.value?.lifecycle_state
  return state === 'active' ? 'success' : state === 'idle' ? 'warning' : 'info'
})
const sessionStatusText = computed(() => {
  const state = sessionState.value?.lifecycle_state
  return state === 'active' ? '运行中' : state === 'idle' ? '空闲' : state || '未知'
})

// === 核心功能：视频流 ===

/** 查找字节序列 */
const findSequence = (data: Uint8Array, seq: Uint8Array): number => {
  for (let i = 0; i <= data.length - seq.length; i++) {
    let match = true
    for (let j = 0; j < seq.length; j++) {
      if (data[i + j] !== seq[j]) {
        match = false
        break
      }
    }
    if (match) return i
  }
  return -1
}

/** 处理 MJPEG 数据块 */
const processMjpegChunk = (chunk: Uint8Array) => {
  if (!canvasRef.value) return

  // 追加到 buffer
  const newBuffer = new Uint8Array(buffer.length + chunk.length)
  newBuffer.set(buffer)
  newBuffer.set(chunk, buffer.length)
  buffer = newBuffer

  // 查找完整的 JPEG 帧
  while (true) {
    const start = findSequence(buffer, SOI)
    const end = findSequence(buffer, EOI)

    if (start >= 0 && end >= 0 && end > start) {
      // 提取完整的 JPEG 帧
      const frame = buffer.subarray(start, end + EOI.length)

      // 渲染到 canvas
      renderFrame(frame)

      // 移除已处理的数据
      buffer = buffer.subarray(end + EOI.length)
    } else {
      break
    }
  }
}

/** 渲染 JPEG 帧到 canvas */
const renderFrame = (frame: Uint8Array) => {
  if (!canvasRef.value) return

  try {
    const blob = new Blob([frame], { type: 'image/jpeg' })
    const url = URL.createObjectURL(blob)

    const img = new Image()
    img.onload = () => {
      const canvas = canvasRef.value!
      const ctx = canvas.getContext('2d')
      if (ctx) {
        // 设置 canvas 大小
        if (canvas.width !== img.naturalWidth || canvas.height !== img.naturalHeight) {
          canvas.width = img.naturalWidth
          canvas.height = img.naturalHeight
        }
        // 绘制图片
        ctx.drawImage(img, 0, 0)
      }
      URL.revokeObjectURL(url)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
    }
    img.src = url

  } catch (e) {
    console.error('[MJPEGStreamPanel] 渲染帧失败:', e)
  }
}

/** 开始 MJPEG 视频流 */
const startVideoStream = async () => {
  if (isStreaming.value || isConnecting.value) return

  const browserId = props.browserId
  isConnecting.value = true
  console.log('[MJPEGStreamPanel] 开始视频流')

  try {
    // 创建 AbortController
    streamAbortController.value = new AbortController()

    // 使用 getMjpegStream 获取流（内部使用 fetch，但配置与 axios 一致）
    const response = await browserControlApi.getMjpegStream(
      {
        browser_id: browserId,
        page_index: currentPageIndex.value
      },
      streamAbortController.value.signal
    )

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    // 获取 reader
    const reader = response.body?.getReader()
    if (!reader) {
      throw new Error('无法读取响应流')
    }

    isStreaming.value = true
    console.log('[MJPEGStreamPanel] 视频流已开始')

    // 启动心跳和页面列表刷新
    startHeartbeat()
    startPageListRefresh()

    // 读取流数据
    const readStream = async () => {
      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          if (value) {
            processMjpegChunk(value)
          }
        }
      } catch (e: any) {
        if (e.name !== 'AbortError') {
          console.error('[MJPEGStreamPanel] 读取流失败:', e)
          biliMessage.error('视频流读取失败')
        }
      } finally {
        await stopVideoStream()
      }
    }

    readStream()

  } catch (e: any) {
    if (e.name !== 'AbortError') {
      console.error('[MJPEGStreamPanel] 开始视频流失败:', e)
      biliMessage.error('开始视频流失败')
    }
  } finally {
    isConnecting.value = false
  }
}

/** 停止 MJPEG 视频流 */
const stopVideoStream = async () => {
  console.log('[MJPEGStreamPanel] 停止视频流')

  // 停止流
  if (streamAbortController.value) {
    streamAbortController.value.abort()
    streamAbortController.value = null
  }

  // 清空 buffer
  buffer = new Uint8Array(0)

  if (isStreaming.value) {
    await browserLiveControlApi.stopMjpegStream({
      browser_id: props.browserId,
      page_index: currentPageIndex.value
    })
  }

  isStreaming.value = false

  // 停止心跳和页面列表刷新
  stopHeartbeat()
  stopPageListRefresh()
}

// === 页面管理 ===

/** 刷新页面列表 */
const refreshPageList = async () => {
  if (!props.browserId) return
  try {
    const res = await browserLiveControlApi.getPageList({ browser_id: props.browserId })
    pagesList.value = res.data || []

    // 更新当前页面 URL
    const currentPage = pagesList.value.find(p => p.page_index === currentPageIndex.value)
    if (currentPage?.url) {
      currentPageUrl.value = currentPage.url
    }
  } catch (e) {
    console.error('[MJPEGStreamPanel] 刷新页面列表失败:', e)
  }
}

/** 切换到指定页面 */
const switchToPage = async (pageIndex: number) => {
  if (pageIndex === currentPageIndex.value) return
  console.log('[MJPEGStreamPanel] 切换到页面:', pageIndex)

  const oldPageIndex = currentPageIndex.value
  currentPageIndex.value = pageIndex

  try {
    // 先切换浏览器页面
    await browserLiveControlApi.switchPage({ browser_id: props.browserId, page_index: pageIndex })

    // 如果正在流中，切换 MJPEG 流
    if (isStreaming.value) {
      await browserLiveControlApi.switchMjpegStream({
        browser_id: props.browserId,
        old_page_index: oldPageIndex,
        new_page_index: pageIndex
      })
      // 重新开始流
      const wasStreaming = isStreaming.value
      await stopVideoStream()
      if (wasStreaming) {
        await startVideoStream()
      }
    }

    await refreshPageList()
    biliMessage.success('页面切换成功')
  } catch (e) {
    console.error('[MJPEGStreamPanel] 页面切换失败:', e)
    biliMessage.error('页面切换失败')
    currentPageIndex.value = oldPageIndex
  }
}

/** 创建新页面 */
const creatingPage = ref(false)
const createNewPage = async () => {
  try {
    creatingPage.value = true
    const newIndex = Math.max(...pagesList.value.map(p => p.page_index)) + 1
    currentPageIndex.value = newIndex
    await refreshPageList()
    biliMessage.success('新页面创建成功')
  } catch (e) {
    console.error('[MJPEGStreamPanel] 创建新页面失败:', e)
    biliMessage.error('创建新页面失败')
  } finally {
    creatingPage.value = false
  }
}

/** 关闭指定页面 */
const closePageByIndex = async (pageIndex: number) => {
  if (pagesList.value.length <= 1) {
    biliMessage.warning('至少保留一个页面')
    return
  }

  try {
    await biliMessageBox.confirm('确定关闭该页面吗?', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    await browserLiveControlApi.closePage({ browser_id: props.browserId, page_index: pageIndex })
    if (currentPageIndex.value === pageIndex) {
      currentPageIndex.value = pagesList.value.find(p => p.page_index !== pageIndex)?.page_index ?? 0
    }
    await refreshPageList()
    biliMessage.success('页面关闭成功')
  } catch (e) {
    if (e !== 'cancel') {
      console.error('[MJPEGStreamPanel] 关闭页面失败:', e)
      biliMessage.error('关闭页面失败')
    }
  }
}

// === 导航 ===

/** 导航到 URL */
const handleNavigate = async () => {
  const url = navigateUrl.value.trim()
  if (!url) return

  navigating.value = true
  try {
    await browserLiveControlApi.executeAction({
      browser_id: props.browserId,
      req: {
        action_id: 'navigate',
        params: { url },
        user_data: { page_index: currentPageIndex.value }
      }
    })
    biliMessage.success('导航成功')
    navigateUrl.value = ''
    // 刷新页面列表以更新 URL
    setTimeout(refreshPageList, 1000)
  } catch (e) {
    console.error('[MJPEGStreamPanel] 导航失败:', e)
    biliMessage.error('导航失败')
  } finally {
    navigating.value = false
  }
}

// === 截图 ===

/** 截图 (使用 canvas) */
const takeScreenshot = async () => {
  if (!canvasRef.value || !isStreaming.value) return

  takingScreenshot.value = true
  try {
    const canvas = canvasRef.value
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9)

    // 下载图片
    const link = document.createElement('a')
    link.download = `screenshot_${Date.now()}.jpg`
    link.href = dataUrl
    link.click()
    biliMessage.success('截图保存成功')
  } catch (e) {
    console.error('[MJPEGStreamPanel] 截图失败:', e)
    biliMessage.error('截图失败')
  } finally {
    takingScreenshot.value = false
  }
}

// === 心跳 ===

/** 启动心跳 */
const startHeartbeat = () => {
  if (heartbeatInterval.value) return
  heartbeatInterval.value = window.setInterval(async () => {
    try {
      await browserLiveControlApi.sendHeartbeat({ browser_id: props.browserId })
    } catch (e) {
      console.error('[MJPEGStreamPanel] 心跳发送失败:', e)
    }
  }, 10000)
}

/** 停止心跳 */
const stopHeartbeat = () => {
  if (heartbeatInterval.value) {
    clearInterval(heartbeatInterval.value)
    heartbeatInterval.value = null
  }
}

/** 刷新会话状态 */
const refreshSessionState = async () => {
  if (!props.browserId) return
  try {
    const res = await browserLiveControlApi.getBrowserSessionStatus({ browser_id: props.browserId })
    sessionState.value = res.data
  } catch (e) {
    console.error('[MJPEGStreamPanel] 刷新会话状态失败:', e)
  }
}

// === 页面列表刷新 ===

/** 启动页面列表刷新 */
const startPageListRefresh = () => {
  if (pageListInterval.value) return
  pageListInterval.value = window.setInterval(refreshPageList, 3000)
}

/** 停止页面列表刷新 */
const stopPageListRefresh = () => {
  if (pageListInterval.value) {
    clearInterval(pageListInterval.value)
    pageListInterval.value = null
  }
}

// === 生命周期 ===

onMounted(async () => {
  await refreshSessionState()
  await refreshPageList()
})

onUnmounted(() => {
  stopHeartbeat()
  stopPageListRefresh()
  if (isStreaming.value) {
    stopVideoStream()
  }
})

// 暴露方法供父组件调用
defineExpose({
  startVideoStream,
  stopVideoStream
})
</script>

<style scoped>
.scrollbar-thin::-webkit-scrollbar {
  height: 6px;
}
.scrollbar-thin::-webkit-scrollbar-thumb {
  background-color: var(--el-border-color);
  border-radius: 3px;
}
</style>
