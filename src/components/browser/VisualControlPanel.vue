<!--
 * @Author: 星瞳 1944637830@qq.com
 * @Date: 2026-04-11 00:00:00
 * @FilePath: \Vue3FrontEndDemoExercise\src\components\browser\VisualControlPanel.vue
 * @Description: 可视化操作连接面板 - 卡片式展示浏览器控制操作
-->
<template>
  <div class="flex flex-col gap-5">
    <!-- 浏览器状态卡片 -->
    <el-card shadow="hover">
      <template #header>
        <div class="flex items-center gap-2 font-bold">
          <el-icon><Monitor /></el-icon>
          <span>浏览器状态</span>
          <el-tag :type="statusTagType" size="small">{{ statusText }}</el-tag>
        </div>
      </template>
      <div class="mb-4">
        <el-row :gutter="20">
          <el-col :span="8">
            <div class="flex flex-col gap-1">
              <label class="text-[12px] text-[var(--el-text-color-secondary)]">会话ID:</label>
              <span class="text-[14px] text-[var(--el-text-color-primary)] font-medium">{{ browserId }}</span>
            </div>
          </el-col>
          <el-col :span="8">
            <div class="flex flex-col gap-1">
              <label class="text-[12px] text-[var(--el-text-color-secondary)]">运行状态:</label>
              <span class="text-[14px] text-[var(--el-text-color-primary)] font-medium">{{ sessionStatus?.is_running ? '运行中' : '未运行' }}</span>
            </div>
          </el-col>
          <el-col :span="8">
            <div class="flex flex-col gap-1">
              <label class="text-[12px] text-[var(--el-text-color-secondary)]">人工操作:</label>
              <span class="text-[14px] text-[var(--el-text-color-primary)] font-medium">{{ operationStatus?.manual_mode ? '启用' : '禁用' }}</span>
            </div>
          </el-col>
        </el-row>
      </div>
      <div class="flex gap-2 justify-end">
        <el-button size="small" @click="refreshStatus" :loading="statusLoading">
          <el-icon><Refresh /></el-icon>
          刷新状态
        </el-button>
        <el-button
          v-if="!sessionStatus?.is_running"
          type="primary"
          size="small"
          @click="createSession"
          :loading="creatingSession"
        >
          <el-icon><VideoPlay /></el-icon>
          启动浏览器
        </el-button>
        <el-button
          v-else
          type="danger"
          size="small"
          @click="forceRelease"
          :loading="releasing"
        >
          <el-icon><Close /></el-icon>
          强制释放
        </el-button>
      </div>
    </el-card>

    <!-- 快捷操作卡片组 -->
    <div>
      <h3 class="flex items-center gap-2 text-[16px] font-bold text-[var(--el-text-color-primary)] mt-6 mb-4">
        <el-icon><Operation /></el-icon>
        快捷操作
      </h3>
      <el-row :gutter="16">
        <!-- 导航操作 -->
        <el-col :xs="24" :sm="12" :md="8" :lg="6">
          <el-card
            class="cursor-pointer transition-all duration-300 h-full hover:-translate-y-1 hover:shadow-[0_4px_12px_rgba(0,0,0,0.15)]"
            shadow="hover"
            @click="showNavigateDialog = true"
          >
            <div class="w-12 h-12 rounded-lg flex items-center justify-center mb-3 text-[24px] text-white bg-[linear-gradient(135deg,#667eea_0%,#764ba2_100%)]">
              <el-icon><Link /></el-icon>
            </div>
            <div>
              <h4 class="m-0 mb-1 text-[14px] text-[var(--el-text-color-primary)]">页面导航</h4>
              <p class="m-0 text-[12px] text-[var(--el-text-color-secondary)]">跳转到指定URL</p>
            </div>
          </el-card>
        </el-col>

        <!-- 截图操作 -->
        <el-col :xs="24" :sm="12" :md="8" :lg="6">
          <el-card
            class="cursor-pointer transition-all duration-300 h-full hover:-translate-y-1 hover:shadow-[0_4px_12px_rgba(0,0,0,0.15)]"
            shadow="hover"
            @click="captureScreenshot"
          >
            <div class="w-12 h-12 rounded-lg flex items-center justify-center mb-3 text-[24px] text-white bg-[linear-gradient(135deg,#f093fb_0%,#f5576c_100%)]">
              <el-icon><Camera /></el-icon>
            </div>
            <div>
              <h4 class="m-0 mb-1 text-[14px] text-[var(--el-text-color-primary)]">页面截图</h4>
              <p class="m-0 text-[12px] text-[var(--el-text-color-secondary)]">捕获当前页面快照</p>
            </div>
          </el-card>
        </el-col>

        <!-- JavaScript执行 -->
        <el-col :xs="24" :sm="12" :md="8" :lg="6">
          <el-card
            class="cursor-pointer transition-all duration-300 h-full hover:-translate-y-1 hover:shadow-[0_4px_12px_rgba(0,0,0,0.15)]"
            shadow="hover"
            @click="showJsDialog = true"
          >
            <div class="w-12 h-12 rounded-lg flex items-center justify-center mb-3 text-[24px] text-white bg-[linear-gradient(135deg,#4facfe_0%,#00f2fe_100%)]">
              <el-icon><Document /></el-icon>
            </div>
            <div>
              <h4 class="m-0 mb-1 text-[14px] text-[var(--el-text-color-primary)]">执行JS</h4>
              <p class="m-0 text-[12px] text-[var(--el-text-color-secondary)]">运行自定义脚本</p>
            </div>
          </el-card>
        </el-col>

        <!-- 插件管理 -->
        <el-col :xs="24" :sm="12" :md="8" :lg="6">
          <el-card
            class="cursor-pointer transition-all duration-300 h-full hover:-translate-y-1 hover:shadow-[0_4px_12px_rgba(0,0,0,0.15)]"
            shadow="hover"
            @click="togglePlugins"
          >
            <div class="w-12 h-12 rounded-lg flex items-center justify-center mb-3 text-[24px] text-white bg-[linear-gradient(135deg,#43e97b_0%,#38f9d7_100%)]">
              <el-icon><Setting /></el-icon>
            </div>
            <div>
              <h4 class="m-0 mb-1 text-[14px] text-[var(--el-text-color-primary)]">插件管理</h4>
              <p class="m-0 text-[12px] text-[var(--el-text-color-secondary)]">暂停/恢复插件</p>
            </div>
          </el-card>
        </el-col>
      </el-row>
    </div>

    <!-- 系统操作卡片列表 -->
    <div>
      <h3 class="flex items-center gap-2 text-[16px] font-bold text-[var(--el-text-color-primary)] mt-6 mb-4">
        <el-icon><List /></el-icon>
        系统操作
      </h3>
      <el-row :gutter="12">
        <el-col
          v-for="action in registeredActions"
          :key="action.id"
          :xs="24"
          :sm="12"
          :md="8"
          :lg="6"
        >
          <el-card class="mb-3 h-full" shadow="hover">
            <div class="flex items-center gap-2 mb-2">
              <el-tag size="small" :type="getActionTagType(action.type)">
                {{ action.type }}
              </el-tag>
              <span class="font-bold text-[14px] text-[var(--el-text-color-primary)]">{{ action.name }}</span>
            </div>
            <p class="text-[12px] text-[var(--el-text-color-regular)] my-2 min-h-8">{{ action.description }}</p>
            <div class="flex justify-end">
              <el-button
                size="small"
                type="primary"
                @click="executeSystemAction(action)"
                :disabled="!sessionStatus?.is_running"
              >
                执行
              </el-button>
            </div>
          </el-card>
        </el-col>
      </el-row>
      <el-empty v-if="registeredActions.length === 0" description="暂无系统操作" />
    </div>

    <!-- 导航对话框 -->
    <el-dialog v-model="showNavigateDialog" title="页面导航" width="500px">
      <el-form :model="navigateForm" label-width="80px">
        <el-form-item label="URL" required>
          <el-input
            v-model="navigateForm.url"
            placeholder="https://example.com"
            clearable
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showNavigateDialog = false">取消</el-button>
        <el-button type="primary" @click="handleNavigate" :loading="navigating">
          导航
        </el-button>
      </template>
    </el-dialog>

    <!-- JavaScript执行对话框 -->
    <el-dialog v-model="showJsDialog" title="执行JavaScript" width="600px">
      <el-form :model="jsForm" label-width="100px">
        <el-form-item label="代码" required>
          <el-input
            v-model="jsForm.code"
            type="textarea"
            :rows="8"
            placeholder="console.log('Hello World');"
          />
        </el-form-item>
        <el-form-item label="安全模式">
          <el-switch v-model="jsForm.safeMode" />
          <span class="ml-2 text-[12px] text-[var(--el-text-color-secondary)]">启用后将进行安全检查</span>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showJsDialog = false">取消</el-button>
        <el-button type="primary" @click="handleExecuteJs" :loading="executingJs">
          执行
        </el-button>
      </template>
    </el-dialog>

    <!-- 截图预览对话框 -->
    <el-dialog v-model="showScreenshotDialog" title="页面截图" width="800px">
      <div class="text-center">
        <img v-if="screenshotUrl" :src="screenshotUrl" alt="截图" class="max-w-full max-h-[600px] border border-[var(--el-border-color-lighter)] rounded" />
        <el-empty v-else description="暂无截图" />
      </div>
      <template #footer>
        <el-button @click="showScreenshotDialog = false">关闭</el-button>
        <el-button type="primary" @click="downloadScreenshot" :disabled="!screenshotUrl">
          下载截图
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import {
  Monitor,
  Refresh,
  VideoPlay,
  Close,
  Operation,
  Link,
  Camera,
  Document,
  Setting,
  List
} from '@element-plus/icons-vue'
import { browserLiveControlApi } from '@/api/browser/browser_api'
import type {
  ActionMetadataResponse,
  BrowserSessionStatus
} from '@/types/browser-automation-api'

