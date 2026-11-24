<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessageBox, ElMessage } from 'element-plus'
import { Refresh, Loading, SetUp, Upload } from '@element-plus/icons-vue'
import FlexContainer from '@/components/CommonCompo/Bili-Container-Compo/FlexContainer.vue'
import BiliPageHeader from '@/components/CommonCompo/Bili-Container-Compo/BiliPageHeader.vue'
import { 自定义操作管理Service, 管理员管理Service } from '@/api/browser/hey-api'
import { client } from '@/api/browser/hey-api/client.gen'
import type { FilterType, SortBy, SortOrder } from '@/api/browser/hey-api'
import { useUserNavStore } from '@/stores/user_nav'
import ActionManageCard from '@/components/rpa-browser/ActionManageCard.vue'
import RpaResourceFilterBar from '@/components/rpa-browser/RpaResourceFilterBar.vue'
import { businessHandler } from '@/utils/businessHandler'
import { pickBackendMsg } from '@/utils/backendErrorMsg'
import { errMsg } from '@/utils/rpa/jsonImport'
import ActionDetailDialog from '@/components/rpa-browser/ActionDetailDialog.vue'
import ShareJsonDialog from '@/components/rpa-browser/ShareJsonDialog.vue'
import ImportJsonDialog from '@/components/rpa-browser/ImportJsonDialog.vue'

const router = useRouter()

interface ActionItem {
  /** 表主键（be-message 互动体系 rpa_action 的 bizId 用数字主键，非 action_id） */
  id: number
  action_id: string
  /** 作者 mid：用于区分本人/他人资源，他人资源不展示作者侧操作 */
  mid?: string
  name: string
  action_type: string
  description: string
  /** 动作展示图标：系列编号（0 = 默认图标） */
  icon_series?: number
  /** 动作展示图标：系列内编号（0 = 默认图标） */
  icon_id?: number
  steps_count: number
  tags: string[]
  is_enabled: boolean
  is_public: boolean
  likes_count: number
  forks_count: number
  /** Fork 来源动作的数据库主键（非空表示这是从上游 Fork 的副本，可同步上游最新内容） */
  forked_from_id: number | null
  /** 作者声明的语义化版本（服务端不自动递增） */
  version?: string
  /** 语义内容指纹（展示前 8 位；空 = 存量未计算） */
  content_hash?: string
  /** 上游是否有新版本可同步（仅 Fork 副本有意义） */
  has_upstream_update?: boolean
  /** 上游最近更新时间（秒级时间戳，转本地时间展示） */
  upstream_updated_at?: number | null
  /** 上游当前声明的版本号（非 Fork 或上游不可用时为 null） */
  upstream_version?: string | null
  /** 上游当前内容指纹（空 = 未计算或非 Fork） */
  upstream_content_hash?: string
  /** 最近一次同步上游的时间（秒级时间戳；null = 从未同步过） */
  last_synced_at?: number | null
  /** 是否开启上游自动同步（仅 Fork 副本有意义） */
  auto_sync_upstream?: boolean
  /** 是否有会被同步覆盖的本地修改（true 时自动同步会跳过） */
  local_steps_modified?: boolean
  created_at: string | null
  updated_at: string | null
}

const userNavStore = useUserNavStore()

const actionList = ref<ActionItem[]>([])
const total = ref(0)
const currentPage = ref(1)
const pageSize = ref(10)
const loading = ref(false)
const loadingMore = ref(false)
const searchText = ref('')
const filterTag = ref('')
const filterType = ref<FilterType>('all')
const sortBy = ref<SortBy>('updated_at')
const sortOrder = ref<SortOrder>('desc')
const allTags = ref<string[]>([])

/** 本人资源才展示作者侧操作（全部筛选下会混入他人公开资源） */
const isOwned = (mid?: string) =>
  !mid || String(mid) === String(userNavStore.user_nav.uid)

const hasMore = computed(() => actionList.value.length < total.value)

const loadActions = async (append = false) => {
  if (append) {
    if (loadingMore.value || !hasMore.value) return
    loadingMore.value = true
    currentPage.value++
  } else {
    loading.value = true
    currentPage.value = 1
  }

  const result = await businessHandler<{ items?: ActionItem[]; total?: number }>(
    自定义操作管理Service.listCustomActionsApiV1RpaBrowserControlCustomActionsListPost({
      body: {
        page: currentPage.value,
        per_page: pageSize.value,
        filter_type: filterType.value,
        sort_by: sortBy.value,
        sort_order: sortOrder.value,
        name: searchText.value || null,
        tag: filterTag.value || null,
      },
      // 失败走非 2xx 响应，开启 throwOnError 让 businessHandler 直接展示后端 msg
      throwOnError: true,
    }) as any,
    { successMessage: '', errorMessage: '获取动作列表失败', showSuccessToast: false }
  )
  if (result.success && result.data) {
    const items = result.data.items || []
    if (append) {
      actionList.value.push(...items)
    } else {
      actionList.value = items
    }
    total.value = result.data.total || 0
  } else if (append) {
    currentPage.value--
  }
  loading.value = false
  loadingMore.value = false
}

