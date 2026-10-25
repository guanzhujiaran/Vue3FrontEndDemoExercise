<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { ElEmpty } from 'element-plus'
import { 自定义操作管理Service } from '@/api/browser/hey-api'
import { businessHandler } from '@/utils/businessHandler'
import { stepsToFlow, type ActionFlowGraph } from '@/utils/rpa/actionFlow'
import ActionIcon from '@/components/rpa-browser/ActionIcon.vue'
import ActionFlowView from '@/components/rpa-browser/ActionFlowView.vue'
import { resolveActionTypeIcon } from '@/utils/rpa/actionTypeIcon'
import { varTypeLabel } from '@/utils/workflowVarFields'
import type { InputVarDefinition } from '@/api/browser/hey-api'

/**
 * 动作详情弹窗
 *
 * 按 `action_id` 拉取动作详情，展示元信息 + **只读结构流程图**（见 ActionFlowView）。
 */

interface ActionDetail {
  action_id: number | string
  name: string
  version?: string
  action_type?: string
  description?: string
  icon_series?: number
  icon_id?: number
  steps: Record<string, unknown>[]
  tags?: string[]
  input_vars?: InputVarDefinition[]
  output_vars?: string[]
  is_enabled?: boolean
  is_public?: boolean
  timeout?: number
  likes_count?: number
  forks_count?: number
  /** Fork 来源主键（非空 = Fork 副本） */
  forked_from_id?: number | null
  /** 上游是否有新版本可同步 */
  has_upstream_update?: boolean
  /** 上游最近更新时间（秒级时间戳） */
  upstream_updated_at?: number | null
  /** 最近一次同步上游的时间（秒级时间戳；null = 从未同步过） */
  last_synced_at?: number | null
  /** 是否开启上游自动同步 */
  auto_sync_upstream?: boolean
  /** 是否有会被同步覆盖的本地修改 */
  local_steps_modified?: boolean
}

/** 秒级时间戳（后端统一口径）转本地时间展示；null/0 视为从未同步 */
const formatTimestamp = (ts: number | null | undefined) => {
  if (!ts) return '从未同步'
  return new Date(ts * 1000).toLocaleString('zh-CN')
}

interface Props {
  modelValue: boolean
  /** 动作雪花 ID（字符串或数字） */
  actionId?: string | number | null
}

const props = defineProps<Props>()
const emit = defineEmits<{ (e: 'update:modelValue', v: boolean): void }>()

const visible = computed({
  get: () => props.modelValue,
  set: (v: boolean) => emit('update:modelValue', v),
})

const loading = ref(false)
const detail = ref<ActionDetail | null>(null)
const flow = ref<ActionFlowGraph>({ nodes: [], edges: [], empty: true })

const stepsCount = computed(() => detail.value?.steps?.length ?? 0)
const fallbackIcon = computed(() => resolveActionTypeIcon(detail.value?.action_type))

const loadDetail = async () => {
  if (props.actionId === null || props.actionId === undefined || props.actionId === '') return
  loading.value = true
  detail.value = null
  flow.value = { nodes: [], edges: [], empty: true }
  const res = await businessHandler<ActionDetail>(
    自定义操作管理Service.getCustomActionApiV1RpaBrowserControlCustomActionsGetPost({
      body: { action_id: props.actionId as unknown as number },
    }) as any,
    { successMessage: '', errorMessage: '获取动作详情失败', showSuccessToast: false }
  )
  if (res.success && res.data) {
    detail.value = res.data
    flow.value = stepsToFlow(res.data.steps)
  }
  loading.value = false
}

watch(
  () => [props.modelValue, props.actionId] as const,
  ([open]) => {
    if (open) loadDetail()
  }
)
</script>

