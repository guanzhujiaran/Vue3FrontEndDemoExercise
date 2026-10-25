<script setup lang="ts">
import { computed, ref } from 'vue'
import ArrowCollapseIcon from '@/assets/svgs/space/arrow_collapse.svg?component'
import CopyIcon from '@/assets/svgs/space/copy.svg?component'
import biliMessage from '@/utils/message'
import WorkflowRunMessageItem from './WorkflowRunMessageItem.vue'
import { copyToClipboard } from '@/utils/rpa/clipboard'
import {
  buildBodyRows,
  groupText,
  roundText,
  type BodyRow,
  type LoopNode,
} from '@/utils/rpa/workflowRunMessageTree'

/**
 * 一个循环轮次分组（可递归：嵌套循环就是组里套组）。
 *
 * 渲染策略是**焦点轮次**：只有「当前轮次到根节点的链」上的分组会被完整渲染
 * （`pathKeys`），其余轮次由 `buildBodyRows` 折叠成一条占位行，不产生 DOM。
 * 一轮跑几百个轮次时，DOM 里也只有当前轮次的内容——这是运行消息面板
 * 在消息量大时不卡的关键（此前每个分组头都会挂载，每条 SSE 消息都让
 * 整棵分组树重新 patch，250 个分组时每条消息多花约 12ms）。
 *
 * 性能注意：分组头**刻意不用 el-tooltip / el-button / el-text**，
 * 改用原生 span + `title` 提示，视觉与交互（含键盘）保持一致；
 * 字号用 `text-sm` 对齐原 `el-text size="default"` 的 14px。
 */
const props = defineProps<{
  node: LoopNode
  /** 当前轮次到根的 key 链（含自身）：决定哪些子分组完整渲染 */
  pathKeys: Set<string>
  /** 当前焦点轮次 key（该分组整行高亮） */
  activeKey: string
  /** 最新一轮的 key：用于区分「运行中」与「已完成」 */
  latestKey: string
}>()

const emit = defineEmits<{
  /** 点击分组头 / 占位行：把某一轮设为焦点轮次 */
  'focus-round': [key: string]
}>()

const isActive = computed(() => props.node.key === props.activeKey)

const isLatest = computed(() => props.node.key === props.latestKey)

/** 状态点：未收口=警告色，有失败=危险色，其余=成功色 */
const dotClass = computed(() => {
  if (!props.node.closed) return 'bg-warning'
  if (props.node.failedCount > 0) return 'bg-danger'
  return 'bg-success'
})

const statusText = computed(() => {
  if (!props.node.closed) return isLatest.value ? '运行中' : '未收口'
  if (props.node.failedCount > 0) return `${props.node.failedCount} 失败`
  return '已完成'
})

const statusClass = computed(() => {
  if (!props.node.closed) return 'text-warning'
  if (props.node.failedCount > 0) return 'text-danger'
  return 'text-success'
})

const roundLabel = computed(() =>
  roundText(props.node.roundIndex, props.node.roundTotal)
)

/** 本轮耗时（首条消息到最近一条消息，秒） */
const costText = computed(() => {
  const seconds = Math.max(0, props.node.lastTs - props.node.firstTs)
  if (!seconds) return ''
  return seconds >= 60
    ? `${(seconds / 60).toFixed(1)}m`
    : `${seconds.toFixed(1)}s`
})

/** 组内渲染行：消息 + 路径上的子分组 + 被折叠轮次的占位行 */
const bodyRows = computed<BodyRow[]>(() =>
  buildBodyRows(props.node.children, props.pathKeys)
)

/** 复制本轮（含嵌套子轮）的全部消息，便于定位错误 */
const copying = ref(false)

async function copyRound() {
  if (copying.value) return
  copying.value = true
  try {
    const ok = await copyToClipboard(groupText(props.node))
    if (ok) {
      biliMessage.success(`已复制${roundLabel.value}消息（${props.node.totalCount} 条）`)
    } else {
      biliMessage.warning('复制失败，请手动选中文本复制')
    }
  } finally {
    copying.value = false
  }
}
</script>

