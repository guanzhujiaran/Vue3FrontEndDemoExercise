<script setup lang="ts">
import { ref, computed, shallowRef, onMounted, onBeforeUnmount, h, render } from 'vue'
import { Search, Tools, Lock, Refresh, Edit, Folder } from '@element-plus/icons-vue'
import {
  ElAutocomplete, ElEmpty, ElTreeV2, ElButton, ElText, ElIcon,
  ElMessage, ElTooltip, ElSelect, ElOption, ElSegmented,
} from 'element-plus'
import { 自定义操作管理Service } from '@/api/browser/hey-api'
import { client } from '@/api/browser/hey-api/client.gen'
import type { ActionMetadataResponse, FilterType, SortBy, SortOrder } from '@/api/browser/hey-api'
import { useUserNavStore } from '@/stores/user_nav'
import ActionIcon from './ActionIcon.vue'
import { resolveActionTypeIcon } from '@/utils/rpa/actionTypeIcon'
import { resolveActionIconUrl } from '@/utils/rpa/actionIcon'
import {
  RECENT_CATEGORY_ID,
  buildActionTree,
  clearActionUsage,
  defaultExpandedGroupIds,
  groupNodeId,
  normalizeQuery,
  readActionUsage,
  recentActionIds,
  recordActionUsage,
  resolveActionDisplayName,
  scoreAction,
  type ActionUsageMap,
} from '@/utils/rpa/actionCategory'

// ── 常量 ─────────────────────────────────────────────
enum ToolboxTab {
  PRIVATE = 'tool-box-private-action',
  PUBLIC = 'tool-box-public-action',
  BASIC = 'tool-box-basic-action',
}
const MAX_VISIBLE_TAGS = 2
const PER_PAGE = 10

/** 工具箱条目标题图标尺寸类（列表与树共用，保证两处视觉一致） */
const TOOLBOX_ICON_CLASS = 'toolbox-item__icon w-8 h-8 shrink-0 text-text-primary'
/** 基础操作树行高（px）：el-tree-v2 虚拟滚动依赖固定行高，需与条目内容高度匹配
 *  （32px 图标 + 上下各 12px 内边距 = 56px，与列表行 `py-3` 的高度一致） */
const TOOLBOX_TREE_ITEM_SIZE = 56
/** 拖拽预览锚点（px）：预览外框 64px（w-16 h-16）+ 8px 内边距（p-2）包住 48px（w-12 h-12）图标，
 *  锚点取外框中心，拖拽时图标中心跟随光标 */
const DRAG_GHOST_ANCHOR = 32

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

const registeredActions = shallowRef<ActionMetadataResponse[]>([])

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

/**
 * 动作显示名
 *
 * 收敛到 `actionCategory.ts` 的 `ACTION_DISPLAY_NAME`（31 个内置动作全覆盖）：
 * 原实现只维护了 19 个 id，新增动作会直接显示原始 `action_id`。
 */
const getActionLabel = (id: string, schema?: Record<string, unknown>) =>
  resolveActionDisplayName(id, null, (schema?.title as string) || null)

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
    // client.post 的返回是 { data | error } 联合：业务包络在 res.data 里
    const payload = res?.data
    if (payload?.code === 0) {
      tagOptions.value = payload.data || []
    }
  } catch (e) { console.error('searchTags failed', e) }
}