<template>
  <el-dialog
    v-model="visible"
    :title="detail?.name || '动作详情'"
    width="900px"
    top="6vh"
    :lock-scroll="false"
    append-to-body
  >
    <div v-loading="loading" style="min-height: 240px">
      <template v-if="detail">
        <!-- 元信息 -->
        <div class="flex items-start gap-3 mb-4">
          <ActionIcon
            :series="detail.icon_series"
            :id="detail.icon_id"
            class="w-9 h-9 shrink-0 text-text-primary"
          >
            <template #fallback>
              <el-icon class="text-2xl text-text-primary">
                <component :is="fallbackIcon" />
              </el-icon>
            </template>
          </ActionIcon>
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 flex-wrap">
              <span class="text-base font-semibold truncate">{{ detail.name }}</span>
              <el-tag size="small" type="info">{{ detail.action_type }}</el-tag>
              <el-tag v-if="detail.version" size="small" effect="plain">v{{ detail.version }}</el-tag>
              <el-tag size="small" :type="detail.is_public ? 'success' : 'info'">
                {{ detail.is_public ? '公开' : '私有' }}
              </el-tag>
              <el-tag size="small" :type="detail.is_enabled === false ? 'danger' : 'success'" effect="plain">
                {{ detail.is_enabled === false ? '已停用' : '已启用' }}
              </el-tag>
              <!-- 上游有更新徽标（仅 Fork 副本展示） -->
              <el-tag
                v-if="detail.forked_from_id && detail.has_upstream_update"
                type="warning"
                effect="plain"
                class="action-detail__upstream-badge"
              >
                可同步
              </el-tag>
            </div>
            <p class="text-sm text-gray-400 mt-1">{{ detail.description || '暂无描述' }}</p>
            <!-- 上游同步状态（仅 Fork 副本展示） -->
            <p v-if="detail.forked_from_id" class="action-detail__sync-status text-xs text-gray-400 mt-1">
              <template v-if="detail.has_upstream_update">
                上游有更新（{{ formatTimestamp(detail.upstream_updated_at) }}），可在动作管理列表点「同步上游」更新
              </template>
              <template v-else>上游无更新</template>
              ；本地同步于：{{ formatTimestamp(detail.last_synced_at) }}
              <template v-if="detail.local_steps_modified">；有本地修改，同步将覆盖</template>
              <template v-if="detail.auto_sync_upstream">；自动同步已开启</template>
            </p>
          </div>
        </div>

        <div class="flex flex-wrap gap-x-6 gap-y-1 text-xs text-gray-400 mb-4">
          <span>步骤：{{ stepsCount }}</span>
          <span>输入变量：{{ detail.input_vars?.length ?? 0 }}</span>
          <span>输出变量：{{ detail.output_vars?.length ?? 0 }}</span>
          <span v-if="detail.timeout">超时：{{ detail.timeout }}s</span>
          <span>点赞：{{ detail.likes_count ?? 0 }}</span>
          <span>Fork：{{ detail.forks_count ?? 0 }}</span>
        </div>

        <!-- 变量契约：输入变量（名称 / 类型 / 必填 / 说明）+ 输出变量槽位 -->
        <div
          v-if="(detail.input_vars?.length ?? 0) > 0 || (detail.output_vars?.length ?? 0) > 0"
          class="action-detail__vars mb-4 flex flex-col gap-2"
        >
          <div class="text-sm font-medium">变量契约</div>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div class="action-detail__vars-input flex flex-col gap-1">
              <el-text type="info">输入变量（运行前需提供）</el-text>
              <el-text v-if="(detail.input_vars?.length ?? 0) === 0" class="text-color-secondary">
                无
              </el-text>
              <div
                v-for="item in detail.input_vars || []"
                :key="item.name"
                class="action-detail__var-row flex flex-wrap items-center gap-1.5"
              >
                <span class="action-detail__var-name font-mono">{{ item.name }}</span>
                <el-tag effect="plain" type="info">{{ varTypeLabel(item.type || 'string') }}</el-tag>
                <span v-if="item.required" class="text-xs text-danger" title="必填">*</span>
                <el-text v-if="item.description" class="text-color-secondary">
                  {{ item.description }}
                </el-text>
              </div>
            </div>
            <div class="action-detail__vars-output flex flex-col gap-1">
              <el-text type="info">输出变量（步骤可写入的槽位）</el-text>
              <el-text v-if="(detail.output_vars?.length ?? 0) === 0" class="text-color-secondary">
                无
              </el-text>
              <div class="flex flex-wrap items-center gap-1.5">
                <el-tag
                  v-for="name in detail.output_vars || []"
                  :key="name"
                  effect="plain"
                  type="success"
                  class="action-detail__output-var font-mono"
                >
                  {{ name }}
                </el-tag>
              </div>
            </div>
          </div>
        </div>

        <div v-if="detail.tags?.length" class="flex flex-wrap items-center gap-1.5 mb-4">
          <span class="text-xs text-gray-400">标签：</span>
          <el-tag v-for="tag in detail.tags" :key="tag" size="small" effect="plain">{{ tag }}</el-tag>
        </div>

        <!-- 结构流程图 -->
        <div class="mb-2 text-sm font-medium">结构流程图</div>
        <ActionFlowView v-if="!flow.empty" :nodes="flow.nodes" :edges="flow.edges" height="480px" />
        <ElEmpty v-else description="该动作暂无可展示的步骤" :image-size="72" />
      </template>
    </div>

    <template #footer>
      <el-button @click="visible = false">关闭</el-button>
    </template>
  </el-dialog>
</template>
