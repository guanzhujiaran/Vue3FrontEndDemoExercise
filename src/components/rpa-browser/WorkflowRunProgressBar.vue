<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import type { WorkflowRunProgress } from '@/api/browser/workflow_run_api'

/**
 * 工作流运行进度（SSE 快照驱动）。
 *
 * 主轴按用户视角分两层：
 *   1. 在循环体内时：进度条 = 当前循环轮次（第 i / 共 N 轮），这是批量处理时最关心的维度；
 *   2. 不在循环内时：进度条 = 已完成步骤 / 总步骤。
 * 运行时长始终可见（本地每秒自增，不依赖推送频率），并附带成功/失败计数、当前动作名、
 * 触发来源与「进度较久未更新」提示，尽可能完整描述一次运行的状态。
 *
 * 布局：两条进度条（整体轮次 / 本轮循环体动作）分别渲染成**独立区块**
 * ——各自带标题、百分比与状态文案，区块之间用分隔线隔开，
 * 避免两条 bar 紧贴成一组后分不清谁是谁（见需求文档 §2.1）。
 */
interface Props {
  /** 运行进度快照；缺省时只显示开始时间与耗时（尚未收到首帧） */
  progress?: WorkflowRunProgress | null
  /** 运行开始时间：ISO 字符串（运行记录接口）或秒级时间戳（SSE） */
  startedAt?: string | number | null
  /** 终态总耗时（毫秒）：有值时优先于本地计时 */
  durationMs?: number | null
  /** 紧凑模式（表格行内） */
  compact?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  progress: null,
  startedAt: null,
  durationMs: null,
  compact: false,
})

const TRIGGER_LABEL: Record<string, string> = {
  manual: '手动',
  schedule: '定时',
}

/** 进度超过该时长未更新时提示可能卡住（步骤级动作本身可能较慢，阈值放宽） */
const STALE_SECONDS = 60

const nowSeconds = ref(Math.floor(Date.now() / 1000))
let timer: ReturnType<typeof setInterval> | null = null

const isRunning = computed(() => (props.progress?.status ?? 'running') === 'running')

/**
 * 进度条下方状态文案是否展开。
 * 默认折叠（多行省略），点击文案展开全文；紧凑模式（表格行内）固定单行，
 * 避免展开后把表格行撑高。折叠靠 el-text 自带的 line-clamp 属性实现。
 */
const stateExpanded = ref(false)

const stateLineClamp = computed<number | undefined>(() => {
  if (props.compact) return 1
  return stateExpanded.value ? undefined : 2
})

function toggleStateExpanded() {
  if (props.compact) return
  stateExpanded.value = !stateExpanded.value
}

function startTimer() {
  stopTimer()
  timer = setInterval(() => {
    nowSeconds.value = Math.floor(Date.now() / 1000)
  }, 1000)
}

function stopTimer() {
  if (timer !== null) {
    clearInterval(timer)
    timer = null
  }
}

watch(
  isRunning,
  (running) => {
    if (running) startTimer()
    else stopTimer()
  },
  { immediate: true }
)

onBeforeUnmount(stopTimer)

/** 开始时间统一成秒级时间戳 */
const startedAtSeconds = computed<number | null>(() => {
  const fromProgress = props.progress?.started_at
  if (typeof fromProgress === 'number' && fromProgress > 0) return fromProgress
  const raw = props.startedAt
  if (typeof raw === 'number' && raw > 0) return raw
  if (typeof raw === 'string' && raw) {
    const parsed = Date.parse(raw)
    if (!Number.isNaN(parsed)) return Math.floor(parsed / 1000)
  }
  return null
})

/** 已运行时长（毫秒）：终态用后端总耗时，运行中按本地时钟推算 */
const elapsedMs = computed<number>(() => {
  if (!isRunning.value && typeof props.durationMs === 'number' && props.durationMs > 0) {
    return props.durationMs
  }
  if (startedAtSeconds.value === null) return 0
  const end = isRunning.value
    ? nowSeconds.value
    : (props.progress?.finished_at ?? nowSeconds.value)
  return Math.max((end - startedAtSeconds.value) * 1000, 0)
})

