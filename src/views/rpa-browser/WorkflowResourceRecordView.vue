<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import FlexContainer from '@/components/CommonCompo/Bili-Container-Compo/FlexContainer.vue'
import BiliPageHeader from '@/components/CommonCompo/Bili-Container-Compo/BiliPageHeader.vue'
import WorkflowResourceRecordTable from '@/components/rpa-browser/WorkflowResourceRecordTable.vue'
import ResourceLinkTemplateDialog from '@/components/rpa-browser/ResourceLinkTemplateDialog.vue'
import { 工作流管理Service } from '@/api/browser/hey-api'
import { businessHandler } from '@/utils/businessHandler'
import { useUserNavStore } from '@/stores/user_nav'
import { useResourceLinkTemplate } from '@/composables/useResourceLinkTemplate'

/**
 * 已处理数据页（去重数据源 WorkflowResourceRecord）。
 *
 * 支持从工作流卡片带 `?workflow_id=` 直接进入；也可在本页切换工作流。
 * 可为本工作流配置「前端跳转链接格式」（本地存储），表格里按业务主键直接打开对应页面。
 */
interface WorkflowOption {
  id: number
  workflow_id: string
  name: string
}

const route = useRoute()
const router = useRouter()
const userNavStore = useUserNavStore()

const workflowOptions = ref<WorkflowOption[]>([])
const selectedWorkflowId = ref('')
/** URL 带来的执行批次：从「工作流运行记录」点批次号跳进来时只看本轮产出 */
const queryExecutionId = ref('')
const loadingWorkflows = ref(false)

const { getTemplate } = useResourceLinkTemplate()
/** 跳转链接格式配置弹窗 */
const linkTemplateDialogVisible = ref(false)

/** 当前工作流已配置的链接格式（未配置为空串） */
const currentLinkTemplate = computed(() => getTemplate(selectedWorkflowId.value))

/** 当前选中工作流的展示名 */
const selectedWorkflowName = computed(
  () => workflowOptions.value.find(w => w.workflow_id === selectedWorkflowId.value)?.name ?? ''
)

async function loadWorkflows() {
  loadingWorkflows.value = true
  const res = await businessHandler<{ items?: Array<Record<string, unknown>> }>(
    工作流管理Service.listWorkflowsApiV1RpaBrowserControlWorkflowsListPost({
      body: { page: 1, per_page: 100 },
      headers: userNavStore.user_header,
    }) as any,
    { successMessage: '', errorMessage: '获取工作流列表失败', showSuccessToast: false }
  )
  loadingWorkflows.value = false
  if (!res.success || !res.data) return
  workflowOptions.value = (res.data.items || []).map(item => ({
    id: Number(item.id),
    workflow_id: String(item.workflow_id ?? ''),
    name: String(item.name ?? ''),
  }))
  if (!selectedWorkflowId.value && workflowOptions.value.length > 0) {
    selectedWorkflowId.value = workflowOptions.value[0].workflow_id
  }
}

function handleWorkflowChange() {
  // 同步到地址栏，便于刷新/分享后仍定位到同一工作流
  router.replace({
    name: route.name ?? undefined,
    query: { ...route.query, workflow_id: selectedWorkflowId.value },
  })
}

/** 同步地址栏里的 workflow_id / execution_id（刷新、分享、从运行记录跳转都走这里） */
function applyQuery() {
  const fromWorkflow = route.query.workflow_id
  if (typeof fromWorkflow === 'string' && fromWorkflow) selectedWorkflowId.value = fromWorkflow
  const fromExecution = route.query.execution_id
  queryExecutionId.value = typeof fromExecution === 'string' ? fromExecution : ''
}

/** 清除批次筛选：同时抹掉地址栏 query，避免刷新后又回到过滤态 */
function clearExecutionFilter() {
  queryExecutionId.value = ''
  const restQuery = { ...route.query }
  delete restQuery.execution_id
  router.replace({ name: route.name ?? undefined, query: restQuery })
}

onMounted(async () => {
  applyQuery()
  await loadWorkflows()
})

watch(() => route.query.workflow_id, applyQuery)
watch(() => route.query.execution_id, applyQuery)
</script>

<template>
  <FlexContainer class="workflow-resource-record-view">
    <BiliPageHeader title="已处理数据" hide-title description="查看工作流已处理（去重）数据：记录主键、业务主键、处理状态与次数" />

    <div class="workflow-resource-record-view__body flex flex-col gap-3">
      <div class="workflow-resource-record-view__filter flex items-center gap-2 flex-wrap">
        <label class="text-xs text-color-secondary whitespace-nowrap">工作流</label>
        <el-select
          v-model="selectedWorkflowId"
          class="w-80"
          placeholder="选择工作流"
          :loading="loadingWorkflows"
          filterable
          @change="handleWorkflowChange"
        >
          <el-option
            v-for="w in workflowOptions"
            :key="w.workflow_id"
            :label="w.name"
            :value="w.workflow_id"
          />
        </el-select>

        <el-button
          class="workflow-resource-record-view__link-config"
          :disabled="!selectedWorkflowId"
          @click="linkTemplateDialogVisible = true"
        >
          {{ currentLinkTemplate ? '修改跳转链接格式' : '设置跳转链接格式' }}
        </el-button>
        <el-text
          v-if="currentLinkTemplate"
          class="workflow-resource-record-view__link-template max-w-[420px] text-color-secondary"
          truncated
          :title="currentLinkTemplate"
        >
          {{ currentLinkTemplate }}
        </el-text>
      </div>

      <!-- 批次过滤条：从运行记录/操作日志带 execution_id 跳进来时显示 -->
      <div
        v-if="queryExecutionId"
        class="workflow-resource-record-view__batch-bar flex items-center gap-2 rounded-lg bg-primary-light-9 px-3 py-1.5 text-xs"
      >
        <span class="text-color-secondary">执行批次</span>
        <span class="workflow-resource-record-view__batch-value font-mono text-primary" :title="queryExecutionId">
          {{ queryExecutionId }}
        </span>
        <el-button text type="primary" class="workflow-resource-record-view__batch-clear" @click="clearExecutionFilter">
          清除批次筛选
        </el-button>
      </div>

      <WorkflowResourceRecordTable
        v-if="selectedWorkflowId"
        :workflow-id="selectedWorkflowId"
        :execution-id="queryExecutionId"
      />
      <el-empty v-else description="请选择工作流" />
    </div>

    <ResourceLinkTemplateDialog
      v-model="linkTemplateDialogVisible"
      :workflow-id="selectedWorkflowId"
      :workflow-name="selectedWorkflowName"
    />
  </FlexContainer>
</template>