const loadMore = () => {
  loadActions(true)
}

const loadTags = async () => {
  const result = await businessHandler<string[]>(
    自定义操作管理Service.listCustomActionTagsApiV1RpaBrowserControlCustomActionsTagsPost({
      // 失败走非 2xx 响应，开启 throwOnError 让 businessHandler 直接展示后端 msg
      throwOnError: true,
    }) as any,
    { successMessage: '', errorMessage: '获取标签列表失败', showSuccessToast: false }
  )
  if (result.success && result.data) {
    allTags.value = result.data || []
  }
}

/** 筛选条件变化：统一回到第一页重新加载 */
const handleFilterChange = () => {
  loadActions()
}

/** 打开「导入分享」弹窗：粘贴 JSON 或从文件读取，统一在弹窗里完成 */
const importVisible = ref(false)
const openImportDialog = () => {
  importVisible.value = true
}

/** 导入他人分享的 JSON 并保存为一个新动作（后端生成新的 action_id） */
const importing = ref(false)
const handleImportSubmit = async (data: Record<string, unknown>) => {
  importing.value = true
  try {
    const res = await client.post({
      url: '/api/v1/rpa/browser/control/custom-actions/import',
      body: data,
      headers: { 'Content-Type': 'application/json', ...userNavStore.user_header },
      // 失败走非 2xx 响应，开启 throwOnError 以便 catch 直接拿到后端 { code, msg, data }
      throwOnError: true,
    }) as { code?: number; msg?: string; data?: { action_id?: string; name?: string } | null }
    if (res?.code === 0) {
      ElMessage.success(`导入成功${res.data?.name ? `：${res.data.name}` : ''}`)
      importVisible.value = false
      await loadActions()
      loadTags()
    } else {
      ElMessage.error(res?.msg || '导入失败')
    }
  } catch (e) {
    // 优先直接展示后端 msg；无 msg 或默认 500 才用兜底文案
    const backendMsg = pickBackendMsg(e)
    console.error('[ActionManagement] 导入动作异常:', e)
    ElMessage.error(backendMsg || `导入失败：${errMsg(e)}`)
  } finally {
    importing.value = false
  }
}

/** 动作的雪花 ID 以字符串透传（19 位整数超出 JS Number 安全范围，后端自行转 int），
 *  SDK 类型声明为 number，此处统一做带注释的转换，避免转 Number() 丢精度 */
const actionIdPayload = (actionId: string) => actionId as unknown as number

// ── 分享动作（后端导出的 JSON 与导入接口请求体一致） ──
const shareVisible = ref(false)
const shareLoading = ref(false)
const shareName = ref('')
const sharePayload = ref<Record<string, unknown> | null>(null)

/** 打开分享弹窗并向后端取导出内容；取不到时直接关闭，避免空弹窗 */
const handleShare = async (item: ActionItem) => {
  shareName.value = item.name
  sharePayload.value = null
  shareVisible.value = true
  shareLoading.value = true
  const result = await businessHandler<Record<string, unknown>>(
    自定义操作管理Service.exportCustomActionApiV1RpaBrowserControlCustomActionsExportPost({
      body: { action_id: actionIdPayload(item.action_id) },
      // 失败走非 2xx 响应，开启 throwOnError 让 businessHandler 直接展示后端 msg
      throwOnError: true,
    }) as any,
    { successMessage: '', errorMessage: '生成分享内容失败', showSuccessToast: false }
  )
  shareLoading.value = false
  if (result.success && result.data) {
    sharePayload.value = result.data
  } else {
    shareVisible.value = false
  }
}

