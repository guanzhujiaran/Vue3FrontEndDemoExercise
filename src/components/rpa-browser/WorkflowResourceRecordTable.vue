<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { Refresh } from '@element-plus/icons-vue'
import { useUserNavStore } from '@/stores/user_nav'
import {
  listWorkflowResources,
  type WorkflowResourceRecordItem,
} from '@/api/browser/workflow_resource_api'
import { buildLinkUrl, useResourceLinkTemplate } from '@/composables/useResourceLinkTemplate'
import { LINK_REFERRER_POLICY, LINK_REL } from '@/utils/PageOpen/linkPolicy'

/**
 * 已处理数据表格（去重数据源 WorkflowResourceRecord）。
 *
 * 页面与弹窗共用同一份实现：筛选条件放在表头，顶部只保留总数与刷新。
 * 字段语义：
 *   - `id`：记录主键（去重表自增）
 *   - `resource_id`：业务主键（动态ID / 预约ID）
 *
 * 若该工作流配置了「前端跳转链接格式」（本地存储），业务主键旁会多一个「打开」入口，
 * 链接由模板替换业务主键生成。
 */
interface Props {
  /** 工作流数据库ID（雪花 int；字符串传入后内部转 Number） */
  workflowId: string
}

const props = defineProps<Props>()
const userNavStore = useUserNavStore()

const { getTemplate } = useResourceLinkTemplate()
/** 当前工作流的跳转链接格式（本地配置，未配置时为空串） */
const linkTemplate = computed(() => getTemplate(props.workflowId))

/** 按链接格式把业务主键替换成实际跳转地址；未配置返回空串 */
function rowLinkUrl(row: WorkflowResourceRecordItem): string {
  if (!linkTemplate.value) return ''
  return buildLinkUrl(linkTemplate.value, {
    resource_id: row.resource_id,
    record_id: row.id,
    resource_type: row.resource_type,
  })
}

const rows = ref<WorkflowResourceRecordItem[]>([])
const total = ref(0)
const page = ref(1)
const perPage = ref(20)
const loading = ref(false)

// ── 表头筛选 ──
const statusFilter = ref('')
const resourceTypeFilter = ref('')
/** 业务主键（模糊） */
const resourceIdFilter = ref('')
const countMinFilter = ref<number | null>(null)
const countMaxFilter = ref<number | null>(null)
const browserFilter = ref<number | null>(null)
const runIdFilter = ref('')
const dateRange = ref<[string, string] | null>(null)

const STATUS_OPTIONS = [
  { value: '', label: '全部' },
  { value: 'success', label: '成功' },
  { value: 'skipped', label: '跳过' },
  { value: 'failed', label: '失败' },
]

const STATUS_TAG_TYPE: Record<string, 'success' | 'warning' | 'danger' | 'info'> = {
  success: 'success',
  skipped: 'warning',
  failed: 'danger',
}

function statusType(status: string) {
  return STATUS_TAG_TYPE[status] ?? 'info'
}

function formatTime(value: string | null) {
  if (!value) return '-'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('zh-CN', { hour12: false })
}

/** extra 里的跳过原因（如 404 的 not_found）等附加信息 */
function extraText(row: WorkflowResourceRecordItem) {
  if (!row.extra) return ''
  const reason = row.extra.reason ?? row.extra.detail
  return reason ? String(reason) : ''
}

/** 数字型筛选框统一解析：空值视为不过滤 */
function toNumberOrUndefined(value: string | number | null): number | undefined {
  if (value === null || value === undefined || value === '') return undefined
  const parsed = Number(value)
  return Number.isNaN(parsed) ? undefined : parsed
}

async function load() {
  if (!props.workflowId) {
    rows.value = []
    total.value = 0
    return
  }
  loading.value = true
  const [from, to] = dateRange.value ?? []
  const res = await listWorkflowResources(
    {
      workflow_id: Number(props.workflowId),
      page: page.value,
      per_page: perPage.value,
      status: statusFilter.value || undefined,
      resource_type: resourceTypeFilter.value || undefined,
      resource_id: resourceIdFilter.value || undefined,
      run_id: runIdFilter.value || undefined,
      process_count_min: toNumberOrUndefined(countMinFilter.value),
      process_count_max: toNumberOrUndefined(countMaxFilter.value),
      browser_id: toNumberOrUndefined(browserFilter.value),
      processed_from: from ? `${from}T00:00:00` : undefined,
      processed_to: to ? `${to}T23:59:59` : undefined,
    },
    userNavStore.user_header
  )
  loading.value = false
  if (!res.success || !res.data) {
    rows.value = []
    total.value = 0
    return
  }
  rows.value = res.data.items ?? []
  total.value = res.data.total ?? 0
}

async function copyResourceId(row: WorkflowResourceRecordItem) {
  try {
    await navigator.clipboard.writeText(row.resource_id)
    ElMessage.success(`已复制业务主键：${row.resource_id}`)
  } catch {
    ElMessage.warning('复制失败，请手动选择复制')
  }
}

function handleRefresh() {
  page.value = 1
  load()
}

