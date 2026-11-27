<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import FlexContainer from '@/components/CommonCompo/Bili-Container-Compo/FlexContainer.vue'
import BiliPageHeader from '@/components/CommonCompo/Bili-Container-Compo/BiliPageHeader.vue'
import ImportCookieDialog from '@/components/rpa-browser/ImportCookieDialog.vue'
import { 工作流管理Service, 浏览器指纹管理Service } from '@/api/browser/hey-api'
import { exportBrowserCookies } from '@/api/browser/cookie_api'
import {
  submitClearLoginStateTask,
  waitOperationTask
} from '@/api/browser/operation_task_api'
import { parseCookieDomains } from '@/components/rpa-browser/cookieBatchShared'
import { formatProxyServer } from '@/utils/rpa/proxy'
import { useUserNavStore } from '@/stores/user_nav'
import { businessHandler } from '@/utils/businessHandler'
import { downloadJsonFile } from '@/utils/rpa/jsonShare'
import type { UserBrowserInfo } from '@/models/rpa_browser'
import { runStatusTagType, runStatusText } from '@/utils/rpa/runDisplay'
import { RouteName } from '@/models/router/index.ts'

/**
 * 浏览器详情页（RPA 浏览器指纹）
 *
 * 入口：工作流管理卡片点击「目标浏览器」标签。
 * 内容：浏览器指纹基本信息 + 关联的工作流（browser_id 指向该浏览器的工作流）。
 */

const route = useRoute()
const router = useRouter()
const userNavStore = useUserNavStore()

const browserId = computed(() => String(route.params.browserId ?? ''))

// ── 浏览器基本信息 ───────────────────────────────────
const browserInfo = ref<UserBrowserInfo | null>(null)
const infoLoading = ref(false)

async function loadBrowserInfo() {
  if (!browserId.value) return
  infoLoading.value = true
  const result = await businessHandler<UserBrowserInfo>(
    浏览器指纹管理Service.readFingerprintRouterApiV1RpaBrowserReadFingerprintPost({
      query: { browser_id: browserId.value },
      headers: userNavStore.user_header,
    }) as any,
    { successMessage: '', errorMessage: '获取浏览器详情失败', showSuccessToast: false }
  )
  if (result.success && result.data) {
    browserInfo.value = result.data
  } else {
    browserInfo.value = null
  }
  infoLoading.value = false
}

const pageTitle = computed(() => browserInfo.value?.custom_name || '浏览器详情')

// ── 关联的工作流 ─────────────────────────────────────
interface WorkflowItem {
  id: number
  name: string
  browser_id: number | null
  trigger_type: string
  trigger_config: Record<string, unknown> | null
  is_enabled: boolean
  last_run_status: string | null
  last_run_at: string | null
  /** 上次运行成功步骤数（无资源记录时展示「成功 N 步」） */
  last_run_success_count?: number
  /** 上次运行步骤总数（用于区分「历史无快照」与「0 步」） */
  last_run_total?: number
  /** 上次运行处理的资源总数（>0 = 批量循环口径） */
  last_run_resource_total?: number
  /** 上次运行资源成功数（= 成功循环轮次） */
  last_run_resource_success?: number
}

const workflows = ref<WorkflowItem[]>([])
const total = ref(0)
const currentPage = ref(1)
const pageSize = ref(10)
const listLoading = ref(false)

async function loadWorkflows() {
  if (!browserId.value) return
  listLoading.value = true
  const result = await businessHandler<{ items?: WorkflowItem[]; total?: number }>(
    工作流管理Service.listWorkflowsApiV1RpaBrowserControlWorkflowsListPost({
      body: {
        page: currentPage.value,
        per_page: pageSize.value,
        filter_type: 'all',
        browser_id: Number(browserId.value),
      },
      headers: userNavStore.user_header,
    }) as any,
    { successMessage: '', errorMessage: '获取关联工作流失败', showSuccessToast: false }
  )
  if (result.success && result.data) {
    workflows.value = result.data.items || []
    total.value = result.data.total || 0
  } else {
    workflows.value = []
    total.value = 0
  }
  listLoading.value = false
}

function reloadAll() {
  loadBrowserInfo()
  currentPage.value = 1
  loadWorkflows()
}