const handleRename = async (item: ActionItem) => {
  let newName: string
  try {
    const result = await ElMessageBox.prompt('请输入新的名称', '重命名', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      inputValue: item.name,
      inputPattern: /\S+/,
      inputErrorMessage: '名称不能为空',
      lockScroll: false,
    })
    newName = result.value
  } catch {
    return
  }
  if (newName === item.name) return

  const result = await businessHandler(
    自定义操作管理Service.updateCustomActionApiV1RpaBrowserControlCustomActionsUpdatePost({
      body: { action_id: actionIdPayload(item.action_id), name: newName },
      // 失败走非 2xx 响应，开启 throwOnError 让 businessHandler 直接展示后端 msg
      throwOnError: true,
    }) as any,
    { successMessage: '重命名成功', errorMessage: '重命名失败' }
  )
  if (result.success) {
    item.name = newName
  }
}

const handleTogglePublic = async (item: ActionItem) => {
  const result = await businessHandler(
    自定义操作管理Service.updateCustomActionApiV1RpaBrowserControlCustomActionsUpdatePost({
      body: { action_id: actionIdPayload(item.action_id), is_public: item.is_public },
      // 失败走非 2xx 响应，开启 throwOnError 让 businessHandler 直接展示后端 msg
      throwOnError: true,
    }) as any,
    {
      successMessage: item.is_public ? '已设为公开' : '已设为私有',
      errorMessage: '修改可见性失败',
    }
  )
  if (!result.success) {
    item.is_public = !item.is_public
  }
}

const handleApplyPublish = async (item: ActionItem) => {
  let desc: string
  try {
    const result = await ElMessageBox.prompt(
      `提交后需管理员审核通过，操作才会公开到社区（审核前保持私有）。`,
      `申请公开「${item.name}」`,
      {
        confirmButtonText: '提交申请',
        cancelButtonText: '取消',
        inputPlaceholder: '请输入申请说明（可选）',
        inputValue: '',
        lockScroll: false,
      }
    )
    desc = result.value || ''
  } catch {
    return
  }
  const res = await businessHandler(
    管理员管理Service.submitApprovalApiAdminRpaApprovalSubmitPost({
      body: {
        resource_type: 'action',
        resource_id: String(item.action_id),
        action: 'publish',
        title: item.name,
        description: desc,
      },
      // 失败走非 2xx 响应，开启 throwOnError 让 businessHandler 直接展示后端 msg
      throwOnError: true,
    }) as any,
    { successMessage: '审批申请已提交，等待管理员审核', errorMessage: '提交失败' }
  )
  if (res.success) {
    ElMessage.success('可在「审批中心」查看审核进度')
  }
}

const goApprovalCenter = () => {
  router.push({ name: 'RPA_BROWSER_APPROVAL_CENTER' })
}

// ── Tag 编辑对话框 ──
const tagDialogVisible = ref(false)
const tagDialogLoading = ref(false)
const tagEditingItem = ref<ActionItem | null>(null)
const tagInputValue = ref('')

const openTagDialog = (item: ActionItem) => {
  tagEditingItem.value = item
  tagInputValue.value = ''
  tagDialogVisible.value = true
}

const handleAddTag = () => {
  const tag = tagInputValue.value.trim()
  if (!tag || !tagEditingItem.value) return
  if (tagEditingItem.value.tags.includes(tag)) {
    ElMessage.warning('标签已存在')
    return
  }
  tagEditingItem.value.tags.push(tag)
  tagInputValue.value = ''
}

const handleRemoveTag = (tag: string) => {
  if (!tagEditingItem.value) return
  tagEditingItem.value.tags = tagEditingItem.value.tags.filter(t => t !== tag)
}

const handleSaveTags = async () => {
  if (!tagEditingItem.value) return
  tagDialogLoading.value = true
  const result = await businessHandler(
    自定义操作管理Service.updateCustomActionApiV1RpaBrowserControlCustomActionsUpdatePost({
      body: { action_id: actionIdPayload(tagEditingItem.value.action_id), tags: tagEditingItem.value.tags },
      // 失败走非 2xx 响应，开启 throwOnError 让 businessHandler 直接展示后端 msg
      throwOnError: true,
    }) as any,
    { successMessage: '标签保存成功', errorMessage: '标签保存失败' }
  )
  tagDialogLoading.value = false
  if (result.success) {
    tagDialogVisible.value = false
    loadTags()
  }
}

// ── 同步上游最新版本（仅 Fork 副本可用） ──
const syncLoadingId = ref<string | null>(null)

/** 「更多」下拉菜单命令分发（次级操作收纳，减少卡片按钮数量） */
const handleMoreCommand = (
  command: 'rename' | 'publish' | 'share' | 'delete',
  item: ActionItem
) => {
  if (command === 'rename') handleRename(item)
  else if (command === 'publish') handleApplyPublish(item)
  else if (command === 'share') handleShare(item)
  else handleDelete(item)
}

