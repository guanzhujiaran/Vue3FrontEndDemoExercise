<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import type { DropdownInstance } from 'element-plus'
import {
  Aim,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ChatDotRound,
  Close,
  Delete,
  Rank,
} from '@element-plus/icons-vue'
import FollowIcon from '@/assets/svgs/space/refresh.svg?component'
import { useWorkflowRunMessageStore } from '@/stores/workflow_run_messages'
import {
  buildBodyRows,
  buildMessageTree,
  collectLoopNodes,
  flattenRoundOptions,
  locateLoopNode,
  pathKeysOf,
  type BodyRow,
} from '@/utils/rpa/workflowRunMessageTree'
import WorkflowRunMessageGroup from './WorkflowRunMessageGroup.vue'
import WorkflowRunMessageItem from './WorkflowRunMessageItem.vue'

/**
 * 运行消息悬浮入口 + 面板（全局挂载，切页面不丢失）。
 *
 * 数据来自 Pinia 的 `workflow_run_messages`：SSE 订阅在 store 中，组件卸载/路由切换
 * 都不会断开；面板默认收起，由右下角悬浮按钮打开。
 *
 * 面板可拖动（标题栏）与调整大小（右下角把手），几何写入 localStorage。
 * 为什么不用 `el-dialog`：它自带遮罩，且焦点陷阱无条件生效，会打断用户
 * 「边跑边看边操作页面」的主流程；`el-dialog` 也只有 `draggable` 没有 `resizable`。
 *
 * 渲染策略是**焦点轮次**（类虚拟滚动）：一次运行的轮次可达数百个，全部挂载会把
 * 面板卡死（每条 SSE 消息都让整棵分组树重新 patch）。因此任意时刻只完整渲染
 * **一个轮次**（`activeKey`，默认 = 正在跑的最新轮次）及其祖先链，其余轮次
 * 折叠成一条占位行、不产生 DOM；切换轮次靠「上一轮/下一轮」「定位轮次」下拉
 * 与占位行点击。跟随最新时新轮次自动成为焦点；用户上翻阅读时自动钉住当前轮次，
 * 不会被新消息把正在看的内容整体换掉。
 */
const messageStore = useWorkflowRunMessageStore()
const { panelOpen, messages, workflowName, running, unread, showEntry } =
  storeToRefs(messageStore)

const listRef = ref<HTMLElement | null>(null)

const entryTitle = computed(() =>
  running.value ? '运行消息（运行中）' : '运行消息'
)

// ── 跟随最新：只在滚动条贴底时自动滚动，用户上翻看历史时不被拽回底部 ──
/** 距底部多少像素内视为「贴底」 */
const FOLLOW_THRESHOLD = 24
const followTail = ref(true)
/**
 * 当前焦点轮次 key（`run_id-seq`）；`null` = 跟随最新（焦点永远是最新一轮）。
 * 用户上翻阅读 / 手动切轮次时钉为某一轮，面板只渲染这一轮的内容。
 */
const activeKey = ref<string | null>(null)

function onListScroll() {
  const el = listRef.value
  if (!el) return
  const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight <= FOLLOW_THRESHOLD
  followTail.value = atBottom
  // 用户上翻看历史：把当前轮次钉住（activeKey 非空 = 不自动切换焦点），
  // 否则新轮次会把正在读的内容整体换掉；没有轮次（普通工作流）无需钉
  if (!atBottom && activeKey.value === null && latestGroupKey.value) {
    activeKey.value = latestGroupKey.value
  }
}

function scrollToBottom() {
  const el = listRef.value
  if (!el) return
  el.scrollTop = el.scrollHeight
  followTail.value = true
}

/** 新消息到达后自动滚到底部（仅在贴底跟随状态） */
watch(
  () => messages.value.length,
  async (length) => {
    // 消息被清空 / 切换运行：焦点回到「跟随最新」
    if (length === 0) {
      activeKey.value = null
      return
    }
    if (!panelOpen.value || !followTail.value) return
    await nextTick()
    scrollToBottom()
  }
)

