<!--
 * @FilePath: \Vue3FrontEndDemoExercise\src\components\browser\VisualControlPanel.vue
 * @Description: 可视化操作连接面板 - 全面重构，使用统一 executeAction 接口
-->
<template>
  <div class="flex flex-col gap-4">
    <!-- 顶部状态栏 -->
    <div class="flex flex-wrap items-center gap-3 p-4 rounded-xl border border-[var(--el-border-color-lighter)] bg-[var(--el-fill-color-lighter)]">
      <div class="flex items-center gap-2">
        <div :class="['w-2.5 h-2.5 rounded-full transition-all duration-500', sessionStatus?.is_running ? 'bg-green-500 shadow-[0_0_8px_rgba(74,222,128,0.8)] animate-pulse' : 'bg-gray-400']"></div>
        <span class="font-semibold text-sm">{{ sessionStatus?.is_running ? '运行中' : '未启动' }}</span>
      </div>
      <el-divider direction="vertical" />
      <div class="flex items-center gap-1.5 text-sm text-[var(--el-text-color-secondary)]">
        <el-icon><Key /></el-icon>
        <span>{{ browserId }}</span>
      </div>
      <div v-if="sessionStatus?.lifecycle_status" class="flex items-center gap-1.5">
        <el-tag :type="getLifecycleTagType(sessionStatus.lifecycle_status)" size="small" effect="plain">
          {{ sessionStatus.lifecycle_status }}
        </el-tag>
      </div>
      <div v-if="sessionStatus?.session_id" class="flex items-center gap-1.5 text-xs text-[var(--el-text-color-secondary)] font-mono">
        <el-icon><Connection /></el-icon>
        {{ sessionStatus.session_id.slice(0, 16) }}...
      </div>
      <div class="ml-auto flex gap-2">
        <el-button size="small" @click="refreshStatus" :loading="statusLoading" :icon="Refresh" round>
          刷新
        </el-button>
        <el-button
          v-if="!sessionStatus?.is_running"
          type="primary"
          size="small"
          @click="createSession"
          :loading="creatingSession"
          :icon="VideoPlay"
          round
        >
          启动浏览器
        </el-button>
        <el-button
          v-else
          type="danger"
          size="small"
          @click="handleForceRelease"
          :loading="releasing"
          :icon="SwitchButton"
          round
        >
          停止会话
        </el-button>
      </div>
    </div>

    <!-- 主要内容区 -->
    <el-row :gutter="16">
      <!-- 左侧：快捷操作 + 系统操作 -->
      <el-col :xs="24" :lg="14">
        <!-- 快捷操作区 -->
        <div class="mb-4">
          <div class="flex items-center gap-2 mb-3">
            <el-icon class="text-[var(--el-color-primary)]"><Operation /></el-icon>
            <span class="font-semibold text-sm text-[var(--el-text-color-primary)]">快捷操作</span>
          </div>
          <el-row :gutter="12">
            <!-- 实时视频 -->
            <el-col :xs="12" :sm="8" :md="6">
              <div
                class="flex flex-col items-center p-4 rounded-xl border border-[var(--el-border-color-lighter)] bg-[var(--el-bg-color)] cursor-pointer transition-all duration-200 mb-3 select-none group hover:-translate-y-1 hover:shadow-[0_4px_16px_rgba(0,0,0,0.1)] hover:border-[var(--el-color-primary-light-5)]"
                @click="goToWebrtc"
              >
                <div class="w-10 h-10 rounded-lg flex items-center justify-center mb-2 text-white text-lg bg-gradient-to-br from-red-500 to-orange-500">
                  <el-icon><VideoCamera /></el-icon>
                </div>
                <span class="text-sm font-medium text-[var(--el-text-color-primary)] mb-0.5">实时视频</span>
                <span class="text-xs text-[var(--el-text-color-secondary)]">WebRTC 视频流</span>
              </div>
            </el-col>

            <!-- 页面导航 -->
            <el-col :xs="12" :sm="8" :md="6">
              <div
                class="flex flex-col items-center p-4 rounded-xl border border-[var(--el-border-color-lighter)] bg-[var(--el-bg-color)] transition-all duration-200 mb-3 select-none group"
                :class="{ 'opacity-50 cursor-not-allowed': !sessionStatus?.is_running }"
                @click="sessionStatus?.is_running && (showNavigateDialog = true)"
              >
                <div class="w-10 h-10 rounded-lg flex items-center justify-center mb-2 text-white text-lg bg-gradient-to-br from-violet-500 to-purple-600">
                  <el-icon><Link /></el-icon>
                </div>
                <span class="text-sm font-medium text-[var(--el-text-color-primary)] mb-0.5">页面导航</span>
                <span class="text-xs text-[var(--el-text-color-secondary)]">跳转到指定URL</span>
              </div>
            </el-col>

            <!-- 页面截图 -->
            <el-col :xs="12" :sm="8" :md="6">
              <div
                class="flex flex-col items-center p-4 rounded-xl border border-[var(--el-border-color-lighter)] bg-[var(--el-bg-color)] transition-all duration-200 mb-3 select-none group"
                :class="{ 'opacity-50 cursor-not-allowed': !sessionStatus?.is_running, 'cursor-pointer hover:-translate-y-1 hover:shadow-[0_4px_16px_rgba(0,0,0,0.1)] hover:border-[var(--el-color-primary-light-5)]': sessionStatus?.is_running }"
                @click="sessionStatus?.is_running && captureScreenshot()"
              >
                <div class="w-10 h-10 rounded-lg flex items-center justify-center mb-2 text-white text-lg bg-gradient-to-br from-pink-500 to-rose-500">
                  <el-icon><Camera /></el-icon>
                </div>
                <span class="text-sm font-medium text-[var(--el-text-color-primary)] mb-0.5">页面截图</span>
                <span class="text-xs text-[var(--el-text-color-secondary)]">捕获当前页面</span>
              </div>
            </el-col>

            <!-- 执行JS -->
            <el-col :xs="12" :sm="8" :md="6">
              <div
                class="flex flex-col items-center p-4 rounded-xl border border-[var(--el-border-color-lighter)] bg-[var(--el-bg-color)] transition-all duration-200 mb-3 select-none group"
                :class="{ 'opacity-50 cursor-not-allowed': !sessionStatus?.is_running, 'cursor-pointer hover:-translate-y-1 hover:shadow-[0_4px_16px_rgba(0,0,0,0.1)] hover:border-[var(--el-color-primary-light-5)]': sessionStatus?.is_running }"
                @click="sessionStatus?.is_running && (showJsDialog = true)"
              >
                <div class="w-10 h-10 rounded-lg flex items-center justify-center mb-2 text-white text-lg bg-gradient-to-br from-sky-400 to-cyan-500">
                  <el-icon><Document /></el-icon>
                </div>
                <span class="text-sm font-medium text-[var(--el-text-color-primary)] mb-0.5">执行 JS</span>
                <span class="text-xs text-[var(--el-text-color-secondary)]">运行脚本代码</span>
              </div>
            </el-col>

            <!-- 暂停插件 -->
            <el-col :xs="12" :sm="8" :md="6">
              <div
                class="flex flex-col items-center p-4 rounded-xl border border-[var(--el-border-color-lighter)] bg-[var(--el-bg-color)] transition-all duration-200 mb-3 select-none group"
                :class="{ 'opacity-50 cursor-not-allowed': !sessionStatus?.is_running, 'cursor-pointer hover:-translate-y-1 hover:shadow-[0_4px_16px_rgba(0,0,0,0.1)] hover:border-[var(--el-color-primary-light-5)]': sessionStatus?.is_running }"
                @click="sessionStatus?.is_running && togglePlugins()"
              >
                <div class="w-10 h-10 rounded-lg flex items-center justify-center mb-2 text-white text-lg bg-gradient-to-br from-emerald-400 to-teal-500">
                  <el-icon><Setting /></el-icon>
                </div>
                <span class="text-sm font-medium text-[var(--el-text-color-primary)] mb-0.5">插件管理</span>
                <span class="text-xs text-[var(--el-text-color-secondary)]">暂停/恢复插件</span>
              </div>
            </el-col>
          </el-row>
        </div>

        <!-- 系统操作列表 -->
        <div>
          <div class="flex items-center justify-between mb-3">
            <div class="flex items-center gap-2">
              <el-icon class="text-[var(--el-color-primary)]"><List /></el-icon>
              <span class="font-semibold text-sm text-[var(--el-text-color-primary)]">系统操作</span>
              <el-tag type="info" size="small" effect="plain">{{ registeredActions.length }}</el-tag>
            </div>
            <el-button size="small" text @click="fetchRegisteredActions" :loading="loadingActions">
              <el-icon><Refresh /></el-icon>
            </el-button>
          </div>

          <el-scrollbar max-height="380px">
            <div v-if="loadingActions" class="grid grid-cols-2 gap-2">
              <el-skeleton v-for="i in 4" :key="i" :rows="2" animated />
            </div>
            <el-row v-else :gutter="10">
              <el-col
                v-for="action in registeredActions"
                :key="action.id"
                :xs="24"
                :sm="12"
              >
                <div class="p-3 rounded-lg border border-[var(--el-border-color-lighter)] bg-[var(--el-bg-color)] transition-all duration-200 mb-2.5 hover:border-[var(--el-color-primary-light-5)] hover:bg-[var(--el-color-primary-light-9)]">
                  <div class="flex items-start gap-2 mb-2">
                    <el-tag size="small" :type="getActionTagType(action.type)" effect="plain" class="shrink-0 mt-0.5">
                      {{ action.type }}
                    </el-tag>
                    <span class="font-medium text-sm text-[var(--el-text-color-primary)] leading-tight">{{ action.name }}</span>
                  </div>
                  <p class="text-xs text-[var(--el-text-color-secondary)] m-0 mb-2 line-clamp-2 min-h-[2rem]">
                    {{ action.description || '暂无描述' }}
                  </p>
                  <div class="flex items-center justify-between">
                    <code class="text-xs text-[var(--el-color-primary)] bg-[var(--el-color-primary-light-9)] px-1.5 py-0.5 rounded">{{ action.id }}</code>
                    <el-button
                      size="small"
                      type="primary"
                      @click="executeSystemAction(action)"
                      :disabled="!sessionStatus?.is_running"
                      :loading="executingActionId === action.id"
                      plain
                    >
                      <el-icon><CaretRight /></el-icon>
                      执行
                    </el-button>
                  </div>
                </div>
              </el-col>
            </el-row>
            <el-empty v-if="registeredActions.length === 0 && !loadingActions" description="暂无系统操作" :image-size="80" />
          </el-scrollbar>
        </div>
      </el-col>

      <!-- 右侧：截图预览 + 执行结果 -->
      <el-col :xs="24" :lg="10">
        <!-- 截图/预览区 -->
        <el-card class="mb-4" shadow="never" :body-style="{ padding: '12px' }">
          <template #header>
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2 text-sm font-medium">
                <el-icon class="text-[var(--el-color-primary)]"><Monitor /></el-icon>
                页面预览
              </div>
              <div class="flex gap-2">
                <el-button
                  v-if="screenshotUrl"
                  size="small"
                  :icon="Download"
                  text
                  @click="downloadScreenshot"
                  title="下载截图"
                />
                <el-button
                  v-if="screenshotUrl"
                  size="small"
                  :icon="ZoomIn"
                  text
                  @click="showScreenshotDialog = true"
                  title="放大查看"
                />
                <el-button
                  size="small"
                  type="primary"
                  :icon="Camera"
                  text
                  :disabled="!sessionStatus?.is_running"
                  :loading="capturingScreenshot"
                  @click="captureScreenshot"
                  title="截图"
                />
              </div>
            </div>
          </template>
          <div class="relative min-h-[160px] flex items-center justify-center bg-[var(--el-fill-color-darker)] rounded-lg overflow-hidden">
            <img
              v-if="screenshotUrl"
              :src="screenshotUrl"
              alt="页面截图"
              class="max-w-full max-h-[280px] object-contain cursor-zoom-in"
              @click="showScreenshotDialog = true"
            />
            <el-empty v-else :image-size="60" description="点击截图按钮获取画面" />
            <div v-if="screenshotTimestamp" class="absolute bottom-1 right-2 text-xs text-white/60 bg-black/40 px-1.5 py-0.5 rounded">
              {{ screenshotTimestamp }}
            </div>
          </div>
        </el-card>

        <!-- 最近执行结果 -->
        <el-card v-if="lastActionResult" shadow="never" :body-style="{ padding: '12px' }">
          <template #header>
            <div class="flex items-center gap-2 text-sm font-medium">
              <el-icon :class="lastActionResult.success ? 'text-green-500' : 'text-red-500'">
                <component :is="lastActionResult.success ? CircleCheck : CircleClose" />
              </el-icon>
              上次执行结果
              <el-tag :type="lastActionResult.success ? 'success' : 'danger'" size="small" effect="plain" class="ml-auto">
                {{ lastActionResult.success ? '成功' : '失败' }}
              </el-tag>
            </div>
          </template>
          <el-descriptions :column="1" size="small" border>
            <el-descriptions-item label="操作">
              <span class="font-medium text-sm">{{ lastActionResult.action_name }}</span>
            </el-descriptions-item>
            <el-descriptions-item v-if="lastActionResult.execution_time != null" label="耗时">
              {{ lastActionResult.execution_time.toFixed(2) }}s
            </el-descriptions-item>
          </el-descriptions>
          <template v-if="lastActionResult.data">
            <el-divider class="my-2" />
            <pre class="bg-[var(--el-fill-color-light)] rounded p-2 text-xs overflow-x-auto m-0 max-h-[120px]">{{ JSON.stringify(lastActionResult.data, null, 2) }}</pre>
          </template>
          <template v-if="lastActionResult.error">
            <el-divider class="my-2" />
            <p class="text-xs text-[var(--el-color-danger)] bg-[var(--el-color-danger-light-9)] rounded p-2 m-0">{{ lastActionResult.error }}</p>
          </template>
        </el-card>
      </el-col>
    </el-row>

    <!-- 导航对话框 -->
    <el-dialog v-model="showNavigateDialog" title="页面导航" width="480px" align-center>
      <el-form :model="navigateForm" @submit.prevent="handleNavigate">
        <el-form-item label="目标 URL" required>
          <el-input
            v-model="navigateForm.url"
            placeholder="https://example.com"
            clearable
            autofocus
          >
            <template #prefix>
              <el-icon><Link /></el-icon>
            </template>
          </el-input>
        </el-form-item>
        <el-form-item label="等待加载">
          <el-switch v-model="navigateForm.waitLoad" />
          <span class="ml-2 text-xs text-[var(--el-text-color-secondary)]">等待页面完全加载</span>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showNavigateDialog = false">取消</el-button>
        <el-button type="primary" @click="handleNavigate" :loading="navigating" :icon="Link">
          导航
        </el-button>
      </template>
    </el-dialog>

    <!-- JavaScript执行对话框 -->
    <el-dialog v-model="showJsDialog" title="执行 JavaScript" width="640px" align-center>
      <el-alert class="mb-3" type="info" :closable="false" show-icon>
        <template #title>
          代码将在浏览器上下文中执行，使用 <code>return</code> 返回值
        </template>
      </el-alert>
      <el-form :model="jsForm">
        <el-form-item label="代码" required>
          <el-input
            v-model="jsForm.code"
            type="textarea"
            :rows="10"
            placeholder="// 示例: 获取页面标题&#10;return document.title;"
            class="font-mono text-sm"
          />
        </el-form-item>
        <el-form-item label="超时(秒)">
          <el-input-number v-model="jsForm.timeout" :min="1" :max="60" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showJsDialog = false">取消</el-button>
        <el-button type="primary" @click="handleExecuteJs" :loading="executingJs">
          <el-icon><VideoPlay /></el-icon>
          执行
        </el-button>
      </template>
    </el-dialog>

    <!-- 截图放大对话框 -->
    <el-dialog v-model="showScreenshotDialog" title="页面截图" width="90%" align-center>
      <div class="text-center">
        <img
          v-if="screenshotUrl"
          :src="screenshotUrl"
          alt="页面截图"
          class="max-w-full border border-[var(--el-border-color-lighter)] rounded-lg shadow-md"
        />
        <el-empty v-else description="暂无截图" />
      </div>
      <template #footer>
        <el-button @click="showScreenshotDialog = false">关闭</el-button>
        <el-button type="primary" @click="downloadScreenshot" :disabled="!screenshotUrl" :icon="Download">
          下载截图
        </el-button>
      </template>
    </el-dialog>

    <!-- 执行系统操作 - 参数对话框 -->
    <el-dialog
      v-model="showActionParamDialog"
      :title="`执行操作: ${pendingAction?.name}`"
      width="520px"
      align-center
    >
      <el-alert
        v-if="pendingAction?.description"
        class="mb-3"
        type="info"
        :closable="false"
        :description="pendingAction.description"
        show-icon
      />
      <div v-if="pendingAction && pendingAction.parameters && pendingAction.parameters.length > 0">
        <el-form :model="actionParamForm" label-width="100px" size="default">
          <el-form-item
            v-for="param in pendingAction.parameters"
            :key="param.name"
            :label="param.name"
            :required="param.required"
          >
            <el-input
              v-model="actionParamForm[param.name]"
              :placeholder="param.description || `请输入 ${param.name}`"
            />
            <div v-if="param.description" class="text-xs text-[var(--el-text-color-secondary)] mt-1">{{ param.description }}</div>
          </el-form-item>
        </el-form>
      </div>
      <div v-else>
        <el-input
          v-model="actionParamsJsonRaw"
          type="textarea"
          :rows="6"
          placeholder='{"key": "value"}'
          class="font-mono text-sm"
        />
        <div class="flex justify-end gap-2 mt-2">
          <el-button size="small" @click="formatActionParamsJson">格式化</el-button>
          <el-button size="small" @click="actionParamsJsonRaw = '{}'">清空</el-button>
        </div>
      </div>
      <template #footer>
        <el-button @click="showActionParamDialog = false">取消</el-button>
        <el-button type="primary" @click="confirmExecuteSystemAction" :loading="executingSystemAction">
          <el-icon><CaretRight /></el-icon>
          执行
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { RouteName } from '@/models/router/index'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Monitor,
  Refresh,
  VideoPlay,
  Operation,
  Link,
  Camera,
  Document,
  Setting,
  List,
  Key,
  Connection,
  Download,
  ZoomIn,
  CircleCheck,
  CircleClose,
  CaretRight,
  SwitchButton,
  VideoCamera
} from '@element-plus/icons-vue'
import { browserLiveControlApi } from '@/api/browser/browser_api'
import type {
  ActionMetadataResponse,
  BrowserSessionStatus,
  ActionResultResponse
} from '@/types/browser-automation-api'

