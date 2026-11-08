/**
 * 内置动作「分类 + 检索」纯函数模块
 *
 * 需求见 `RPA-Browser/docs/frontend_requirements/动作分类与检索.md`。
 *
 * 为什么放在前端常量里而不是后端下发 category：
 * 1. `ActionMetadataResponse` 加字段会牵动 MCP schema、`check_action_consistency.py` 与已发布 SDK；
 * 2. 分类只服务于「找动作」这个交互，不是执行语义，前端维护即可；
 * 3. 用 `Record<BuiltinActionId, ...>` 让后端新增动作时 **TS 编译报错**，强制补分类，
 *    而不是静默落进兜底分支。
 *
 * 注意：`src/utils/rpa/actionIcon.ts` 里的 `getActionIconCategory*` 是「图标素材目录分类」
 * （FGO头像 / Saber脸 / 指令纹章 / 礼装），与本文件的「动作分类」是两个概念，不要混用。
 */

import type { Component } from 'vue'
import {
  Aim,
  ArrowDown,
  Bell,
  Camera,
  CircleClose,
  CollectionTag,
  Connection,
  Document,
  Download,
  Edit,
  FolderOpened,
  Grid,
  Link,
  Monitor,
  Mouse,
  Operation,
  Printer,
  RefreshRight,
  SetUp,
  Sort,
  SortDown,
  Star,
  Switch,
  Tickets,
  Timer,
  Top,
  View,
} from '@element-plus/icons-vue'

// ── 分类定义 ──────────────────────────────────────────

export type ActionCategoryId =
  | 'interaction'
  | 'navigation'
  | 'probe'
  | 'data'
  | 'control'
  | 'business'
  | 'media'

/** 「常用」虚拟分类：只有存在使用记录时才出现，不是真实动作分类 */
export const RECENT_CATEGORY_ID = '__recent__'

export interface ActionCategoryDef {
  readonly id: ActionCategoryId
  readonly label: string
}

/** 固定展示顺序（未命中查询时按此顺序） */
export const ACTION_CATEGORIES: readonly ActionCategoryDef[] = [
  { id: 'interaction', label: '页面交互' },
  { id: 'navigation', label: '导航与页面' },
  { id: 'probe', label: '等待与提取' },
  { id: 'data', label: '数据处理' },
  { id: 'control', label: '流程控制' },
  { id: 'business', label: '业务与通知' },
  { id: 'media', label: '媒体与 AI' },
]

export const ACTION_CATEGORY_LABEL: Readonly<Record<ActionCategoryId, string>> =
  ACTION_CATEGORIES.reduce(
    (acc, cur) => ({ ...acc, [cur.id]: cur.label }),
    {} as Record<ActionCategoryId, string>,
  )

// ── 30 个内置动作：显示名 + 分类 + 兜底图标 ────────────

export type BuiltinActionId =
  | 'click'
  | 'input'
  | 'press'
  | 'hover'
  | 'scroll'
  | 'select_option'
  | 'navigate'
  | 'new_page'
  | 'open_page'
  | 'close_page'
  | 'wait_for_url'
  | 'wait'
  | 'wait_for_response'
  | 'get_text'
  | 'get_window'
  | 'element_state'
  | 'print'
  | 'random_pick'
  | 'pick_line'
  | 'shuffle_list'
  | 'sort_list'
  | 'fetch_external_data'
  | 'loop'
  | 'if_else'
  | 'parallel'
  | 'composite'
  | 'mark_resource_result'
  | 'notify'
  | 'screenshot'
  | 'llm'

/** 与后端 `BuiltinActionName` 对齐；仅在前端拿不到 name 时兜底 */
export const ACTION_DISPLAY_NAME: Record<BuiltinActionId, string> = {
  click: '点击',
  input: '输入',
  press: '按键',
  hover: '悬停',
  scroll: '滚动',
  select_option: '下拉选择',
  navigate: '页面导航',
  new_page: '新建页面',
  open_page: '打开页面',
  close_page: '关闭页面',
  wait_for_url: '等待 URL',
  wait: '等待',
  wait_for_response: '等待响应',
  get_text: '获取文本',
  get_window: '获取 window 属性',
  element_state: '元素状态',
  print: '打印参数',
  random_pick: '随机取值',
  pick_line: '按行取值',
  shuffle_list: '打乱列表',
  sort_list: '列表排序',
  fetch_external_data: '获取外部数据',
  loop: '循环',
  if_else: '条件判断',
  parallel: '并行分支',
  composite: '复合操作',
  mark_resource_result: '记录资源结果',
  notify: '发送通知',
  screenshot: '截图',
  llm: 'LLM',
}

