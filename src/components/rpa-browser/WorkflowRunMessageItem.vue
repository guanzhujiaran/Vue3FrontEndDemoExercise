<script setup lang="ts">
import { ref } from 'vue'
import ArrowCollapseIcon from '@/assets/svgs/space/arrow_collapse.svg?component'
import ArrowExpandIcon from '@/assets/svgs/space/arrow_expand.svg?component'
import {
  CaretRight,
  CircleCheck,
  CircleClose,
  Flag,
  Refresh,
  WarningFilled,
} from '@element-plus/icons-vue'
import type { WorkflowRunLogEvent } from '@/api/browser/workflow_run_api'

/**
 * 运行消息单条（顶层步骤消息 / 循环轮次分组内的动作消息共用）。
 *
 * 缩进由外层分组容器（`WorkflowRunMessageGroup`）负责，本组件只渲染一行内容，
 * 因此嵌套深度不影响这里。
 *
 * `detail`（动作返回内容）默认折叠成一行摘要，点击本条展开全文：
 * 取数类动作每轮都会返回大 JSON，全铺开会把面板刷满。
 */
const props = defineProps<{
  event: WorkflowRunLogEvent
}>()

const LEVEL_TEXT_CLASS: Record<string, string> = {
  success: 'text-success',
  error: 'text-danger',
  warn: 'text-warning',
  info: 'text-text-regular',
}

const LEVEL_ICON_CLASS: Record<string, string> = {
  success: 'text-success',
  error: 'text-danger',
  warn: 'text-warning',
  info: 'text-info',
}

/** 本条的返回内容是否展开（每条独立） */
const detailExpanded = ref(false)

function textClass(event: WorkflowRunLogEvent) {
  return LEVEL_TEXT_CLASS[event.level] ?? LEVEL_TEXT_CLASS.info
}

function iconClass(event: WorkflowRunLogEvent) {
  return LEVEL_ICON_CLASS[event.level] ?? LEVEL_ICON_CLASS.info
}

function iconOf(event: WorkflowRunLogEvent) {
  if (event.kind === 'step_started' || event.kind === 'body_step_started') {
    return CaretRight
  }
  if (event.kind === 'step_finished' || event.kind === 'body_step_finished') {
    return event.success ? CircleCheck : CircleClose
  }
  if (event.kind === 'loop_iteration') return Refresh
  if (event.kind === 'loop_finished') return Flag
  if (event.kind === 'run_finished') return event.success ? CircleCheck : WarningFilled
  return CaretRight
}

function formatTs(ts: number) {
  if (!ts) return '--:--:--'
  return new Date(ts * 1000).toLocaleTimeString('zh-CN', { hour12: false })
}

function hasDetail(event: WorkflowRunLogEvent) {
  return typeof event.detail === 'string' && event.detail.length > 0
}

/** 折叠态只展示首行摘要，避免大响应把面板撑高 */
function detailPreview(event: WorkflowRunLogEvent) {
  return (event.detail ?? '').split('\n')[0]
}

function toggleDetail() {
  if (!hasDetail(props.event)) return
  detailExpanded.value = !detailExpanded.value
}
</script>

<template>
  <div class="workflow-run-message-item flex min-w-0 flex-col gap-0.5 text-xs">
    <div
      class="workflow-run-message-item__row flex min-w-0 items-start gap-2"
      :class="hasDetail(event) ? 'cursor-pointer' : ''"
      @click="toggleDetail()"
    >
      <el-icon
        class="workflow-run-message-item__icon mt-0.5 h-3 w-3 shrink-0"
        :class="iconClass(event)"
      >
        <component :is="iconOf(event)" />
      </el-icon>
      <span
        class="workflow-run-message-item__time shrink-0 font-mono text-color-secondary"
      >
        {{ formatTs(event.ts) }}
      </span>
      <el-text
        class="workflow-run-message-item__text min-w-0 flex-1 break-all"
        :class="textClass(event)"
        size="default"
      >
        {{ event.text }}
      </el-text>
      <el-icon
        v-if="hasDetail(event)"
        class="workflow-run-message-item__toggle mt-0.5 h-3 w-3 shrink-0 text-color-secondary"
      >
        <component :is="detailExpanded ? ArrowCollapseIcon : ArrowExpandIcon" />
      </el-icon>
    </div>
    <!-- 步骤返回内容：折叠一行摘要，点击展开全文
         el-text 自带 `align-self: center`，在 flex 列里会退化为 fit-content 宽度，
         长行（JSON / URL）就会顶出面板边框；这里用 flex 行 + min-w-0 flex-1 约束宽度。 -->
    <div
      v-if="hasDetail(event)"
      class="workflow-run-message-item__detail-wrap ml-6 flex min-w-0"
    >
      <el-text
        class="workflow-run-message-item__detail min-w-0 flex-1 font-mono text-color-secondary"
        :class="detailExpanded ? 'whitespace-pre-wrap break-all' : 'truncate'"
        size="default"
      >
        {{ detailExpanded ? event.detail : detailPreview(event) }}
      </el-text>
    </div>
  </div>
</template>