// Props
const props = defineProps({
  browserId: {
    type: String,
    required: true
  }
})

// 状态管理
const statusLoading = ref(false)
const creatingSession = ref(false)
const releasing = ref(false)
const navigating = ref(false)
const executingJs = ref(false)
const showNavigateDialog = ref(false)
const showJsDialog = ref(false)
const showScreenshotDialog = ref(false)
const screenshotUrl = ref('')

// 数据
const sessionStatus = ref<BrowserSessionStatus | null>(null)
const operationStatus = ref<any>(null)
const registeredActions = ref<ActionMetadataResponse[]>([])

// 表单
const navigateForm = ref({ url: '' })
const jsForm = ref({ code: '', safeMode: true })

// 计算属性
const statusText = computed(() => {
  if (!sessionStatus.value) return '未知'
  return sessionStatus.value.is_running ? '运行中' : '未启动'
})

const statusTagType = computed(() => {
  if (!sessionStatus.value) return 'info'
  return sessionStatus.value.is_running ? 'success' : 'info'
})

// 获取浏览器状态
const refreshStatus = async () => {
  statusLoading.value = true
  try {
    const [sessionRes, operationRes] = await Promise.all([
      browserLiveControlApi.getBrowserSessionStatus({ browser_id: props.browserId }),
      browserLiveControlApi.getOperationStatus({ browser_id: props.browserId })
    ])

    if (sessionRes.code === 0 && sessionRes.data) {
      sessionStatus.value = sessionRes.data
    }
    if (operationRes.code === 0 && operationRes.data) {
      operationStatus.value = operationRes.data
    }
  } catch (error) {
    ElMessage.error('获取状态失败')
    console.error(error)
  } finally {
    statusLoading.value = false
  }
}

