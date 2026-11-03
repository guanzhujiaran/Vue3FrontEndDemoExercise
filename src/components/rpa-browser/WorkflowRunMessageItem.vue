<script setup lang="ts">
import { computed, ref } from 'vue'
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
import {
  buildDetailBlocks,
  formatRunMessage,
} from '@/utils/rpa/workflowRunMessageFormat'

/**
 * 运行消息单条（顶层步骤消息 / 循环轮次分组内的动作消息共用）。
 *
 * 缩进由外层分组容器（`WorkflowRunMessageGroup`）负责，本组件只渲染一行内容，
 * 因此嵌套深度不影响这里。
 *
 * 文案不再整行平铺：`text` 由 `formatRunMessage` 拆成「位置徽标 / 动作名 / 耗时 /
 * 失败原因」，失败原因单独成块（浅红底），成功失败靠图标与徽标色区分，
 * 扫一眼就能定位哪一步挂了。
 *
 * `detail`（动作返回内容）**默认不渲染**，点击本条才挂载：
 * 取数类 / LLM 类动作每轮都会返回大 JSON（实测单条可达数 MB），
 * 即便只显示一行摘要，文本节点本身也会把面板拖住；折叠态一律不产生 detail 的 DOM。
 * 展开的文本已由 store 在入列前截断（`MAX_DETAIL_CHARS`），并做 JSON 缩进美化。
 */
const props = defineProps<{
  event: WorkflowRunLogEvent
}>()

const LEVEL_ICON_CLASS: Record<string, string> = {
  success: 'text-success',
  error: 'text-danger',
  warn: 'text-warning',
  info: 'text-info',
}

/** 主文案颜色：失败才标红，成功不再整行染绿（图标与徽标已足够表达结果） */
const LEVEL_TITLE_CLASS: Record<string, string> = {
  success: 'text-text-regular',
  error: 'text-danger',
  warn: 'text-warning',
  info: 'text-text-regular',
}

/** 位置徽标配色 */
const LEVEL_BADGE_CLASS: Record<string, string> = {
  success: 'bg-success-light-9 text-success',
  error: 'bg-danger-light-9 text-danger',
  warn: 'bg-warning-light-9 text-warning',
  info: 'bg-info-light-9 text-info',
}

/** 本条的返回内容是否展开（每条独立） */
const detailExpanded = ref(false)

/** 结构化后的行视图（解析失败自动退回原文，见 `formatRunMessage`） */
const view = computed(() => formatRunMessage(props.event))

const hasDetail = computed(
  () => typeof props.event.detail === 'string' && props.event.detail.length > 0
)

/** 展开态才解析返回内容：折叠时不做任何文本处理 */
const detailBlocks = computed(() =>
  detailExpanded.value ? buildDetailBlocks(props.event.detail) : []
)

function iconClass(event: WorkflowRunLogEvent) {
  return LEVEL_ICON_CLASS[event.level] ?? LEVEL_ICON_CLASS.info
}

function titleClass(event: WorkflowRunLogEvent) {
  return LEVEL_TITLE_CLASS[event.level] ?? LEVEL_TITLE_CLASS.info
}

function badgeClass(event: WorkflowRunLogEvent) {
  return LEVEL_BADGE_CLASS[event.level] ?? LEVEL_BADGE_CLASS.info
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

function toggleDetail() {
  if (!hasDetail.value) return
  detailExpanded.value = !detailExpanded.value
}
</script>

<template>
  <div class="workflow-run-message-item flex min-w-0 flex-col gap-1 text-xs">
    <div
      class="workflow-run-message-item__row flex min-w-0 items-start gap-2 rounded px-1 py-0.5 transition-colors hover:bg-bg-page"
      :class="hasDetail ? 'cursor-pointer' : ''"
      @click="toggleDetail()"
    >
      <el-icon
        class="workflow-run-message-item__icon mt-0.5 h-3 w-3 shrink-0"
        :class="iconClass(event)"
      >
        <component :is="iconOf(event)" />
      </el-icon>
      <span
        class="workflow-run-message-item__time mt-0.5 shrink-0 font-mono text-color-secondary"
      >
        {{ formatTs(event.ts) }}
      </span>
      <span
        v-if="view.badge"
        class="workflow-run-message-item__badge mt-0.5 shrink-0 rounded px-1 font-mono leading-4"
        :class="badgeClass(event)"
      >
        {{ view.badge }}
      </span>
      <el-text
        class="workflow-run-message-item__text min-w-0 flex-1 break-all"
        :class="titleClass(event)"
        size="default"
      >
        {{ view.title }}
      </el-text>
      <span
        v-if="view.cost"
        class="workflow-run-message-item__cost mt-0.5 shrink-0 rounded bg-bg-secondary px-1 font-mono leading-4 text-color-secondary"
      >
        {{ view.cost }}
      </span>
      <el-icon
        v-if="hasDetail"
        class="workflow-run-message-item__toggle mt-0.5 h-3 w-3 shrink-0 text-color-secondary"
        :title="detailExpanded ? '收起返回内容' : '展开返回内容'"
      >
        <component :is="detailExpanded ? ArrowCollapseIcon : ArrowExpandIcon" />
      </el-icon>
    </div>

    <!-- 失败原因单独成块：原来和动作名、耗时挤在一行，长错误信息很难扫 -->
    <div
      v-if="view.reason"
      class="workflow-run-message-item__reason ml-6 flex min-w-0 items-start gap-1 rounded bg-danger-light-9 px-1.5 py-1"
    >
      <el-icon class="mt-0.5 h-3 w-3 shrink-0 text-danger">
        <WarningFilled />
      </el-icon>
      <el-text
        class="workflow-run-message-item__reason-text min-w-0 flex-1 whitespace-pre-wrap break-all text-danger"
        size="default"
      >
        {{ view.reason }}
      </el-text>
    </div>

    <!-- 步骤返回内容：**折叠态不渲染**（detail 可能上千行/数 MB），点击才挂载；
         JSON 行缩进展开、`参数:` 前缀改为小标签，超出高度在块内滚动 -->
    <div
      v-if="hasDetail && detailExpanded"
      class="workflow-run-message-item__detail-wrap ml-6 flex min-w-0"
    >
      <div
        class="workflow-run-message-item__detail bili-thin-scroll flex max-h-60 min-w-0 flex-1 flex-col gap-1.5 overflow-y-auto rounded border border-border-lighter bg-bg-secondary p-1.5"
      >
        <div
          v-for="(block, index) in detailBlocks"
          :key="`${event.seq}-${index}`"
          class="workflow-run-message-item__detail-block flex min-w-0 flex-col gap-0.5"
        >
          <span
            v-if="block.label"
            class="workflow-run-message-item__detail-label w-fit rounded bg-info-light-9 px-1 font-mono leading-4 text-info"
          >
            {{ block.label }}
          </span>
          <!-- el-text 自带 align-self: center，在 flex 列里会退化为 fit-content 宽度，
               长行（JSON / URL）就会顶出面板边框；这里用 min-w-0 + w-full 约束宽度 -->
          <el-text
            class="workflow-run-message-item__detail-text w-full min-w-0 whitespace-pre-wrap break-all font-mono text-color-secondary"
            size="default"
          >
            {{ block.text }}
          </el-text>
        </div>
      </div>
    </div>
  </div>
</template>
