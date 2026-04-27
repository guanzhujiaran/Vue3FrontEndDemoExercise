<!--
 * @FilePath: \Vue3FrontEndDemoExercise\src\views\BrowserConsolePanelView.vue
 * @Description: RPA浏览器控制台 - 面板布局页（左侧 el-menu + 右侧 router-view）
-->
<template>
  <FlexContainer class="h-screen">
    <!-- 控制台子导航栏 -->
    <header
      class="bg-bg flex shrink-0 items-center gap-4 border-b border-(--el-border-color-lighter) px-5 py-3"
    >
      <!-- 返回按钮 -->
      <el-button size="default" plain :icon="ArrowLeft" @click="goBack" round>返回列表</el-button>

      <el-divider direction="vertical" class="mx-1!" />

      <!-- 图标 + 标题 -->
      <el-icon class="text-primary" :size="20"><Monitor /></el-icon>
      <span class="text-base font-semibold">浏览器控制台</span>

      <!-- 浏览器信息 Tags -->
      <template v-if="browserInfo">
        <el-tag size="small" type="info" effect="plain" class="font-mono">
          {{ browserInfo.custom_name || `未命名${browserInfo.id_str || browserId}` }}
        </el-tag>
        <el-tag
          v-if="browserInfo.fingerprint_browser"
          size="small"
          :type="getBrowserTagType(browserInfo.fingerprint_browser)"
          effect="plain"
        >
          {{ browserInfo.fingerprint_browser }}
        </el-tag>
        <el-tag v-if="browserInfo.fingerprint_platform" size="small" type="info" effect="plain">
          {{ browserInfo.fingerprint_platform }}
        </el-tag>
      </template>
      <template v-else-if="loadingInfo">
        <el-skeleton :rows="0" animated style="width: 180px; height: 22px" />
      </template>
      <template v-else>
        <el-tag size="small" type="info" effect="plain" class="font-mono">
          未命名{{ browserId }}
        </el-tag>
      </template>

      <!-- 右侧：browser_id 展示 -->
      <div class="ml-auto flex items-center gap-2 text-xs text-[var(--el-text-color-secondary)]">
        <el-icon><Key /></el-icon>
        <span class="font-mono select-all">{{ browserId }}</span>
        <el-button size="small" text :icon="CopyDocument" @click="copyBrowserId" />
      </div>
    </header>

    <!-- 主体：左侧 menu + 右侧 router-view -->
    <div class="flex flex-1 min-h-0 overflow-hidden bg-bg-page">
      <!-- 左侧导航菜单 -->
      <div
        class="flex flex-col shrink-0 overflow-hidden bg-bg border-r border-(--el-border-color-lighter) transition-[width] duration-200 ease-[ease]"
        :class="isCollapsed ? 'w-[52px]' : 'w-[72px]'"
      >
        <el-menu
          class="console-side-nav-menu"
          :default-active="activeMenu"
          :collapse="isCollapsed"
          :collapse-transition="false"
          router
        >
          <el-menu-item :index="consoleBasePath + '/webrtc'">
            <el-icon><VideoCamera /></el-icon>
            <template #title>实时控制</template>
          </el-menu-item>
          <el-menu-item :index="consoleBasePath + '/visual'">
            <el-icon><Connection /></el-icon>
            <template #title>可视化操作</template>
          </el-menu-item>
          <el-menu-item :index="consoleBasePath + '/custom'">
            <el-icon><Tools /></el-icon>
            <template #title>自定义操作</template>
          </el-menu-item>
          <el-menu-item :index="consoleBasePath + '/debug'">
            <el-icon><Cpu /></el-icon>
            <template #title>Debug 调试</template>
          </el-menu-item>
        </el-menu>

        <!-- 浏览器会话状态 & 操作 -->
        <div class="flex flex-col items-center gap-1.5 px-1.5 py-2 border-t border-(--el-border-color-lighter)">
          <div
            class="flex items-center gap-1.5 text-[11px] leading-tight whitespace-nowrap cursor-default"
            :title="sessionStatusLabel"
          >
            <span
              class="w-2 h-2 rounded-full shrink-0"
              :class="{
                'bg-[var(--el-color-info)]': sessionStatusType === 'info',
                'bg-[var(--el-color-success)] shadow-[0_0_4px_var(--el-color-success-light-5)]': sessionStatusType === 'success',
                'bg-[var(--el-color-warning)] animate-pulse-warn': sessionStatusType === 'warning',
                'bg-[var(--el-color-danger)]': sessionStatusType === 'danger',
              }"
            />
            <span v-if="!isCollapsed" class="text-[var(--el-text-color-secondary)]">{{ sessionStatusLabel }}</span>
          </div>
          <div v-if="!isCollapsed" class="flex gap-1 [&>.el-button]:px-2.5 [&>.el-button]:py-1 [&>.el-button]:text-[11px]">
            <!-- 终止按钮：仅在 running 状态显示 -->
            <el-button
              v-if="operateState === 'running'"
              size="small"
              type="danger"
              plain
              :loading="operateState === 'stopping'"
              :disabled="stopBtnDisabled"
              @click="stopBrowser"
            >
              终止
            </el-button>
            <!-- 启动按钮：idle / launch_failed / launching 状态显示 -->
            <el-button
              v-else
              size="small"
              :type="launchBtnType"
              plain
              :loading="operateState === 'launching'"
              :disabled="operateState === 'launching'"
              @click="startBrowser"
            >
              {{ launchBtnText }}
            </el-button>
          </div>
        </div>

        <!-- 收起/展开按钮 -->
        <div class="flex items-center justify-center py-2 border-t border-(--el-border-color-lighter)">
          <el-button
            text
            :icon="isCollapsed ? Expand : Fold"
            @click="isCollapsed = !isCollapsed"
          />
        </div>
      </div>

      <!-- 右侧内容区 -->
      <div class="flex-1 min-w-0 min-h-0 overflow-y-auto bg-bg">
        <router-view v-slot="{ Component }">
          <component :is="Component" :session-state="sessionState" />
        </router-view>
      </div>
    </div>
  </FlexContainer>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Monitor, ArrowLeft, Key, CopyDocument, VideoCamera, Connection, Tools, Cpu, Fold, Expand } from '@element-plus/icons-vue'
