<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessageBox, ElMessage } from 'element-plus'
import { Refresh, Search, Loading, SetUp, Upload } from '@element-plus/icons-vue'
import { useDebounceFn } from '@vueuse/core'
import FlexContainer from '@/components/CommonCompo/Bili-Container-Compo/FlexContainer.vue'
import BiliPageHeader from '@/components/CommonCompo/Bili-Container-Compo/BiliPageHeader.vue'
import { 自定义操作管理Service, 管理员管理Service } from '@/api/browser/hey-api'
import { client } from '@/api/browser/hey-api/client.gen'
import type { FilterType, SortBy, SortOrder } from '@/api/browser/hey-api'
import { useUserNavStore } from '@/stores/user_nav'
import ActionIcon from '@/components/rpa-browser/ActionIcon.vue'
import { DEFAULT_ACTION_ICON } from '@/utils/rpa/actionTypeIcon'
import { businessHandler } from '@/utils/businessHandler'
import { pickBackendMsg } from '@/utils/backendErrorMsg'
import { pickJsonFile, errMsg } from '@/utils/rpa/jsonImport'
import ResourceInteractionBar from '@/components/interaction/ResourceInteractionBar.vue'
import ActionDetailDialog from '@/components/rpa-browser/ActionDetailDialog.vue'
import IconRefresh from '@/assets/svgs/space/refresh.svg?component'
import IconTag from '@/assets/svgs/space/tag.svg?component'
import IconMore from '@/assets/svgs/space/more.svg?component'

const router = useRouter()

