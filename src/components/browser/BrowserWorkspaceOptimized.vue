<template>
  <div class="browser-workspace-optimized flex h-screen bg-gray-100 overflow-hidden">
    <!-- 主内容区域（左侧） -->
    <main class="main-content flex-1 min-w-0 bg-white shadow-lg relative">
      <!-- 这里放置浏览器视图或其他主要内容 -->
      <div class="h-full flex items-center justify-center text-gray-400">
        <div class="text-center">
          <el-icon :size="64" class="mb-4"><Monitor /></el-icon>
          <p class="text-lg">浏览器主工作区</p>
          <p class="text-sm mt-2">右侧为优化的调试面板</p>
        </div>
      </div>
    </main>

    <!-- 右侧调试栏（优化版） -->
    <aside
      class="debug-sidebar bg-[#f5f5f5] border-l border-gray-200 transition-all duration-300"
      :style="{ width: sidebarWidth }"
    >
      <OptimizedDebugPanel
        ref="optimizedDebugPanelRef"
        browser-id="test-browser-001"
        :browser-running="browserRunning"
        :registered-actions="mockRegisteredActions"
        :loading-actions="loadingActions"
        @log="handleLog"
      />
    </aside>

    <!-- 侧边栏宽度调整手柄 -->
    <div
      class="resize-handle absolute top-0 bottom-0 right-[380px] w-1 cursor-col-resize hover:bg-primary/30 z-20"
      @mousedown="startResize"
    >
      <div class="w-full h-full group-hover:bg-primary/50" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Monitor } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import OptimizedDebugPanel from './right-panel/optimized/OptimizedDebugPanel.vue'

const router = useRouter()

// 状态管理
const optimizedDebugPanelRef = ref<InstanceType<typeof OptimizedDebugPanel> | null>(null)
const sidebarWidth = ref('380px')
const browserRunning = ref(true)
const loadingActions = ref(false)

// 模拟数据：注册的操作列表
const mockRegisteredActions = ref([
  {
    id: 'navigate',
    name: '页面导航',
    type: 'navigation',
    description: '导航到指定URL地址',
    parameters: [
      { name: 'url', type: 'string', required: true, default: '', description: '目标URL' },
      { name: 'timeout', type: 'int', required: false, default: 30000, description: '超时时间(ms)' }
    ]
  },
  {
    id: 'click',
    name: '点击元素',
    type: 'interaction',
    description: '点击页面上的指定元素',
    parameters: [
      { name: 'selector', type: 'string', required: true, default: '', description: 'CSS选择器' },
      { name: 'timeout', type: 'int', required: false, default: 5000, description: '等待时间(ms)' }
    ]
  },
  {
    id: 'input',
    name: '输入文本',
    type: 'interaction',
    description: '在输入框中输入文本内容',
    parameters: [
      { name: 'selector', type: 'string', required: true, default: '', description: 'CSS选择器' },
      { name: 'value', type: 'string', required: true, default: '', description: '输入的文本' },
      { name: 'clear_first', type: 'boolean', required: false, default: true, description: '是否先清空' }
    ]
  },
  {
    id: 'screenshot',
    name: '截图',
    type: 'utility',
    description: '截取当前页面的屏幕截图',
    parameters: [
      { name: 'full_page', type: 'boolean', required: false, default: false, description: '是否全屏截图' }
    ]
  },
  {
    id: 'wait',
    name: '等待',
    type: 'control_flow',
    description: '等待指定的时间或条件',
    parameters: [
      { name: 'duration', type: 'int', required: false, default: 1000, description: '等待时长(ms)' },
      { name: 'selector', type: 'string', required: false, default: '', description: '等待元素出现的选择器' }
    ]
  },
  {
    id: 'extract_text',
    name: '提取文本',
    type: 'extraction',
    description: '从页面元素中提取文本内容',
    parameters: [
      { name: 'selector', type: 'string', required: true, default: '', description: 'CSS选择器' },
      { name: 'attribute', type: 'string', required: false, default: 'textContent', description: '要提取的属性' }
    ]
  }
])

// 方法
const handleLog = (message: string, type: 'info' | 'success' | 'warning' | 'error') => {
  console.log(`[OptimizedDebugPanel] ${type}: ${message}`)

  if (type === 'error') {
    ElMessage.error(message)
  } else if (type === 'success') {
    ElMessage.success(message)
  }
}

// 侧边栏宽度调整
let isResizing = false

const startResize = (e: MouseEvent) => {
  isResizing = true

  const onMouseMove = (ev: MouseEvent) => {
    if (!isResizing) return

    const newWidth = window.innerWidth - ev.clientX
    if (newWidth >= 300 && newWidth <= 600) {
      sidebarWidth.value = `${newWidth}px`
    }
  }

  const onMouseUp = () => {
    isResizing = false
    document.removeEventListener('mousemove', onMouseMove)
    document.removeEventListener('mouseup', onMouseUp)
  }

  document.addEventListener('mousemove', onMouseMove)
  document.addEventListener('mouseup', onMouseUp)
}

// 初始化
onMounted(() => {
  console.log('✅ 优化版浏览器工作区已加载')

  // 模拟加载操作列表
  setTimeout(() => {
    loadingActions.value = false
  }, 500)

  // 示例：监听全局错误并跳转
  // 如果 API 返回 code !== 0，可以调用：
  // handleApiError({ code: -1, msg: '会话已过期' })
})

// 全局错误处理（用户需求）
const handleApiError = (error: { code: number; msg?: string }) => {
  if (error.code !== 0) {
    ElMessage.error(error.msg || `API 错误 (code: ${error.code})`)
    console.error(`[API Error] Code: ${error.code}, Message: ${error.msg}`)

    // 跳转到主页
    setTimeout(() => {
      router.push('/')
    }, 1500)
  }
}

// 暴露给父组件的方法
defineExpose({
  getDebugPanel: () => optimizedDebugPanelRef.value,
  handleApiError
})
</script>

<style scoped>
.browser-workspace-optimized {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.debug-sidebar {
  display: flex;
  flex-direction: column;
  box-shadow: -2px 0 8px rgba(0, 0, 0, 0.05);
}

.resize-handle {
  transition: background-color 0.2s;
}

.resize-handle:hover {
  background-color: rgba(64, 158, 255, 0.3);
}
</style>