import browserApi, { browserLiveControlApi } from '@/api/browser/browser_api'
import { businessHandler } from '@/utils/businessHandler'
import biliMessage from '@/utils/message'
import type { UserBrowserInfoReadResp } from '@/types/browser-automation-api'
import { RouteName } from '@/models/router/index'

const route = useRoute()
const router = useRouter()

// 从路由参数获取 browserId
const browserId = route.params.browserId as string
const consoleBasePath = computed(() => `/app/browser-console/${browserId}/panel`)

// 当前激活的菜单项
const activeMenu = computed(() => route.path)

const isCollapsed = ref(false)

const browserInfo = ref<UserBrowserInfoReadResp | null>(null)
const loadingInfo = ref(false)

// ===== 浏览器会话状态 =====
interface SessionState {
  session_exists: boolean
  browser_running: boolean
  lifecycle_state: string
  status: string
  message?: string
  active_connections: number
  video_streaming: boolean
  manual_mode: boolean
}

// 前端操作状态机
type OperateState = 'idle' | 'launching' | 'running' | 'launch_failed' | 'stopping'

const sessionState = ref<SessionState | null>(null)

// 监听sessionState变化
watch(sessionState, (newVal) => {
  console.log('[BrowserConsolePanelView] sessionState changed:', newVal)
}, { deep: true })

const statusPollingTimer = ref<ReturnType<typeof setInterval> | null>(null)
const statusPollCount = ref(0)
const STATUS_MAX_POLLS = 3
const STATUS_POLL_INTERVAL = 30000
const launchPollingTimer = ref<ReturnType<typeof setInterval> | null>(null)
const launchPollCount = ref(0)
const LAUNCH_MAX_POLLS = 3       // 最多轮询 3 次
const LAUNCH_POLL_INTERVAL = 30000 // 每 30 秒一次
const operateState = ref<OperateState>('idle')

const sessionStatusLabel = computed(() => {
  if (!sessionState.value) return '未知'
  const { session_exists, browser_running, lifecycle_state } = sessionState.value
  if (!session_exists) return '未启动'
  if (lifecycle_state === 'initializing') return '启动中...'
  if (lifecycle_state === 'running' || browser_running) return '运行中'
  if (lifecycle_state === 'stopping') return '停止中...'
  if (lifecycle_state === 'stopped' || lifecycle_state === 'terminated') return '已停止'
  if (lifecycle_state === 'error') return '异常'
  if (lifecycle_state === 'paused') return '已暂停'
  if (lifecycle_state === 'pending') return '等待中'
  return lifecycle_state || '未知'
})