// ── 焦点轮次：任意时刻只完整渲染一个轮次（见组件头注） ──
/** 消息树：循环轮次是分组节点，组内消息 / 更深的循环都是它的子节点 */
const messageTree = computed(() => buildMessageTree(messages.value))
/** 快速定位下拉的选项（按执行顺序，嵌套用 `›` 前缀） */
const roundOptions = computed(() => flattenRoundOptions(messageTree.value))
/** key → 分组节点（定位时校验目标是否存在） */
const groupIndex = computed(
  () => new Map(collectLoopNodes(messageTree.value).map(node => [node.key, node]))
)
/** 最新一轮（正在跑的那轮）：跟随最新时的焦点 */
const latestGroupKey = computed(() => {
  const loops = collectLoopNodes(messageTree.value)
  return loops[loops.length - 1]?.key ?? ''
})
/**
 * 当前焦点轮次 key：`activeKey` 为空 = 跟随最新（取最新一轮）；
 * 用户切过的轮次要校验还存在（清空消息 / 切换运行后旧 key 会失效）。
 */
const activeLoopKey = computed(() => {
  const key = activeKey.value
  if (key && groupIndex.value.has(key)) return key
  return latestGroupKey.value
})
/** 是否处于「跟随最新」：焦点永远等于最新一轮 */
const following = computed(() => activeKey.value === null)
/** 焦点轮次到根的 key 链：只有链上的分组完整渲染，其余折叠成占位行 */
const pathKeys = computed(() => pathKeysOf(messageTree.value, activeLoopKey.value))
/** 顶层渲染行（同样只保留焦点链，其余轮次是一条占位行） */
const rootRows = computed<BodyRow[]>(() =>
  buildBodyRows(messageTree.value, pathKeys.value)
)
/** 本次运行失败消息条数（循环体内失败也算，头部一眼可见） */
const failedCount = computed(() => {
  let count = 0
  for (const event of messages.value) {
    if (event.success === false) count += 1
  }
  return count
})

/** 当前焦点轮次的同层兄弟（同一循环的各轮），供上一轮/下一轮使用 */
const activeSiblings = computed(
  () => locateLoopNode(messageTree.value, activeLoopKey.value)?.siblings ?? []
)
const activeSiblingIndex = computed(() =>
  activeSiblings.value.findIndex(node => node.key === activeLoopKey.value)
)
const hasPrevRound = computed(() => activeSiblingIndex.value > 0)
const hasNextRound = computed(
  () => activeSiblingIndex.value >= 0 && activeSiblingIndex.value < activeSiblings.value.length - 1
)

/** 把某一轮设为焦点（下拉定位 / 上一轮下一轮 / 占位行点击共用） */
async function focusRound(key: string) {
  if (!key || !groupIndex.value.has(key)) return
  activeKey.value = key
  // 切到旧轮次后不再贴底跟随：否则下一条消息会把视图拽回底部
  followTail.value = false
  await nextTick()
  const list = listRef.value
  const target = list?.querySelector<HTMLElement>(`[data-group-key="${key}"]`)
  if (list && target) {
    list.scrollTop += target.getBoundingClientRect().top - list.getBoundingClientRect().top - 4
  }
}

function prevRound() {
  if (!hasPrevRound.value) return
  focusRound(activeSiblings.value[activeSiblingIndex.value - 1]!.key)
}

function nextRound() {
  if (!hasNextRound.value) return
  focusRound(activeSiblings.value[activeSiblingIndex.value + 1]!.key)
}

/** 手动切换「跟随最新」：开启即回到最新一轮，关闭则钉住当前轮次 */
function toggleFollow() {
  if (following.value) {
    // 没有轮次（普通工作流）时无可钉住，点击不产生状态变化
    if (latestGroupKey.value) activeKey.value = latestGroupKey.value
  } else {
    activeKey.value = null
    scrollToBottom()
  }
}

/** 浮动「回到最新」：恢复跟随最新轮次并滚到底部 */
function backToLatest() {
  activeKey.value = null
  scrollToBottom()
}