// keep-alive 下同路由不同 browserId 复用同一实例（routeViewKey 取父路径），需监听参数变化重载
watch(browserId, reloadAll)

onMounted(reloadAll)

function handlePageChange(page: number) {
  currentPage.value = page
  loadWorkflows()
}

function goBack() {
  router.push({ name: RouteName.RPA_BROWSER_FINGERPRINT_LIST })
}

// ── 展示辅助 ─────────────────────────────────────────
const formatTime = (t: string | null) => {
  if (!t) return '-'
  return new Date(t).toLocaleString('zh-CN')
}

const cronOf = (wf: WorkflowItem) => {
  const cron = wf.trigger_config?.cron
  return typeof cron === 'string' ? cron : ''
}

const triggerText = (wf: WorkflowItem) =>
  wf.trigger_type === 'cron' ? `定时（${cronOf(wf) || '未配置'}）` : '手动'

/** 上次运行：不给成败结论，只给可数结果（成功循环 N 轮 / 成功 N 步） */
const lastRunText = (wf: WorkflowItem) =>
  runStatusText({
    status: wf.last_run_status,
    success_count: wf.last_run_success_count,
    total_steps: wf.last_run_total,
    resource_total: wf.last_run_resource_total,
    resource_success: wf.last_run_resource_success,
  })

const browserIdText = computed(
  () => browserInfo.value?.browser_id_str || browserInfo.value?.browser_id || browserId.value
)

const majorOf = (version: string | null | undefined): string => (version || '').split('.')[0]

/** 主版本不同 = 非法组合（内核特性集/TLS 对不上），历史脏数据才会出现 */
const isMajorVersionMismatch = computed(() => {
  const info = browserInfo.value
  if (!info?.fingerprint_real_version || !info?.fingerprint_brand_version) return false
  return (
    majorOf(info.fingerprint_real_version) !== majorOf(info.fingerprint_brand_version)
  )
})

/** 同主版本内自定义了 patch（合法） */
const isPatchDiverged = computed(() => {
  const info = browserInfo.value
  if (!info?.fingerprint_real_version || !info?.fingerprint_brand_version) return false
  return info.fingerprint_real_version !== info.fingerprint_brand_version
})

// ── 登录态（Cookie） ──────────────────────────────────
// cookie 的唯一真相源是浏览器 profile：这里只做一次性读取/写入，前端不留副本。
const exportDomains = ref('')
const clearDomains = ref('')
const exporting = ref(false)
const clearingLoginState = ref(false)
const clearingMessage = ref('')
const importCookieVisible = ref(false)

function resolveExportDomains(): string[] {
  return exportDomains.value
    .split(/[,，\s]+/)
    .map((item) => item.trim())
    .filter(Boolean)
}

async function handleExportCookies() {
  if (!browserId.value) {
    return
  }

  exporting.value = true
  const result = await exportBrowserCookies(
    browserId.value,
    resolveExportDomains(),
    userNavStore.user_header,
    // 详情页拿不到会话状态：未启动就先启动，否则永远导不出任何东西
    { launchIfNotRunning: true }
  )
  exporting.value = false

  if (!result.success || !result.data) {
    return
  }

  const launchedHint = result.data.launched ? '（本次启动了浏览器）' : ''
  const cookies = result.data.cookies ?? []
  if (!cookies.length) {
    ElMessage.warning(`${result.data.message || '没有匹配到 cookie'}${launchedHint}`)
    return
  }

  downloadJsonFile(`cookies_${browserIdText.value}_${Date.now()}.json`, cookies)
  ElMessage.success(
    `已导出 ${result.data.cookie_count ?? cookies.length} 条 cookie，覆盖 ${
      result.data.matched_domains?.length ?? 0
    } 个域名${launchedHint}`
  )
}

