<template>
  <div class="debug-screenshot flex flex-col h-full bg-[#1e1e1e] rounded-lg overflow-hidden">
    <!-- 头部 -->
    <div class="flex items-center justify-between px-3 py-2 bg-[#252526] border-b border-[#3c3c3c] shrink-0">
      <span class="text-xs font-medium text-[#cccccc]">截图预览</span>
      <div v-if="screenshot" class="flex items-center gap-2">
        <el-button size="small" text @click="downloadScreenshot"><el-icon><Download /></el-icon> 下载</el-button>
        <el-button size="small" text @click="screenshot = null"><el-icon><Close /></el-icon></el-button>
      </div>
    </div>

    <!-- 截图内容区 -->
    <div class="flex-1 flex items-center justify-center p-4 overflow-auto">
      <div v-if="screenshot" class="relative inline-block">
        <img
          :src="screenshot"
          alt="执行截图"
          class="max-w-full max-h-full rounded shadow-lg"
          crossorigin="anonymous"
        />
        <!-- 截图信息覆盖层 -->
        <div class="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs px-3 py-1.5 rounded-b flex items-center justify-between">
          <span>{{ screenshotTime ? formatTime(screenshotTime) : '' }}</span>
          <span>{{ imageSize }}</span>
        </div>
      </div>

      <div v-else class="flex flex-col items-center justify-center text-[#6a6a6a]">
        <el-icon :size="48" class="mb-2"><Picture /></el-icon>
        <span class="text-sm">暂无截图</span>
        <span class="text-xs mt-1">执行操作后将显示截图</span>
      </div>
    </div>

    <!-- 历史记录（可选） -->
    <div v-if="history.length > 0" class="border-t border-[#3c3c3c] shrink-0">
      <div class="px-3 py-2 bg-[#252526] flex items-center justify-between">
        <span class="text-xs font-medium text-[#858585]">历史截图 ({{ history.length }})</span>
        <el-button size="small" text @click="history = []">清除</el-button>
      </div>
      <div class="flex gap-2 p-2 overflow-x-auto">
        <div
          v-for="(item, index) in history.slice(-10).reverse()"
          :key="index"
          class="shrink-0 cursor-pointer rounded overflow-hidden border-2 transition-all hover:border-primary hover:scale-105"
          :class="{ 'border-primary': currentHistoryIndex === history.length - 1 - index }"
          @click="selectHistory(history.length - 1 - index)"
        >
          <img
            :src="item.url"
            class="w-16 h-12 object-cover"
          />
          <div class="bg-black/50 text-white text-[10px] px-1 py-0.5 text-center truncate max-w-[64px]">
            {{ formatTime(item.time) }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import { Picture, Download, Close } from '@element-plus/icons-vue'

const props = defineProps<{
  url?: string
  base64?: string
  timestamp?: number
}>()

const emit = defineEmits<{
  'update:url': [value: string | undefined]
  'update:base64': [value: string | undefined]
}>()

const screenshot = ref<string | undefined>(props.url || props.base64)
const screenshotTime = ref<number | undefined>(props.timestamp)
const currentHistoryIndex = ref(-1)
const imageSize = ref('')

interface ScreenshotHistory {
  url: string
  time: number
}
const history = ref<ScreenshotHistory[]>([])

watch(() => props.url, (val) => {
  if (val) {
    setScreenshot(val)
  }
})

watch(() => props.base64, (val) => {
  if (val) {
    setScreenshot(val)
  }
})

watch(() => props.timestamp, (val) => {
  if (val) {
    screenshotTime.value = val
  }
})

const setScreenshot = (src: string) => {
  if (screenshot.value && screenshot.value !== src) {
    history.value.push({
      url: screenshot.value,
      time: Date.now()
    })
  }
  screenshot.value = src
  screenshotTime.value = Date.now()
  currentHistoryIndex.value = -1

  const img = new Image()
  img.onload = () => {
    imageSize.value = `${img.naturalWidth} × ${img.naturalHeight}`
  }
  img.src = src
}

const selectHistory = (index: number) => {
  if (history.value[index]) {
    screenshot.value = history.value[index].url
    screenshotTime.value = history.value[index].time
    currentHistoryIndex.value = index
  }
}

const downloadScreenshot = async () => {
  if (!screenshot.value) return
  try {
    const response = await fetch(screenshot.value)
    const blob = await response.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `screenshot_${Date.now()}.png`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  } catch (e) {
    console.error('下载失败:', e)
  }
}

const formatTime = (timestamp: number) => {
  return new Date(timestamp).toLocaleTimeString('zh-CN', { hour12: false })
}

onMounted(() => {
  if (props.url || props.base64) {
    setScreenshot(props.url || props.base64!)
  }
})
</script>