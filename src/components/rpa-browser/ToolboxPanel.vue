<script setup lang="ts">
import { ref, computed, shallowRef, onMounted } from 'vue'
import { Search, Tools, Lock, Refresh, Bell, Edit, Folder } from '@element-plus/icons-vue'
import {
  ElAutocomplete, ElEmpty, ElTreeV2, ElButton, ElText,
  ElMessage, ElTooltip, ElSelect, ElOption, ElSegmented,
} from 'element-plus'
import {
  listCustomActionsApiV1RpaBrowserControlCustomActionsListPost,
  listRegisteredActionsApiV1RpaBrowserControlActionsRegisteredPost,
  getCustomActionApiV1RpaBrowserControlCustomActionsGetPost,
} from '@/api/browser/hey-api'
import { client } from '@/api/browser/hey-api/client.gen'
import type { FilterType, SortBy, SortOrder } from '@/api/browser/hey-api/types.gen'
import { useUserNavStore } from '@/stores/user_nav'

// ── 常量 ─────────────────────────────────────────────
enum ToolboxTab {
  PRIVATE = 'tool-box-private-action',
  PUBLIC = 'tool-box-public-action',
  BASIC = 'tool-box-basic-action',
}
const MAX_VISIBLE_TAGS = 2
const PER_PAGE = 10

interface TabOption {
  value: ToolboxTab
  label: string
  icon: typeof Lock
}
const tabList: TabOption[] = [
  { value: ToolboxTab.PRIVATE, label: '私有', icon: Lock },
  { value: ToolboxTab.PUBLIC, label: '公开', icon: Folder },
  { value: ToolboxTab.BASIC, label: '基础操作', icon: Tools },
]

// ── Props & Emits ────────────────────────────────────

interface Props { browserId: string }
defineProps<Props>()
const emit = defineEmits<{ 'edit-action': [actionDetail: Record<string, unknown>] }>()
const userNavStore = useUserNavStore()

// ── 状态 ─────────────────────────────────────────────

const activeTab = ref<string>(ToolboxTab.PRIVATE)
const searchInput = ref('')
const searchQuery = ref('')
const selectedTag = ref('')
const tagSelected = ref(true)
interface TagOption { name: string; count: number }
const tagOptions = ref<TagOption[]>([])
const loading = ref(false)
const loadingMore = ref(false)
const loadedTabs = ref(new Set<string>())

/** 当前列表数据（追加模式） */
const actionList = shallowRef<unknown[]>([])
const currentPage = ref(1)
const totalCount = ref(0)
const loadError = ref(false)

const registeredActions = shallowRef<unknown[]>([])

/** 标签缓存：切换 tab 时保存/恢复各 tab 的列表状态 */
const tabCache = ref<Record<string, {
  actionList: unknown[]
  searchInput: string
  searchQuery: string
  selectedTag: string
  tagSelected: boolean
  currentPage: number
  totalCount: number
  loadError: boolean
}>>({})

// 联想词节流
let suggestLastTime = 0
let suggestTimer: ReturnType<typeof setTimeout> | null = null
const SUGGEST_THROTTLE_MS = 300

// ── 工具 ─────────────────────────────────────────────

const actionTitleMap: Record<string, string> = {
  click: '点击', input: '输入', navigation: '导航', navigate: '页面导航',
  new_page: '新建页面', screenshot: '截图', wait: '等待', scroll: '滚动',
  hover: '悬停', evaluate: '执行JS', select: '选择', keyboard: '键盘',
  mouse: '鼠标', llm: 'LLM', loop: '循环', if_else: '条件',
  composite: '组合', custom: '自定义',
}

const getActionLabel = (id: string, schema?: Record<string, unknown>) =>
  actionTitleMap[id] || (schema?.title as string) || id

/** 生成 action 详细信息的 tooltip 文本 */
function getTooltipContent(data: Record<string, unknown>): string {
  const parts: string[] = []
  if (data.description) parts.push(data.description as string)
  const tags = (data.tags as string[]) || []
  if (tags.length) parts.push(`标签: ${tags.join(', ')}`)
  if (data.steps_count !== undefined) parts.push(`步骤数: ${data.steps_count}`)
  if (data.is_public !== undefined) parts.push(`可见性: ${data.is_public ? '公开' : '私有'}`)
  if (data.likes_count !== undefined) parts.push(`点赞: ${data.likes_count}`)
  if (data.forks_count !== undefined) parts.push(`Fork: ${data.forks_count}`)
  parts.push(`ID: ${data.action_id}`)
  return parts.join('\n')
}