async function handleClearLoginState() {
  if (!browserId.value) {
    return
  }

  const scopeText = parseCookieDomains(clearDomains.value).length
    ? `指定站点（${clearDomains.value.trim()}）的`
    : '全部站点的'
  try {
    await ElMessageBox.confirm(
      `将清空该浏览器${scopeText} cookie（含 HttpOnly）与页面缓存的登录信息。` +
        '权限授权会整体重置（无法按站点保留）；操作不可撤销，确定继续？',
      '清空登录态',
      {
        type: 'warning',
        confirmButtonText: '清空',
        cancelButtonText: '取消',
        lockScroll: false
      }
    )
  } catch {
    return
  }

  clearingLoginState.value = true
  clearingMessage.value = '正在提交任务…'
  const submitted = await submitClearLoginStateTask(
    [browserId.value],
    userNavStore.user_header,
    { domains: parseCookieDomains(clearDomains.value) }
  )

  if (!submitted.success || !submitted.data) {
    clearingLoginState.value = false
    clearingMessage.value = ''
    return
  }

  try {
    const final = await waitOperationTask(
      submitted.data.task_id,
      userNavStore.user_header,
      {
        onUpdate: (status) => {
          clearingMessage.value = status.message || '清空中…'
        }
      }
    )

    if (final.status === 'failed') {
      ElMessage.error(final.error || '清空任务失败')
      return
    }

    const item = final.clear_result?.results?.[0]
    if (!item) {
      ElMessage.error('任务完成但没有返回结果，请重试')
      return
    }
    if (item.status !== 'success') {
      ElMessage.error(item.message || '清空失败')
      return
    }

    ElMessage.success(
      item.message || `已退出登录，影响 ${item.affected_domains ?? 0} 个站点`
    )
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '清空任务失败')
  } finally {
    clearingLoginState.value = false
    clearingMessage.value = ''
  }
}
</script>