// 创建会话
const createSession = async () => {
  creatingSession.value = true
  try {
    const res = await browserLiveControlApi.createBrowserSession({
      browser_id: props.browserId
    })
    if (res.code === 0) {
      ElMessage.success('浏览器启动成功')
      await refreshStatus()
    } else {
      ElMessage.error(res.msg || '启动失败')
    }
  } catch (error) {
    ElMessage.error('网络错误')
    console.error(error)
  } finally {
    creatingSession.value = false
  }
}

// 强制释放
const forceRelease = async () => {
  releasing.value = true
  try {
    const res = await browserLiveControlApi.forceReleaseBrowser(props.browserId)
    if (res.code === 0) {
      ElMessage.success('浏览器已释放')
      await refreshStatus()
    } else {
      ElMessage.error(res.msg || '释放失败')
    }
  } catch (error) {
    ElMessage.error('网络错误')
    console.error(error)
  } finally {
    releasing.value = false
  }
}

// 页面导航
const handleNavigate = async () => {
  if (!navigateForm.value.url) {
    ElMessage.warning('请输入URL')
    return
  }

  navigating.value = true
  try {
    const res = await browserLiveControlApi.navigateToUrl({
      browser_id: props.browserId,
      request: { url: navigateForm.value.url }
    })
    if (res.code === 0) {
      // 静默成功，仅在失败时提示
      showNavigateDialog.value = false
      navigateForm.value.url = ''
    } else {
      ElMessage.error(res.msg || '导航失败')
    }
  } catch (error) {
    ElMessage.error('网络错误')
    console.error(error)
  } finally {
    navigating.value = false
  }
}