/** 分类归属（后端加动作时 TS 强制补齐，见文件头说明） */
export const ACTION_CATEGORY_MAP: Record<BuiltinActionId, ActionCategoryId> = {
  click: 'interaction',
  input: 'interaction',
  press: 'interaction',
  hover: 'interaction',
  scroll: 'interaction',
  select_option: 'interaction',

  navigate: 'navigation',
  new_page: 'navigation',
  open_page: 'navigation',
  close_page: 'navigation',
  wait_for_url: 'navigation',

  wait: 'probe',
  wait_for_response: 'probe',
  get_text: 'probe',
  get_window: 'probe',
  element_state: 'probe',

  print: 'data',
  random_pick: 'data',
  pick_line: 'data',
  shuffle_list: 'data',
  sort_list: 'data',
  fetch_external_data: 'data',

  loop: 'control',
  if_else: 'control',
  parallel: 'control',
  composite: 'control',

  mark_resource_result: 'business',
  notify: 'business',

  screenshot: 'media',
  llm: 'media',
}

/** 兜底图标：图库无素材时按 action_id 取（覆盖全部 30 个，避免出现问号） */
export const ACTION_TYPE_ICONS: Record<BuiltinActionId, Component> = {
  click: Mouse,
  input: Edit,
  press: SetUp,
  hover: Mouse,
  scroll: View,
  select_option: ArrowDown,

  navigate: Top,
  new_page: Top,
  open_page: FolderOpened,
  close_page: CircleClose,
  wait_for_url: Link,

  wait: Timer,
  wait_for_response: Connection,
  get_text: Document,
  get_window: Monitor,
  element_state: Aim,

  print: Printer,
  random_pick: Switch,
  pick_line: Tickets,
  shuffle_list: Sort,
  sort_list: SortDown,
  fetch_external_data: Download,

  loop: RefreshRight,
  if_else: Connection,
  parallel: Operation,
  composite: Grid,

  mark_resource_result: CollectionTag,
  notify: Bell,

  screenshot: Camera,
  llm: Star,
}

// ── 分类归属算法 ──────────────────────────────────────

/**
 * 表里未收录的新动作（后端先上线、前端未更新）走前缀兜底，
 * 保证任何 id 都有分类，不出现「未分类」空分组。
 */
const FALLBACK_RULES: ReadonlyArray<readonly [RegExp, ActionCategoryId]> = [
  [/^wait/, 'probe'],
  [/^get/, 'probe'],
  [/(_list|^print|^random|^fetch|^shuffle|^sort)/, 'data'],
  [/^(loop|if|parallel|composite)/, 'control'],
  [/(_page|^navigate|url)/, 'navigation'],
  [/^(screenshot|llm)/, 'media'],
  [/^(mark|notify|bili)/, 'business'],
]

/** 解析动作分类：静态表 → 前缀兜底 → interaction */
export function resolveActionCategory(actionId: string): ActionCategoryId {
  if (!actionId) return 'interaction'
  const exact = (ACTION_CATEGORY_MAP as Record<string, ActionCategoryId>)[actionId]
  if (exact) return exact
  for (const [pattern, category] of FALLBACK_RULES) {
    if (pattern.test(actionId)) return category
  }
  return 'interaction'
}

// ── 检索打分算法 ──────────────────────────────────────

export interface ActionMetaLike {
  action_id: string
  name?: string | null
  label?: string | null
  description?: string | null
}

export interface ActionUsageEntry {
  /** 累计使用次数 */
  count: number
  /** 最近一次使用时间戳（ms） */
  lastAt: number
}

export type ActionUsageMap = Record<string, ActionUsageEntry>

/** 最近使用的最多保留数量（参与「常用」分组与打分加成） */
export const RECENT_LIMIT = 5

/** 归一化查询串：去首尾空白 + 小写 */
export function normalizeQuery(query: string | null | undefined): string {
  return (query || '').trim().toLowerCase()
}

/** 按最近使用时间倒序取前 N 个 action_id */
export function recentActionIds(usage: ActionUsageMap = {}, limit = RECENT_LIMIT): string[] {
  return Object.entries(usage)
    .filter(([, entry]) => entry && entry.lastAt > 0)
    .sort((a, b) => b[1].lastAt - a[1].lastAt)
    .slice(0, limit)
    .map(([actionId]) => actionId)
}

