<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { 浏览器指纹管理Service } from '@/api/browser/hey-api'
import {
  submitImportCookiesTask,
  waitOperationTask
} from '@/api/browser/operation_task_api'
import { useUserNavStore } from '@/stores/user_nav'
import { businessHandler } from '@/utils/businessHandler'
import {
  parseCookieGroups,
  parseCookieList,
  type ParsedCookieGroup
} from '@/utils/rpa/cookieJson'
import type {
  CookieData,
  ImportCookiesBatchResponse
} from '@/api/browser/hey-api/types.gen'
import type { UserBrowserInfo } from '@/models/rpa_browser'

/**
 * 批量导入 Cookie 弹窗。
 *
 * 交互模型：用户先按顺序勾选浏览器，再给一批「cookie 组」（每个导出文件一组），
 * 第 i 组写入第 i 个浏览器。数量不匹配不阻止导入，但必须如实告知：
 * - 组数多于浏览器：多出的组不会导入，提示未使用的组数与条数；
 * - 浏览器多于组数：多出的浏览器标记为未分配。
 *
 * 不缓存任何 cookie：关闭即清空，结果也只留在当前弹窗内存中。
 */

interface BrowserOption {
  browserId: string
  name: string
}

interface BrowserPair {
  browserId: string
  cookies: CookieData[]
}

interface PairRow {
  index: number
  browserId: string
  browserName: string
  cookieCount: number
  sessionCount: number
}

const props = defineProps<{
  visible: boolean
}>()

const emit = defineEmits<{
  'update:visible': [visible: boolean]
  success: [succeededCount: number]
}>()

const userNavStore = useUserNavStore()

const visibleModel = computed({
  get: () => props.visible,
  set: (value: boolean) => emit('update:visible', value)
})

type TagType = 'success' | 'info' | 'warning' | 'danger' | 'primary'

const STATUS_META: Record<string, { label: string; type: TagType }> = {
  success: { label: '成功', type: 'success' },
  not_running: { label: '未启动', type: 'info' },
  workflow_running: { label: '工作流执行中', type: 'warning' },
  forbidden: { label: '无权访问', type: 'danger' },
  invalid: { label: '参数非法', type: 'danger' },
  launch_failed: { label: '启动失败', type: 'danger' },
  injection_failed: { label: '写入失败', type: 'danger' },
  unassigned: { label: '未分配', type: 'info' }
}

const browsers = ref<BrowserOption[]>([])
const browsersLoading = ref(false)
const selectedBrowserIds = ref<string[]>([])

const cookieText = ref('')
const fileNames = ref<string[]>([])
const parsedGroups = ref<ParsedCookieGroup[] | null>(null)
const parseError = ref('')
const launchIfNotRunning = ref(false)
const submitting = ref(false)
/** 任务进度（后端按浏览器逐项推进） */
const taskProgress = ref<{ current: number; total: number }>({ current: 0, total: 0 })
const taskMessage = ref('')
const resultData = ref<ImportCookiesBatchResponse | null>(null)
const lastPairs = ref<BrowserPair[]>([])
const fileInputRef = ref<HTMLInputElement | null>(null)

const browserNameMap = computed(() => {
  const map = new Map<string, string>()
  for (const browser of browsers.value) {
    map.set(browser.browserId, browser.name)
  }
  return map
})

function browserName(browserId: string) {
  return browserNameMap.value.get(browserId) ?? browserId
}

function statusMeta(status: string) {
  return STATUS_META[status] ?? { label: status, type: 'info' as TagType }
}

/** 实际会配对的条目：只取两侧较短的一段 */
const pairRows = computed<PairRow[]>(() => {
  const groups = parsedGroups.value ?? []
  const count = Math.min(selectedBrowserIds.value.length, groups.length)
  const rows: PairRow[] = []
  for (let index = 0; index < count; index += 1) {
    const browserId = selectedBrowserIds.value[index] ?? ''
    const group = groups[index]
    rows.push({
      index: index + 1,
      browserId,
      browserName: browserName(browserId),
      cookieCount: group?.cookies.length ?? 0,
      sessionCount: group?.sessionCount ?? 0
    })
  }
  return rows
})

/** 多出的组（浏览器不够）：整组不会导入 */
const unusedGroupCount = computed(() => {
  const groups = parsedGroups.value ?? []
  return Math.max(0, groups.length - selectedBrowserIds.value.length)
})

