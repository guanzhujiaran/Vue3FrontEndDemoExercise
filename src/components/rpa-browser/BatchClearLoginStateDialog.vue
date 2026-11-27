<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  submitClearLoginStateTask,
  waitOperationTask
} from '@/api/browser/operation_task_api'
import { useUserNavStore } from '@/stores/user_nav'
import {
  COOKIE_BATCH_LIMIT,
  cookieBatchLaunchNotice,
  cookieBatchStatusMeta,
  launchCookieBatchBrowsers,
  loadCookieBatchBrowsers,
  parseCookieDomains,
  type CookieBatchBrowserOption
} from '@/components/rpa-browser/cookieBatchShared'
import type { ClearLoginStateBatchResponse } from '@/api/browser/hey-api/types.gen'

/**
 * 批量清空登录态弹窗（换号）。
 *
 * 语义与单浏览器「清空登录态」一致：清全部站点 cookie（含 HttpOnly）+ 权限授权 +
 * 页面 localStorage / sessionStorage，不关闭、不重建浏览器。
 *
 * 与批量导出一样是**两阶段编排**：
 *
 * 1. 先调批量清空（只处理运行中的浏览器），未启动项返回 `not_running`；
 * 2. 勾选「先启动再清空」时，对未启动项**逐项**调会话创建接口启动
 *    （每项独立请求，超时/失败互不影响，界面显示进度）；
 * 3. 只对刚启动成功的浏览器再清空一次，把结果合并回第一次的响应。
 *
 * 不把启动塞进批量接口：N 个浏览器串行启动会让一个 HTTP 请求跑成分钟级。
 * 破坏性操作，提交前必须二次确认；工作流执行中的项由后端跳过。
 */

interface LaunchProgress {
  current: number
  total: number
}

interface ClearStatusSummary {
  notRunning: number
  workflowRunning: number
  otherFailed: number
}

const props = defineProps<{
  visible: boolean
}>()

const emit = defineEmits<{
  'update:visible': [visible: boolean]
}>()

const userNavStore = useUserNavStore()

const visibleModel = computed({
  get: () => props.visible,
  set: (value: boolean) => emit('update:visible', value)
})

const browsers = ref<CookieBatchBrowserOption[]>([])
const browsersLoading = ref(false)
const selectedBrowserIds = ref<string[]>([])
const domainsText = ref('')
const reloadPages = ref(true)
const launchIfNotRunning = ref(true)
const clearing = ref(false)
const launching = ref(false)
const launchProgress = ref<LaunchProgress>({ current: 0, total: 0 })
/** 任务进度（后端按浏览器逐项推进） */
const taskProgress = ref<LaunchProgress>({ current: 0, total: 0 })
const taskMessage = ref('')
const launchNotice = ref('')
const resultData = ref<ClearLoginStateBatchResponse | null>(null)

const browserNameMap = computed(() => {
  const map = new Map<string, string>()
  for (const browser of browsers.value) {
    map.set(browser.browserId, browser.name)
  }
  return map
})

const selectedCount = computed(() => selectedBrowserIds.value.length)
const overLimit = computed(() => selectedCount.value > COOKIE_BATCH_LIMIT)
const busy = computed(() => clearing.value || launching.value)
const canSubmit = computed(
  () => selectedCount.value > 0 && !overLimit.value && !busy.value
)

const launchPercentage = computed(() => {
  const { current, total } = launchProgress.value
  return total > 0 ? Math.round((current / total) * 100) : 0
})

const taskPercentage = computed(() => {
  const { current, total } = taskProgress.value
  return total > 0 ? Math.round((current / total) * 100) : 0
})

const resultStats = computed(() => {
  const data = resultData.value
  const results = data?.results ?? []
  return {
    total: data?.total_browsers ?? results.length,
    succeeded: data?.succeeded ?? 0,
    failed: data?.failed ?? 0,
    affectedDomains: data?.total_affected_domains ?? 0,
    results
  }
})