/**
 * 单个动作的检索得分（0 = 不命中）
 *
 * 权重取舍：名称精确 > action_id 精确 > 名称前缀 > action_id 前缀 > 名称子串 > …
 * —— 用户既可能输入中文名（「点击」），也可能输入 id（`wa`），两条通道都要覆盖。
 */
export function scoreAction(
  meta: ActionMetaLike,
  query: string,
  usage: ActionUsageMap = {},
): number {
  const q = normalizeQuery(query)
  if (!q) return 1

  const actionId = (meta.action_id || '').toLowerCase()
  const name = (meta.name || meta.label || '').toLowerCase()
  const desc = (meta.description || '').toLowerCase()
  const categoryLabel = ACTION_CATEGORY_LABEL[resolveActionCategory(meta.action_id)].toLowerCase()

  let base = 0
  if (name && name === q) base = Math.max(base, 100)
  else if (name && name.startsWith(q)) base = Math.max(base, 70)
  else if (name && name.includes(q)) base = Math.max(base, 45)

  if (actionId === q) base = Math.max(base, 90)
  else if (actionId.startsWith(q)) base = Math.max(base, 55)
  else if (actionId.includes(q)) base = Math.max(base, 30)

  if (categoryLabel.includes(q)) base = Math.max(base, 15)
  if (desc.includes(q)) base = Math.max(base, 10)

  if (base === 0) return 0

  // 加成：最近使用（名次递减）+ 使用频次（对数，避免重度动作长期霸榜）
  const recent = recentActionIds(usage)
  const recentIndex = recent.indexOf(meta.action_id)
  if (recentIndex >= 0) base += Math.max(4, 20 - recentIndex * 4)

  const count = usage[meta.action_id]?.count ?? 0
  if (count > 0) base += Math.min(10, Math.log2(count + 1) * 3)

  return base
}

/** 同一分类内的排序：分数降序 → 最近使用 → 使用次数 → 中文名 */
export function compareActions(
  a: ActionMetaLike,
  b: ActionMetaLike,
  scoreOf: (meta: ActionMetaLike) => number,
  usage: ActionUsageMap = {},
): number {
  const sa = scoreOf(a)
  const sb = scoreOf(b)
  if (sb !== sa) return sb - sa

  const la = usage[a.action_id]?.lastAt ?? 0
  const lb = usage[b.action_id]?.lastAt ?? 0
  if (lb !== la) return lb - la

  const ca = usage[a.action_id]?.count ?? 0
  const cb = usage[b.action_id]?.count ?? 0
  if (cb !== ca) return cb - ca

  const na = a.name || a.label || a.action_id
  const nb = b.name || b.label || b.action_id
  return na.localeCompare(nb, 'zh')
}

// ── 分组树构建 ────────────────────────────────────────

export type ActionTreeLeaf<T> = T & {
  is_group: false
  category_id: ActionCategoryId
  /** 检索得分，便于模板高亮/调试 */
  score: number
}

export interface ActionTreeGroup<T> {
  id: string
  label: string
  is_group: true
  category_id: string
  count: number
  children: ActionTreeLeaf<T>[]
}

/** 默认展开的分类（最常用的两类），其余折叠 */
export const DEFAULT_EXPANDED_CATEGORIES: readonly ActionCategoryId[] = [
  'interaction',
  'navigation',
]

/** el-tree-v2 的 `default-expanded-keys`：分组节点 id */
export function defaultExpandedGroupIds(): string[] {
  return DEFAULT_EXPANDED_CATEGORIES.map((id) => groupNodeId(id))
}

export function groupNodeId(categoryId: string): string {
  return `group-${categoryId}`
}

/**
 * 构建「分类 → 动作」两层树
 *
 * - `query` 非空时按打分过滤，分数 0 的动作丢弃；
 * - 空分类不输出（查询时自然收敛，避免一屏空标题）；
 * - 分类排序：命中数降序 → 固定顺序；
 * - 「常用」虚拟分组置顶，仅在有最近使用记录时出现。
 */