function getTagsInfo(data: Record<string, unknown>) {
  const tags = (data.tags as string[]) || []
  const visible = tags.slice(0, MAX_VISIBLE_TAGS)
  const overflow = tags.slice(MAX_VISIBLE_TAGS)
  return { visible, overflow, hasOverflow: overflow.length > 0 }
}

const hasMore = computed(() => actionList.value.length < totalCount.value)
const isPrivateOrPublic = computed(() => activeTab.value === ToolboxTab.PRIVATE || activeTab.value === ToolboxTab.PUBLIC)

// ── API ──────────────────────────────────────────────

/** 搜索标签（远程搜索，返回标签及关联操作数量） */
async function searchTags(query: string) {
  try {
    const filterType = (activeTab.value === ToolboxTab.PRIVATE ? 'private' : 'public') as FilterType
    const res = await client.post<{ 200: { code: number; data?: { name: string; count: number }[] | null; msg: string } }>({
      url: '/api/v1/rpa/browser/control/custom-actions/tags/search',
      body: { keyword: query || null, filter_type: filterType },
      headers: { 'Content-Type': 'application/json', ...userNavStore.user_header },
    })
    if (res?.code === 0) {
      tagOptions.value = res.data || []
    }
  } catch (e) { console.error('searchTags failed', e) }
}

/** 加载自定义操作（首页替换，后续追加） */
async function fetchActions(page: number, append = false) {
  try {
    const filterType = (activeTab.value === ToolboxTab.PRIVATE ? 'private' : 'public') as FilterType
    const res = await listCustomActionsApiV1RpaBrowserControlCustomActionsListPost({
      body: {
        page,
        per_page: PER_PAGE,
        filter_type: filterType,
        sort_by: 'updated_at' as SortBy,
        sort_order: 'desc' as SortOrder,
        name: searchQuery.value || undefined,
        tag: selectedTag.value || undefined,
        tag_exact: tagSelected.value,
      },
      headers: userNavStore.user_header,
    })
    if (res?.code === 0 && res?.data) {
      const d = res.data as { items?: unknown[]; total?: number }
      const items = d.items || []
      if (append) {
        actionList.value = [...actionList.value, ...items]
      } else {
        actionList.value = items
      }
      totalCount.value = d.total || 0
      currentPage.value = page
    }
  } catch { console.error('fetchActions failed') }
}

/** 加载更多（LoadingMoreContainer 回调） */
async function loadMore() {
  loadingMore.value = true
  loadError.value = false
  try {
    await fetchActions(currentPage.value + 1, true)
  } catch { loadError.value = true }
  finally { loadingMore.value = false }
}

/** 重置并重新加载第一页 */
async function reloadActions() {
  loading.value = true
  try {
    await fetchActions(1, false)
  } finally { loading.value = false }
}

async function loadRegistered() {
  const res = await listRegisteredActionsApiV1RpaBrowserControlActionsRegisteredPost({ headers: userNavStore.user_header })
  if (res?.code === 0 && res?.data) {
    registeredActions.value = ((res.data as unknown[]) || []).filter(
      (a: Record<string, unknown>) => a.action_id !== 'composite',
    )
  }
}

onMounted(() => loadTab(activeTab.value))
async function loadTab(tab: string) {
  loading.value = true
  try {
    if (tab === ToolboxTab.PRIVATE || tab === ToolboxTab.PUBLIC) {
      await fetchActions(1, false)
    } else {
      await loadRegistered()
    }
    loadedTabs.value.add(tab)
  } finally { loading.value = false }
}

/** 保存当前 tab 状态 */
function saveTabState(tab: string) {
  tabCache.value[tab] = {
    actionList: actionList.value,
    searchInput: searchInput.value,
    searchQuery: searchQuery.value,
    selectedTag: selectedTag.value,
    tagSelected: tagSelected.value,
    currentPage: currentPage.value,
    totalCount: totalCount.value,
    loadError: loadError.value,
  }
}