function handlePageChange(next: number) {
  page.value = next
  load()
}

function handleSizeChange(size: number) {
  perPage.value = size
  page.value = 1
  load()
}

// 切换工作流立即加载（含首次挂载：页面里表格是在选中工作流后才渲染的）
watch(
  () => props.workflowId,
  () => handleRefresh(),
  { immediate: true }
)

defineExpose({ load })
</script>

<template>
  <div class="workflow-resource-record flex flex-col gap-3">
    <div class="workflow-resource-record__toolbar flex items-center gap-2 flex-wrap">
      <el-button :icon="Refresh" :loading="loading" @click="handleRefresh">刷新</el-button>
    </div>

    <el-table v-loading="loading" :data="rows" border stripe>
      <el-table-column prop="id" label="记录ID" width="90" />
      <el-table-column prop="resource_type" label="资源类型" min-width="220" show-overflow-tooltip>
        <template #header>
          <el-input
            v-model="resourceTypeFilter"
            class="workflow-resource-record__filter"
            placeholder="资源类型过滤"
            clearable
            @change="handleRefresh"
            @clear="handleRefresh"
          />
        </template>
      </el-table-column>
      <el-table-column label="业务主键" min-width="240">
        <template #header>
          <el-input
            v-model="resourceIdFilter"
            class="workflow-resource-record__filter"
            placeholder="业务主键（模糊）"
            clearable
            @change="handleRefresh"
            @clear="handleRefresh"
          />
        </template>
        <template #default="{ row }">
          <span class="workflow-resource-record__id font-mono">{{ row.resource_id }}</span>
          <el-button
            class="workflow-resource-record__copy ml-1"
            link
            type="primary"
            @click="copyResourceId(row as WorkflowResourceRecordItem)"
          >
            复制
          </el-button>
          <el-link
            v-if="rowLinkUrl(row as WorkflowResourceRecordItem)"
            class="workflow-resource-record__open ml-2"
            type="primary"
            :href="rowLinkUrl(row as WorkflowResourceRecordItem)"
            target="_blank"
            :rel="LINK_REL"
            :referrerpolicy="LINK_REFERRER_POLICY"
          >
            打开
          </el-link>
        </template>
      </el-table-column>
      <el-table-column label="状态" width="140">
        <template #header>
          <el-select
            v-model="statusFilter"
            class="workflow-resource-record__filter"
            placeholder="全部状态"
            @change="handleRefresh"
          >
            <el-option
              v-for="option in STATUS_OPTIONS"
              :key="option.value"
              :label="option.label"
              :value="option.value"
            />
          </el-select>
        </template>
        <template #default="{ row }">
          <el-tag :type="statusType(row.status)" effect="plain" disable-transitions>
            {{ row.status }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="process_count" label="处理次数" width="180">
        <template #header>
          <div class="workflow-resource-record__range flex items-center gap-1">
            <el-input
              v-model="countMinFilter"
              class="workflow-resource-record__filter"
              placeholder="≥"
              @change="handleRefresh"
            />
            <span class="text-color-secondary">-</span>
            <el-input
              v-model="countMaxFilter"
              class="workflow-resource-record__filter"
              placeholder="≤"
              @change="handleRefresh"
            />
          </div>
        </template>
      </el-table-column>
      <el-table-column label="浏览器" width="160">
        <template #header>
          <el-input
            v-model="browserFilter"
            class="workflow-resource-record__filter"
            placeholder="浏览器ID"
            clearable
            @change="handleRefresh"
            @clear="handleRefresh"
          />
        </template>
        <template #default="{ row }">{{ row.browser_id || '-' }}</template>
      </el-table-column>
      <el-table-column label="所属运行" width="200">
        <template #header>
          <el-input
            v-model="runIdFilter"
            class="workflow-resource-record__filter"
            placeholder="运行ID"
            clearable
            @change="handleRefresh"
            @clear="handleRefresh"
          />
        </template>
        <template #default="{ row }">
          <span class="font-mono">{{ row.run_id ? String(row.run_id).slice(0, 8) : '-' }}</span>
        </template>
      </el-table-column>
      <el-table-column label="备注" min-width="120" show-overflow-tooltip>
        <template #default="{ row }">
          {{ extraText(row as WorkflowResourceRecordItem) || row.fail_reason || '-' }}
        </template>
      </el-table-column>
      <el-table-column label="最近处理时间" min-width="300">
        <template #header>
          <el-date-picker
            v-model="dateRange"
            class="workflow-resource-record__date"
            type="daterange"
            value-format="YYYY-MM-DD"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            unlink-panels
            @change="handleRefresh"
          />
        </template>
        <template #default="{ row }">{{ formatTime(row.last_processed_at) }}</template>
      </el-table-column>
    </el-table>

    <div class="workflow-resource-record__pager flex justify-end">
      <BiliPagination
        v-model:current-page="page"
        v-model:page-size="perPage"
        :total="total"
        :page-sizes="[20, 50, 100]"
        layout="total, sizes, prev, pager, next"
        @current-change="handlePageChange"
        @size-change="handleSizeChange"
      />
    </div>
  </div>
</template>