const sessionStatusType = computed(() => {
  if (!sessionState.value) return 'info' as const
  const { session_exists, browser_running, lifecycle_state } = sessionState.value
  if (!session_exists) return 'info' as const
  if (lifecycle_state === 'running' || browser_running) return 'success' as const
  if (lifecycle_state === 'initializing' || lifecycle_state === 'pending') return 'warning' as const
  if (lifecycle_state === 'error') return 'danger' as const
  return 'info' as const
})

// ===== 启动/终止按钮状态 =====
const launchBtnText = computed(() => {
  switch (operateState.value) {
    case 'launching': return '启动中...'
    case 'launch_failed': return '启动失败'
    default: return '启动'
  }
})

const launchBtnIcon = computed(() => {
  return operateState.value === 'launch_failed' ? 'WarningFilled' : undefined
})

const launchBtnType = computed(() => {
  return operateState.value === 'launch_failed' ? 'danger' as const : 'primary' as const
})

const stopBtnDisabled = computed(() => operateState.value === 'launching' || operateState.value === 'stopping')

// ===== 状态机转换 =====
const refreshSessionStatus = async (): Promise<SessionState | null> => {
  if (!browserId) return null
  try {
    const res = await browserLiveControlApi.getBrowserSessionStatus({ browser_id: browserId })
    // 兼容code为0或200的情况
    if ((res.code === 0 || res.code === 200) && res.data) {
      const data = res.data as any
      // 兼容处理：如果是新的API格式（包含browser_running字段），确保转换为正确的格式
      sessionState.value = {
        session_exists: data.session_exists || true,
        browser_running: data.browser_running || false,
        lifecycle_state: data.lifecycle_state || data.lifecycle_status || 'unknown',
        status: data.status || data.lifecycle_state || data.lifecycle_status || 'unknown',
        message: data.message || '',
        active_connections: data.active_connections || data.connected_clients || 0,
        video_streaming: data.video_streaming || data.video_stream_active || false,
        manual_mode: data.manual_mode || data.manual_operation || false
      }
      console.log('[BrowserConsolePanelView] refreshSessionStatus updated sessionState:', sessionState.value)
      return sessionState.value
    } else if (res.code === 404) {
      sessionState.value = {
        session_exists: false,
        browser_running: false,
        lifecycle_state: 'terminated',
        status: 'terminated',
        message: res.msg || '会话不存在',
        active_connections: 0,
        video_streaming: false,
        manual_mode: false
      }
      return sessionState.value
    }
  } catch {
    // 静默失败
  }
  return null
}

const startLaunchPolling = () => {
  stopLaunchPolling()
  launchPollCount.value = 0
  launchPollingTimer.value = setInterval(async () => {
    launchPollCount.value++
    const state = await refreshSessionStatus()
    if (!state) return

    // 判定是否启动成功
    if (state.browser_running || state.lifecycle_state === 'running' || state.lifecycle_state === 'active' || state.status === 'running') {
      stopLaunchPolling()
      operateState.value = 'running'
      return
    }
    // 后端明确报错
    if (state.lifecycle_state === 'error') {
      stopLaunchPolling()
      operateState.value = 'launch_failed'
      biliMessage.error('浏览器启动失败：' + (state.message || '后端返回异常状态'))
      return
    }
    // 超过上限
    if (launchPollCount.value >= LAUNCH_MAX_POLLS) {
      stopLaunchPolling()
      operateState.value = 'launch_failed'
      biliMessage.error(`浏览器启动超时（已等待 ${(LAUNCH_MAX_POLLS * LAUNCH_POLL_INTERVAL / 1000)}s），请稍后重试`)
    }
  }, LAUNCH_POLL_INTERVAL)
}

const stopLaunchPolling = () => {
  if (launchPollingTimer.value) {
    clearInterval(launchPollingTimer.value)
    launchPollingTimer.value = null
  }
}