const statusSummary = computed<ClearStatusSummary>(() => {
  const summary: ClearStatusSummary = {
    notRunning: 0,
    workflowRunning: 0,
    otherFailed: 0
  }
  for (const item of resultData.value?.results ?? []) {
    if (item.status === 'not_running') {
      summary.notRunning += 1
    } else if (item.status === 'workflow_running') {
      summary.workflowRunning += 1
    } else if (item.status !== 'success') {
      summary.otherFailed += 1
    }
  }
  return summary
})

function browserName(browserId: string) {
  return browserNameMap.value.get(browserId) ?? browserId
}

async function loadBrowsers() {
  browsersLoading.value = true
  browsers.value = await loadCookieBatchBrowsers(userNavStore.user_header)
  browsersLoading.value = false
}

function collectNotRunning(data: ClearLoginStateBatchResponse): string[] {
  return (data.results ?? [])
    .filter((item) => item.status === 'not_running')
    .map((item) => item.browser_id)
}

/** 逐项启动未启动的浏览器，返回启动成功的 id（失败/排队不阻塞其它项） */
async function launchNotRunning(ids: string[]): Promise<string[]> {
  launching.value = true
  launchProgress.value = { current: 0, total: ids.length }
  const outcome = await launchCookieBatchBrowsers(
    ids,
    userNavStore.user_header,
    (current, total) => {
      launchProgress.value = { current, total }
    }
  )
  launching.value = false

  launchNotice.value = cookieBatchLaunchNotice(outcome)
  return outcome.launched
}

/**
 * 提交一次清空任务并轮询到结束，返回逐项结果。
 *
 * 长耗时（逐项启动、页面刷新）全在后台任务里，HTTP 请求立即返回，
 * 不会再出现「前端 504 但操作已生效」。
 */
async function runClearTask(
  browserIds: string[]
): Promise<ClearLoginStateBatchResponse | null> {
  clearing.value = true
  taskMessage.value = '正在提交任务…'
  taskProgress.value = { current: 0, total: browserIds.length }

  const submitted = await submitClearLoginStateTask(
    browserIds,
    userNavStore.user_header,
    {
      domains: parseCookieDomains(domainsText.value),
      reloadPages: reloadPages.value
    }
  )

  if (!submitted.success || !submitted.data) {
    clearing.value = false
    taskMessage.value = ''
    return null
  }

  try {
    const final = await waitOperationTask(
      submitted.data.task_id,
      userNavStore.user_header,
      {
        onUpdate: (status) => {
          taskProgress.value = {
            current: status.progress ?? 0,
            total: status.total ?? browserIds.length
          }
          taskMessage.value = status.message || '执行中…'
        }
      }
    )

    if (final.status === 'failed') {
      ElMessage.error(final.error || '清空任务失败')
      return null
    }
    return final.clear_result ?? null
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '清空任务失败')
    return null
  } finally {
    clearing.value = false
    taskMessage.value = ''
  }
}

/** 只对刚启动成功的项重新清空，并把结果按 browser_id 合并回第一次的响应 */
async function refetchAfterLaunch(
  first: ClearLoginStateBatchResponse,
  launchedIds: string[]
): Promise<ClearLoginStateBatchResponse> {
  if (!launchedIds.length) {
    return first
  }

  const second = await runClearTask(launchedIds)
  if (!second) {
    return first
  }

  const replacement = new Map(
    (second.results ?? []).map((item) => [item.browser_id, item])
  )
  // 保持第一次响应的顺序（= 勾选顺序），只替换刚启动的项
  const results = (first.results ?? []).map(
    (item) => replacement.get(item.browser_id) ?? item
  )
  const succeeded = results.filter((item) => item.status === 'success').length
  const totalAffectedDomains = results
    .filter((item) => item.status === 'success')
    .reduce((sum, item) => sum + (item.affected_domains ?? 0), 0)

  return {
    total_browsers: results.length,
    succeeded,
    failed: results.length - succeeded,
    total_affected_domains: totalAffectedDomains,
    results
  }
}

function notifyDone(data: ClearLoginStateBatchResponse) {
  ElMessage.success(
    `批量清空完成：成功 ${data.succeeded ?? 0} / ${data.total_browsers ?? 0}`
  )
}

