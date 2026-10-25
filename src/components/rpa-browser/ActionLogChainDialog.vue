<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { 操作日志管理Service } from '@/api/browser/hey-api'
import { useUserNavStore } from '@/stores/user_nav'
import { businessHandler } from '@/utils/businessHandler'

/**
 * 执行链路弹窗
 *
 * 按 execution_id **分页**拉取步骤日志（按写入顺序），按 depth 缩进还原调用树；
 * 失败步骤整行高亮并完整展示错误信息，点击任一步骤可下钻到该步骤的日志详情。
 *
 * 分页是必需的：一次长循环运行的步骤日志可达数千条，全量拉取既慢又会卡住渲染。
 * 走已生成 SDK 的 `action-logs/list`（支持 execution_id 过滤 + page/per_page）。
 */

interface Props {
  modelValue: boolean
  executionId: string
}

const props = defineProps<Props>()
const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  select: [logId: string]
}>()

const userNavStore = useUserNavStore()

/** 链路步骤（by-execution 返回的是完整字段，这里只取展示所需） */
interface ChainStep {
  id: number
  log_id: string
  action_id: string
  action_name: string
  status: string
  success: boolean
  depth: number
  execution_time: number
  error_message?: string | null
}

const visible = computed({
  get: () => props.modelValue,
  set: (val: boolean) => emit('update:modelValue', val),
})

/** 每页步骤数（几千条日志时避免一次渲染） */
const PAGE_SIZE = 50

const loading = ref(false)
/** 当前页的步骤（不是全部） */
const steps = ref<ChainStep[]>([])
const page = ref(1)
/** 该执行批次的步骤总数（来自接口 total，用于汇总与分页器） */
const total = ref(0)

/** 当前页的成败/耗时统计（全量统计需要额外接口，这里只对本页负责） */
const summary = computed(() => {
  const failed = steps.value.filter((s) => !s.success).length
  return {
    success: steps.value.length - failed,
    failed,
    duration: steps.value.reduce((sum, s) => sum + (s.execution_time || 0), 0),
  }
})

async function loadSteps(target = 1) {
  if (!props.executionId) return
  loading.value = true
  const result = await businessHandler<{ items?: ChainStep[]; total?: number }>(
    操作日志管理Service.listActionLogsApiV1RpaBrowserControlActionLogsListPost({
      body: {
        execution_id: props.executionId,
        page: target,
        per_page: PAGE_SIZE,
        // 升序 = 写入顺序，前端据此按 depth 还原调用树
        order_desc: false,
      },
      headers: userNavStore.user_header,
    }) as any,
    { successMessage: '', errorMessage: '获取执行链路失败', showSuccessToast: false },
  )
  if (result.success && result.data) {
    steps.value = (result.data.items || []) as ChainStep[]
    total.value = result.data.total || 0
    page.value = target
  } else {
    steps.value = []
    total.value = 0
  }
  loading.value = false
}

watch(
  () => props.modelValue,
  (open) => {
    if (open) loadSteps(1)
  },
)
watch(
  () => props.executionId,
  () => {
    if (props.modelValue) loadSteps(1)
  },
)

const stepStatusText = (step: ChainStep) => {
  if (step.status === 'timeout') return '超时'
  return step.success ? '成功' : '失败'
}

const stepStatusType = (step: ChainStep): 'success' | 'danger' | 'warning' => {
  if (step.status === 'timeout') return 'warning'
  return step.success ? 'success' : 'danger'
}

/** 嵌套深度 → 缩进 class（depth × 16px，映射实现，不写内联 style）。
 *  depth > 10 视为异常值（历史数据曾被误存为 step_index，如 100/102），
 *  按平铺处理，不缩进、不显示层级标签。 */
const depthIndentClass = (depth: number) => {
  if (depth <= 0 || depth > 10) return ''
  if (depth === 1) return 'ml-4'
  if (depth === 2) return 'ml-8'
  return 'ml-12'
}

