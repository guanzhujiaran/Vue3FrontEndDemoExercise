<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import FlexContainer from '@/components/CommonCompo/Bili-Container-Compo/FlexContainer.vue'
import BiliPageHeader from '@/components/CommonCompo/Bili-Container-Compo/BiliPageHeader.vue'
import { 工作流管理Service, 浏览器指纹管理Service } from '@/api/browser/hey-api'
import { useUserNavStore } from '@/stores/user_nav'
import { businessHandler } from '@/utils/businessHandler'
import type { UserBrowserInfo } from '@/models/rpa_browser'
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

const runStatusLabel: Record<string, string> = {
  success: '成功',
  failed: '失败',
  running: '运行中',
  interrupted: '已中断',
}
const runStatusType: Record<string, 'success' | 'danger' | 'warning' | 'info'> = {
  success: 'success',
  failed: 'danger',
  running: 'warning',
  interrupted: 'info',
}

const browserIdText = computed(
  () => browserInfo.value?.browser_id_str || browserInfo.value?.browser_id || browserId.value
)
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
        <el-descriptions-item label="浏览器版本">{{ browserInfo.fingerprint_brand_version || '-' }}
        </el-descriptions-item>
        <el-descriptions-item label="代理服务器">{{ browserInfo.proxy_server || '未配置' }}</el-descriptions-item>
        <el-descriptions-item label="创建时间">{{ formatTime(browserInfo.created_at) }}</el-descriptions-item>
        <el-descriptions-item label="更新时间">{{ formatTime(browserInfo.updated_at) }}</el-descriptions-item>
      </el-descriptions>
      <el-empty v-else description="浏览器不存在或无权访问" />
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
              <el-tag v-if="wf.last_run_status" :type="runStatusType[wf.last_run_status] || 'info'" effect="plain">
                {{ runStatusLabel[wf.last_run_status] || wf.last_run_status }}
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
  </FlexContainer>
</template>