/** 恢复 tab 状态 */
function restoreTabState(tab: string) {
  const saved = tabCache.value[tab]
  if (saved) {
    actionList.value = saved.actionList
    searchInput.value = saved.searchInput
    searchQuery.value = saved.searchQuery
    selectedTag.value = saved.selectedTag
    tagSelected.value = saved.tagSelected
    currentPage.value = saved.currentPage
    totalCount.value = saved.totalCount
    loadError.value = saved.loadError
  } else {
    actionList.value = []
    searchInput.value = ''
    searchQuery.value = ''
    selectedTag.value = ''
    tagSelected.value = true
    currentPage.value = 1
    totalCount.value = 0
    loadError.value = false
  }
  loadingMore.value = false
}

/** 切换 tab（不重新加载已加载的 tab） */
function switchTab(tab: string) {
  if (tab === activeTab.value) return
  if (suggestTimer) { clearTimeout(suggestTimer); suggestTimer = null }
  saveTabState(activeTab.value)
  restoreTabState(tab)
  activeTab.value = tab
  if (!loadedTabs.value.has(tab)) {
    loadTab(tab)
  }
}

function handleRefresh() {
  loadedTabs.value.delete(activeTab.value)
  delete tabCache.value[activeTab.value]
  actionList.value = []
  searchInput.value = ''
  searchQuery.value = ''
  selectedTag.value = ''
  tagSelected.value = true
  tagOptions.value = []
  currentPage.value = 1
  totalCount.value = 0
  loadError.value = false
  loadTab(activeTab.value)
}

/** 点击搜索按钮：将输入值应用到搜索查询并触发搜索 */
function handleSearch() {
  searchQuery.value = searchInput.value
  if (isPrivateOrPublic.value) {
    actionList.value = []
    totalCount.value = 0
    currentPage.value = 1
    loadError.value = false
    reloadActions()
  }
}

/** 搜索操作名称（远程，用于私有/公开 tab 联想） */
async function searchNamesApi(keyword: string): Promise<string[]> {
  const filterType = (activeTab.value === ToolboxTab.PRIVATE ? 'private' : 'public') as FilterType
  try {
    const res = await client.post<{ 200: { code: number; data?: string[] | null; msg: string } }>({
      url: '/api/v1/rpa/browser/control/custom-actions/names/search',
      body: { keyword: keyword || null, filter_type: filterType },
      headers: { 'Content-Type': 'application/json', ...userNavStore.user_header },
    })
    if (res?.code === 0) return res.data || []
  } catch (e) { console.error('searchNames failed', e) }
  return []
}

/** 从已加载的注册操作中本地过滤名称（基础操作 tab） */
function searchNamesLocal(keyword: string): string[] {
  const q = keyword.toLowerCase()
  return (registeredActions.value as Record<string, unknown>[])
    .map((a) => (a.name as string) || getActionLabel(a.action_id as string, a.json_schema as Record<string, unknown>))
    .filter((n) => n.toLowerCase().includes(q))
    .slice(0, 10)
}

/** 节流获取联想词（el-autocomplete 的 fetch-suggestions 回调） */
function fetchSuggestions(queryString: string, cb: (items: { value: string }[]) => void) {
  if (!queryString) { cb([]); return }
  const now = Date.now()
  const remaining = SUGGEST_THROTTLE_MS - (now - suggestLastTime)
  const exec = async () => {
    suggestLastTime = Date.now()
    const names = isPrivateOrPublic.value
      ? await searchNamesApi(queryString)
      : searchNamesLocal(queryString)
    cb(names.map((n) => ({ value: n })))
  }
  if (remaining <= 0) {
    exec()
  } else {
    if (suggestTimer) clearTimeout(suggestTimer)
    suggestTimer = setTimeout(exec, remaining)
  }
}

// 标签变更：选中则为精确匹配，输入则为模糊匹配
function onTagChange(value: string) {
  tagSelected.value = value ? tagOptions.value.some((t) => t.name === value) : true
  actionList.value = []
  totalCount.value = 0
  currentPage.value = 1
  loadError.value = false
  reloadActions()
}