const depthLabel = (depth: number) => {
  if (depth <= 0 || depth > 10) return ''
  return `第 ${depth} 层`
}

const formatDuration = (ms: number) => {
  if (ms >= 1000) return `${(ms / 1000).toFixed(2)}s`
  return `${Math.round(ms)}ms`
}
</script>

<template>
  <el-dialog
    v-model="visible"
    :title="`执行链路 · ${executionId}`"
    width="720px"
    class="action-log-chain-dialog"
    append-to-body
    :close-on-click-modal="false"
  >
    <div v-loading="loading" class="action-log-chain flex flex-col gap-3">
      <!-- 汇总：总数走接口 total，成败/耗时按当前页 -->
      <div class="action-log-chain__summary flex items-center gap-4 flex-wrap text-sm">
        <span class="action-log-chain__summary-total">共 {{ total }} 步</span>
        <span class="action-log-chain__summary-success text-success">
          本页成功 {{ summary.success }}
        </span>
        <span
          class="action-log-chain__summary-failed"
          :class="summary.failed ? 'text-danger' : 'text-text-secondary'"
        >
          本页失败 {{ summary.failed }}
        </span>
        <span class="action-log-chain__summary-duration text-text-secondary">
          本页耗时 {{ formatDuration(summary.duration * 1000) }}
        </span>
      </div>

      <!-- 步骤列表（按写入顺序，depth 缩进） -->
      <div
        v-if="steps.length"
        class="action-log-chain__steps bili-thin-scroll flex max-h-[55vh] flex-col gap-2 overflow-y-auto"
      >
        <div
          v-for="step in steps"
          :key="step.log_id"
          class="action-log-chain__step flex items-start gap-3 rounded-lg p-3 cursor-pointer transition-colors"
          :class="[
            step.success ? 'bg-fill-light hover:bg-fill' : 'bg-danger-light-9 hover:bg-danger-light-8',
            depthIndentClass(step.depth),
          ]"
          @click="emit('select', step.log_id)"
        >
          <el-tag class="action-log-chain__step-status" :type="stepStatusType(step)">
            {{ stepStatusText(step) }}
          </el-tag>
          <div class="action-log-chain__step-body flex-1 min-w-0">
            <div class="flex items-center gap-2 flex-wrap">
              <span class="action-log-chain__step-name text-sm font-semibold truncate">
                {{ step.action_name || step.action_id }}
              </span>
              <span class="action-log-chain__step-id text-xs text-text-secondary">
                {{ step.action_id }}
              </span>
              <span class="action-log-chain__step-duration text-xs text-text-secondary">
                {{ formatDuration(step.execution_time * 1000) }}
              </span>
              <span v-if="depthLabel(step.depth)" class="action-log-chain__step-depth text-xs text-text-secondary">
                {{ depthLabel(step.depth) }}
              </span>
            </div>
            <div
              v-if="step.error_message"
              class="action-log-chain__step-error text-xs mt-1 whitespace-pre-wrap break-all"
              :class="step.success ? 'text-warning' : 'text-danger'"
            >
              <span v-if="step.success" class="font-semibold">提示：</span>{{ step.error_message }}
            </div>
          </div>
        </div>
      </div>

      <el-empty
        v-else-if="!loading"
        class="action-log-chain__empty"
        description="该批次暂无步骤日志：未开启「执行日志」开关，或日志已过保留期被清理"
      />

      <!-- 分页器吸底：一次运行几千条日志时只渲染一页 -->
      <BiliPagination
        v-if="total > PAGE_SIZE"
        v-model:current-page="page"
        class="action-log-chain__pagination shrink-0"
        :page-size="PAGE_SIZE"
        :total="total"
        layout="total, prev, pager, next"
        background
        @current-change="loadSteps"
      />
    </div>

    <template #footer>
      <el-button class="action-log-chain-dialog__close" @click="visible = false">
        关闭
      </el-button>
    </template>
  </el-dialog>
</template>