async function submit() {
  if (!canSubmit.value) {
    return
  }

  const ids = [...selectedBrowserIds.value]
  const scopeText = parseCookieDomains(domainsText.value).length
    ? `指定站点（${domainsText.value.trim()}）的`
    : '全部站点的'
  const launchHint = launchIfNotRunning.value
    ? '未启动的浏览器会先逐个启动（耗时较长）。'
    : '未启动的浏览器会被跳过。'
  try {
    await ElMessageBox.confirm(
      `将清空选中的 ${ids.length} 个浏览器${scopeText} cookie（含 HttpOnly）与页面登录缓存。` +
        `${launchHint}工作流执行中的浏览器会被跳过。该操作不可撤销，确定继续？`,
      '批量清空登录态',
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

  launchNotice.value = ''
  const first = await runClearTask(ids)
  if (!first) {
    return
  }

  const notRunningIds = collectNotRunning(first)
  if (!launchIfNotRunning.value || !notRunningIds.length) {
    resultData.value = first
    notifyDone(first)
    return
  }

  const launchedIds = await launchNotRunning(notRunningIds)
  const merged = await refetchAfterLaunch(first, launchedIds)
  resultData.value = merged
  notifyDone(merged)
}

function resetState() {
  selectedBrowserIds.value = []
  domainsText.value = ''
  reloadPages.value = true
  launchIfNotRunning.value = true
  clearing.value = false
  launching.value = false
  launchProgress.value = { current: 0, total: 0 }
  taskProgress.value = { current: 0, total: 0 }
  taskMessage.value = ''
  launchNotice.value = ''
  resultData.value = null
}

/** 打开时拉全量浏览器；关闭即丢弃选择与结果 */
watch(visibleModel, (visible) => {
  if (visible) {
    void loadBrowsers()
    return
  }
  resetState()
})
</script>

<template>
  <el-dialog
    v-model="visibleModel"
    title="批量清空登录态"
    width="900px"
    :close-on-click-modal="false"
    lock-scroll
    destroy-on-close
    class="clear-login-batch"
  >
    <div class="clear-login-batch__body flex flex-col gap-3">
      <el-text class="clear-login-batch__hint text-text-secondary">
        清空选中浏览器全部站点的 cookie（含 HttpOnly）与页面登录缓存，用于换号。
        未启动的默认跳过；勾选下方「先启动再清空」会逐个启动它们后自动重试。
        <strong class="clear-login-batch__hint-strong">不关闭、不重建浏览器</strong>。
      </el-text>

      <div class="clear-login-batch__browsers flex items-center gap-2 flex-wrap">
        <el-text class="clear-login-batch__label text-text-secondary">目标浏览器</el-text>
        <el-select
          v-model="selectedBrowserIds"
          class="clear-login-batch__browser-select flex-1 min-w-60"
          multiple
          filterable
          collapse-tags
          collapse-tags-tooltip
          :loading="browsersLoading"
          placeholder="选择要清空登录态的浏览器"
        >
          <el-option
            v-for="browser in browsers"
            :key="browser.browserId"
            :label="browser.name"
            :value="browser.browserId"
          />
        </el-select>
        <el-text class="clear-login-batch__selected text-text-placeholder">
          已选 {{ selectedCount }} / {{ COOKIE_BATCH_LIMIT }}
        </el-text>
      </div>

      <el-alert
        v-if="overLimit"
        class="clear-login-batch__alert"
        type="warning"
        :closable="false"
        show-icon
        :title="`单次最多 ${COOKIE_BATCH_LIMIT} 个浏览器，请分批操作`"
      />

      <div class="clear-login-batch__domains flex items-center gap-2 flex-wrap">
        <el-text class="clear-login-batch__label text-text-secondary">清空站点</el-text>
        <el-input
          v-model="domainsText"
          class="clear-login-batch__domains-input flex-1 min-w-60"
          placeholder="留空 = 全部站点（换号）；多个用逗号或空格分隔，如 bilibili.com"
        />
      </div>

      <el-checkbox v-model="launchIfNotRunning" class="clear-login-batch__launch">
        先启动再清空（未启动的浏览器逐个启动，耗时较长且占用时长配额）
      </el-checkbox>

      <el-checkbox v-model="reloadPages" class="clear-login-batch__reload">
        清空后刷新已打开页面（让站点回到未登录态）
      </el-checkbox>

      <div
        v-if="clearing"
        class="clear-login-batch__progress flex items-center gap-2 flex-wrap"
      >
        <el-progress
          class="clear-login-batch__progress-bar flex-1 min-w-60"
          :percentage="taskPercentage"
          :stroke-width="10"
          :show-text="false"
        />
        <el-text class="clear-login-batch__progress-text text-text-secondary">
          {{ taskMessage || '执行中…' }}（{{ taskProgress.current }} / {{ taskProgress.total }}）
        </el-text>
      </div>

      <div
        v-if="launching"
        class="clear-login-batch__progress flex items-center gap-2 flex-wrap"
      >
        <el-progress
          class="clear-login-batch__progress-bar flex-1 min-w-60"
          :percentage="launchPercentage"
          :stroke-width="10"
          :show-text="false"
        />
        <el-text class="clear-login-batch__progress-text text-text-secondary">
          正在启动 {{ launchProgress.current }} / {{ launchProgress.total }}
        </el-text>
      </div>

      <el-alert
        v-if="launchNotice"
        class="clear-login-batch__launch-notice"
        type="info"
        :closable="false"
        show-icon
        :title="launchNotice"
      />

      <el-alert
        class="clear-login-batch__danger"
        type="error"
        :closable="false"
        show-icon
        title="该操作不可撤销：清空后需要重新登录才能恢复"
      />

      <div v-if="resultData" class="clear-login-batch__results flex flex-col gap-2">
        <el-text class="clear-login-batch__summary text-text-secondary">
          共 {{ resultStats.total }} 个：成功 {{ resultStats.succeeded }}
          （影响 {{ resultStats.affectedDomains }} 个站点）
          <template v-if="statusSummary.notRunning > 0">
            ；未启动 {{ statusSummary.notRunning }}
          </template>
          <template v-if="statusSummary.workflowRunning > 0">
            ；工作流执行中 {{ statusSummary.workflowRunning }}
          </template>
          <template v-if="statusSummary.otherFailed > 0">
            ；其他失败 {{ statusSummary.otherFailed }}
          </template>
        </el-text>

        <el-alert
          v-if="statusSummary.notRunning > 0"
          class="clear-login-batch__not-running"
          type="info"
          :closable="false"
          show-icon
          :title="
            launchIfNotRunning
              ? '未启动的浏览器启动未完成（排队或失败），可稍后重试'
              : '未启动的浏览器无法清空：勾选「先启动再清空」或先到画面页启动'
          "
        />

        <el-table
          class="clear-login-batch__result-table"
          :data="resultStats.results"
          max-height="320"
          border
        >
          <el-table-column label="浏览器" min-width="170">
            <template #default="{ row }">
              <el-text>{{ browserName(row.browser_id) }}</el-text>
            </template>
          </el-table-column>
          <el-table-column label="状态" width="130">
            <template #default="{ row }">
              <el-tag :type="cookieBatchStatusMeta(row.status).type" effect="plain">
                {{ cookieBatchStatusMeta(row.status).label }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="清空页面" width="100">
            <template #default="{ row }">
              <el-text>{{ row.cleared_pages ?? 0 }}</el-text>
            </template>
          </el-table-column>
          <el-table-column label="刷新页面" width="100">
            <template #default="{ row }">
              <el-text>{{ row.reloaded_pages ?? 0 }}</el-text>
            </template>
          </el-table-column>
          <el-table-column label="影响站点" width="100">
            <template #default="{ row }">
              <el-text>{{ row.affected_domains ?? 0 }}</el-text>
            </template>
          </el-table-column>
          <el-table-column prop="message" label="说明" min-width="220" show-overflow-tooltip />
        </el-table>
      </div>
    </div>

    <template #footer>
      <div class="clear-login-batch__footer flex items-center justify-end gap-2">
        <el-button @click="visibleModel = false">关闭</el-button>
        <el-button type="danger" :loading="busy" :disabled="!canSubmit" @click="submit">
          {{ launching ? '启动中…' : '清空选中浏览器' }}
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>
