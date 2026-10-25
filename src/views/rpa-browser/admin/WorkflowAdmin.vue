<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { ElMessageBox } from 'element-plus'
import { TableV2FixedDir, type Column } from 'element-plus'
import { Refresh, Search, Document, Delete } from '@element-plus/icons-vue'
import { useMessageAdminStore } from '@/stores/message_admin'
import { businessHandler } from '@/utils/businessHandler'
import {
  listWorkflowsAdmin,
  setWorkflowEnabledAdmin,
  deleteWorkflowAdmin,
  listWorkflowRunsAdmin,
  type AdminWorkflowItem,
  type AdminWorkflowListParams,
  type AdminWorkflowRunItem,
} from './workflowAdminApi'
import LoadingWrap from '@/components/message/LoadingWrap.vue'
import EmptyState from '@/components/message/EmptyState.vue'
import PaginationBar from '@/components/message/PaginationBar.vue'

/**
 * 工作流管理端（root 专属）
 *
 * root 对**全部用户**的工作流拥有管理特权：跨作者查看、启停、删除、查询运行记录
 *（不代为运行，执行归作者）。与用户侧工作流页完全分离，非 root 一律伪装 404（路由 meta.requiresMessageRoot）。
 */
const adminStore = useMessageAdminStore()
const isRoot = computed(() => Boolean(adminStore.status?.is_root))

// ── 筛选 ─────────────────────────────────────────────
const filterName = ref('')
const filterMid = ref('')
const filterPublic = ref<'' | 'public' | 'private'>('')
const filterEnabled = ref<'' | 'enabled' | 'disabled'>('')