const startBrowser = async () => {
  if (!browserId) return
  // 启动失败后可以重试
  operateState.value = 'launching'
  try {
    const result = await businessHandler(
      browserLiveControlApi.createBrowserSession({ browser_id: browserId }),
      { successMessage: '浏览器启动中...', errorMessage: '启动浏览器失败', showSuccessToast: true }
    )
    if (result.success) {
      // create成功后，立即查一次状态
      const state = await refreshSessionStatus()
      if (state && (state.browser_running || state.lifecycle_state === 'running' || state.lifecycle_state === 'active' || state.status === 'running')) {
        // 浏览器已启动成功
        operateState.value = 'running'
      } else {
        // 浏览器未启动，进入轮询等待
        startLaunchPolling()
      }
    } else {
      operateState.value = 'launch_failed'
    }
  } catch {
    operateState.value = 'launch_failed'
  }
}

const stopBrowser = async () => {
  if (!browserId || stopBtnDisabled.value) return
  operateState.value = 'stopping'
  stopLaunchPolling()
  try {
    const result = await businessHandler(
      browserLiveControlApi.triggerSystemCleanup(),
      { successMessage: '浏览器正在关闭...', errorMessage: '关闭浏览器失败', showSuccessToast: true }
    )
    if (result.success) {
      // 等待后端清理完成后回到 idle
      const checkStopped = async (attempts = 0) => {
        if (attempts > 10) {
          operateState.value = 'idle'
          refreshSessionStatus()
          return
        }
        await new Promise(r => setTimeout(r, 2000))
        const state = await refreshSessionStatus()
        if (state && !state.browser_running && !state.session_exists) {
          operateState.value = 'idle'
        } else {
          checkStopped(attempts + 1)
        }
      }
      checkStopped()
    } else {
      operateState.value = 'idle'
    }
  } catch {
    operateState.value = 'idle'
  }
}

const startStatusPolling = () => {
  stopStatusPolling()
  statusPollCount.value = 0
  const poll = () => {
    statusPollCount.value++
    refreshSessionStatus().then((state) => syncOperateStateFromBackend(state))
    if (statusPollCount.value < STATUS_MAX_POLLS) {
      statusPollingTimer.value = setTimeout(poll, STATUS_POLL_INTERVAL)
    } else {
      stopStatusPolling()
    }
  }
  poll()
}

const stopStatusPolling = () => {
  if (statusPollingTimer.value) {
    clearTimeout(statusPollingTimer.value)
    statusPollingTimer.value = null
  }
}

// 状态轮询时，如果检测到后端状态变化，同步状态机
const syncOperateStateFromBackend = (state: SessionState | null) => {
  if (!state) return
  // 不覆盖 launching / stopping 等前端操作进行中的状态
  if (operateState.value === 'launching' || operateState.value === 'stopping') return

  if (state.browser_running || state.lifecycle_state === 'running' || state.lifecycle_state === 'active' || state.status === 'running') {
    operateState.value = 'running'
  } else if (operateState.value === 'running' && !state.browser_running) {
    // 后端从 running 变非 running（比如浏览器自己崩溃了）
    operateState.value = 'idle'
  }
}

// 获取浏览器信息（用于顶栏展示）
const loadBrowserInfo = async () => {
  if (!browserId) return
  loadingInfo.value = true
  try {
    const result = await businessHandler(browserApi.readFingerprint({ id: browserId }), {
      showSuccessToast: false,
      showErrorToast: false
    })
    if (result.success && result.data) {
      browserInfo.value = result.data as UserBrowserInfoReadResp
    }
  } catch {
    // 不影响主功能，顶栏仅展示 id 即可
  } finally {
    loadingInfo.value = false
  }
}

// 返回列表
const goBack = () => {
  router.push({ name: RouteName.BROWSER_MANAGEMENT })
}

// 复制 browser_id
const copyBrowserId = () => {
  navigator.clipboard.writeText(browserId).then(() => {
    biliMessage.success('已复制 Browser ID')
  })
}

// 浏览器类型颜色
const getBrowserTagType = (browser: string): string => {
  const map: Record<string, string> = {
    chrome: 'primary',
    Edge: 'success',
    Opera: 'warning',
    Vivaldi: 'danger'
  }
  return map[browser] || 'info'
}

onMounted(() => {
  loadBrowserInfo()
  startStatusPolling()
})

onBeforeUnmount(() => {
  stopStatusPolling()
  stopLaunchPolling()
})
</script>