// 截图
const captureScreenshot = async () => {
  try {
    const blob = await browserLiveControlApi.getScreenshot(props.browserId)
    screenshotUrl.value = URL.createObjectURL(blob)
    showScreenshotDialog.value = true
  } catch (error) {
    ElMessage.error('截图失败')
    console.error(error)
  }
}

// 下载截图
const downloadScreenshot = () => {
  if (!screenshotUrl.value) return
  const a = document.createElement('a')
  a.href = screenshotUrl.value
  a.download = `screenshot-${Date.now()}.png`
  a.click()
}

// 执行JavaScript
const handleExecuteJs = async () => {
  if (!jsForm.value.code) {
    ElMessage.warning('请输入JavaScript代码')
    return
  }

  executingJs.value = true
  try {
    const api = jsForm.value.safeMode
      ? browserLiveControlApi.safeExecuteJavaScript
      : browserLiveControlApi.executeJavaScript

    const res = await api({
      browser_id: props.browserId,
      request: { code: jsForm.value.code }
    })

    if (res.code === 0) {
      // 静默成功，结果输出到控制台
      console.log('JS执行结果:', res.data)
      showJsDialog.value = false
      jsForm.value.code = ''
    } else {
      ElMessage.error(res.msg || '执行失败')
    }
  } catch (error) {
    ElMessage.error('网络错误')
    console.error(error)
  } finally {
    executingJs.value = false
  }
}

// 切换插件状态
const togglePlugins = async () => {
  try {
    const res = await browserLiveControlApi.pausePlugins({ browser_id: props.browserId })
    if (res.code !== 0) {
      // 仅在失败时提示
      ElMessage.error(res.msg || '操作失败')
    }
  } catch (error) {
    ElMessage.error('网络错误')
    console.error(error)
  }
}

// 获取操作标签类型
const getActionTagType = (type: string) => {
  const typeMap: Record<string, any> = {
    navigation: 'primary',
    interaction: 'success',
    extraction: 'warning',
    utility: 'info'
  }
  return typeMap[type] || ''
}

// 执行系统操作
const executeSystemAction = async (action: ActionMetadataResponse) => {
  ElMessage.info(`执行操作: ${action.name}`)
  // TODO: 实现具体操作执行逻辑
}

// 获取系统操作列表
const fetchRegisteredActions = async () => {
  try {
    const res = await browserLiveControlApi.listRegisteredActions()
    if (res.code === 0 && res.data) {
      registeredActions.value = res.data
    }
  } catch (error) {
    console.error('获取系统操作失败:', error)
  }
}

// 初始化
onMounted(() => {
  refreshStatus()
  fetchRegisteredActions()
})
</script>