/** 快速定位：下拉选中某一轮，展开其祖先链（渲染路径）并滚动过去 */
const jumpDropdownRef = ref<DropdownInstance | null>(null)

async function onJump(value: unknown) {
  if (typeof value !== 'string' || !value) return
  await focusRound(value)
  jumpDropdownRef.value?.handleClose()
}

// ── 面板几何：可拖动 / 可调整大小 / 关闭后保持摆放 ──
/** 位置（视口左上角为原点）与尺寸，单位 px */
interface DockGeometry {
  left: number
  top: number
  width: number
  height: number
}

const STORAGE_KEY = 'workflow-run-message-dock-geometry'
/** 与 app-tailwind.css 里 `.workflow-run-message-bar` 的默认值保持一致（27.5rem × 25rem） */
const DEFAULT_WIDTH = 440
const DEFAULT_HEIGHT = 400
const MIN_WIDTH = 320
const MIN_HEIGHT = 220
/** 与视口边缘/悬浮入口之间保留的间距 */
const VIEWPORT_MARGIN = 16
/** 默认摆放：悬浮入口按钮上方（bottom-24 ≈ 6rem 加按钮高度） */
const DEFAULT_BOTTOM_OFFSET = 160

const panelRef = ref<HTMLElement | null>(null)
const geometry = ref<DockGeometry | null>(null)
/** 已写入过几何：为 true 时由 CSS 变量接管位置与尺寸（见 .is-positioned） */
const positioned = ref(false)
/** 当前交互：拖动标题栏 / 右下角缩放；null 表示空闲 */
const interacting = ref<'move' | 'resize' | null>(null)
/** 交互起始点（鼠标 + 面板几何快照） */
interface InteractionOrigin extends DockGeometry {
  x: number
  y: number
}
let origin: InteractionOrigin | null = null

/** 默认几何：贴右下角，位于悬浮入口按钮上方 */
function defaultGeometry(): DockGeometry {
  const width = Math.min(DEFAULT_WIDTH, window.innerWidth - VIEWPORT_MARGIN * 2)
  const height = Math.min(DEFAULT_HEIGHT, window.innerHeight - VIEWPORT_MARGIN * 2)
  return {
    width,
    height,
    left: Math.max(VIEWPORT_MARGIN, window.innerWidth - width - VIEWPORT_MARGIN),
    top: Math.max(VIEWPORT_MARGIN, window.innerHeight - height - DEFAULT_BOTTOM_OFFSET),
  }
}

/** 把宽高与位置收进合法区间，拖出视口/窗口缩小后不会找不到面板 */
function clampGeometry(value: DockGeometry): DockGeometry {
  const maxWidth = Math.max(MIN_WIDTH, window.innerWidth - VIEWPORT_MARGIN * 2)
  const maxHeight = Math.max(MIN_HEIGHT, window.innerHeight - VIEWPORT_MARGIN * 2)
  const width = Math.min(Math.max(value.width, MIN_WIDTH), maxWidth)
  const height = Math.min(Math.max(value.height, MIN_HEIGHT), maxHeight)
  return {
    width,
    height,
    left: Math.min(Math.max(value.left, 0), Math.max(window.innerWidth - width, 0)),
    top: Math.min(Math.max(value.top, 0), Math.max(window.innerHeight - height, 0)),
  }
}

/** 读取上次摆放；数据缺失/损坏时返回 null 走默认值 */
function readStoredGeometry(): DockGeometry | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<DockGeometry>
    const { left, top, width, height } = parsed
    if (
      typeof left !== 'number' ||
      typeof top !== 'number' ||
      typeof width !== 'number' ||
      typeof height !== 'number'
    ) {
      return null
    }
    return { left, top, width, height }
  } catch {
    return null
  }
}

function persistGeometry(value: DockGeometry) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value))
  } catch {
    // 隐私模式 / 存储配额不可用时忽略：本次会话内仍可拖动，只是不保留
  }
}

/**
 * 几何落到 DOM 上：写 CSS 变量而非 `:style` 绑定，样式声明仍集中在
 * `app-tailwind.css` 的 `.workflow-run-message-bar.is-positioned`。
 */
