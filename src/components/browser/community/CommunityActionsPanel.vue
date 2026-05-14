<!--
 * @FilePath: \Vue3FrontEndDemoExercise\src\components\browser\community\CommunityActionsPanel.vue
 * @Description: 社区自定义操作面板 - 浏览和克隆社区分享的自定义操作
-->
<template>
  <div class="flex flex-col h-full overflow-hidden">
    <div class="flex flex-wrap gap-2 mb-4 p-3 rounded-xl border border-[var(--el-border-color-lighter)] bg-[var(--el-fill-color-lighter)]">
      <el-button type="primary" size="small" @click="refreshActions" :loading="loading">
        <el-icon><Refresh /></el-icon>
        刷新
      </el-button>

      <div class="ml-auto flex items-center gap-2 text-xs text-[var(--el-text-color-secondary)]">
        <span>共 {{ actions.length }} 个操作</span>
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

      <el-row v-else-if="actions.length > 0" :gutter="16">
        <el-col
          v-for="action in actions"
          :key="action.id"
          :xs="24"
          :sm="12"
          :md="8"
          :lg="6"
        >
          <el-card
            class="mb-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md"
            shadow="hover"
          >
            <div class="flex justify-between items-center mb-2">
              <div class="flex items-center gap-1.5 flex-wrap">
                <VisibilityBadge :resource="action" />
                <el-tag size="small" :type="action.is_composite ? 'warning' : 'success'" effect="plain">
                  {{ action.is_composite ? '复合' : '单一' }}
                </el-tag>
                <el-tag v-if="action.action_type" size="small" type="info" effect="plain">
                  {{ action.action_type }}
                </el-tag>
              </div>
            </div>

            <h4 class="font-medium text-sm m-0 mb-1 truncate">{{ action.name }}</h4>
            <p class="text-xs text-[var(--el-text-color-secondary)] m-0 mb-2 line-clamp-2">
              {{ action.description || '暂无描述' }}
            </p>

            <div v-if="action.author_name" class="text-[11px] text-[var(--el-text-color-placeholder)] mb-2">
              by {{ action.author_name }}
            </div>

            <div class="flex items-center justify-between pt-2 border-t border-[var(--el-border-color-lighter)]">
              <CommunityBar
                :resource="action"
                resource-type="action"
                :resource-id="action.id"
                :browser-id="undefined"
                @reported="refreshActions"
              />
              <div class="flex gap-1">
                <el-button size="small" text type="primary" @click="viewDetail(action)">
                  查看
                </el-button>
                <el-button size="small" type="primary" @click="cloneAction(action)" :loading="cloningId === action.id">
                  克隆
                </el-button>
              </div>
            </div>
          </el-card>
        </el-col>
      </el-row>

      <div v-else class="flex flex-col items-center justify-center py-16 text-[var(--el-text-color-placeholder)]">
        <el-icon :size="48"><SetUp /></el-icon>
        <p class="mt-4 text-sm">暂无社区自定义操作</p>
      </div>
    </div>

    <el-dialog v-model="showDetailDialog" title="操作详情" width="700px" destroy-on-close>
      <div v-if="selectedAction">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="名称">{{ selectedAction.name }}</el-descriptions-item>
          <el-descriptions-item label="类型">
            <el-tag size="small" :type="selectedAction.is_composite ? 'warning' : 'success'" effect="plain">
              {{ selectedAction.is_composite ? '复合' : '单一' }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="描述" :span="2">{{ selectedAction.description || '暂无' }}</el-descriptions-item>
          <el-descriptions-item label="标签" :span="2">
            <el-tag v-for="tag in selectedAction.tags" :key="tag" size="small" class="mr-1">{{ tag }}</el-tag>
            <span v-if="!selectedAction.tags?.length">暂无</span>
          </el-descriptions-item>
        </el-descriptions>

        <div v-if="selectedAction.steps?.length" class="mt-4">
          <div class="text-sm font-medium mb-2">步骤预览</div>
          <el-timeline>
            <el-timeline-item
              v-for="(step, index) in selectedAction.steps"
              :key="index"
              :timestamp="`步骤 ${index + 1}`"
              placement="top"
            >
              <el-card shadow="never">
                <div class="text-xs">
                  <span class="font-medium">{{ step.action_id }}</span>
                  <span class="text-[var(--el-text-color-secondary)] ml-2">
                    {{ JSON.stringify(step.params).substring(0, 50) }}...
                  </span>
                </div>
              </el-card>
            </el-timeline-item>
          </el-timeline>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Refresh, SetUp } from '@element-plus/icons-vue'
import customActionsApi from '@/api/browser/custom_actions_api'
import CommunityFilterBar from './CommunityFilterBar.vue'
import CommunityBar from './CommunityBar.vue'
import VisibilityBadge from './VisibilityBadge.vue'
import type { CustomActionListItem, CommunityFilter, CommunitySortBy, CommunitySortOrder } from '@/types/browser-automation-api'
import { ElMessage } from 'element-plus'

const loading = ref(false)
const actions = ref<CustomActionListItem[]>([])
const cloningId = ref<number | null>(null)
const showDetailDialog = ref(false)
const selectedAction = ref<CustomActionListItem | null>(null)

const filter = ref<CommunityFilter>('all')
const sort = ref<CommunitySortBy>('updated_at')
const sortOrder = ref<CommunitySortOrder>('desc')

const handleFilterChange = (f: CommunityFilter, s: CommunitySortBy, o: CommunitySortOrder) => {
  filter.value = f
  sort.value = s
  sortOrder.value = o
  refreshActions()
}

const refreshActions = async () => {
  loading.value = true
  try {
    const res = await customActionsApi.listCustomActions({
      filter_type: filter.value,
      sort_by: sort.value,
      sort_order: sortOrder.value
    })
    if (res.code === 0 && res.data) {
      actions.value = res.data
    }
  } catch (e: any) {
    ElMessage.error(e.message || '获取自定义操作列表失败')
  } finally {
    loading.value = false
  }
}

const viewDetail = async (action: CustomActionListItem) => {
  try {
    const res = await customActionsApi.getCustomAction(action.id)
    if (res.code === 0 && res.data) {
      selectedAction.value = { ...action, ...res.data }
      showDetailDialog.value = true
    }
  } catch (e: any) {
    ElMessage.error(e.message || '获取详情失败')
  }
}

const cloneAction = async (action: CustomActionListItem) => {
  cloningId.value = action.id
  try {
    const res = await customActionsApi.cloneAction(action.id)
    if (res.code === 0) {
      ElMessage.success(`已克隆 "${action.name}" 到您的自定义操作`)
      refreshActions()
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
  refreshActions()
})
</script>