/** 加载自定义操作（首页替换，后续追加） */
async function fetchActions(page: number, append = false) {
  try {
    const filterType = (activeTab.value === ToolboxTab.PRIVATE ? 'private' : 'public') as FilterType
    const res = await 自定义操作管理Service.listCustomActionsApiV1RpaBrowserControlCustomActionsListPost({
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
  const res = await 自定义操作管理Service.listRegisteredActionsApiV1RpaBrowserControlActionsRegisteredPost({ headers: userNavStore.user_header })
  if (res?.code === 0 && res?.data) {
    registeredActions.value = res.data.filter((a) => a.action_id !== 'composite')
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
    // client.post 的返回是 { data | error } 联合：业务包络在 res.data 里
    const payload = res?.data
    if (payload?.code === 0) return payload.data || []
  } catch (e) { console.error('searchNames failed', e) }
  return []
}

/** 从已加载的注册操作中本地检索名称（基础操作 tab）—— 与树内检索共用同一套打分算法 */
function searchNamesLocal(keyword: string): string[] {
  const q = normalizeQuery(keyword)
  if (!q) return []
  return registeredActions.value
    .map((a) => ({
      name: a.name || getActionLabel(a.action_id, a.json_schema as Record<string, unknown>),
      score: scoreAction(
        {
          action_id: a.action_id,
          name: a.name,
          description: (a.json_schema?.description as string) || null,
        },
        q,
        actionUsage.value,
      ),
    }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 10)
    .map((item) => item.name)
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

/**
 * 基础操作树节点
 *
 * el-tree-v2 的 `data` 只接受对象数组（`TreeNodeData[]`），原先声明成 `unknown[]`
 * 会被直接拒绝；节点字段由模板按需断言（`data as Record<string, unknown>`），
 * 因此这里用宽松的对象记录承载，既能塞进 el-tree-v2，也不锁死字段。
 *
 * 结构已从「一层平铺」改为「分类 → 动作」两层（见 docs/frontend_requirements/动作分类与检索.md）：
 * 31 个动作平铺后靠滚动找动作成本太高，分类节点不可拖拽、只做折叠与计数。
 */
type ToolboxTreeNode = Record<string, unknown>

/** 内置动作使用记录（localStorage）：驱动「常用」分组与打分加成 */
const actionUsage = shallowRef<ActionUsageMap>(readActionUsage())

const hasUsage = computed(() => recentActionIds(actionUsage.value).length > 0)

const normalizedQuery = computed(() => normalizeQuery(searchQuery.value))

const filteredRegistered = computed<ToolboxTreeNode[]>(() => {
  const items = registeredActions.value.map((a) => ({
    id: `action-${a.action_id}`,
    label: a.name || getActionLabel(a.action_id, a.json_schema || {}),
    action_id: a.action_id,
    action_type: a.action_id,
    // 图标字段必须透传：后端为每个内置动作都下发了 (icon_series, icon_id)
    // —— 现已指向现有系列 `Saber脸/s_33_FGO状态图`，且是一个动作一位不同角色的最终形态
    // （编号不连续，见 action_params.BUILTIN_ACTION_ICON_SERIES / BuiltinActionIconId）；
    // 此前漏传导致 ActionIcon 拿不到 series/id，树节点永远走 fallback（图标全都一样）
    icon_series: a.icon_series,
    icon_id: a.icon_id,
    name: a.name || (a.json_schema?.title as string) || a.action_id,
    description: (a.json_schema?.description as string) || null,
    // ActionMetadataResponse 无 tags 字段，历史行为保留（恒为空数组）
    tags: (a as { tags?: unknown[] }).tags || [],
    // 变量契约（后端 /actions/registered 下发）合并进 json_schema 透传，
    // ActionParamsForm 据此渲染变量绑定区；多余顶层键对参数表单渲染无影响
    json_schema: {
      ...(a.json_schema || {}),
      input_variables: a.input_variables,
      output_variables: a.output_variables,
    },
  }))
  return buildActionTree(items, normalizedQuery.value, actionUsage.value) as unknown as ToolboxTreeNode[]
})

/**
 * 展开的分组：搜索时全展开（让命中项直接可见），无查询时只展开最常用的两类。
 * el-tree-v2 的 `default-expanded-keys` 只在挂载时生效，配合下方 `:key` 重建树生效。
 */
const expandedGroupIds = computed<string[]>(() => {
  if (normalizedQuery.value) {
    return filteredRegistered.value.map((group) => String(group.id))
  }
  // 常用分组若已出现也一并展开
  return [...defaultExpandedGroupIds(), groupNodeId(RECENT_CATEGORY_ID)]
})

/**
 * 树重建 key：**只在查询变化时重建**。
 * 不把使用记录放进 key —— 否则每拖一个新动作（最近列表顺序变化）都会重建整棵树，
 * 展开态被重置，拖拽体验很差；新增的「常用」分组交给 Vue 响应式更新即可。
 */
const treeRenderKey = computed(() => `basic-tree:${normalizedQuery.value}`)

function onClearUsage() {
  clearActionUsage()
  actionUsage.value = {}
}

// ── 拖拽 ─────────────────────────────────────────────

function handleDragStart(event: DragEvent, nodeData: unknown) {
  if (!event.dataTransfer || !nodeData) return
  const data = { ...(nodeData as Record<string, unknown>) }
  // 分类节点只做折叠与计数，不能被当成步骤拖进画布
  if (data.is_group) { event.preventDefault(); return }
  delete data.children; delete data.expanded
  delete data.checked; delete data.indeterminate
  delete data.is_group; delete data.category_id; delete data.score
  const json = JSON.stringify(data)
  event.dataTransfer.setData('text/plain', json)
  event.dataTransfer.setData('application/json', json)
  event.dataTransfer.effectAllowed = 'copyMove'
  // 记录使用（驱动「常用」分组）；只在最近使用列表真的变化时刷新，避免拖拽过程中重建树
  const actionId = String(data.action_id || '')
  if (actionId) {
    const before = recentActionIds(actionUsage.value).join(',')
    const usage = recordActionUsage(actionId)
    if (recentActionIds(usage).join(',') !== before) actionUsage.value = usage
  }
  setToolboxDragGhost(event, data)
}

/**
 * 把「该动作当前设置的图标」渲染成拖拽预览图（drag ghost）
 *
 * 浏览器默认的拖拽影像是被拖元素的整行截图（含文字/标签、宽高不定），
 * 拖到画布上难以辨认；这里替换为固定尺寸的方形图标缩略图，
 * 图标缺失（未设置 / 图库无资源）时用内置类型图标兜底，保证预览不空白。
 *
 * 实现要点：`setDragImage` 要求元素在调用瞬间位于文档中（允许移出视口），
 * 故临时挂到 body、调用后下一帧卸载移除；外观全部为 Tailwind 原子类字面量
 * （动态拼接的类名不会被 Tailwind 扫描到）。
 */
function setToolboxDragGhost(event: DragEvent, action: Record<string, unknown>) {
  const dt = event.dataTransfer
  if (!dt) return

  const iconUrl = resolveActionIconUrl(
    action.icon_series as number | undefined,
    action.icon_id as number | undefined,
  )
  const iconVNode = iconUrl
    ? h('img', { src: iconUrl, alt: '', class: 'toolbox-drag-ghost__icon w-12 h-12 object-contain' })
    : h(ElIcon, { class: 'toolbox-drag-ghost__icon w-12 h-12 text-text-primary' }, () =>
        h(resolveActionTypeIcon(action.action_id as string)),
      )

  const ghost = document.createElement('div')
  ghost.className =
    'toolbox-drag-ghost pointer-events-none fixed top-[-9999px] left-0 flex h-16 w-16 items-center justify-center rounded-lg bg-bg p-2 shadow-lg'
  render(iconVNode, ghost)
  document.body.appendChild(ghost)
  dt.setDragImage(ghost, DRAG_GHOST_ANCHOR, DRAG_GHOST_ANCHOR)

  // 浏览器已取走图像快照，下一帧回收临时节点（避免残留 DOM）
  requestAnimationFrame(() => {
    render(null, ghost)
    ghost.remove()
  })
}

// ── 编辑 ─────────────────────────────────────────────

async function handleEditCustomAction(nodeData: Record<string, unknown>) {
  // 只有自定义（复合）动作有编辑入口，action_id 是雪花 int；内置动作名是字符串，转出来是 NaN
  const actionId = Number(nodeData.action_id)
  if (!Number.isFinite(actionId) || actionId <= 0) { ElMessage.warning('无效的操作标识'); return }
  try {
    const res = await 自定义操作管理Service.getCustomActionApiV1RpaBrowserControlCustomActionsGetPost({
      body: { action_id: actionId }, headers: userNavStore.user_header,
    })
    if (res?.code === 0 && res?.data) emit('edit-action', res.data as Record<string, unknown>)
    else ElMessage.error('获取操作详情失败')
  } catch { ElMessage.error('获取操作详情失败') }
}

// ── 配置 ─────────────────────────────────────────────

const treeProps = { children: 'children', label: 'label' }

/** 基础操作树容器（flex-1 自适应高度，只做裁剪、不滚动——滚动由树的虚拟列表自己承担） */
const treeWrapRef = ref<HTMLElement | null>(null)
/** 虚拟树需要显式高度，跟随容器实际高度同步 */
const treeHeight = ref(320)
let treeResizeObserver: ResizeObserver | null = null

onMounted(() => {
  if (!treeWrapRef.value) return
  treeResizeObserver = new ResizeObserver((entries) => {
    // 必须取 contentRect（内容盒）而不是 clientHeight（padding 盒）：
    // 容器有 p-3 的 24px 上下内边距，用 padding 盒高度会让树比可用区高 24px，
    // 既多出一条外层滚动条，又让虚拟列表误以为可视区更高、末行只露出一半。
    const h = entries[0]?.contentRect.height ?? 0
    if (h > 0) treeHeight.value = Math.floor(h)
  })
  treeResizeObserver.observe(treeWrapRef.value)
})

onBeforeUnmount(() => {
  treeResizeObserver?.disconnect()
  treeResizeObserver = null
})
</script>

<template>
  <div class="toolbox-root h-full min-h-0 flex flex-col overflow-hidden">
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
      class="flex-1 min-h-0"
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
              class="flex items-center justify-between w-full gap-2 px-2 py-3 rounded cursor-grab active:cursor-grabbing hover:bg-(--el-fill-color-light) transition-colors"
              draggable="true"
              @dragstart="handleDragStart($event, item)"
              @mousedown.stop @dragstart.stop
            >
              <span class="flex items-center gap-2 min-w-0 flex-1">
                <ActionIcon
                  :series="(item as Record<string, unknown>).icon_series as number | undefined"
                  :id="(item as Record<string, unknown>).icon_id as number | undefined"
                  :class="TOOLBOX_ICON_CLASS"
                >
                  <template #fallback>
                    <!-- 未选图标 / 图库无资源：按动作类型兜底（自定义动作 ca_* 回落默认问号图标） -->
                    <el-icon class="w-8 h-8 shrink-0">
                      <component :is="resolveActionTypeIcon((item as Record<string, unknown>).action_id as string)" />
                    </el-icon>
                  </template>
                </ActionIcon>
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
                    class="text-xs px-1.5 py-px rounded bg-(--el-color-primary-light-9) text-(--el-color-primary) shrink-0"
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
                <el-button size="small" text :icon="Edit" class="p-0.5! h-auto!"
                  @click.stop="handleEditCustomAction(item as Record<string, unknown>)"
                />
              </span>
            </div>
          </template>
          <el-empty v-else description="暂无匹配内容" :image-size="60" />
        </div>
      </template>
    </LoadingMoreContainer>

    <!-- 基础操作树（分类 → 动作 两层） -->
    <div v-show="activeTab === ToolboxTab.BASIC" class="flex flex-col flex-1 min-h-0">
      <div class="toolbox-basic-summary flex items-center justify-between gap-2 px-3 pt-2 shrink-0">
        <el-text class="text-xs text-text-secondary">
          {{ registeredActions.length }} 个预置动作 · {{ filteredRegistered.length }} 个分类
        </el-text>
        <el-button
          v-if="hasUsage"
          link type="primary" class="toolbox-clear-usage"
          @click="onClearUsage"
        >清空常用</el-button>
      </div>
      <div ref="treeWrapRef" class="flex-1 min-h-0 overflow-hidden p-3" v-loading="loading">
        <el-tree-v2
          v-if="filteredRegistered.length > 0"
          :key="treeRenderKey"
          :data="filteredRegistered" :props="treeProps"
          :default-expanded-keys="expandedGroupIds"
          :height="treeHeight" :item-size="TOOLBOX_TREE_ITEM_SIZE" class="tree-drag-drop [&_.el-tree-node__content]:p-[4px_8px]!"
        >
          <template #default="{ data }">
            <!-- 分类节点：只做折叠与计数，不可拖拽 -->
            <div
              v-if="(data as Record<string, unknown>).is_group"
              class="toolbox-category-node flex items-center justify-between w-full gap-2 cursor-default"
            >
              <span class="flex items-center gap-2 min-w-0 flex-1">
                <el-icon class="w-4 h-4 shrink-0"><Folder /></el-icon>
                <el-text class="flex-1 min-w-0 font-medium" truncated>{{ (data as Record<string, unknown>).label as string }}</el-text>
              </span>
              <span class="text-xs text-text-secondary shrink-0">{{ (data as Record<string, unknown>).count as number }}</span>
            </div>
            <!-- 动作节点 -->
            <div
              v-else
              class="toolbox-action-node flex items-center justify-between w-full gap-2 cursor-grab active:cursor-grabbing"
              draggable="true"
              @dragstart="handleDragStart($event, data)"
            >
              <span class="flex items-center gap-2 min-w-0 flex-1">
                <ActionIcon
                  :series="(data as Record<string, unknown>).icon_series as number | undefined"
                  :id="(data as Record<string, unknown>).icon_id as number | undefined"
                  :class="TOOLBOX_ICON_CLASS"
                >
                  <template #fallback>
                    <!-- 图库中无对应资源时按 action_id 取内置类型图标（点击/输入/导航…各不相同） -->
                    <el-icon class="w-8 h-8 shrink-0">
                      <component :is="resolveActionTypeIcon((data as Record<string, unknown>).action_id as string)" />
                    </el-icon>
                  </template>
                </ActionIcon>
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
  </div>
</template>
