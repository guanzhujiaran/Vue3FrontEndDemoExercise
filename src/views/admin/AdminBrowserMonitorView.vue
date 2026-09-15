<script setup lang="ts">
import { computed, onMounted, provide, ref } from 'vue'
import { Refresh } from '@element-plus/icons-vue'
import { ElMessageBox } from 'element-plus'
import { TableV2FixedDir, type Column } from 'element-plus'
import {
  管理员管理Service,
  type BrowserMonitorItem,
  type BrowserMonitorListResponse,
  type BrowserMonitorPageItem,
  type BrowserMonitorPagesResponse,
  type BrowserMonitorStopResponse,
} from '@/api/browser/hey-api'
import {
  MessageNotifyService,
  NotifyLevelEnum,
  NotifyTargetTypeEnum,
  type NotifyCreateReq,
} from '@/api/community/hey-api'
import { useMessageAdminStore } from '@/stores/message_admin'
import { hasBizPerm, hasRpaAdminPerm } from '@/views/message/messageAdmin'
import { businessHandler, type BusinessResponse } from '@/utils/businessHandler'
import LoadingWrap from '@/components/message/LoadingWrap.vue'
import EmptyState from '@/components/message/EmptyState.vue'
import PaginationBar from '@/components/message/PaginationBar.vue'
import LiveBox from '@/components/rpa-browser/LiveBox.vue'

/** 资源操作位：BAN=1（x 处置） / AUDIT=2（w 审核） / VIEW=4（r 查看） */
const BAN_OP = 1
/** 封号域：RPA 封禁走 be-message 授予的 user 域 BAN 位 */
const USER_BIZ = 'user'

const adminStore = useMessageAdminStore()

// 监管列表 / 停止：RPA 资源域（root 或任一 rpa_* 域持有 查看/审核 位）
const isAdmin = computed(() =>
  hasRpaAdminPerm(adminStore.status.biz_perms, adminStore.status.is_root)
)
// 封号：user 域 BAN 位（仅 RPA 服务生效，不联动评论 / 私信）
const canBanUser = computed(
  () =>
    Boolean(adminStore.status.is_root) ||
    hasBizPerm(adminStore.status.biz_perms, USER_BIZ, BAN_OP)
)