/** 多出的组里共多少条 cookie 没用上 */
const unusedCookieCount = computed(() => {
  const groups = parsedGroups.value ?? []
  return groups
    .slice(selectedBrowserIds.value.length)
    .reduce((sum, group) => sum + group.cookies.length, 0)
})

/** 多出的浏览器（组数不够）：标记未分配 */
const unassignedBrowserCount = computed(() =>
  Math.max(0, selectedBrowserIds.value.length - (parsedGroups.value?.length ?? 0))
)

const failedResults = computed(() =>
  (resultData.value?.results ?? []).filter(
    (item) => item.status !== 'success' && item.status !== 'unassigned'
  )
)

/** 生成类型的响应字段都是可选的（后端有默认值），展示前统一兜底成确定值 */
const resultStats = computed(() => {
  const data = resultData.value
  return {
    succeeded: data?.succeeded ?? 0,
    assigned: data?.assigned ?? 0,
    unusedGroups: data?.unused_cookie_group_count ?? 0,
    unusedCookies: data?.unused_cookie_count ?? 0,
    unassignedCount: data?.unassigned_browser_ids?.length ?? 0,
    results: data?.results ?? []
  }
})

const canSubmit = computed(
  () =>
    selectedBrowserIds.value.length > 0 &&
    (parsedGroups.value?.length ?? 0) > 0 &&
    !submitting.value
)

const taskPercentage = computed(() => {
  const { current, total } = taskProgress.value
  return total > 0 ? Math.round((current / total) * 100) : 0
})

async function loadBrowsers() {
  browsersLoading.value = true
  const result = await businessHandler<{ items?: UserBrowserInfo[]; total?: number }>(
    浏览器指纹管理Service.listFingerprintRouterApiV1RpaBrowserListFingerprintPost({
      body: { page: 1, per_page: 200 },
      headers: userNavStore.user_header
    }) as never,
    { successMessage: '', errorMessage: '获取浏览器列表失败', showSuccessToast: false }
  )
  browsersLoading.value = false

  if (!result.success || !result.data) {
    return
  }
  browsers.value = (result.data.items ?? []).map((item) => {
    const id = String(item.browser_id_str || item.browser_id)
    return { browserId: id, name: item.custom_name || id }
  })
}

function revalidate() {
  parsedGroups.value = null
  parseError.value = ''
  if (!cookieText.value.trim()) {
    return
  }
  try {
    parsedGroups.value = parseCookieGroups(cookieText.value)
  } catch (error) {
    parseError.value = error instanceof Error ? error.message : '解析失败'
  }
}

function triggerFilePick() {
  fileInputRef.value?.click()
}

/** 选择多个文件时，一个文件 = 一组 cookie（按选择顺序） */
async function handleFilesChange(event: Event) {
  const input = event.target as HTMLInputElement
  const files = Array.from(input.files ?? [])
  input.value = ''
  if (!files.length) {
    return
  }

  try {
    const groups: ParsedCookieGroup[] = []
    for (const file of files) {
      const text = await file.text()
      groups.push(parseCookieList(text))
    }
    fileNames.value = files.map((file) => file.name)
    cookieText.value = ''
    parsedGroups.value = groups
    parseError.value = ''
  } catch (error) {
    fileNames.value = []
    parsedGroups.value = null
    cookieText.value = ''
    ElMessage.error(error instanceof Error ? error.message : '解析文件失败')
  }
}

async function submitPairs(pairs: BrowserPair[]) {
  if (!pairs.length) {
    return
  }

  submitting.value = true
  taskMessage.value = '正在提交任务…'
  taskProgress.value = { current: 0, total: pairs.length }

  const submitted = await submitImportCookiesTask(
    pairs.map((pair) => pair.browserId),
    pairs.map((pair) => pair.cookies),
    userNavStore.user_header,
    { launchIfNotRunning: launchIfNotRunning.value }
  )

  if (!submitted.success || !submitted.data) {
    submitting.value = false
    taskMessage.value = ''
    return
  }

  try {
    const final = await waitOperationTask(
      submitted.data.task_id,
      userNavStore.user_header,
      {
        onUpdate: (status) => {
          taskProgress.value = {
            current: status.progress ?? 0,
            total: status.total ?? pairs.length
          }
          taskMessage.value = status.message || '执行中…'
        }
      }
    )

    if (final.status === 'failed') {
      ElMessage.error(final.error || '导入任务失败')
      return
    }
    if (!final.import_result) {
      ElMessage.error('任务完成但没有返回结果，请重试')
      return
    }

    const succeeded = final.import_result.succeeded ?? 0
    resultData.value = final.import_result
    lastPairs.value = pairs
    ElMessage.success(
      `批量导入完成：成功 ${succeeded} / ${final.import_result.assigned ?? 0}`
    )
    emit('success', succeeded)
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '导入任务失败')
  } finally {
    submitting.value = false
    taskMessage.value = ''
  }
}

