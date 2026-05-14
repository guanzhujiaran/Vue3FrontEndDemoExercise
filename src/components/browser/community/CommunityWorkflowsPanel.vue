<!--
 * @FilePath: \Vue3FrontEndDemoExercise\src\components\browser\community\CommunityWorkflowsPanel.vue
 * @Description: 社区工作流面板 - 浏览和克隆社区分享的工作流
-->
<template>
  <div class="flex flex-col h-full overflow-hidden">
    <div class="flex flex-wrap gap-2 mb-4 p-3 rounded-xl border border-[var(--el-border-color-lighter)] bg-[var(--el-fill-color-lighter)]">
      <el-button type="primary" size="small" @click="fetchWorkflows" :loading="loading">
        <el-icon><Refresh /></el-icon>
        刷新
      </el-button>

      <div class="ml-auto flex items-center gap-2 text-xs text-[var(--el-text-color-secondary)]">
        <span>共 {{ workflows.length }} 个工作流</span>
      </div>
    </div>

    <CommunityFilterBar
      class="mb-3"
      @change="handleFilterChange"
    />

    <div class="flex-1 overflow-y-auto min-h-0">
      <div v-if="loading" class="flex justify-center py-10">
        <el-skeleton :rows="4" animated />
      </div>

      <div v-else-if="workflows.length === 0" class="flex flex-col items-center justify-center py-16 text-[var(--el-text-color-placeholder)]">
        <el-icon :size="48"><SetUp /></el-icon>
        <p class="mt-4 text-sm">暂无社区工作流</p>
      </div>

      <div v-else class="space-y-3">
        <el-card
          v-for="wf in workflows"
          :key="wf.id"
          class="transition-all duration-200 hover:shadow-sm"
          shadow="hover"
        >
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3 min-w-0">
              <el-icon :size="20" class="text-primary shrink-0"><SetUp /></el-icon>
              <div class="min-w-0">
                <div class="font-medium text-sm flex items-center gap-1.5">
                  <span class="truncate">{{ wf.name }}</span>
                  <VisibilityBadge :resource="wf" />
                </div>
                <div class="text-xs text-[var(--el-text-color-secondary)] mt-0.5">
                  {{ wf.description || '暂无描述' }} · {{ wf.step_count }} 步
                  <span v-if="wf.author_name" class="ml-1">by {{ wf.author_name }}</span>
                </div>
                <div class="flex gap-1 mt-1">
                  <el-tag v-for="tag in (wf.tags || []).slice(0, 2)" :key="tag" size="small" type="info" effect="plain">{{ tag }}</el-tag>
                </div>
              </div>
            </div>

            <div class="flex items-center gap-2 shrink-0">
              <CommunityBar
                :resource="wf"
                resource-type="workflow"
                :resource-id="wf.id"
                :browser-id="undefined"
                @reported="fetchWorkflows"
              />
              <el-button size="small" type="primary" @click="viewDetail(wf)" :loading="viewingId === wf.id">
                查看
              </el-button>
              <el-button size="small" type="primary" @click="cloneWorkflow(wf)" :loading="cloningId === wf.id">
                克隆
              </el-button>
            </div>
          </div>
        </el-card>
      </div>
    </div>

    <el-dialog v-model="showDetailDialog" title="工作流详情" width="800px" destroy-on-close>
      <div v-if="selectedWorkflow">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="名称">{{ selectedWorkflow.name }}</el-descriptions-item>
          <el-descriptions-item label="步骤数">{{ selectedWorkflow.step_count }}</el-descriptions-item>
          <el-descriptions-item label="描述" :span="2">{{ selectedWorkflow.description || '暂无' }}</el-descriptions-item>
          <el-descriptions-item label="标签" :span="2">
            <el-tag v-for="tag in selectedWorkflow.tags" :key="tag" size="small" class="mr-1">{{ tag }}</el-tag>
            <span v-if="!selectedWorkflow.tags?.length">暂无</span>
          </el-descriptions-item>
        </el-descriptions>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Refresh, SetUp } from '@element-plus/icons-vue'
import workflowsApi from '@/api/browser/workflows_api'
import CommunityFilterBar from './CommunityFilterBar.vue'
import CommunityBar from './CommunityBar.vue'
import VisibilityBadge from './VisibilityBadge.vue'
import type { WorkflowListItem, CommunityFilter, CommunitySortBy, CommunitySortOrder } from '@/types/browser-automation-api'
import { ElMessage } from 'element-plus'

const loading = ref(false)
const workflows = ref<WorkflowListItem[]>([])
const cloningId = ref<number | null>(null)
const viewingId = ref<number | null>(null)
const showDetailDialog = ref(false)
const selectedWorkflow = ref<WorkflowListItem | null>(null)

const filter = ref<CommunityFilter>('all')
const sort = ref<CommunitySortBy>('updated_at')
const sortOrder = ref<CommunitySortOrder>('desc')

const handleFilterChange = (f: CommunityFilter, s: CommunitySortBy, o: CommunitySortOrder) => {
  filter.value = f
  sort.value = s
  sortOrder.value = o
  fetchWorkflows()
}

const fetchWorkflows = async () => {
  loading.value = true
  try {
    const res = await workflowsApi.listWorkflows({
      filter_type: filter.value,
      sort_by: sort.value,
      sort_order: sortOrder.value
    })
    if (res.code === 0 && res.data) {
      workflows.value = res.data
    }
  } catch (e: any) {
    ElMessage.error(e.message || '获取工作流列表失败')
  } finally {
    loading.value = false
  }
}

const viewDetail = async (wf: WorkflowListItem) => {
  viewingId.value = wf.id
  try {
    const res = await workflowsApi.getWorkflow({ browser_id: '', workflow_id: wf.id } as any)
    if (res.code === 0 && res.data) {
      selectedWorkflow.value = res.data
      showDetailDialog.value = true
    }
  } catch (e: any) {
    ElMessage.error(e.message || '获取详情失败')
  } finally {
    viewingId.value = null
  }
}

const cloneWorkflow = async (wf: WorkflowListItem) => {
  cloningId.value = wf.id
  try {
    const res = await workflowsApi.duplicateWorkflow({ browser_id: '', workflow_id: wf.id } as any)
    if (res.code === 0) {
      ElMessage.success(`已克隆 "${wf.name}" 到您的工作流`)
      fetchWorkflows()
    } else {
      ElMessage.error(res.msg || '克隆失败')
    }
  } catch (e: any) {
    ElMessage.error(e.message || '克隆失败')
  } finally {
    cloningId.value = null
  }
}

onMounted(() => {
  fetchWorkflows()
})
</script>