const items = ref<BrowserMonitorItem[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(20)
const loading = ref(false)
const filterMid = ref('')
const filterBrowserId = ref('')

const TABLE_HEADER_H = 44
const TABLE_ROW_H = 72
const TABLE_FOOTER_H = 64

function fitTableHeight(avail: number): number {
  const footerH = total.value > pageSize.value ? TABLE_FOOTER_H : 0
  const contentH = TABLE_HEADER_H + items.value.length * TABLE_ROW_H + footerH
  return Math.min(avail, Math.max(contentH, TABLE_HEADER_H + TABLE_ROW_H + footerH))
}

function formatTime(seconds: number | undefined): string {
  if (!seconds) return '-'
  return new Date(seconds * 1000).toLocaleString('zh-CN')
}

function displayName(item: BrowserMonitorItem): string {
  return item.custom_name || '未命名'
}

/** 后端 int 可能精度丢失，优先用 *_str */
function idOf(value: string | undefined, fallback: number): string {
  return value || String(fallback)
}

const columns: Column<BrowserMonitorItem>[] = [
  { key: 'browser', title: '浏览器', width: 210 },
  { key: 'mid', title: '用户 mid', width: 150 },
  { key: 'env', title: '环境', width: 150 },
  { key: 'started_at', title: '启动时间', width: 175 },
  { key: 'last_activity_at', title: '最后操作', width: 175 },
  { key: 'page_count', title: '标签页', width: 90 },
  { key: 'active_page', title: '当前页面', width: 260, flexGrow: 1 },
  { key: 'streams', title: '直播流', width: 90 },
  { key: 'op', title: '操作', width: 280, fixed: TableV2FixedDir.RIGHT },
]

const load = async () => {
  if (!isAdmin.value) return
  loading.value = true
  const res = await businessHandler(
    管理员管理Service.listBrowserMonitorsApiAdminRpaBrowserMonitorsPost({
      body: {
        page: page.value,
        per_page: pageSize.value,
        mid: filterMid.value || undefined,
        browser_id: filterBrowserId.value || undefined,
      },
    }) as unknown as Promise<BusinessResponse<BrowserMonitorListResponse | null | undefined>>,
    { showSuccessToast: false, errorMessage: '获取浏览器监管列表失败' }
  )
  items.value = res.data?.items ?? []
  total.value = res.data?.total ?? 0
  loading.value = false
}

const handleSearch = () => {
  page.value = 1
  load()
}

const onPageChange = (p: number) => {
  page.value = p
  load()
}

const onPageSizeChange = (size: number) => {
  pageSize.value = size
  page.value = 1
  load()
}

// ===== 查看直播（只读）=====
const drawerVisible = ref(false)
const currentItem = ref<BrowserMonitorItem | null>(null)
const monitorPages = ref<BrowserMonitorPageItem[]>([])
const readonlyStreaming = ref(false)
// LiveBox 依赖 provide 的会话状态，监管场景会话确实在运行，直接按已连接提供
const sessionStatus = ref('connected')
const sessionConnected = ref(true)
const monitorUploadSpeed = ref('0')
const monitorDownloadSpeed = ref('0')

provide('isStreaming', readonlyStreaming)
provide('browserSessionStatus', sessionStatus)
provide('isSessionConnected', sessionConnected)
provide('uploadSpeed', monitorUploadSpeed)
provide('downloadSpeed', monitorDownloadSpeed)

const openMonitor = async (item: BrowserMonitorItem) => {
  currentItem.value = item
  monitorPages.value = []
  readonlyStreaming.value = false
  drawerVisible.value = true

  const res = await businessHandler(
    管理员管理Service.getBrowserMonitorPagesApiAdminRpaBrowserMonitorPagesPost({
      body: {
        mid: idOf(item.mid_str, item.mid),
        browser_id: idOf(item.browser_id_str, item.browser_id),
      },
    }) as unknown as Promise<BusinessResponse<BrowserMonitorPagesResponse | null | undefined>>,
    { showSuccessToast: false, errorMessage: '获取标签页失败' }
  )
  monitorPages.value = res.data?.pages ?? []
}

// ===== 停止会话 =====
const handleStop = async (item: BrowserMonitorItem) => {
  let reason = ''
  try {
    const res = await ElMessageBox.prompt(
      `将强制停止用户 ${idOf(item.mid_str, item.mid)} 的浏览器 ${idOf(item.browser_id_str, item.browser_id)}`,
      '强制停止会话',
      {
        confirmButtonText: '确定停止',
        cancelButtonText: '取消',
        type: 'warning',
        inputPlaceholder: '请填写处置原因（写入审计日志）',
        inputValidator: (v: string) => (v?.trim() ? true : '处置原因不能为空'),
        lockScroll: false,
      }
    )
    reason = String(res.value ?? '').trim()
  } catch {
    return
  }

  const result = await businessHandler(
    管理员管理Service.stopBrowserSessionApiAdminRpaBrowserSessionStopPost({
      body: {
        mid: idOf(item.mid_str, item.mid),
        browser_id: idOf(item.browser_id_str, item.browser_id),
        reason,
      },
    }) as unknown as Promise<BusinessResponse<BrowserMonitorStopResponse | null | undefined>>,
    { successMessage: '会话已强制停止', errorMessage: '停止会话失败' }
  )
  if (result.success) load()
}

// ===== 通知（定向该用户，走 be-message 站内通知）=====
const notifyDialogVisible = ref(false)
const notifyTarget = ref<BrowserMonitorItem | null>(null)
const notifyTitle = ref('')
const notifyContent = ref('')
const notifyLevel = ref<number>(NotifyLevelEnum.IMPORTANT)

const openNotify = (item: BrowserMonitorItem) => {
  notifyTarget.value = item
  notifyTitle.value = '浏览器使用违规提醒'
  notifyContent.value = ''
  notifyLevel.value = NotifyLevelEnum.IMPORTANT
  notifyDialogVisible.value = true
}

const submitNotify = async () => {
  const item = notifyTarget.value
  if (!item || !notifyTitle.value.trim() || !notifyContent.value.trim()) return

  const payload: NotifyCreateReq = {
    title: notifyTitle.value.trim(),
    content: notifyContent.value.trim(),
    target_type: NotifyTargetTypeEnum.CUSTOM,
    target_value: idOf(item.mid_str, item.mid),
    level: notifyLevel.value as NotifyCreateReq['level'],
  }
  const res = await businessHandler(
    MessageNotifyService.createNotifyApiV1MessageNotifyAdminCreatePost({
      body: payload,
    }) as unknown as Promise<BusinessResponse<unknown>>,
    { successMessage: '通知已发送', errorMessage: '通知发送失败' }
  )
  if (res.success) notifyDialogVisible.value = false
}

// ===== 封号（仅 RPA 服务）=====
const BAN_DURATIONS: Array<{ label: string; value: number }> = [
  { label: '10 分钟', value: 10 },
  { label: '1 小时', value: 60 },
  { label: '24 小时', value: 1440 },
  { label: '7 天', value: 10080 },
]

const banDialogVisible = ref(false)
const banTarget = ref<BrowserMonitorItem | null>(null)
const banPermanent = ref(false)
const banDuration = ref(60)
const banReason = ref('')

const openBan = (item: BrowserMonitorItem) => {
  banTarget.value = item
  banPermanent.value = false
  banDuration.value = 60
  banReason.value = ''
  banDialogVisible.value = true
}

const submitBan = async () => {
  const item = banTarget.value
  if (!item || !banReason.value.trim()) return

  const res = await businessHandler(
    管理员管理Service.banUserApiAdminRpaBanCreatePost({
      body: {
        mid: item.mid,
        ban_type: banPermanent.value ? 'permanent' : 'temporary',
        duration_minutes: banPermanent.value ? null : banDuration.value,
        reason: banReason.value.trim(),
        note: `browser_id=${idOf(item.browser_id_str, item.browser_id)}`,
      },
    }) as unknown as Promise<BusinessResponse<unknown>>,
    { successMessage: '已封禁该用户（仅 RPA 服务）', errorMessage: '封禁失败' }
  )
  if (res.success) {
    banDialogVisible.value = false
    load()
  }
}

onMounted(async () => {
  await adminStore.fetchStatus()
  if (isAdmin.value) load()
})
</script>

<template>
  <div class="admin-browser-monitor flex flex-col gap-4">
    <el-empty v-if="!isAdmin" description="无权限访问，需要 RPA 管理员或 root 权限" />

    <template v-else>
      <div class="admin-browser-monitor__header flex flex-wrap items-center justify-between gap-3">
        <div class="flex items-center gap-3">
          <span class="text-lg font-medium text-text-primary">浏览器监管</span>
          <el-input
            v-model="filterMid"
            class="admin-browser-monitor__filter-mid w-44"
            placeholder="按 mid 过滤"
            clearable
            @keyup.enter="handleSearch"
          />
          <el-input
            v-model="filterBrowserId"
            class="admin-browser-monitor__filter-browser w-44"
            placeholder="按 browser_id 过滤"
            clearable
            @keyup.enter="handleSearch"
          />
          <el-button type="primary" @click="handleSearch">查询</el-button>
        </div>
      </div>

      <div class="admin-browser-monitor__toolbar flex justify-end">
        <el-button :icon="Refresh" :loading="loading" @click="load">刷新</el-button>
      </div>

      <LoadingWrap :loading="loading" :rows="6">
        <EmptyState v-if="!loading && items.length === 0" text="暂无运行中的浏览器实例" />
        <div
          v-else
          class="admin-browser-monitor__table h-[calc(100vh-340px)] min-h-105"
        >
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
                row-key="browser_id"
                fixed
              >
                <template #header-cell="{ column }">
                  <span class="text-sm font-medium text-text-secondary">{{ column.title }}</span>
                </template>

                <template #cell="{ column, rowData }">
                  <template v-if="column.key === 'browser'">
                    <div class="flex flex-col justify-center">
                      <span class="truncate text-sm text-text-primary">{{ displayName(rowData as BrowserMonitorItem) }}</span>
                      <span class="truncate text-xs text-text-placeholder">
                        {{ idOf((rowData as BrowserMonitorItem).browser_id_str, (rowData as BrowserMonitorItem).browser_id) }}
                      </span>
                    </div>
                  </template>

                  <template v-else-if="column.key === 'mid'">
                    <span class="text-sm text-text-primary">
                      {{ idOf((rowData as BrowserMonitorItem).mid_str, (rowData as BrowserMonitorItem).mid) }}
                    </span>
                  </template>

                  <template v-else-if="column.key === 'env'">
                    <span class="text-sm text-text-secondary">
                      {{ (rowData as BrowserMonitorItem).platform || '-' }} /
                      {{ (rowData as BrowserMonitorItem).browser || '-' }}
                    </span>
                  </template>

                  <template v-else-if="column.key === 'started_at'">
                    <span class="text-sm text-text-placeholder">
                      {{ formatTime((rowData as BrowserMonitorItem).started_at) }}
                    </span>
                  </template>

                  <template v-else-if="column.key === 'last_activity_at'">
                    <span class="text-sm text-text-placeholder">
                      {{ formatTime((rowData as BrowserMonitorItem).last_activity_at) }}
                    </span>
                  </template>

                  <template v-else-if="column.key === 'page_count'">
                    <span class="text-sm text-text-primary">
                      {{ (rowData as BrowserMonitorItem).page_count ?? 0 }}
                    </span>
                  </template>

                  <template v-else-if="column.key === 'active_page'">
                    <div class="flex flex-col justify-center">
                      <span
                        class="truncate text-sm text-text-primary"
                        :title="(rowData as BrowserMonitorItem).active_page_url || '-'"
                      >
                        {{ (rowData as BrowserMonitorItem).active_page_url || '-' }}
                      </span>
                      <span class="truncate text-xs text-text-placeholder">
                        {{ (rowData as BrowserMonitorItem).active_page_title || '' }}
                      </span>
                    </div>
                  </template>

                  <template v-else-if="column.key === 'streams'">
                    <span class="text-sm text-text-primary">
                      {{ (rowData as BrowserMonitorItem).webrtc_active_streams ?? 0 }}
                    </span>
                  </template>

                  <template v-else-if="column.key === 'op'">
                    <div class="flex flex-wrap items-center gap-2">
                      <el-button @click="openMonitor(rowData as BrowserMonitorItem)">查看</el-button>
                      <el-button type="warning" @click="handleStop(rowData as BrowserMonitorItem)">
                        停止
                      </el-button>
                      <el-button @click="openNotify(rowData as BrowserMonitorItem)">通知</el-button>
                      <el-button
                        type="danger"
                        :disabled="!canBanUser"
                        @click="openBan(rowData as BrowserMonitorItem)"
                      >
                        封号
                      </el-button>
                    </div>
                  </template>

                  <template v-else>
                    <span class="text-sm text-text-primary">-</span>
                  </template>
                </template>

                <template #empty>
                  <div class="flex h-full items-center justify-center">
                    <el-empty description="暂无数据" :image-size="80" />
                  </div>
                </template>

                <template #footer>
                  <PaginationBar
                    class="admin-browser-monitor__pagination"
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

    <!-- 查看直播（只读：只观看，不代替用户操作浏览器） -->
    <el-drawer
      v-model="drawerVisible"
      class="admin-browser-monitor__drawer"
      title="浏览器监管 - 只读观看"
      size="70%"
      destroy-on-close
    >
      <div class="flex h-full flex-col gap-4">
        <div class="flex flex-wrap items-center gap-4 text-sm text-text-secondary">
          <span>浏览器：{{ currentItem ? displayName(currentItem) : '-' }}</span>
          <span>ID：{{ currentItem ? idOf(currentItem.browser_id_str, currentItem.browser_id) : '-' }}</span>
          <span>用户 mid：{{ currentItem ? idOf(currentItem.mid_str, currentItem.mid) : '-' }}</span>
          <span>启动：{{ currentItem ? formatTime(currentItem.started_at) : '-' }}</span>
        </div>

        <div class="flex min-h-0 flex-1 gap-4">
          <div class="admin-browser-monitor__live h-full min-w-0 flex-1">
            <LiveBox
              v-if="currentItem"
              :browser-id="idOf(currentItem.browser_id_str, currentItem.browser_id)"
              :is-streaming="readonlyStreaming"
              readonly
              :readonly-pages="monitorPages"
            />
          </div>

          <div class="admin-browser-monitor__pages w-72 shrink-0 overflow-auto">
            <div class="mb-2 text-sm font-medium text-text-primary">
              标签页（{{ monitorPages.length }}）
            </div>
            <el-empty v-if="monitorPages.length === 0" description="暂无标签页" :image-size="60" />
            <ul v-else class="flex flex-col gap-2">
              <li
                v-for="p in monitorPages"
                :key="p.index"
                class="admin-browser-monitor__page-item rounded border border-border p-2"
              >
                <div class="truncate text-sm text-text-primary" :title="p.title">
                  {{ p.title || `页面 ${p.index + 1}` }}
                </div>
                <div class="truncate text-xs text-text-placeholder" :title="p.url">{{ p.url }}</div>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </el-drawer>

    <!-- 通知该用户 -->
    <el-dialog v-model="notifyDialogVisible" class="admin-browser-monitor__notify" title="通知用户" width="520" :lock-scroll="false">
      <el-form label-width="80px">
        <el-form-item label="接收用户">
          <span class="text-sm text-text-secondary">
            {{ notifyTarget ? idOf(notifyTarget.mid_str, notifyTarget.mid) : '-' }}
          </span>
        </el-form-item>
        <el-form-item label="标题">
          <el-input v-model="notifyTitle" placeholder="通知标题" />
        </el-form-item>
        <el-form-item label="正文">
          <el-input v-model="notifyContent" type="textarea" :rows="4" placeholder="通知正文" />
        </el-form-item>
        <el-form-item label="级别">
          <el-select v-model="notifyLevel">
            <el-option :label="'普通'" :value="NotifyLevelEnum.NORMAL" />
            <el-option :label="'重要'" :value="NotifyLevelEnum.IMPORTANT" />
            <el-option :label="'紧急'" :value="NotifyLevelEnum.URGENT" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="notifyDialogVisible = false">取消</el-button>
        <el-button
          type="primary"
          :disabled="!notifyTitle.trim() || !notifyContent.trim()"
          @click="submitNotify"
        >
          发送
        </el-button>
      </template>
    </el-dialog>

    <!-- 封号（仅 RPA 服务） -->
    <el-dialog v-model="banDialogVisible" class="admin-browser-monitor__ban" title="封禁用户（仅 RPA 服务）" width="520" :lock-scroll="false">
      <el-form label-width="90px">
        <el-form-item label="封禁用户">
          <span class="text-sm text-text-secondary">
            {{ banTarget ? idOf(banTarget.mid_str, banTarget.mid) : '-' }}
          </span>
        </el-form-item>
        <el-form-item label="封禁时长">
          <el-select v-model="banDuration" :disabled="banPermanent">
            <el-option v-for="d in BAN_DURATIONS" :key="d.value" :label="d.label" :value="d.value" />
          </el-select>
          <el-checkbox v-model="banPermanent" class="ml-3">永久封禁</el-checkbox>
        </el-form-item>
        <el-form-item label="封禁理由">
          <el-input v-model="banReason" type="textarea" :rows="3" placeholder="必填，写入封禁记录" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="banDialogVisible = false">取消</el-button>
        <el-button type="danger" :disabled="!banReason.trim()" @click="submitBan">确认封禁</el-button>
      </template>
    </el-dialog>
  </div>
</template>