function submit() {
  if (!canSubmit.value) {
    revalidate()
    return
  }
  const groups = parsedGroups.value ?? []
  const ids = selectedBrowserIds.value
  const count = Math.min(ids.length, groups.length)
  const pairs: BrowserPair[] = []
  for (let index = 0; index < count; index += 1) {
    pairs.push({
      browserId: ids[index] as string,
      cookies: (groups[index] as ParsedCookieGroup).cookies
    })
  }
  void submitPairs(pairs)
}

/** 只重试「已分配但失败」的项；未分配项没有 cookie，重试没有意义 */
function retryFailed() {
  const failedIds = new Set(failedResults.value.map((item) => item.browser_id))
  const pairs = lastPairs.value.filter((pair) => failedIds.has(pair.browserId))
  void submitPairs(pairs)
}

function resetState() {
  selectedBrowserIds.value = []
  cookieText.value = ''
  fileNames.value = []
  parsedGroups.value = null
  parseError.value = ''
  launchIfNotRunning.value = false
  submitting.value = false
  taskProgress.value = { current: 0, total: 0 }
  taskMessage.value = ''
  resultData.value = null
  lastPairs.value = []
}

/** 打开时拉全量浏览器；关闭即丢弃输入与结果，避免明文凭证停留 */
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
    title="批量导入 Cookie"
    width="1000px"
    :close-on-click-modal="false"
    lock-scroll
    destroy-on-close
    class="import-cookie-batch"
  >
    <div class="import-cookie-batch__body flex flex-col gap-3">
      <el-text class="import-cookie-batch__hint text-text-secondary">
        先按顺序勾选浏览器，再选择或粘贴多组 cookie（一个导出文件 = 一组）。
        <strong class="import-cookie-batch__hint-strong">第 i 组写入第 i 个浏览器</strong>，
        数量不一致也能导入，未用到的部分会在下方提示。
      </el-text>

      <div class="import-cookie-batch__browsers flex items-center gap-2 flex-wrap">
        <el-text class="import-cookie-batch__label text-text-secondary">目标浏览器</el-text>
        <el-select
          v-model="selectedBrowserIds"
          class="import-cookie-batch__browser-select flex-1 min-w-60"
          multiple
          filterable
          collapse-tags
          collapse-tags-tooltip
          :loading="browsersLoading"
          placeholder="按配对顺序选择浏览器"
        >
          <el-option
            v-for="browser in browsers"
            :key="browser.browserId"
            :label="browser.name"
            :value="browser.browserId"
          />
        </el-select>
        <el-text class="import-cookie-batch__selected text-text-placeholder">
          已选 {{ selectedBrowserIds.length }} 个
        </el-text>
      </div>

      <div class="import-cookie-batch__files flex items-center gap-2 flex-wrap">
        <el-button @click="triggerFilePick">选择 JSON 文件（可多选）</el-button>
        <el-text class="import-cookie-batch__file-name text-text-placeholder">
          {{ fileNames.length ? fileNames.join('、') : '未选择文件' }}
        </el-text>
        <input
          ref="fileInputRef"
          class="import-cookie-batch__file-input hidden"
          type="file"
          accept=".json,application/json"
          multiple
          @change="handleFilesChange"
        />
      </div>

      <el-input
        v-model="cookieText"
        class="import-cookie-batch__editor"
        type="textarea"
        :rows="8"
        placeholder='[[{"name": "SESSDATA", "value": "...", "domain": ".bilibili.com"}], [{"name": "SESSDATA", "value": "...", "domain": ".bilibili.com"}]]'
        @input="revalidate"
      />

      <el-text v-if="parseError" class="import-cookie-batch__error" type="danger">
        {{ parseError }}
      </el-text>

      <template v-if="parsedGroups">
        <div class="import-cookie-batch__preview flex items-center gap-2 flex-wrap">
          <el-tag type="info" effect="plain">{{ parsedGroups.length }} 组 cookie</el-tag>
          <el-tag type="success" effect="plain">
            {{ parsedGroups.reduce((sum, group) => sum + group.cookies.length, 0) }} 条
          </el-tag>
          <el-tag v-if="pairRows.length" effect="plain">
            将导入 {{ pairRows.length }} 个浏览器
          </el-tag>
        </div>

        <el-alert
          v-if="unusedGroupCount > 0"
          class="import-cookie-batch__alert"
          type="warning"
          :closable="false"
          show-icon
          :title="`浏览器不够：将忽略 ${unusedGroupCount} 组 cookie（共 ${unusedCookieCount} 条），这些不会导入`"
        />
        <el-alert
          v-if="unassignedBrowserCount > 0"
          class="import-cookie-batch__alert"
          type="warning"
          :closable="false"
          show-icon
          :title="`cookie 组数不够：有 ${unassignedBrowserCount} 个浏览器分不到 cookie，会标记为「未分配」`"
        />

        <el-table
          v-if="pairRows.length"
          class="import-cookie-batch__pair-table"
          :data="pairRows"
          max-height="240"
          border
        >
          <el-table-column prop="index" label="#" width="60" />
          <el-table-column label="浏览器" min-width="200">
            <template #default="{ row }">
              <el-text>{{ row.browserName }}</el-text>
            </template>
          </el-table-column>
          <el-table-column prop="cookieCount" label="cookie 条数" width="130" />
          <el-table-column label="会话 cookie" width="120">
            <template #default="{ row }">
              <el-text v-if="row.sessionCount > 0" type="warning">
                {{ row.sessionCount }}
              </el-text>
              <el-text v-else>0</el-text>
            </template>
          </el-table-column>
        </el-table>
      </template>

      <el-checkbox v-model="launchIfNotRunning" class="import-cookie-batch__launch">
        未启动的浏览器顺带启动（会逐个启动，耗时较长且占用时长配额）
      </el-checkbox>

      <div
        v-if="submitting"
        class="import-cookie-batch__progress flex items-center gap-2 flex-wrap"
      >
        <el-progress
          class="import-cookie-batch__progress-bar flex-1 min-w-60"
          :percentage="taskPercentage"
          :stroke-width="10"
          :show-text="false"
        />
        <el-text class="import-cookie-batch__progress-text text-text-secondary">
          {{ taskMessage || '执行中…' }}（{{ taskProgress.current }} / {{ taskProgress.total }}）
        </el-text>
      </div>

      <div v-if="resultData" class="import-cookie-batch__results flex flex-col gap-2">
        <div class="import-cookie-batch__results-header flex items-center justify-between gap-2 flex-wrap">
          <el-text class="text-text-secondary">
            执行结果：成功 {{ resultStats.succeeded }} / 已分配 {{ resultStats.assigned }}
            <template v-if="resultStats.unusedGroups > 0">
              ；忽略 {{ resultStats.unusedGroups }} 组（{{ resultStats.unusedCookies }} 条）
            </template>
            <template v-if="resultStats.unassignedCount > 0">
              ；未分配 {{ resultStats.unassignedCount }} 个浏览器
            </template>
          </el-text>
          <el-button
            v-if="failedResults.length"
            :loading="submitting"
            @click="retryFailed"
          >
            仅重试失败项（{{ failedResults.length }}）
          </el-button>
        </div>

        <el-table
          class="import-cookie-batch__result-table"
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
              <el-tag :type="statusMeta(row.status).type" effect="plain">
                {{ statusMeta(row.status).label }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="imported_count" label="写入" width="80" />
          <el-table-column label="会话 cookie" width="120">
            <template #default="{ row }">
              <el-text v-if="(row.session_cookie_count ?? 0) > 0" type="warning">
                {{ row.session_cookie_count }}（重启失效）
              </el-text>
              <el-text v-else>0</el-text>
            </template>
          </el-table-column>
          <el-table-column prop="message" label="说明" min-width="240" show-overflow-tooltip />
        </el-table>
      </div>
    </div>

    <template #footer>
      <div class="import-cookie-batch__footer flex items-center justify-end gap-2">
        <el-button @click="visibleModel = false">关闭</el-button>
        <el-button type="primary" :loading="submitting" :disabled="!canSubmit" @click="submit">
          开始导入
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>