// Props
const props = defineProps({
  browserId: {
    type: String,
    required: true
  }
})

// 路由
const route = useRoute()
const router = useRouter()

// 状态管理
const statusLoading = ref(false)
const creatingSession = ref(false)
const releasing = ref(false)
const navigating = ref(false)
const executingJs = ref(false)
const loadingActions = ref(false)
const capturingScreenshot = ref(false)
const executingSystemAction = ref(false)
const executingActionId = ref<string>('')

const showNavigateDialog = ref(false)
const showJsDialog = ref(false)
const showScreenshotDialog = ref(false)
const showActionParamDialog = ref(false)
const screenshotUrl = ref('')
const screenshotTimestamp = ref('')

// 数据
const sessionStatus = ref<BrowserSessionStatus | null>(null)
const registeredActions = ref<ActionMetadataResponse[]>([])
const lastActionResult = ref<ActionResultResponse | null>(null)
const pendingAction = ref<ActionMetadataResponse | null>(null)
const actionParamForm = ref<Record<string, any>>({})
const actionParamsJsonRaw = ref('{}')

// 表单
const navigateForm = ref({ url: '', waitLoad: true })
const jsForm = ref({ code: '', timeout: 30 })

// 获取生命周期状态颜色
const getLifecycleTagType = (status: string) => {
  const map: Record<string, any> = {
    running: 'success',
    initializing: 'warning',
    paused: 'info',
    stopping: 'warning',
    stopped: 'info',
    error: 'danger'
  }
  return map[status] || 'info'
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

// 获取浏览器状态
// 注意：getOperationStatus（/control/session/operation/status）后端已删除，只保留 getBrowserSessionStatus
const refreshStatus = async () => {
  statusLoading.value = true
  try {
    console.log('[VisualControlPanel] getBrowserSessionStatus req:', { browser_id: props.browserId })
    const sessionRes = await browserLiveControlApi.getBrowserSessionStatus({ browser_id: props.browserId })
    console.log('[VisualControlPanel] getBrowserSessionStatus res:', sessionRes)
    if (sessionRes.code === 0 && sessionRes.data) {
      sessionStatus.value = sessionRes.data
    }
  } catch (error) {
    console.error('[VisualControlPanel] 获取状态失败:', error)
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

// 强制停止会话（触发系统清理，stopManualOperation 后端已删除）
const handleForceRelease = async () => {
  try {
    await ElMessageBox.confirm(
      '确定要停止当前浏览器会话吗？这将触发系统清理，中断所有正在进行的操作。',
      '停止会话',
      { confirmButtonText: '确定停止', cancelButtonText: '取消', type: 'warning' }
    )
    releasing.value = true
    const res = await browserLiveControlApi.triggerSystemCleanup()
    if (res.code === 0) {
      ElMessage.success('清理完成，会话已停止')
      await refreshStatus()
    } else {
      ElMessage.error(res.msg || '停止失败')
    }
  } catch (e: any) {
    if (e !== 'cancel') {
      ElMessage.error('操作失败')
      console.error(e)
    }
  } finally {
    releasing.value = false
  }
}

// 页面导航 - 通过 executeAction 接口
const handleNavigate = async () => {
  if (!navigateForm.value.url) {
    ElMessage.warning('请输入URL')
    return
  }

  navigating.value = true
  try {
    const res = await browserLiveControlApi.executeAction({
      browser_id: props.browserId,
      req: {
        action_id: 'navigate',
        params: {
          url: navigateForm.value.url,
          wait_for_load: navigateForm.value.waitLoad
        }
      }
    })
    if (res.code === 0 && res.data?.success) {
      ElMessage.success('导航成功')
      showNavigateDialog.value = false
      navigateForm.value.url = ''
      lastActionResult.value = res.data
      // 延迟截图
      setTimeout(captureScreenshot, 1500)
    } else {
      ElMessage.error(res.data?.error || res.msg || '导航失败')
    }
  } catch (error: any) {
    ElMessage.error(error.message || '网络错误')
    console.error(error)
  } finally {
    navigating.value = false
  }
}

// 截图 - 通过 executeAction 接口
const captureScreenshot = async () => {
  if (!sessionStatus.value?.is_running) return
  capturingScreenshot.value = true
  try {
    const res = await browserLiveControlApi.executeAction({
      browser_id: props.browserId,
      req: {
        action_id: 'screenshot',
        params: {}
      }
    })
    if (res.code === 0 && res.data) {
      // screenshot action 返回 base64 图像数据
      if (res.data.data && typeof res.data.data === 'string') {
        const imgData = res.data.data.startsWith('data:')
          ? res.data.data
          : `data:image/png;base64,${res.data.data}`
        screenshotUrl.value = imgData
        screenshotTimestamp.value = new Date().toLocaleTimeString('zh-CN')
      } else if (res.data.data && typeof res.data.data === 'object') {
        const d = res.data.data as any
        if (d.image_base64 || d.screenshot) {
          const raw = d.image_base64 || d.screenshot
          screenshotUrl.value = raw.startsWith('data:') ? raw : `data:image/png;base64,${raw}`
          screenshotTimestamp.value = new Date().toLocaleTimeString('zh-CN')
        }
      }
      lastActionResult.value = res.data
    } else {
      ElMessage.error(res.msg || '截图失败')
    }
  } catch (error: any) {
    ElMessage.error(error.message || '截图失败')
    console.error(error)
  } finally {
    capturingScreenshot.value = false
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

// 执行JavaScript - 通过 executeAction 接口
const handleExecuteJs = async () => {
  if (!jsForm.value.code) {
    ElMessage.warning('请输入JavaScript代码')
    return
  }

  executingJs.value = true
  try {
    const res = await browserLiveControlApi.executeAction({
      browser_id: props.browserId,
      req: {
        action_id: 'execute_javascript',
        params: {
          code: jsForm.value.code,
          timeout: jsForm.value.timeout
        }
      }
    })

    if (res.code === 0 && res.data?.success) {
      ElMessage.success('执行成功')
      lastActionResult.value = res.data
      showJsDialog.value = false
      jsForm.value.code = ''
    } else {
      ElMessage.error(res.data?.error || res.msg || '执行失败')
      if (res.data) lastActionResult.value = res.data
    }
  } catch (error: any) {
    ElMessage.error(error.message || '网络错误')
    console.error(error)
  } finally {
    executingJs.value = false
  }
}

// 切换插件状态
const togglePlugins = async () => {
  try {
    const res = await browserLiveControlApi.pausePlugins({ browser_id: props.browserId })
    if (res.code === 0) {
      ElMessage.success('插件操作成功')
    } else {
      ElMessage.error(res.msg || '操作失败')
    }
  } catch (error) {
    ElMessage.error('网络错误')
    console.error(error)
  }
}

// 系统操作 - 打开参数配置
const executeSystemAction = (action: ActionMetadataResponse) => {
  if (!sessionStatus.value?.is_running) {
    ElMessage.warning('请先启动浏览器会话')
    return
  }
  pendingAction.value = action
  actionParamForm.value = {}
  actionParamsJsonRaw.value = '{}'
  // 预填充默认参数
  if (action.parameters?.length) {
    action.parameters.forEach((p: any) => {
      actionParamForm.value[p.name] = p.default ?? ''
    })
  }
  showActionParamDialog.value = true
}

// 确认执行系统操作
const confirmExecuteSystemAction = async () => {
  if (!pendingAction.value) return
  executingSystemAction.value = true
  executingActionId.value = pendingAction.value.id

  try {
    let params: Record<string, any> = {}
    if (pendingAction.value.parameters?.length) {
      params = { ...actionParamForm.value }
    } else {
      try {
        params = JSON.parse(actionParamsJsonRaw.value || '{}')
      } catch {
        ElMessage.error('JSON 格式错误')
        return
      }
    }

    const res = await browserLiveControlApi.executeAction({
      browser_id: props.browserId,
      req: {
        action_id: pendingAction.value.id,
        params
      }
    })

    if (res.code === 0 && res.data) {
      lastActionResult.value = res.data
      showActionParamDialog.value = false
      if (res.data.success) {
        ElMessage.success(`操作 "${pendingAction.value.name}" 执行成功`)
      } else {
        ElMessage.error(res.data.error || '执行失败')
      }
    } else {
      ElMessage.error(res.msg || '执行失败')
    }
  } catch (error: any) {
    ElMessage.error(error.message || '执行失败')
    console.error(error)
  } finally {
    executingSystemAction.value = false
    executingActionId.value = ''
  }
}

// 格式化操作参数 JSON
const formatActionParamsJson = () => {
  try {
    const obj = JSON.parse(actionParamsJsonRaw.value || '{}')
    actionParamsJsonRaw.value = JSON.stringify(obj, null, 2)
  } catch {
    ElMessage.error('JSON 格式错误')
  }
}

// 获取系统操作列表
const fetchRegisteredActions = async () => {
  loadingActions.value = true
  try {
    console.log('[VisualControlPanel] listRegisteredActions req')
    const res = await browserLiveControlApi.listRegisteredActions()
    console.log('[VisualControlPanel] listRegisteredActions res:', res)
    if (res.code === 0 && res.data) {
      registeredActions.value = res.data
    }
  } catch (error) {
    console.error('[VisualControlPanel] 获取系统操作失败:', error)
  } finally {
    loadingActions.value = false
  }
}

// 初始化
// 跳转到实时控制 tab
const goToWebrtc = () => {
  router.push({ name: RouteName.BROWSER_CONSOLE_WEBRTC, params: { browserId: route.params.browserId } })
}

onMounted(() => {
  console.log('[VisualControlPanel] mounted, browserId:', props.browserId)
  refreshStatus()
  fetchRegisteredActions()
})
</script>