function applyGeometry(value: DockGeometry) {
  const el = panelRef.value
  if (!el) return
  el.style.setProperty('--workflow-dock-left', `${value.left}px`)
  el.style.setProperty('--workflow-dock-top', `${value.top}px`)
  el.style.setProperty('--workflow-dock-width', `${value.width}px`)
  el.style.setProperty('--workflow-dock-height', `${value.height}px`)
}

/** 打开面板时装载几何（首次用存储值，否则沿用上次摆放） */
function ensureGeometry() {
  const current = geometry.value
  geometry.value = current ? clampGeometry(current) : clampGeometry(readStoredGeometry() ?? defaultGeometry())
  positioned.value = true
}

function startInteraction(event: PointerEvent, mode: 'move' | 'resize') {
  // 只响应主键（鼠标左键 / 触摸），右键菜单等不触发拖动
  if (event.button !== 0 || !geometry.value) return
  origin = { x: event.clientX, y: event.clientY, ...geometry.value }
  interacting.value = mode
  ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
}

function onPointerMove(event: PointerEvent) {
  const current = geometry.value
  if (!interacting.value || !origin || !current) return
  const dx = event.clientX - origin.x
  const dy = event.clientY - origin.y
  const next =
    interacting.value === 'resize'
      ? { ...current, width: origin.width + dx, height: origin.height + dy }
      : { ...current, left: origin.left + dx, top: origin.top + dy }
  geometry.value = clampGeometry(next)
  applyGeometry(geometry.value)
}

function endInteraction(event: PointerEvent) {
  if (!interacting.value) return
  interacting.value = null
  origin = null
  const target = event.currentTarget as HTMLElement
  if (target.hasPointerCapture(event.pointerId)) target.releasePointerCapture(event.pointerId)
  if (geometry.value) persistGeometry(geometry.value)
}

/**
 * 恢复默认摆放：清掉存储（下次打开走默认几何），本次立即回到右下角。
 * 不写回默认值，避免「复位后又被记住」。
 */
function resetGeometry() {
  geometry.value = defaultGeometry()
  positioned.value = true
  try {
    window.localStorage.removeItem(STORAGE_KEY)
  } catch {
    // 清不掉也不影响本次会话：面板已经回到默认位置
  }
  applyGeometry(geometry.value)
}

/** 窗口尺寸变化后把面板收回视口内 */
function handleViewportResize() {
  if (!geometry.value) return
  geometry.value = clampGeometry(geometry.value)
  applyGeometry(geometry.value)
  persistGeometry(geometry.value)
}

onMounted(() => {
  window.addEventListener('resize', handleViewportResize)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleViewportResize)
})

/** 展开时装载几何并滚到底，避免打开后停在顶部 */
watch(panelOpen, async (open) => {
  if (!open) return
  ensureGeometry()
  await nextTick()
  const current = geometry.value
  if (current) applyGeometry(current)
  scrollToBottom()
})
</script>