<template>
  <div
    class="workflow-run-message-group flex flex-col rounded-md border bg-bg-secondary"
    :class="isActive ? 'border-primary' : 'border-border-lighter'"
    :data-group-key="node.key"
  >
    <!-- 点击分组头 = 把本轮设为焦点（嵌套场景可「放大」到外层轮） -->
    <div
      class="workflow-run-message-group__header flex cursor-pointer items-center gap-1.5 px-2 py-1 text-sm hover:bg-bg-page"
      :class="isActive ? 'bg-bg-page' : ''"
      @click="emit('focus-round', node.key)"
    >
      <el-icon
        class="workflow-run-message-group__caret h-3 w-3 shrink-0 text-color-secondary"
      >
        <ArrowCollapseIcon />
      </el-icon>
      <span
        class="workflow-run-message-group__dot h-1.5 w-1.5 shrink-0 rounded-full"
        :class="dotClass"
      />
      <span
        class="workflow-run-message-group__round shrink-0 font-mono"
        :class="isActive ? 'text-primary' : 'text-info'"
      >
        {{ roundLabel }}
      </span>
      <span class="workflow-run-message-group__name min-w-0 flex-1 truncate">
        {{ node.loopName }}
      </span>
      <span
        class="workflow-run-message-group__status shrink-0"
        :class="statusClass"
      >
        {{ statusText }}
      </span>
      <span class="workflow-run-message-group__count shrink-0 text-color-secondary">
        {{ node.totalCount }} 条
      </span>
      <span
        v-if="costText"
        class="workflow-run-message-group__cost shrink-0 text-color-secondary"
      >
        {{ costText }}
      </span>
      <!-- 复制本轮：stop 阻止冒泡，避免误触发焦点切换；
           title 代替 el-tooltip、span 代替 el-button，见组件头部的性能说明 -->
      <span
        class="workflow-run-message-group__copy shrink-0 cursor-pointer text-color-secondary hover:text-primary"
        role="button"
        tabindex="0"
        title="复制本轮消息（含嵌套轮次）"
        @pointerdown.stop
        @click.stop="copyRound()"
        @keydown.enter.prevent.stop="copyRound()"
        @keydown.space.prevent.stop="copyRound()"
      >
        <el-icon class="h-3.5 w-3.5"><CopyIcon /></el-icon>
      </span>
    </div>

    <!-- 组体：焦点链上的子分组递归渲染，其余轮次折叠为占位行 -->
    <div
      class="workflow-run-message-group__body ml-2 flex min-w-0 flex-col gap-1 border-l border-border-light py-1 pl-2 pr-1"
    >
      <template v-for="row in bodyRows" :key="row.key">
        <WorkflowRunMessageGroup
          v-if="row.kind === 'loop'"
          :node="row.node"
          :path-keys="pathKeys"
          :active-key="activeKey"
          :latest-key="latestKey"
          @focus-round="emit('focus-round', $event)"
        />
        <WorkflowRunMessageItem v-else-if="row.kind === 'item'" :event="row.event" />
        <!-- 被折叠的轮次：只留一条占位行，点击跳到离焦点最近的那一轮 -->
        <div
          v-else
          class="workflow-run-message-hidden-round cursor-pointer truncate rounded px-1 py-0.5 text-xs text-color-secondary hover:bg-bg-page hover:text-primary"
          :title="`跳转到附近的 ${row.count} 轮`"
          @click="emit('focus-round', row.focusKey)"
        >
          · 另有 {{ row.count }} 轮已折叠
        </div>
      </template>
      <el-text
        v-if="node.tailText"
        class="workflow-run-message-group__tail min-w-0 break-all text-color-secondary"
        size="default"
      >
        {{ node.tailText }}
      </el-text>
    </div>
  </div>
</template>
