<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { exportBrowserCookiesBatch } from '@/api/browser/cookie_api'
import { useUserNavStore } from '@/stores/user_nav'
import { downloadJsonFile } from '@/utils/rpa/jsonShare'
import {
  COOKIE_BATCH_LIMIT,
  cookieBatchLaunchNotice,
  cookieBatchStatusMeta,
  cookieBatchTimestampText,
  launchCookieBatchBrowsers,
  loadCookieBatchBrowsers,
  parseCookieDomains,
  type CookieBatchBrowserOption
} from '@/components/rpa-browser/cookieBatchShared'
import type {
  CookieData,
  ExportCookiesBatchItemResult,
  ExportCookiesBatchResponse
} from '@/api/browser/hey-api/types.gen'

/**
 * 批量导出 Cookie 弹窗。
 *
 * 编排是**两阶段**的，而不是在批量接口里串行启动浏览器：
 *
 * 1. 先调批量导出（纯只读，秒级返回）：已启动的浏览器直接拿到 cookie，
 *    未启动的项返回 `not_running`；
 * 2. 勾选「先启动再导出」时，对未启动项**逐项**调用会话创建接口启动
 *    （每项独立请求，超时/失败互不影响，界面能显示进度）；
 * 3. 只对刚启动成功的浏览器再发起一次批量导出，把结果合并回第一次的结果。
 *
 * 为什么不把启动塞进批量导出：N 个浏览器串行启动会让一个 HTTP 请求跑成分钟级，
 * 撞上网关读超时后前端报失败、后端仍在启动，用户既看不到进度也不知道是否生效。
 *
 * 只读约束不变：cookie 只在内存中流转并交给下载，不落任何前端存储。
 */

/** 聚合下载文件：顶层就是数组，一组 = 一个浏览器，顺序与勾选顺序一致 */
interface CookieBatchExportGroup {
  browser_id: string
  browser_name: string
  cookies: CookieData[]
}