interface ActionItem {
  /** 表主键（be-message 互动体系 rpa_action 的 bizId 用数字主键，非 action_id） */
  id: number
  action_id: string
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
  /** 上游是否有新版本可同步（仅 Fork 副本有意义） */
  has_upstream_update?: boolean
  /** 上游最近更新时间（秒级时间戳，转本地时间展示） */
  upstream_updated_at?: number | null
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
const allTags = ref<string[]>([])

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
        filter_type: 'private' as FilterType,
        sort_by: 'updated_at' as SortBy,
        sort_order: 'desc' as SortOrder,
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

const handleSearch = useDebounceFn(() => {
  loadActions()
}, 400)

/** 从 JSON 文件直接导入并保存为一个新动作（后端生成新的 action_id） */
const importing = ref(false)
const handleImportJson = async () => {
  let data: Record<string, unknown> | null
  try {
    data = await pickJsonFile()
  } catch (e) {
    ElMessage.error(`导入失败：${errMsg(e)}`)
    return
  }
  if (!data) return // 用户取消

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

const handleTagFilter = () => {
  loadActions()
}

/** 动作的雪花 ID 以字符串透传（19 位整数超出 JS Number 安全范围，后端自行转 int），
 *  SDK 类型声明为 number，此处统一做带注释的转换，避免转 Number() 丢精度 */
const actionIdPayload = (actionId: string) => actionId as unknown as number

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
        resource_id: item.action_id,
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

/** 同步图标悬停文案（图标化后的状态说明入口） */
const syncIconTip = (item: ActionItem) => {
  if (item.has_upstream_update) {
    return item.local_steps_modified ? '上游有更新（有本地修改，同步将覆盖）' : '上游有更新，点击同步'
  }
  return item.local_steps_modified ? '已是最新版本（有本地修改）' : '已是最新版本'
}

/** 「更多」下拉菜单命令分发（次级操作收纳，减少卡片按钮数量） */
const handleMoreCommand = (
  command: 'rename' | 'publish' | 'delete',
  item: ActionItem
) => {
  if (command === 'rename') handleRename(item)
  else if (command === 'publish') handleApplyPublish(item)
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

const formatTime = (t: string | null) => {
  if (!t) return '-'
  return new Date(t).toLocaleString('zh-CN')
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
    <BiliPageHeader title="动作管理" hide-title description="管理你的自定义动作" tag-text="私有动作">
      <template #extra>
        <el-button :icon="Upload" :loading="importing" @click="handleImportJson">从 JSON 导入</el-button>
        <el-button :icon="SetUp" @click="goApprovalCenter">审批中心</el-button>
        <el-button :icon="Refresh" @click="handleRefresh">刷新</el-button>
      </template>
    </BiliPageHeader>

    <FlexContainer class="mt-4 bg-bg rounded-2xl p-4">
      <!-- 搜索栏 -->
      <div class="action-toolbar flex items-center gap-3 mb-4 flex-wrap">
        <el-input
          v-model="searchText"
          placeholder="搜索动作名称"
          :prefix-icon="Search"
          clearable
          class="action-toolbar__search w-60"
          @input="handleSearch"
          @clear="handleSearch"
        />
        <el-select
          v-model="filterTag"
          placeholder="按标签筛选"
          clearable
          class="action-toolbar__tag-filter w-45"
          @change="handleTagFilter"
          @clear="handleTagFilter"
        >
          <el-option v-for="t in allTags" :key="t" :label="t" :value="t" />
        </el-select>
      </div>

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
          <div
            v-for="item in actionList"
            :key="item.action_id"
            class="action-card min-w-0 rounded-xl p-5 border border-border-light hover:border-primary transition-colors flex flex-col gap-3 overflow-hidden"
          >
              <!-- 名称行 -->
              <div class="action-card__header flex items-start justify-between gap-2">
                <div class="flex-1 min-w-0">
                  <div class="action-card__title-row flex items-center gap-2">
                    <ActionIcon
                      :series="item.icon_series"
                      :id="item.icon_id"
                      class="action-card__icon w-5 h-5 shrink-0 text-text-primary"
                    >
                      <template #fallback>
                        <el-icon class="text-lg text-text-primary">
                          <component :is="DEFAULT_ACTION_ICON" />
                        </el-icon>
                      </template>
                    </ActionIcon>
                    <h3 class="text-base font-semibold truncate" :title="item.name">{{ item.name }}</h3>
                  </div>
                  <p class="action-card__description text-sm text-gray-400 mt-1 line-clamp-2 min-h-10">
                    {{ item.description || '暂无描述' }}
                  </p>
                </div>
                <!-- 上游同步状态图标（仅 Fork 副本）：有更新=warning 高亮可点击；
                     已是最新=置灰不可点，悬停有说明，取代原文字徽标与同步按钮 -->
                <div class="action-card__status-icons flex items-center gap-2 shrink-0">
                  <el-tooltip v-if="item.forked_from_id" :content="syncIconTip(item)" placement="top">
                    <el-button
                      v-if="item.has_upstream_update"
                      link
                      class="action-card__sync-icon p-0 h-auto text-warning"
                      :loading="syncLoadingId === item.action_id"
                      @click="handleSyncUpstream(item)"
                    >
                      <component :is="IconRefresh" class="w-4 h-4" />
                    </el-button>
                    <span v-else class="action-card__sync-idle text-gray-300">
                      <component :is="IconRefresh" class="w-4 h-4" />
                    </span>
                  </el-tooltip>
                </div>
              </div>

              <!-- 标签（仅在有标签时展示，无占位文字，避免卡片信息过载） -->
              <div v-if="item.tags?.length" class="action-card__tags flex flex-wrap items-center gap-1.5">
                <el-tag
                  v-for="tag in item.tags"
                  :key="tag"
                  effect="plain"
                >
                  {{ tag }}
                </el-tag>
              </div>

              <!-- 元信息 -->
              <div class="action-card__meta flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-400">
                <span class="shrink-0">步骤: {{ item.steps_count }}</span>
                <span class="truncate">更新: {{ formatTime(item.updated_at) }}</span>
              </div>

              <!-- 收藏/点赞（2.17.0：动作走 be-message 通用互动） -->
              <div class="action-card__interaction flex items-center pt-1">
                <ResourceInteractionBar biz-type="rpa_action" :biz-id="String(item.id)" />
              </div>

              <!-- 操作栏：主操作（查看）保留文字按钮，次级操作全部图标化，
                   重命名/申请公开/删除收入「更多」下拉；EP 会给相邻 el-button
                   加 12px 左边距，用 [&_.el-button]:ml-0 中和 gap -->
              <div class="action-card__actions flex items-center gap-3 pt-3 border-t border-border-lighter [&_.el-button]:ml-0">
                <el-button type="primary" @click="openDetail(item)">查看</el-button>

                <el-tooltip content="编辑标签" placement="top">
                  <el-button
                    link
                    class="action-card__action-tags p-0 h-auto text-text-primary"
                    @click="openTagDialog(item)"
                  >
                    <component :is="IconTag" class="w-4 h-4" />
                  </el-button>
                </el-tooltip>

                <!-- 上游自动同步开关（仅 Fork 副本） -->
                <el-tooltip
                  v-if="item.forked_from_id"
                  :content="item.auto_sync_upstream ? '自动同步：开' : '自动同步：关'"
                  placement="top"
                >
                  <el-switch
                    class="action-card__auto-sync"
                    v-model="item.auto_sync_upstream"
                    :loading="autoSyncLoadingId === item.action_id"
                    @change="handleToggleAutoSync(item)"
                  />
                </el-tooltip>

                <!-- 可见性开关 -->
                <el-tooltip :content="item.is_public ? '公开' : '私有'" placement="top">
                  <el-switch
                    class="action-card__visibility"
                    v-model="item.is_public"
                    inline-prompt
                    active-text="公开"
                    inactive-text="私有"
                    @change="handleTogglePublic(item)"
                  />
                </el-tooltip>

                <!-- 更多次级操作 -->
                <el-dropdown
                  class="action-card__more ml-auto"
                  trigger="click"
                  @command="(cmd: string) => handleMoreCommand(cmd as 'rename' | 'publish' | 'delete', item)"
                >
                  <el-button link class="action-card__more-trigger p-0 h-auto text-text-primary">
                    <component :is="IconMore" class="w-4 h-4" />
                  </el-button>
                  <template #dropdown>
                    <el-dropdown-menu>
                      <el-dropdown-item command="rename">重命名</el-dropdown-item>
                      <el-dropdown-item v-if="!item.is_public" command="publish">申请公开</el-dropdown-item>
                      <el-dropdown-item command="delete" divided>删除</el-dropdown-item>
                    </el-dropdown-menu>
                  </template>
                </el-dropdown>
              </div>
            </div>
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