// ── 基础操作树 ───────────────────────────────────────

const filteredRegistered = computed<unknown[]>(() => {
  const q = searchQuery.value.toLowerCase()
  const items = registeredActions.value.map((a: Record<string, unknown>) => ({
    id: `action-${a.action_id}`,
    label: (a.name as string) || getActionLabel(a.action_id as string, a.json_schema as Record<string, unknown>),
    children: [],
    action_id: a.action_id,
    action_type: a.action_id,
    name: a.name || (a.json_schema as Record<string, unknown>)?.title || a.action_id,
    description: (a.json_schema as Record<string, unknown>)?.description,
    tags: a.tags || [],
    json_schema: a.json_schema,
  }))
  if (!q) return items
  return items.filter((i) => String(i.name || i.label || '').toLowerCase().includes(q))
})

// ── 拖拽 ─────────────────────────────────────────────

function handleDragStart(event: DragEvent, nodeData: unknown) {
  if (!event.dataTransfer || !nodeData) return
  const data = { ...(nodeData as Record<string, unknown>) }
  delete data.children; delete data.expanded
  delete data.checked; delete data.indeterminate
  const json = JSON.stringify(data)
  event.dataTransfer.setData('text/plain', json)
  event.dataTransfer.setData('application/json', json)
  event.dataTransfer.effectAllowed = 'copyMove'
}

// ── 编辑 ─────────────────────────────────────────────

async function handleEditCustomAction(nodeData: Record<string, unknown>) {
  const id = nodeData.action_id as string
  if (!id) { ElMessage.warning('无效的操作标识'); return }
  try {
    const res = await getCustomActionApiV1RpaBrowserControlCustomActionsGetPost({
      body: { action_id: id }, headers: userNavStore.user_header,
    })
    if (res?.code === 0 && res?.data) emit('edit-action', res.data as Record<string, unknown>)
    else ElMessage.error('获取操作详情失败')
  } catch { ElMessage.error('获取操作详情失败') }
}

// ── 配置 ─────────────────────────────────────────────

const treeProps = { children: 'children', label: 'label' }
const treeHeight = computed(() => Math.floor(window.innerHeight * 0.45))
</script>