interface LaunchProgress {
  current: number
  total: number
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
const launchIfNotRunning = ref(true)
const exporting = ref(false)
const launching = ref(false)
const launchProgress = ref<LaunchProgress>({ current: 0, total: 0 })
const launchNotice = ref('')
const resultData = ref<ExportCookiesBatchResponse | null>(null)

const browserNameMap = computed(() => {
  const map = new Map<string, string>()
  for (const browser of browsers.value) {
    map.set(browser.browserId, browser.name)
  }
  return map
})

const selectedCount = computed(() => selectedBrowserIds.value.length)
const overLimit = computed(() => selectedCount.value > COOKIE_BATCH_LIMIT)
const busy = computed(() => exporting.value || launching.value)
const canSubmit = computed(
  () => selectedCount.value > 0 && !overLimit.value && !busy.value
)

const launchPercentage = computed(() => {
  const { current, total } = launchProgress.value
  return total > 0 ? Math.round((current / total) * 100) : 0
})

const resultStats = computed(() => {
  const data = resultData.value
  const results = data?.results ?? []
  return {
    total: data?.total_browsers ?? results.length,
    succeeded: data?.succeeded ?? 0,
    failed: data?.failed ?? 0,
    totalCookieCount: data?.total_cookie_count ?? 0,
    results
  }
})

function browserName(browserId: string) {
  return browserNameMap.value.get(browserId) ?? browserId
}

async function loadBrowsers() {
  browsersLoading.value = true
  browsers.value = await loadCookieBatchBrowsers(userNavStore.user_header)
  browsersLoading.value = false
}

/** 只把「成功且有 cookie」的项写进文件；顺序沿用后端 results（与勾选顺序一致） */
function buildExportGroups(data: ExportCookiesBatchResponse): CookieBatchExportGroup[] {
  const groups: CookieBatchExportGroup[] = []
  for (const item of data.results ?? []) {
    if (item.status !== 'success' || (item.cookie_count ?? 0) <= 0) {
      continue
    }
    groups.push({
      browser_id: item.browser_id,
      browser_name: browserName(item.browser_id),
      cookies: item.cookies ?? []
    })
  }
  return groups
}

/**
 * 没有可下载内容时按逐项状态给出准确原因。
 *
 * 不能一律提示「可能未登录或未启动」：这两种情况的排障动作完全不同，
 * 混在一起会让人误以为登录态丢了。
 */
function warnEmptyResult(data: ExportCookiesBatchResponse) {
  const results = data.results ?? []
  const notRunning = results.filter((item) => item.status === 'not_running').length
  const forbidden = results.filter((item) => item.status === 'forbidden').length
  const launchFailed = results.filter((item) => item.status === 'launch_failed').length
  const emptyLogged = results.filter(
    (item) => item.status === 'success' && (item.cookie_count ?? 0) === 0
  ).length
  const otherFailed =
    results.length - notRunning - forbidden - launchFailed - emptyLogged

  const reasons: string[] = []
  if (notRunning > 0) reasons.push(`${notRunning} 个浏览器未启动`)
  if (launchFailed > 0) reasons.push(`${launchFailed} 个启动失败`)
  if (forbidden > 0) reasons.push(`${forbidden} 个无权访问`)
  if (otherFailed > 0) reasons.push(`${otherFailed} 个读取失败`)
  if (emptyLogged > 0) reasons.push(`${emptyLogged} 个已连接但没有 cookie（可能未登录）`)

  const launchHint = notRunning > 0
    ? launchIfNotRunning.value
      ? '；未启动的浏览器启动未完成（排队或失败），请稍后重试'
      : '；勾选「先启动再导出」可自动启动'
    : ''

  ElMessage.warning(
    reasons.length
      ? `没有可导出的 cookie：${reasons.join('；')}${launchHint}`
      : '没有可导出的 cookie，未生成文件'
  )
}

function finishExport(data: ExportCookiesBatchResponse) {
  const groups = buildExportGroups(data)
  if (!groups.length) {
    warnEmptyResult(data)
    return
  }

  downloadJsonFile(`cookies_batch_${cookieBatchTimestampText()}.json`, groups)
  ElMessage.success(
    `已导出 ${data.total_cookie_count ?? 0} 条 cookie，覆盖 ${groups.length} 个浏览器`
  )
}

function collectNotRunning(data: ExportCookiesBatchResponse): string[] {
  return (data.results ?? [])
    .filter((item) => item.status === 'not_running')
    .map((item) => item.browser_id)
}

/**
 * 逐项启动未启动的浏览器，返回启动成功的 id。
 *
 * 批量启动超过 5 个先二次确认（耗时较长、占用时长配额）；
 * 逐项串行与失败隔离在 `launchCookieBatchBrowsers` 里统一实现。
 */
async function launchNotRunning(ids: string[]): Promise<string[]> {
  if (ids.length > 5) {
    try {
      await ElMessageBox.confirm(
        `有 ${ids.length} 个浏览器未启动，需要逐个启动后才能导出（每个约 10~30 秒，耗时较长）。确定继续？`,
        '需要先启动浏览器',
        {
          type: 'warning',
          confirmButtonText: '启动并导出',
          cancelButtonText: '取消',
          lockScroll: false
        }
      )
    } catch {
      return []
    }
  }

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

/** 只对刚启动成功的项重新导出，并把结果按 browser_id 合并回第一次的响应 */
async function refetchAfterLaunch(
  first: ExportCookiesBatchResponse,
  launchedIds: string[],
  domains: string[]
): Promise<ExportCookiesBatchResponse> {
  if (!launchedIds.length) {
    return first
  }

  exporting.value = true
  const second = await exportBrowserCookiesBatch(
    launchedIds,
    domains,
    userNavStore.user_header
  )
  exporting.value = false

  if (!second.success || !second.data) {
    return first
  }

  const replacement = new Map<string, ExportCookiesBatchItemResult>()
  for (const item of second.data.results ?? []) {
    replacement.set(item.browser_id, item)
  }

  // 保持第一次响应的顺序（= 勾选顺序），只替换刚启动的项
  const results = (first.results ?? []).map(
    (item) => replacement.get(item.browser_id) ?? item
  )
  const succeeded = results.filter((item) => item.status === 'success').length
  const totalCookieCount = results
    .filter((item) => item.status === 'success')
    .reduce((sum, item) => sum + (item.cookie_count ?? 0), 0)

  return {
    total_browsers: results.length,
    succeeded,
    failed: results.length - succeeded,
    total_cookie_count: totalCookieCount,
    results
  }
}

async function submit() {
  if (!canSubmit.value) {
    return
  }

  const ids = [...selectedBrowserIds.value]
  const domains = parseCookieDomains(domainsText.value)

  launchNotice.value = ''
  exporting.value = true
  const first = await exportBrowserCookiesBatch(ids, domains, userNavStore.user_header)
  exporting.value = false

  if (!first.success || !first.data) {
    return
  }

  const notRunningIds = collectNotRunning(first.data)
  if (!launchIfNotRunning.value || !notRunningIds.length) {
    resultData.value = first.data
    finishExport(first.data)
    return
  }

  const launchedIds = await launchNotRunning(notRunningIds)
  const merged = await refetchAfterLaunch(first.data, launchedIds, domains)
  resultData.value = merged
  finishExport(merged)
}

function resetState() {
  selectedBrowserIds.value = []
  domainsText.value = ''
  launchIfNotRunning.value = true
  exporting.value = false
  launching.value = false
  launchProgress.value = { current: 0, total: 0 }
  launchNotice.value = ''
  resultData.value = null
}

/** 打开时拉全量浏览器；关闭即丢弃选择与结果，避免明文凭证停留 */
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
    title="批量导出 Cookie"
    width="900px"
    :close-on-click-modal="false"
    lock-scroll
    destroy-on-close
    class="export-cookie-batch"
  >
    <div class="export-cookie-batch__body flex flex-col gap-3">
      <el-text class="export-cookie-batch__hint text-text-secondary">
        只导出<strong class="export-cookie-batch__hint-strong">运行中</strong>浏览器的 cookie，
        未启动的默认跳过；勾选下方「先启动再导出」会逐个启动它们后自动重试。
        多个浏览器合并成一个文件，
        <strong class="export-cookie-batch__hint-strong">顺序与勾选顺序一致</strong>，
        可直接用于「批量导入 Cookie」。
      </el-text>

      <div class="export-cookie-batch__browsers flex items-center gap-2 flex-wrap">
        <el-text class="export-cookie-batch__label text-text-secondary">目标浏览器</el-text>
        <el-select
          v-model="selectedBrowserIds"
          class="export-cookie-batch__browser-select flex-1 min-w-60"
          multiple
          filterable
          collapse-tags
          collapse-tags-tooltip
          :loading="browsersLoading"
          placeholder="选择要导出的浏览器"
        >
          <el-option
            v-for="browser in browsers"
            :key="browser.browserId"
            :label="browser.name"
            :value="browser.browserId"
          />
        </el-select>
        <el-text class="export-cookie-batch__selected text-text-placeholder">
          已选 {{ selectedCount }} / {{ COOKIE_BATCH_LIMIT }}
        </el-text>
      </div>

      <el-alert
        v-if="overLimit"
        class="export-cookie-batch__alert"
        type="warning"
        :closable="false"
        show-icon
        :title="`单次最多 ${COOKIE_BATCH_LIMIT} 个浏览器，请分批导出`"
      />

      <div class="export-cookie-batch__domains flex items-center gap-2 flex-wrap">
        <el-text class="export-cookie-batch__label text-text-secondary">导出站点</el-text>
        <el-input
          v-model="domainsText"
          class="export-cookie-batch__domains-input flex-1 min-w-60"
          placeholder="留空 = 全部；多个用逗号或空格分隔，如 bilibili.com"
        />
      </div>

      <el-checkbox v-model="launchIfNotRunning" class="export-cookie-batch__launch">
        先启动再导出（未启动的浏览器逐个启动，耗时较长且占用时长配额）
      </el-checkbox>

      <div
        v-if="launching"
        class="export-cookie-batch__progress flex items-center gap-2 flex-wrap"
      >
        <el-progress
          class="export-cookie-batch__progress-bar flex-1 min-w-60"
          :percentage="launchPercentage"
          :stroke-width="10"
          :show-text="false"
        />
        <el-text class="export-cookie-batch__progress-text text-text-secondary">
          正在启动 {{ launchProgress.current }} / {{ launchProgress.total }}
        </el-text>
      </div>

      <el-alert
        v-if="launchNotice"
        class="export-cookie-batch__launch-notice"
        type="info"
        :closable="false"
        show-icon
        :title="launchNotice"
      />

      <el-alert
        class="export-cookie-batch__secret"
        type="warning"
        :closable="false"
        show-icon
        title="导出的 cookie 等同于账号凭证（含 HttpOnly），请勿上传或分享"
      />

      <div v-if="resultData" class="export-cookie-batch__results flex flex-col gap-2">
        <el-text class="export-cookie-batch__summary text-text-secondary">
          共 {{ resultStats.total }} 个：成功 {{ resultStats.succeeded }}
          （{{ resultStats.totalCookieCount }} 条 cookie）/ 未成功 {{ resultStats.failed }}
        </el-text>

        <el-table
          class="export-cookie-batch__result-table"
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
          <el-table-column label="启动" width="110">
            <template #default="{ row }">
              <el-tag v-if="row.launched" type="success" effect="plain">本次启动</el-tag>
              <el-text v-else>-</el-text>
            </template>
          </el-table-column>
          <el-table-column label="cookie 条数" width="120">
            <template #default="{ row }">
              <el-text>{{ row.cookie_count ?? 0 }}</el-text>
            </template>
          </el-table-column>
          <el-table-column label="覆盖域名" width="110">
            <template #default="{ row }">
              <el-text>{{ row.matched_domains?.length ?? 0 }}</el-text>
            </template>
          </el-table-column>
          <el-table-column prop="message" label="说明" min-width="240" show-overflow-tooltip />
        </el-table>
      </div>
    </div>

    <template #footer>
      <div class="export-cookie-batch__footer flex items-center justify-end gap-2">
        <el-button @click="visibleModel = false">关闭</el-button>
        <el-button type="primary" :loading="busy" :disabled="!canSubmit" @click="submit">
          {{ launching ? '启动中…' : '导出并下载' }}
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>