// ── 列表 ─────────────────────────────────────────────
const loading = ref(false)
const items = ref<AdminWorkflowItem[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(20)

function buildBody(pageNum: number): AdminWorkflowListParams {
  const body: AdminWorkflowListParams = { page: pageNum, per_page: pageSize.value }
  const name = filterName.value.trim()
  if (name) body.name = name
  const mid = Number(filterMid.value.trim())
  if (filterMid.value.trim() && Number.isFinite(mid)) body.mid = mid
  if (filterPublic.value) body.is_public = filterPublic.value === 'public'
  if (filterEnabled.value) body.is_enabled = filterEnabled.value === 'enabled'
  return body
}

async function load(pageNum = 1) {
  if (!isRoot.value) return
  loading.value = true
  const res = await businessHandler(listWorkflowsAdmin(buildBody(pageNum)), {
    showSuccessToast: false,
    errorMessage: '获取工作流列表失败',
  })
  if (res.success && res.data) {
    items.value = res.data.items || []
    total.value = res.data.total || 0
    page.value = pageNum
  } else {
    items.value = []
    total.value = 0
  }
  loading.value = false
}

function handleSearch() {
  load(1)
}

function handleReset() {
  filterName.value = ''
  filterMid.value = ''
  filterPublic.value = ''
  filterEnabled.value = ''
  load(1)
}

function handleRefresh() {
  load(page.value)
}

function onPageChange(p: number) {
  load(p)
}

function onPageSizeChange(size: number) {
  pageSize.value = size
  load(1)
}

// ── 展示映射 ─────────────────────────────────────────
const triggerText = (t: string) => (t === 'cron' ? '定时' : '手动')
const statusText: Record<string, string> = {
  success: '成功',
  failed: '失败',
  running: '运行中',
  interrupted: '已中断',
}
const statusTagType: Record<string, 'success' | 'danger' | 'warning' | 'info'> = {
  success: 'success',
  failed: 'danger',
  running: 'warning',
  interrupted: 'info',
}
function formatTime(t?: string | null) {
  if (!t) return '-'
  return new Date(t).toLocaleString('zh-CN')
}
function formatDuration(ms?: number) {
  if (ms === undefined || ms === null) return '-'
  return ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${ms}ms`
}

// ── 表格列 ───────────────────────────────────────────
const TABLE_HEADER_H = 44
const TABLE_ROW_H = 56
const TABLE_FOOTER_H = 64
function fitTableHeight(avail: number): number {
  const footerH = total.value > pageSize.value ? TABLE_FOOTER_H : 0
  const contentH = TABLE_HEADER_H + items.value.length * TABLE_ROW_H + footerH
  return Math.min(avail, Math.max(contentH, TABLE_HEADER_H + TABLE_ROW_H + footerH))
}

const columns: Column<AdminWorkflowItem>[] = [
  { key: 'mid', title: '作者', width: 110 },
  { key: 'name', title: '名称', width: 220, minWidth: 140, flexGrow: 1 },
  { key: 'trigger_type', title: '触发', width: 80 },
  { key: 'browser_id', title: '目标浏览器', width: 110 },
  { key: 'is_enabled', title: '启用', width: 90 },
  { key: 'is_public', title: '可见性', width: 90 },
  { key: 'last_run_status', title: '上次运行', width: 100 },
  { key: 'updated_at', title: '更新时间', width: 170 },
  { key: 'op', title: '操作', width: 220, fixed: TableV2FixedDir.RIGHT },
]

// ── 操作：启停 / 删除 ────────────────────────────────
async function handleToggleEnabled(item: AdminWorkflowItem, val: boolean) {
  const prev = !val
  // el-switch 由 rowData.is_enabled 受控，先乐观更新，失败再回滚
  item.is_enabled = val
  const res = await businessHandler(setWorkflowEnabledAdmin(item.id, val), {
    successMessage: val ? '工作流已启用' : '工作流已停用',
    errorMessage: '操作失败',
  })
  if (!res.success) item.is_enabled = prev
}

async function handleDelete(item: AdminWorkflowItem) {
  try {
    await ElMessageBox.confirm(
      `确定删除工作流「${item.name || item.id}」？该操作不可恢复。`,
      '删除工作流',
      { confirmButtonText: '删除', cancelButtonText: '取消', type: 'warning', lockScroll: false }
    )
  } catch {
    return
  }
  const res = await businessHandler(deleteWorkflowAdmin(item.id), {
    successMessage: '工作流已删除',
    errorMessage: '删除失败',
  })
  if (res.success) {
    const nextPage = items.value.length === 1 && page.value > 1 ? page.value - 1 : page.value
    load(nextPage)
  }
}

// ── 运行记录弹窗 ─────────────────────────────────────
const runsVisible = ref(false)
const runsWorkflow = ref<AdminWorkflowItem | null>(null)
const runs = ref<AdminWorkflowRunItem[]>([])
const runsTotal = ref(0)
const runsPage = ref(1)
const runsPageSize = ref(10)
const runsLoading = ref(false)

const runsTitle = computed(() =>
  runsWorkflow.value ? `运行记录：${runsWorkflow.value.name || runsWorkflow.value.id}` : '运行记录'
)

async function loadRuns(pageNum = 1) {
  if (!runsWorkflow.value) return
  runsLoading.value = true
  const res = await businessHandler(
    listWorkflowRunsAdmin(runsWorkflow.value.id, pageNum, runsPageSize.value),
    { showSuccessToast: false, errorMessage: '获取运行记录失败' }
  )
  if (res.success && res.data) {
    runs.value = res.data.items || []
    runsTotal.value = res.data.total || 0
    runsPage.value = pageNum
  } else {
    runs.value = []
    runsTotal.value = 0
  }
  runsLoading.value = false
}

function openRuns(item: AdminWorkflowItem) {
  runsWorkflow.value = item
  runs.value = []
  runsTotal.value = 0
  runsPage.value = 1
  runsVisible.value = true
  loadRuns(1)
}

function onRunsPageSizeChange(size: number) {
  runsPageSize.value = size
  loadRuns(1)
}

onMounted(async () => {
  if (!adminStore.loaded) await adminStore.fetchStatus()
  if (isRoot.value) load(1)
})
</script>

<template>
  <div class="rpa-workflow-admin flex flex-col gap-4">
    <el-empty v-if="!isRoot" description="无权限访问，需要 root 权限" />

    <template v-else>
      <!-- 筛选工具栏 -->
      <div class="rpa-workflow-admin__toolbar flex flex-wrap items-center gap-3">
        <el-input
          v-model="filterName"
          placeholder="按名称搜索"
          clearable
          class="w-52"
          @keyup.enter="handleSearch"
        />
        <el-input
          v-model="filterMid"
          placeholder="按作者 mid"
          clearable
          class="w-44"
          @keyup.enter="handleSearch"
        />
        <el-select v-model="filterPublic" placeholder="可见性" clearable class="w-36">
          <el-option label="公开" value="public" />
          <el-option label="私有" value="private" />
        </el-select>
        <el-select v-model="filterEnabled" placeholder="启用状态" clearable class="w-36">
          <el-option label="启用" value="enabled" />
          <el-option label="停用" value="disabled" />
        </el-select>
        <el-button type="primary" :icon="Search" @click="handleSearch">查询</el-button>
        <el-button :icon="Refresh" @click="handleReset">重置</el-button>
        <div class="flex-1" />
        <el-button :icon="Refresh" circle :loading="loading" @click="handleRefresh" />
      </div>

      <LoadingWrap :loading="loading" :rows="6">
        <EmptyState v-if="!loading && items.length === 0" text="暂无工作流" />
        <div v-else class="rpa-workflow-admin__table h-[calc(100vh-360px)] min-h-105">
          <el-auto-resizer>
            <template #default="{ height, width }">
              <el-table-v2
                :columns="columns"
                :data="items"
                :width="width"
                :height="fitTableHeight(height)"
                :row-height="TABLE_ROW_H"
                :header-height="TABLE_HEADER_H"
                :footer-height="total > pageSize ? TABLE_FOOTER_H : 0"
                row-key="id"
                fixed
              >
                <template #header-cell="{ column }">
                  <span class="text-sm font-medium text-text-secondary">{{ column.title }}</span>
                </template>

                <template #cell="{ column, rowData }">
                  <!-- 作者 -->
                  <template v-if="column.key === 'mid'">
                    <span class="text-sm text-text-primary">{{ rowData.mid || '-' }}</span>
                  </template>

                  <!-- 名称 -->
                  <template v-else-if="column.key === 'name'">
                    <span class="block truncate text-sm text-text-primary" :title="rowData.name">
                      {{ rowData.name || '-' }}
                    </span>
                  </template>

                  <!-- 触发 -->
                  <template v-else-if="column.key === 'trigger_type'">
                    <el-tag :type="rowData.trigger_type === 'cron' ? 'warning' : 'info'" effect="light">
                      {{ triggerText(rowData.trigger_type) }}
                    </el-tag>
                  </template>

                  <!-- 目标浏览器 -->
                  <template v-else-if="column.key === 'browser_id'">
                    <span class="text-sm text-text-primary">{{ rowData.browser_id ?? '-' }}</span>
                  </template>

                  <!-- 启用 -->
                  <template v-else-if="column.key === 'is_enabled'">
                    <el-switch
                      :model-value="rowData.is_enabled"
                      @change="(v: any) => handleToggleEnabled(rowData as AdminWorkflowItem, Boolean(v))"
                    />
                  </template>

                  <!-- 可见性 -->
                  <template v-else-if="column.key === 'is_public'">
                    <el-tag :type="rowData.is_public ? 'success' : 'info'" effect="plain">
                      {{ rowData.is_public ? '公开' : '私有' }}
                    </el-tag>
                  </template>

                  <!-- 上次运行 -->
                  <template v-else-if="column.key === 'last_run_status'">
                    <el-tag
                      v-if="rowData.last_run_status"
                      :type="statusTagType[rowData.last_run_status] || 'info'"
                      effect="light"
                    >
                      {{ statusText[rowData.last_run_status] || rowData.last_run_status }}
                    </el-tag>
                    <span v-else class="text-sm text-text-placeholder">-</span>
                  </template>

                  <!-- 更新时间 -->
                  <template v-else-if="column.key === 'updated_at'">
                    <span class="text-sm text-text-placeholder">{{ formatTime(rowData.updated_at) }}</span>
                  </template>

                  <!-- 操作 -->
                  <template v-else-if="column.key === 'op'">
                    <div class="flex items-center gap-1">
                      <el-button
                        size="small"
                        link
                        :icon="Document"
                        @click="openRuns(rowData as AdminWorkflowItem)"
                      >
                        运行记录
                      </el-button>
                      <el-button
                        size="small"
                        type="danger"
                        link
                        :icon="Delete"
                        @click="handleDelete(rowData as AdminWorkflowItem)"
                      >
                        删除
                      </el-button>
                    </div>
                  </template>

                  <!-- 默认列 -->
                  <template v-else>
                    <span class="text-sm text-text-primary">
                      {{ rowData[column.key as keyof AdminWorkflowItem] }}
                    </span>
                  </template>
                </template>

                <template #empty>
                  <div class="flex h-full items-center justify-center">
                    <el-empty description="暂无数据" :image-size="80" />
                  </div>
                </template>

                <template #footer>
                  <PaginationBar
                    :total="total"
                    :page-size="pageSize"
                    :current-page="page"
                    @update:current-page="onPageChange"
                    @update:page-size="onPageSizeChange"
                  />
                </template>
              </el-table-v2>
            </template>
          </el-auto-resizer>
        </div>
      </LoadingWrap>
    </template>

    <!-- 运行记录弹窗 -->
    <el-dialog v-model="runsVisible" :title="runsTitle" width="860px" top="8vh" destroy-on-close>
      <div class="flex flex-col gap-3">
        <div class="flex items-center justify-between">
          <span class="text-sm text-text-placeholder">共 {{ runsTotal }} 条</span>
          <el-button :icon="Refresh" size="small" :loading="runsLoading" @click="loadRuns(runsPage)">
            刷新
          </el-button>
        </div>
        <el-table v-loading="runsLoading" :data="runs" size="small" border max-height="480">
          <el-table-column prop="run_id" label="运行ID" width="180" show-overflow-tooltip />
          <el-table-column label="触发" width="80">
            <template #default="{ row }">{{ triggerText(row.trigger_source) }}</template>
          </el-table-column>
          <el-table-column label="状态" width="90">
            <template #default="{ row }">
              <el-tag :type="statusTagType[row.status] || 'info'" effect="light">
                {{ statusText[row.status] || row.status }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="结果" width="110">
            <template #default="{ row }">成功 {{ row.success_count }}/{{ row.total }}</template>
          </el-table-column>
          <el-table-column label="耗时" width="90">
            <template #default="{ row }">{{ formatDuration(row.duration_ms) }}</template>
          </el-table-column>
          <el-table-column label="开始时间" width="170">
            <template #default="{ row }">{{ formatTime(row.started_at) }}</template>
          </el-table-column>
          <el-table-column label="错误" min-width="140" show-overflow-tooltip>
            <template #default="{ row }">{{ row.error_message || '-' }}</template>
          </el-table-column>
        </el-table>
        <PaginationBar
          :total="runsTotal"
          :page-size="runsPageSize"
          :current-page="runsPage"
          @update:current-page="loadRuns"
          @update:page-size="onRunsPageSizeChange"
        />
      </div>
    </el-dialog>
  </div>
</template>