export function buildActionTree<T extends ActionMetaLike>(
  actions: readonly T[],
  query = '',
  usage: ActionUsageMap = {},
): ActionTreeGroup<T>[] {
  const q = normalizeQuery(query)
  const scoreOf = (meta: ActionMetaLike) => scoreAction(meta, q, usage)

  const buckets = new Map<ActionCategoryId, ActionTreeLeaf<T>[]>()
  for (const action of actions) {
    const score = scoreOf(action)
    if (q && score === 0) continue
    const categoryId = resolveActionCategory(action.action_id)
    const leaf: ActionTreeLeaf<T> = { ...action, is_group: false, category_id: categoryId, score }
    const bucket = buckets.get(categoryId)
    if (bucket) bucket.push(leaf)
    else buckets.set(categoryId, [leaf])
  }

  const groups: ActionTreeGroup<T>[] = []
  for (const category of ACTION_CATEGORIES) {
    const children = buckets.get(category.id)
    if (!children || children.length === 0) continue
    children.sort((a, b) => compareActions(a, b, scoreOf, usage))
    groups.push({
      id: groupNodeId(category.id),
      label: category.label,
      is_group: true,
      category_id: category.id,
      count: children.length,
      children,
    })
  }

  // 「常用」分组：只放最近用过、且通过查询过滤的动作（保持最近使用顺序）
  const recent = recentActionIds(usage)
  if (recent.length > 0) {
    const byId = new Map(actions.map((a) => [a.action_id, a]))
    const children: ActionTreeLeaf<T>[] = []
    for (const actionId of recent) {
      const action = byId.get(actionId)
      if (!action) continue
      const score = scoreOf(action)
      if (q && score === 0) continue
      children.push({
        ...action,
        is_group: false,
        category_id: resolveActionCategory(actionId),
        score,
      })
    }
    if (children.length > 0) {
      groups.unshift({
        id: groupNodeId(RECENT_CATEGORY_ID),
        label: '常用',
        is_group: true,
        category_id: RECENT_CATEGORY_ID,
        count: children.length,
        children,
      })
    }
  }

  // 命中数降序只作用于「有查询」的跨分类场景；无查询保持固定顺序
  if (q) {
    groups.sort((a, b) => {
      if (a.category_id === RECENT_CATEGORY_ID) return -1
      if (b.category_id === RECENT_CATEGORY_ID) return 1
      return b.count - a.count
    })
  }

  return groups
}

// ── 使用记录（localStorage，失败静默降级） ─────────────

export const ACTION_USAGE_STORAGE_KEY = 'rpa:action-usage'

/** 最多保留的记录条数，超出按 lastAt 淘汰最旧 */
const USAGE_MAX_ENTRIES = 200

export function readActionUsage(): ActionUsageMap {
  try {
    const raw = localStorage.getItem(ACTION_USAGE_STORAGE_KEY)
    if (!raw) return {}
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return {}
    const result: ActionUsageMap = {}
    for (const [actionId, entry] of Object.entries(parsed as Record<string, unknown>)) {
      if (!entry || typeof entry !== 'object') continue
      const record = entry as Record<string, unknown>
      const count = Number(record.count)
      const lastAt = Number(record.lastAt)
      if (!Number.isFinite(count) || !Number.isFinite(lastAt)) continue
      result[actionId] = { count, lastAt }
    }
    return result
  } catch {
    // 隐私模式 / JSON 损坏：静默降级为空记录，不阻塞面板渲染
    return {}
  }
}

function writeActionUsage(usage: ActionUsageMap): void {
  try {
    const entries = Object.entries(usage)
    const trimmed =
      entries.length > USAGE_MAX_ENTRIES
        ? entries.sort((a, b) => b[1].lastAt - a[1].lastAt).slice(0, USAGE_MAX_ENTRIES)
        : entries
    localStorage.setItem(ACTION_USAGE_STORAGE_KEY, JSON.stringify(Object.fromEntries(trimmed)))
  } catch {
    // 配额超限 / 无 localStorage：忽略
  }
}

/** 记录一次动作使用（拖入画布、弹窗选中时各调一次） */
export function recordActionUsage(actionId: string, now = Date.now()): ActionUsageMap {
  if (!actionId) return readActionUsage()
  const usage = readActionUsage()
  const prev = usage[actionId]
  usage[actionId] = { count: (prev?.count ?? 0) + 1, lastAt: now }
  writeActionUsage(usage)
  return usage
}

export function clearActionUsage(): void {
  try {
    localStorage.removeItem(ACTION_USAGE_STORAGE_KEY)
  } catch {
    // ignore
  }
}

/** 按 action_id 取显示名（后端 name 优先，缺失回落常量表，最后回落 id） */
export function resolveActionDisplayName(
  actionId: string,
  fallbackName?: string | null,
  schemaTitle?: string | null,
): string {
  const byName = (fallbackName || '').trim()
  if (byName) return byName
  const byMap = (ACTION_DISPLAY_NAME as Record<string, string>)[actionId]
  if (byMap) return byMap
  const byTitle = (schemaTitle || '').trim()
  return byTitle || actionId
}