<template>
  <div class="toolbox-root h-full flex flex-col overflow-hidden">
    <!-- 分段控制 + 搜索/刷新/筛选内容区 -->
    <div class="p-3 border-b border-border space-y-2">
      <el-segmented
        :model-value="activeTab"
        :options="tabList"
        block
        size="large"
        @change="(val: string | number | boolean) => switchTab(val as string)"
      >
        <template #default="{ item }">
          <div class="flex items-center gap-1">
            <el-icon><component :is="item.icon" /></el-icon>
            <span>{{ item.label }}</span>
          </div>
        </template>
      </el-segmented>

      <!-- 搜索、刷新、筛选内容区 -->
      <div class="flex items-center gap-2">
        <el-autocomplete
          v-model="searchInput"
          :fetch-suggestions="fetchSuggestions"
          placeholder="搜索动作名称"
          clearable
          size="large"
          class="flex-1 search-autocomplete"
          @select="handleSearch"
          @keyup.enter="handleSearch"
          @clear="handleSearch"
        />
        <el-button size="large" type="primary" :icon="Search" class="search-btn" @click="handleSearch" />
        <el-button size="large" :icon="Refresh" @click="handleRefresh" />
      </div>
      <div v-if="isPrivateOrPublic" class="flex items-center gap-2">
        <span class="text-xs text-text-secondary shrink-0">标签：</span>
        <el-select
          v-model="selectedTag"
          placeholder="输入或选择标签"
          size="large"
          clearable
          filterable
          remote
          :remote-method="searchTags"
          allow-create
          default-first-option
          class="flex-1 tag-filter-select"
          @change="onTagChange"
          @visible-change="(v: boolean) => v && tagOptions.length === 0 && searchTags('')"
        >
          <el-option v-for="t in tagOptions" :key="t.name" :label="t.name" :value="t.name">
            <div class="flex items-center justify-between w-full">
              <span>{{ t.name }}</span>
              <span class="text-xs text-text-secondary ml-2">{{ t.count }}</span>
            </div>
          </el-option>
        </el-select>
      </div>
    </div>

    <!-- 私有/公开列表（共享模板，v-show 保留 DOM） -->
    <LoadingMoreContainer
    class="flex-1"
      v-show="isPrivateOrPublic"
      v-loading="loading"
      v-model:is-more="hasMore"
      v-model:is-loading="loadingMore"
      v-model:is-error="loadError"
      :handle-load="loadMore"
    >
      <template #content>
        <div class="p-3">
          <template v-if="actionList.length > 0">
            <div
              v-for="(item, idx) in actionList"
              :key="(item as Record<string, unknown>).action_id as string"
              class="flex items-center justify-between w-full gap-2 px-2 py-2 rounded cursor-grab active:cursor-grabbing hover:bg-[var(--el-fill-color-light)] transition-colors"
              draggable="true"
              @dragstart="handleDragStart($event, item)"
              @mousedown.stop @dragstart.stop
            >
              <span class="flex items-center gap-2 min-w-0 flex-1">
                <el-icon><Bell class="w-4 h-4 shrink-0" /></el-icon>
                <el-tooltip
                  :content="getTooltipContent(item as Record<string, unknown>)"
                  placement="right" :show-after="400"
                  popper-class="toolbox-tooltip whitespace-pre-line"
                >
                  <el-text class="flex-1 min-w-0" truncated>{{ (item as Record<string, unknown>).name as string || (item as Record<string, unknown>).label as string }}</el-text>
                </el-tooltip>
                <template v-if="getTagsInfo(item as Record<string, unknown>).visible.length > 0">
                  <span
                    v-for="tag in getTagsInfo(item as Record<string, unknown>).visible"
                    :key="tag"
                    class="text-xs px-1.5 py-px rounded bg-[var(--el-color-primary-light-9)] text-[var(--el-color-primary)] shrink-0"
                  >{{ tag }}</span>
                  <el-tooltip v-if="getTagsInfo(item as Record<string, unknown>).hasOverflow" :show-after="300" popper-class="toolbox-tooltip">
                    <template #content>
                      <div class="flex flex-wrap gap-1">
                        <span v-for="tag in getTagsInfo(item as Record<string, unknown>).overflow" :key="tag">{{ tag }}</span>
                      </div>
                    </template>
                    <span class="text-xs text-text-secondary shrink-0">+{{ getTagsInfo(item as Record<string, unknown>).overflow.length }}</span>
                  </el-tooltip>
                </template>
              </span>
              <span class="flex items-center gap-1 shrink-0">
                <el-button size="small" text :icon="Edit" class="!p-0.5 !h-auto"
                  @click.stop="handleEditCustomAction(item as Record<string, unknown>)"
                />
              </span>
            </div>
          </template>
          <el-empty v-else description="暂无匹配内容" :image-size="60" />
        </div>
      </template>
    </LoadingMoreContainer>

    <!-- 基础操作树 -->
    <div v-show="activeTab === ToolboxTab.BASIC" class="overflow-auto p-3" v-loading="loading">
      <el-tree-v2
        v-if="filteredRegistered.length > 0"
        :data="filteredRegistered" :props="treeProps"
        :height="treeHeight" class="tree-drag-drop"
      >
        <template #default="{ data }">
          <div
            class="flex items-center justify-between w-full gap-2 cursor-grab active:cursor-grabbing"
            draggable="true"
            @dragstart="handleDragStart($event, data)"
          >
            <span class="flex items-center gap-2 min-w-0 flex-1">
              <el-icon><Tools class="w-4 h-4 shrink-0" /></el-icon>
              <el-tooltip
                :content="getTooltipContent(data as Record<string, unknown>)"
                placement="right" :show-after="400"
                popper-class="toolbox-tooltip whitespace-pre-line"
              >
                <el-text class="flex-1 min-w-0" truncated>{{ (data as Record<string, unknown>).name as string || (data as Record<string, unknown>).label as string }}</el-text>
              </el-tooltip>
            </span>
            <span class="text-xs text-text-secondary shrink-0">预置动作</span>
          </div>
        </template>
      </el-tree-v2>
      <el-empty v-else description="暂无匹配内容" :image-size="60" />
    </div>
  </div>
</template>