const elapsedText = computed(() => {
  const totalSeconds = Math.floor(elapsedMs.value / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  const mmss = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
  return hours > 0 ? `${hours}:${mmss}` : mmss
})

const totalSteps = computed(() => props.progress?.total_steps ?? 0)
const completedSteps = computed(() => props.progress?.completed_steps ?? 0)
const loopIndex = computed(() => props.progress?.loop_index ?? 0)
const loopTotal = computed(() => props.progress?.loop_total ?? 0)
const loopActive = computed(() => loopIndex.value > 0 || loopTotal.value > 0)

/** 循环轮次可预知：分母 > 0 且后端标记为已知 */
const loopTotalKnown = computed(
  () => loopTotal.value > 0 && (props.progress?.loop_total_known ?? true)
)

/** 第一条进度条标题：说明这一条量的是什么维度 */
const mainLabel = computed(() => (loopActive.value ? '循环总进度' : '执行进度'))

/** 进度条百分比：循环内用轮次，否则用步骤 */
const percentage = computed(() => {
  if (loopActive.value && loopTotalKnown.value) {
    return Math.min(Math.round((loopIndex.value / loopTotal.value) * 100), 100)
  }
  if (!loopActive.value && totalSteps.value > 0) {
    return Math.min(Math.round((completedSteps.value / totalSteps.value) * 100), 100)
  }
  return 0
})

/** 分母未知（条件循环 / 尚未拿到首帧）：走不确定态动画，不展示假百分比 */
const indeterminate = computed(() => {
  if (!isRunning.value) return false
  if (loopActive.value) return !loopTotalKnown.value
  return totalSteps.value === 0
})

/** 百分比文本：不确定态显示占位符，不伪造数字 */
const percentText = computed(() =>
  indeterminate.value ? '—' : `${percentage.value}%`
)

const barStatus = computed<'' | 'success' | 'exception' | 'warning'>(() => {
  const status = props.progress?.status
  if (status === 'failed') return 'exception'
  if (status === 'success') return 'success'
  if (status === 'interrupted' || status === 'cancelled') return 'warning'
  return ''
})

/** 主状态文案：循环轮次优先，其次步骤名 */
const mainText = computed(() => {
  if (loopActive.value) {
    const action = props.progress?.loop_action_name
    const finishing = isRunning.value && loopTotalKnown.value && loopIndex.value >= loopTotal.value
    const loopPart = loopTotalKnown.value
      ? `第 ${loopIndex.value}/${loopTotal.value} 轮${finishing ? '（收尾中）' : ''}`
      : `已执行 ${loopIndex.value} 轮`
    return action ? `${loopPart} · 循环「${action}」` : loopPart
  }
  const stepName = props.progress?.current_step_name
  // 运行已开始但还没有任何步骤启动：多半在拉起浏览器 / 加载步骤，明确告知避免误判卡死
  if (
    isRunning.value &&
    completedSteps.value === 0 &&
    !stepName &&
    totalSteps.value > 0
  ) {
    return '正在准备执行环境（启动浏览器 / 加载步骤）…'
  }
  if (isRunning.value && stepName) {
    return `顶层步骤 ${completedSteps.value}/${totalSteps.value} · ${stepName}`
  }
  if (totalSteps.value > 0) return `顶层步骤 ${completedSteps.value}/${totalSteps.value}`
  return '等待进度上报'
})

// ── 第二条进度条：本轮循环体内的动作进度 ──
const bodyTotal = computed(() => props.progress?.loop_body_total ?? 0)
const bodyCompleted = computed(() => props.progress?.loop_body_completed ?? 0)
const bodyStepName = computed(() => props.progress?.loop_body_step_name ?? '')
const bodyActive = computed(() => loopActive.value && bodyTotal.value > 0)

const bodyPercentage = computed(() => {
  if (bodyTotal.value <= 0) return 0
  return Math.min(Math.round((bodyCompleted.value / bodyTotal.value) * 100), 100)
})

const bodyPercentText = computed(() => `${bodyPercentage.value}%`)

const triggerText = computed(() => {
  const source = props.progress?.trigger_source
  return source ? (TRIGGER_LABEL[source] ?? source) : ''
})

const showCounts = computed(() => {
  const progress = props.progress
  if (!progress) return false
  return progress.success_count > 0 || progress.failed_count > 0
})

/** 进度心跳超时提示：仅运行中才有意义 */
const progressStale = computed(() => {
  if (!isRunning.value) return false
  const updatedAt = props.progress?.updated_at
  if (!updatedAt) return false
  return nowSeconds.value - updatedAt > STALE_SECONDS
})

const resumedHint = computed(() => {
  const count = props.progress?.resume_count ?? 0
  return count > 0 ? `已恢复 ${count} 次` : ''
})
</script>

<template>
  <div class="workflow-run-progress flex flex-col" :class="compact ? 'gap-2' : 'gap-3'">
    <!-- 区块一：整体进度（循环内按轮次，否则按顶层步骤） -->
    <div
      class="workflow-run-progress__group workflow-run-progress__group--main flex flex-col"
      :class="compact ? 'gap-1' : 'gap-1.5'"
    >
      <div class="workflow-run-progress__group-head flex items-center justify-between gap-x-2 text-xs">
        <el-text class="workflow-run-progress__group-label text-text-secondary" size="default">
          {{ mainLabel }}
        </el-text>
        <el-text class="workflow-run-progress__group-percent font-mono text-text-primary" size="default">
          {{ percentText }}
        </el-text>
      </div>
      <el-progress
        class="workflow-run-progress__bar"
        :percentage="percentage"
        :status="barStatus"
        :indeterminate="indeterminate"
        :duration="2"
        :stroke-width="compact ? 6 : 8"
        :show-text="false"
      />
      <el-text
        class="workflow-run-progress__state text-color-secondary break-words"
        :class="compact ? '' : 'cursor-pointer'"
        tag="p"
        size="default"
        :title="mainText"
        :line-clamp="stateLineClamp"
        @click="toggleStateExpanded"
      >
        {{ mainText }}
      </el-text>
    </div>

    <!-- 区块二：本轮循环体内的动作进度（独立区块 + 分隔线，不与整体进度并在一起） -->
    <div
      v-if="bodyActive"
      class="workflow-run-progress__group workflow-run-progress__group--body flex flex-col border-t border-border-lighter pt-2"
      :class="compact ? 'gap-1' : 'gap-1.5'"
    >
      <div class="workflow-run-progress__group-head flex items-center justify-between gap-x-2 text-xs">
        <el-text class="workflow-run-progress__group-label text-text-secondary" size="default">
          本轮动作进度
        </el-text>
        <el-text class="workflow-run-progress__group-percent font-mono text-text-primary" size="default">
          {{ bodyPercentText }}
        </el-text>
      </div>
      <el-progress
        class="workflow-run-progress__body-bar"
        :percentage="bodyPercentage"
        :show-text="false"
        :stroke-width="compact ? 4 : 6"
      />
      <div class="workflow-run-progress__body-meta flex items-center gap-x-2 text-xs min-w-0">
        <el-text class="workflow-run-progress__body-state text-color-secondary" size="default">
          {{ bodyCompleted }}/{{ bodyTotal }}
        </el-text>
        <el-text
          v-if="bodyStepName"
          class="workflow-run-progress__body-step text-color-secondary truncate"
          size="default"
        >
          · {{ bodyStepName }}
        </el-text>
      </div>
    </div>

    <div
      class="workflow-run-progress__meta flex items-center gap-x-3 gap-y-1 flex-wrap text-xs border-t border-border-lighter pt-2"
    >
      <el-text class="workflow-run-progress__timer font-mono" size="default">
        {{ isRunning ? '已运行' : '耗时' }} {{ elapsedText }}
      </el-text>

      <el-text
        v-if="showCounts"
        class="workflow-run-progress__counts text-color-secondary"
        size="default"
      >
        <span class="text-success">成功 {{ progress?.success_count ?? 0 }}</span>
        <span class="mx-1">/</span>
        <span class="text-danger">失败 {{ progress?.failed_count ?? 0 }}</span>
      </el-text>

      <el-text v-if="triggerText" class="workflow-run-progress__trigger text-color-secondary" size="default">
        {{ triggerText }}触发
      </el-text>

      <el-text v-if="resumedHint" class="workflow-run-progress__resume text-warning" size="default">
        {{ resumedHint }}
      </el-text>

      <el-text
        v-if="progressStale"
        class="workflow-run-progress__stale text-warning"
        size="default"
      >
        超过 3 分钟未更新（可能正在执行长耗时动作，或连接中断）
      </el-text>
    </div>
  </div>
</template>