<template>
  <!-- 悬浮入口：有消息或运行中才出现；未读数量角标 -->
  <div v-if="showEntry" class="workflow-run-message-entry fixed bottom-24 right-4 z-[2000]">
    <el-tooltip :content="entryTitle" placement="left">
      <el-badge :value="unread" :hidden="unread === 0" :max="99">
        <el-button
          class="workflow-run-message-entry__button"
          type="primary"
          circle
          size="large"
          :icon="panelOpen ? Close : ChatDotRound"
          @click="messageStore.togglePanel()"
        />
      </el-badge>
    </el-tooltip>
  </div>

  <!-- 消息面板：标题栏拖动移动，右下角把手调整大小，几何写入 localStorage -->
  <div
    v-if="showEntry && panelOpen"
    ref="panelRef"
    class="workflow-run-message-bar fixed z-[2000]"
    :class="positioned ? 'is-positioned' : ''"
  >
    <div
      class="workflow-run-message-bar__panel relative flex h-full w-full flex-col rounded-xl border border-border-light bg-bg-overlay shadow-lg overflow-hidden"
      :class="interacting ? 'select-none' : ''"
    >
      <div
        class="workflow-run-message-bar__header flex shrink-0 cursor-move touch-none items-center gap-2 px-3 py-2 border-b border-border-lighter"
        @pointerdown="startInteraction($event, 'move')"
        @pointermove="onPointerMove"
        @pointerup="endInteraction"
        @pointercancel="endInteraction"
      >
        <el-tooltip content="拖动此处移动面板" placement="top">
          <el-icon class="workflow-run-message-bar__drag-handle shrink-0 text-color-secondary">
            <Rank />
          </el-icon>
        </el-tooltip>
        <el-text class="workflow-run-message-bar__title text-sm font-medium" size="default">
          运行消息
        </el-text>
        <el-text
          v-if="workflowName"
          class="workflow-run-message-bar__workflow min-w-0 flex-1 truncate text-xs text-color-secondary"
          size="default"
        >
          {{ workflowName }}
        </el-text>
        <span v-else class="workflow-run-message-bar__spacer flex-1" />
        <el-tag :type="running ? 'warning' : 'info'" effect="plain">
          {{ running ? '运行中' : '已结束' }}
        </el-tag>
        <el-tooltip content="恢复默认位置与大小" placement="top">
          <el-button
            class="workflow-run-message-bar__reset shrink-0"
            link
            :icon="Aim"
            @pointerdown.stop
            @click="resetGeometry()"
          />
        </el-tooltip>
        <el-tooltip content="清空消息" placement="top">
          <el-button
            class="workflow-run-message-bar__clear shrink-0"
            link
            :icon="Delete"
            @pointerdown.stop
            @click="messageStore.clearMessages()"
          />
        </el-tooltip>
        <el-tooltip content="收起" placement="top">
          <el-button
            class="workflow-run-message-bar__close shrink-0"
            link
            :icon="Close"
            @pointerdown.stop
            @click="messageStore.closePanel()"
          />
        </el-tooltip>
      </div>

      <!-- 工具栏：轮次快速定位 + 上一轮/下一轮 + 统计 + 跟随最新 -->
      <div
        class="workflow-run-message-bar__toolbar flex shrink-0 items-center gap-1.5 border-b border-border-lighter px-2 py-1"
      >
        <!-- 定位轮次：懒渲染下拉（:persistent="false"）。
             轮次可达数百个，el-select 会把所有 el-option 常驻实例化
             （打开面板即多花数百毫秒挂载、每条新消息还要承受 EP 内部
             O(n²) 的 optionsArray 重算），这里改成打开才渲染列表。 -->
        <el-dropdown
          ref="jumpDropdownRef"
          class="workflow-run-message-bar__jump min-w-0 flex-1"
          trigger="click"
          :persistent="false"
        >
          <el-button
            class="workflow-run-message-bar__jump-trigger w-full min-w-0 justify-start"
            link
            size="default"
          >
            <span class="workflow-run-message-bar__jump-label min-w-0 flex-1 truncate text-left">定位轮次</span>
            <el-icon class="h-3 w-3 shrink-0"><ArrowDown /></el-icon>
          </el-button>
          <template #dropdown>
            <el-dropdown-menu
              class="workflow-run-message-bar__jump-menu max-h-80 w-64 overflow-y-auto"
            >
              <li
                v-for="option in roundOptions"
                :key="option.key"
                class="workflow-run-message-bar__jump-option cursor-pointer truncate px-3 py-1.5 text-xs hover:bg-bg-page"
                :title="option.label"
                @click="onJump(option.key)"
              >
                {{ option.label }}
              </li>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
        <!-- 上一轮 / 下一轮：同一循环的相邻轮次（无相邻轮次时置灰） -->
        <el-tooltip content="上一轮（同一循环）" placement="top">
          <el-button
            class="workflow-run-message-bar__prev-round shrink-0"
            link
            :disabled="!hasPrevRound"
            @pointerdown.stop
            @click="prevRound()"
          >
            <el-icon class="h-4 w-4"><ArrowLeft /></el-icon>
          </el-button>
        </el-tooltip>
        <el-tooltip content="下一轮（同一循环）" placement="top">
          <el-button
            class="workflow-run-message-bar__next-round shrink-0"
            link
            :disabled="!hasNextRound"
            @pointerdown.stop
            @click="nextRound()"
          >
            <el-icon class="h-4 w-4"><ArrowRight /></el-icon>
          </el-button>
        </el-tooltip>
        <el-text
          class="workflow-run-message-bar__stat shrink-0 text-color-secondary"
          size="default"
        >
          {{ messages.length }} 条
        </el-text>
        <el-text
          v-if="failedCount > 0"
          class="workflow-run-message-bar__stat-failed shrink-0 text-danger"
          size="default"
        >
          {{ failedCount }} 失败
        </el-text>
        <el-tooltip
          :content="following ? '跟随最新（已开启）' : '跟随最新（已暂停，点击恢复）'"
          placement="top"
        >
          <el-button
            class="workflow-run-message-bar__follow shrink-0"
            link
            :class="following ? 'text-primary' : 'text-color-secondary'"
            @pointerdown.stop
            @click="toggleFollow()"
          >
            <el-icon class="h-4 w-4"><FollowIcon /></el-icon>
          </el-button>
        </el-tooltip>
      </div>

      <!-- 消息列表：只渲染焦点轮次（及其祖先链），其余轮次折叠为占位行 -->
      <div class="workflow-run-message-bar__body relative min-h-0 min-w-0 flex-1">
        <div
          ref="listRef"
          class="workflow-run-message-bar__list bili-thin-scroll flex h-full min-w-0 flex-col gap-1 overflow-x-hidden overflow-y-auto px-2 py-2"
          @scroll="onListScroll"
        >
          <el-text
            v-if="rootRows.length === 0"
            class="workflow-run-message-bar__empty text-xs text-color-secondary"
            size="default"
          >
            {{ running ? '等待执行步骤…' : '暂无消息' }}
          </el-text>

          <template v-for="row in rootRows" :key="row.key">
            <WorkflowRunMessageGroup
              v-if="row.kind === 'loop'"
              class="workflow-run-message-bar__group"
              :node="row.node"
              :path-keys="pathKeys"
              :active-key="activeLoopKey"
              :latest-key="latestGroupKey"
              @focus-round="focusRound"
            />
            <WorkflowRunMessageItem
              v-else-if="row.kind === 'item'"
              class="workflow-run-message-bar__item"
              :event="row.event"
            />
            <!-- 不在焦点链上的轮次：只留一条占位行，点击跳到附近的那一轮 -->
            <div
              v-else
              class="workflow-run-message-hidden-round cursor-pointer truncate rounded px-1 py-0.5 text-xs text-color-secondary hover:bg-bg-page hover:text-primary"
              :title="`跳转到附近的 ${row.count} 轮`"
              @click="focusRound(row.focusKey)"
            >
              · 另有 {{ row.count }} 轮已折叠
            </div>
          </template>
        </div>

        <!-- 上翻阅读 / 焦点不在最新一轮时浮出；点击恢复跟随并滚到最新一条 -->
        <el-button
          v-if="messages.length > 0 && (!followTail || !following)"
          class="workflow-run-message-bar__to-latest absolute bottom-2 right-2"
          type="primary"
          round
          @click="backToLatest()"
        >
          回到最新
        </el-button>
      </div>

      <!-- 缩放把手：右下角拖动调整面板宽高 -->
      <el-tooltip content="拖动调整大小" placement="top">
        <div
          class="workflow-run-message-bar__resizer absolute bottom-0 right-0 flex h-4 w-4 cursor-se-resize touch-none items-center justify-center text-color-secondary"
          @pointerdown="startInteraction($event, 'resize')"
          @pointermove="onPointerMove"
          @pointerup="endInteraction"
          @pointercancel="endInteraction"
        >
          <el-icon class="workflow-run-message-bar__resizer-icon rotate-45 text-xs">
            <Rank />
          </el-icon>
        </div>
      </el-tooltip>
    </div>
  </div>
</template>