const handleSyncUpstream = async (item: ActionItem) => {
  try {
    await ElMessageBox.confirm(
      `确定将「${item.name}」同步到上游原作者的最新版本吗？本地的当前内容会被上游最新内容覆盖（关联的子动作也会一并同步）。`,
      '同步上游',
      { confirmButtonText: '同步', cancelButtonText: '取消', type: 'warning', lockScroll: false }
    )
  } catch {
    return
  }
  syncLoadingId.value = item.action_id
  try {
    const res = await 自定义操作管理Service.syncCustomActionApiV1RpaBrowserControlCustomActionsSyncPost({
      body: { action_id: Number(item.action_id) },
      // 失败走非 2xx 响应，开启 throwOnError 以便 catch 直接拿到后端 { code, msg, data }
      throwOnError: true,
    }) as { code?: number; msg?: string; data?: { updated?: string[]; created?: string[]; unavailable?: number[]; local_overwritten?: boolean } | null }
    if (res?.code === 0) {
      const overwritten = res.data?.local_overwritten ? '（已覆盖本地修改）' : ''
      ElMessage.success((res.msg || '同步完成') + overwritten)
      loadActions()
      loadTags()
    } else {
      ElMessage.error(res?.msg || '同步失败')
    }
  } catch (e) {
    // 优先直接展示后端 msg；无 msg 或默认 500 才用兜底文案
    const backendMsg = pickBackendMsg(e)
    console.error('[ActionManagement] 同步上游异常:', e)
    ElMessage.error(backendMsg || `同步失败：${errMsg(e)}`)
  } finally {
    syncLoadingId.value = null
  }
}

// ── 上游自动同步开关（仅 Fork 副本；走更新接口透传） ──
const autoSyncLoadingId = ref<string | null>(null)
const handleToggleAutoSync = async (item: ActionItem) => {
  const next = item.auto_sync_upstream ?? false
  autoSyncLoadingId.value = item.action_id
  try {
    const result = await businessHandler(
      自定义操作管理Service.updateCustomActionApiV1RpaBrowserControlCustomActionsUpdatePost({
        body: { action_id: actionIdPayload(item.action_id), auto_sync_upstream: next },
        // 失败走非 2xx 响应，开启 throwOnError 让 businessHandler 直接展示后端 msg
        throwOnError: true,
      }) as any,
      {
        successMessage: next ? '已开启上游自动同步' : '已关闭上游自动同步',
        errorMessage: '自动同步开关设置失败',
      }
    )
    if (!result.success) {
      // 失败回滚开关状态
      item.auto_sync_upstream = !next
    }
  } finally {
    autoSyncLoadingId.value = null
  }
}

