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

onMounted(async () => {
  const fromQuery = route.query.workflow_id
  if (typeof fromQuery === 'string' && fromQuery) selectedWorkflowId.value = fromQuery
  await loadWorkflows()
})

watch(
  () => route.query.workflow_id,
  value => {
    if (typeof value === 'string' && value && value !== selectedWorkflowId.value) {
      selectedWorkflowId.value = value
    }
  }
)
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

      <WorkflowResourceRecordTable v-if="selectedWorkflowId" :workflow-id="selectedWorkflowId" />
      <el-empty v-else description="请选择工作流" />
    </div>

    <ResourceLinkTemplateDialog
      v-model="linkTemplateDialogVisible"
      :workflow-id="selectedWorkflowId"
      :workflow-name="selectedWorkflowName"
    />
  </FlexContainer>
</template>