<template>
  <FlexContainer class="min-h-0">
    <BiliPageHeader :title="pageTitle" hide-title description="浏览器指纹详情与关联工作流" tag-text="浏览器详情">
      <template #extra>
        <div class="browser-detail__actions flex items-center gap-2">
          <el-button @click="goBack">返回指纹列表</el-button>
          <el-button type="primary" :loading="infoLoading || listLoading" @click="reloadAll">刷新</el-button>
        </div>
      </template>
    </BiliPageHeader>

    <!-- 基本信息 -->
    <FlexContainer class="browser-detail__info mt-4 bg-bg rounded-2xl p-4">
      <el-skeleton v-if="infoLoading" :rows="4" animated />
      <el-descriptions v-else-if="browserInfo" :column="2" border class="browser-detail__info-grid">
        <el-descriptions-item label="名称">{{ browserInfo.custom_name || '未命名' }}</el-descriptions-item>
        <el-descriptions-item label="Browser ID">{{ browserIdText }}</el-descriptions-item>
        <el-descriptions-item label="浏览器">{{ browserInfo.browser || browserInfo.fingerprint_browser || '-' }}
        </el-descriptions-item>
        <el-descriptions-item label="平台">{{ browserInfo.platform || browserInfo.fingerprint_platform || '-' }}
        </el-descriptions-item>
        <el-descriptions-item label="平台版本">{{ browserInfo.fingerprint_platform_version || '-' }}
        </el-descriptions-item>
        <el-descriptions-item label="模拟版本">
          <span class="browser-detail__brand-version">{{ browserInfo.fingerprint_brand_version || '-' }}</span>
          <el-tag v-if="isMajorVersionMismatch" type="danger" effect="plain" class="browser-detail__version-warning ml-2">
            主版本与真实版本不一致
          </el-tag>
          <el-tag v-else-if="isPatchDiverged" type="info" effect="plain" class="browser-detail__version-custom ml-2">
            同主版本自定义 patch
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="真实版本">
          <span class="browser-detail__real-version">{{ browserInfo.fingerprint_real_version || '-' }}</span>
        </el-descriptions-item>
        <el-descriptions-item label="指纹种子">
          <span class="browser-detail__seed font-mono">{{ browserInfo.fingerprint ?? '-' }}</span>
        </el-descriptions-item>
        <el-descriptions-item label="代理服务器">{{ formatProxyServer(browserInfo.proxy_server) }}</el-descriptions-item>
        <el-descriptions-item label="代理绕过">{{ browserInfo.proxy_bypass || '未配置' }}</el-descriptions-item>
        <el-descriptions-item label="创建时间">{{ formatTime(browserInfo.created_at) }}</el-descriptions-item>
        <el-descriptions-item label="更新时间">{{ formatTime(browserInfo.updated_at) }}</el-descriptions-item>
      </el-descriptions>
      <el-empty v-else description="浏览器不存在或无权访问" />
    </FlexContainer>

    <!-- 登录态（Cookie）：只读导出 / 一次性写入，均由浏览器 profile 持有 -->
    <FlexContainer class="browser-detail__login-state mt-4 bg-bg rounded-2xl p-4">
      <div class="browser-detail__login-state-header flex items-start justify-between gap-3 flex-wrap">
        <div class="browser-detail__login-state-intro min-w-0">
          <el-text class="browser-detail__login-state-title text-text-primary font-medium">
            登录态（Cookie）
          </el-text>
          <el-text class="browser-detail__login-state-desc block mt-1 text-text-secondary">
            Cookie 由浏览器 profile 自行保存与刷新，这里只做一次性读取与写入，服务端不保留副本。
            导出时若浏览器未启动会先启动（耗时较长、占用时长配额）；导入 / 清空仍要求浏览器处于运行状态。
          </el-text>
        </div>

        <div class="browser-detail__login-state-actions flex items-center gap-2 flex-wrap">
          <el-input
            v-model="exportDomains"
            class="browser-detail__login-state-domains w-60"
            placeholder="导出站点，留空=全部"
            clearable
          />
          <el-button type="primary" :loading="exporting" @click="handleExportCookies">
            导出 Cookie
          </el-button>
          <el-button @click="importCookieVisible = true">导入 Cookie</el-button>
          <el-input
            v-model="clearDomains"
            class="browser-detail__login-state-clear-domains w-60"
            placeholder="清空站点，留空=全部"
            clearable
          />
          <el-button
            type="danger"
            plain
            :loading="clearingLoginState"
            @click="handleClearLoginState"
          >
            清空登录态
          </el-button>
        </div>
      </div>
    </FlexContainer>

    <!-- 关联的工作流 -->
    <FlexContainer class="browser-detail__workflows mt-4 flex-1 min-h-0 flex flex-col">
      <div class="browser-detail__workflows-header flex items-center justify-between mb-3">
        <span class="text-sm font-medium">关联的工作流（{{ total }}）</span>
        <span class="text-xs text-gray-400">仅列出以该浏览器为执行目标的工作流</span>
      </div>

      <BiliScrollbar class="flex-1 min-h-0">
        <el-skeleton v-if="listLoading" :rows="3" animated />
        <div v-else-if="workflows.length > 0" class="flex flex-col gap-2">
          <div v-for="wf in workflows" :key="wf.id"
            class="browser-detail__workflow-item flex items-center justify-between gap-3 rounded-lg border border-border-light p-3">
            <div class="flex-1 min-w-0">
              <div class="text-sm font-medium truncate" :title="wf.name">{{ wf.name }}</div>
              <div class="text-xs text-gray-400 mt-1">上次运行：{{ formatTime(wf.last_run_at) }}</div>
            </div>
            <div class="flex items-center gap-2 shrink-0 flex-wrap">
              <el-tag :type="wf.trigger_type === 'cron' ? 'warning' : 'info'" effect="plain">
                {{ triggerText(wf) }}
              </el-tag>
              <el-tag v-if="wf.last_run_status" :type="runStatusTagType(wf.last_run_status)" effect="plain">
                {{ lastRunText(wf) }}
              </el-tag>
              <el-tag :type="wf.is_enabled ? 'success' : 'info'" effect="plain">
                {{ wf.is_enabled ? '已启用' : '已禁用' }}
              </el-tag>
            </div>
          </div>
        </div>
        <el-empty v-else description="暂无关联工作流" />
      </BiliScrollbar>

      <BiliPagination v-if="total > pageSize" class="browser-detail__pagination flex justify-center mt-3 shrink-0"
        hide-on-single-page v-model:current-page="currentPage" :page-size="pageSize" :total="total"
        layout="prev, pager, next, total" @current-change="handlePageChange" />
    </FlexContainer>

    <ImportCookieDialog
      v-model:visible="importCookieVisible"
      :browser-id="browserId"
      :browser-name="browserInfo?.custom_name || browserIdText"
    />
  </FlexContainer>
</template>