const handleDelete = async (item: ActionItem) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除动作「${item.name}」吗？此操作不可恢复。`,
      '删除确认',
      { confirmButtonText: '删除', cancelButtonText: '取消', type: 'warning', lockScroll: false }
    )
  } catch {
    return
  }
  const result = await businessHandler(
    自定义操作管理Service.deleteCustomActionApiV1RpaBrowserControlCustomActionsDeletePost({
      body: { action_id: actionIdPayload(item.action_id) },
      // 失败走非 2xx 响应，开启 throwOnError 让 businessHandler 直接展示后端 msg
      throwOnError: true,
    }) as any,
    { successMessage: '删除成功', errorMessage: '删除失败' }
  )
  if (result.success) {
    loadActions()
  }
}

// ── 动作详情（含结构流程图） ──
const detailVisible = ref(false)
const detailActionId = ref<string | null>(null)

const openDetail = (item: ActionItem) => {
  detailActionId.value = item.action_id
  detailVisible.value = true
}

const handleScroll = (e: Event) => {
  const target = e.target as HTMLElement
  const { scrollTop, scrollHeight, clientHeight } = target
  if (scrollHeight - scrollTop - clientHeight < 100 && hasMore.value && !loadingMore.value) {
    loadMore()
  }
}

const handleRefresh = () => {
  loadActions()
  loadTags()
}

/** 秒级时间戳（后端统一口径）转本地时间展示；null/0 视为从未同步 */
const formatTimestamp = (ts: number | null | undefined) => {
  if (!ts) return '从未同步'
  return new Date(ts * 1000).toLocaleString('zh-CN')
}

onMounted(() => {
  loadActions()
  loadTags()
})
</script>

<template>
  <FlexContainer>
    <BiliPageHeader title="动作管理" hide-title description="管理你的自定义动作" tag-text="动作">
      <template #extra>
        <el-button class="action-toolbar__import" :icon="Upload" @click="openImportDialog">导入分享</el-button>
        <el-button :icon="SetUp" @click="goApprovalCenter">审批中心</el-button>
        <el-button :icon="Refresh" @click="handleRefresh">刷新</el-button>
      </template>
    </BiliPageHeader>

    <FlexContainer class="mt-4 bg-bg rounded-2xl p-4">
      <!-- 搜索 / 筛选 / 排序：与工作流管理共用统一筛选栏 -->
      <RpaResourceFilterBar
        v-model:keyword="searchText"
        v-model:filter-type="filterType"
        v-model:sort-by="sortBy"
        v-model:sort-order="sortOrder"
        v-model:tag="filterTag"
        :tags="allTags"
        show-tag
        placeholder="搜索动作名称"
        @change="handleFilterChange"
      />

      <!-- 加载骨架 -->
      <div v-if="loading" class="w-full">
        <div class="action-card-grid grid grid-cols-[repeat(auto-fill,minmax(340px,1fr))] gap-4">
          <div v-for="i in 6" :key="i" class="rounded-xl p-5 border border-border-light">
            <el-skeleton :rows="4" animated />
          </div>
        </div>
      </div>

      <!-- 空状态 -->
      <div v-else-if="actionList.length === 0" class="flex flex-col items-center justify-center my-20 text-gray-400">
        <el-empty description="暂无自定义动作" />
      </div>

      <!-- 动作卡片列表（滚动容器） -->
      <div v-else class="action-list-scroll overflow-auto max-h-[calc(100vh-280px)]" @scroll="handleScroll">
        <div class="action-card-grid grid grid-cols-[repeat(auto-fill,minmax(340px,1fr))] gap-4">
          <ActionManageCard
            v-for="item in actionList"
            :key="item.action_id"
            :item="item"
            :variant="isOwned(item.mid) ? 'manage' : 'community'"
            :sync-loading="syncLoadingId === item.action_id"
            :auto-sync-loading="autoSyncLoadingId === item.action_id"
            @view="openDetail(item)"
            @sync-upstream="handleSyncUpstream(item)"
            @edit-tags="openTagDialog(item)"
            @toggle-public="handleTogglePublic(item)"
            @toggle-auto-sync="handleToggleAutoSync(item)"
            @more-command="(cmd) => handleMoreCommand(cmd, item)"
          />
        </div>

        <!-- 加载更多状态 -->
        <div v-if="loadingMore" class="flex justify-center py-6">
          <el-icon class="is-loading" :size="24"><Loading /></el-icon>
          <span class="ml-2 text-sm text-gray-400">加载中...</span>
        </div>
        <div v-else-if="!hasMore && actionList.length > 0" class="flex justify-center py-6 text-sm text-gray-400">
          没有更多了
        </div>
      </div>
    </FlexContainer>

    <!-- 动作详情（结构流程图） -->
    <ActionDetailDialog v-model="detailVisible" :action-id="detailActionId" />

    <!-- 分享动作：复制 / 下载与导入接口兼容的 JSON -->
    <ShareJsonDialog
      v-model="shareVisible"
      kind="action"
      :name="shareName"
      :payload="sharePayload"
      :loading="shareLoading"
    />

    <!-- 导入分享：粘贴 JSON 或选择 .json 文件后创建一份动作副本 -->
    <ImportJsonDialog
      v-model="importVisible"
      kind="action"
      :importing="importing"
      @submit="handleImportSubmit"
    />

    <!-- 标签编辑对话框 -->
    <el-dialog v-model="tagDialogVisible" title="编辑标签" width="420px" :lock-scroll="false">
      <div v-if="tagEditingItem" class="flex flex-col gap-4">
        <div class="text-sm text-gray-400">动作: {{ tagEditingItem.name }}</div>
        <div class="flex flex-wrap gap-2">
          <el-tag
            v-for="tag in tagEditingItem.tags"
            :key="tag"
            closable
            @close="handleRemoveTag(tag)"
          >
            {{ tag }}
          </el-tag>
          <span v-if="!tagEditingItem.tags.length" class="text-sm text-gray-500">暂无标签</span>
        </div>
        <el-input
          v-model="tagInputValue"
          placeholder="输入标签后按回车添加"
          @keyup.enter="handleAddTag"
        >
          <template #append>
            <el-button @click="handleAddTag">添加</el-button>
          </template>
        </el-input>
      </div>
      <template #footer>
        <el-button @click="tagDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="tagDialogLoading" @click="handleSaveTags">保存</el-button>
      </template>
    </el-dialog>
  </FlexContainer>
</template>
