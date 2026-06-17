<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Search, Folder, Tools, Lock } from '@element-plus/icons-vue'
import { ElInput, ElTabs, ElTabPane, ElEmpty, ElButton } from 'element-plus'
import { listCustomActionsApiV1RpaBrowserControlCustomActionsListPost, listPluginsApiV1RpaBrowserControlPluginsListPost, listWorkflowsApiV1RpaBrowserControlWorkflowsListPost, listCommunityActionsApiV1RpaBrowserControlCommunityActionsListPost, listCommunityPluginsApiV1RpaBrowserControlCommunityPluginsListPost, listCommunityWorkflowsApiV1RpaBrowserControlCommunityWorkflowsListPost } from '@/api/browser/hey-api'
import { useUserNavStore } from '@/stores/user_nav'
import biliMessage from '@/utils/message'
import type { FilterType, SortBy, SortOrder } from '@/api/browser/hey-api/types.gen'

interface Props {
  browserId: string
  isSessionConnected: boolean
}

const props = defineProps<Props>()

const userNavStore = useUserNavStore()

const activeTab = ref('private')
const searchQuery = ref('')
const privateActions = ref<any[]>([])
const publicActions = ref<any[]>([])
const privatePlugins = ref<any[]>([])
const publicPlugins = ref<any[]>([])
const privateWorkflows = ref<any[]>([])
const publicWorkflows = ref<any[]>([])
const loading = ref(false)

const loadPrivateActions = async () => {
  try {
    const response = await listCustomActionsApiV1RpaBrowserControlCustomActionsListPost({
      body: {
        page: 1,
        per_page: 20,
        filter_type: 'private' as FilterType,
        sort_by: 'updated_at' as SortBy,
        sort_order: 'desc' as SortOrder
      },
      headers: {
        'x-bili-mid': userNavStore.user_nav.uid,
        'x-bili-level': String(userNavStore.user_nav.level_info.current_level)
      }
    })

    if (response.data?.code === 0 && response.data?.data) {
      const data = response.data.data as any
      privateActions.value = data.items || []
    }
  } catch (error) {
    console.error('Failed to load private actions')
  }
}

const loadPublicActions = async () => {
  try {
    const response = await listCommunityActionsApiV1RpaBrowserControlCommunityActionsListPost({
      body: {
        page: 1,
        per_page: 20,
        filter_type: 'public' as FilterType,
        sort_by: 'updated_at' as SortBy,
        sort_order: 'desc' as SortOrder
      },
      headers: {
        'x-bili-mid': userNavStore.user_nav.uid,
        'x-bili-level': String(userNavStore.user_nav.level_info.current_level)
      }
    })

    if (response.data?.code === 0 && response.data?.data) {
      const data = response.data.data as any
      publicActions.value = data.items || []
    }
  } catch (error) {
    console.error('Failed to load public actions')
  }
}

const loadPlugins = async () => {
  try {
    const privateResponse = await listPluginsApiV1RpaBrowserControlPluginsListPost({
      body: {
        page: 1,
        per_page: 20,
        filter_type: 'private' as FilterType
      },
      headers: {
        'x-bili-mid': userNavStore.user_nav.uid,
        'x-bili-level': String(userNavStore.user_nav.level_info.current_level)
      }
    })

    if (privateResponse.data?.code === 0 && privateResponse.data?.data) {
      const data = privateResponse.data.data as any
      privatePlugins.value = data.items || []
    }

    const publicResponse = await listCommunityPluginsApiV1RpaBrowserControlCommunityPluginsListPost({
      body: {
        page: 1,
        per_page: 20,
        filter_type: 'public' as FilterType
      },
      headers: {
        'x-bili-mid': userNavStore.user_nav.uid,
        'x-bili-level': String(userNavStore.user_nav.level_info.current_level)
      }
    })

    if (publicResponse.data?.code === 0 && publicResponse.data?.data) {
      const data = publicResponse.data as any
      publicPlugins.value = data.items || []
    }
  } catch (error) {
    console.error('Failed to load plugins')
  }
}

const loadWorkflows = async () => {
  try {
    const privateResponse = await listWorkflowsApiV1RpaBrowserControlWorkflowsListPost({
      body: {
        page: 1,
        per_page: 20,
        filter_type: 'private' as FilterType
      },
      headers: {
        'x-bili-mid': userNavStore.user_nav.uid,
        'x-bili-level': String(userNavStore.user_nav.level_info.current_level)
      }
    })

    if (privateResponse.data?.code === 0 && privateResponse.data?.data) {
      const data = privateResponse.data.data as any
      privateWorkflows.value = data.items || []
    }

    const publicResponse = await listCommunityWorkflowsApiV1RpaBrowserControlCommunityWorkflowsListPost({
      body: {
        page: 1,
        per_page: 20,
        filter_type: 'public' as FilterType
      },
      headers: {
        'x-bili-mid': userNavStore.user_nav.uid,
        'x-bili-level': String(userNavStore.user_nav.level_info.current_level)
      }
    })

    if (publicResponse.data?.code === 0 && publicResponse.data?.data) {
      const data = publicResponse.data.data as any
      publicWorkflows.value = data.items || []
    }
  } catch (error) {
    console.error('Failed to load workflows')
  }
}

const loadAllData = async () => {
  loading.value = true
  await Promise.all([
    loadPrivateActions(),
    loadPublicActions(),
    loadPlugins(),
    loadWorkflows()
  ])
  loading.value = false
}

const handleDragStart = (event: DragEvent, item: any, type: string) => {
  if (event.dataTransfer) {
    event.dataTransfer.setData('application/json', JSON.stringify({ ...item, type }))
    event.dataTransfer.effectAllowed = 'copy'
  }
}

onMounted(() => {
  loadAllData()
})
</script>

<template>
  <div class="h-full flex flex-col bg-[var(--el-bg-color)]">
    <div class="p-4 border-b border-[var(--el-border-color)]">
      <el-input v-model="searchQuery" placeholder="搜索插件/动作/工作流" :prefix-icon="Search" clearable />
    </div>

    <el-tabs v-model="activeTab" class="flex-1 overflow-hidden flex flex-col">
      <el-tab-pane label="私有" name="private">
        <template #label>
          <div class="flex items-center gap-1">
            <el-icon><Lock /></el-icon>
            <span>私有</span>
          </div>
        </template>

        <div class="flex-1 overflow-auto p-4">
          <div class="mb-6">
            <h4 class="text-sm font-semibold mb-2 flex items-center gap-1">
              <el-icon><Folder /></el-icon>
              自定义动作
            </h4>
            <div class="space-y-2">
              <div v-for="action in privateActions" :key="action.id" class="p-2 rounded border border-[var(--el-border-color)] hover:border-[var(--el-color-primary)] cursor-pointer" draggable="true" @dragstart="handleDragStart($event, action, 'action')">
                <div class="font-medium text-sm">{{ action.name }}</div>
                <div class="text-xs text-[var(--el-text-color-secondary)]">{{ action.description || '无描述' }}</div>
              </div>
              <el-empty v-if="privateActions.length === 0" description="暂无私有动作" :image-size="60" />
            </div>
          </div>

          <div class="mb-6">
            <h4 class="text-sm font-semibold mb-2 flex items-center gap-1">
              <el-icon><Tools /></el-icon>
              插件
            </h4>
            <div class="space-y-2">
              <div v-for="plugin in privatePlugins" :key="plugin.id" class="p-2 rounded border border-[var(--el-border-color)] hover:border-[var(--el-color-primary)] cursor-pointer" draggable="true" @dragstart="handleDragStart($event, plugin, 'plugin')">
                <div class="font-medium text-sm">{{ plugin.name }}</div>
                <div class="text-xs text-[var(--el-text-color-secondary)]">{{ plugin.description || '无描述' }}</div>
              </div>
              <el-empty v-if="privatePlugins.length === 0" description="暂无私有插件" :image-size="60" />
            </div>
          </div>

          <div>
            <h4 class="text-sm font-semibold mb-2 flex items-center gap-1">
              <el-icon><Folder /></el-icon>
              工作流
            </h4>
            <div class="space-y-2">
              <div v-for="workflow in privateWorkflows" :key="workflow.id" class="p-2 rounded border border-[var(--el-border-color)] hover:border-[var(--el-color-primary)] cursor-pointer" draggable="true" @dragstart="handleDragStart($event, workflow, 'workflow')">
                <div class="font-medium text-sm">{{ workflow.name }}</div>
                <div class="text-xs text-[var(--el-text-color-secondary)]">{{ workflow.description || '无描述' }}</div>
              </div>
              <el-empty v-if="privateWorkflows.length === 0" description="暂无私有工作流" :image-size="60" />
            </div>
          </div>
        </div>
      </el-tab-pane>

      <el-tab-pane label="公开" name="public">
        <template #label>
          <div class="flex items-center gap-1">
            <el-icon><Folder /></el-icon>
            <span>公开</span>
          </div>
        </template>

        <div class="flex-1 overflow-auto p-4">
          <div class="mb-6">
            <h4 class="text-sm font-semibold mb-2 flex items-center gap-1">
              <el-icon><Folder /></el-icon>
              自定义动作
            </h4>
            <div class="space-y-2">
              <div v-for="action in publicActions" :key="action.id" class="p-2 rounded border border-[var(--el-border-color)] hover:border-[var(--el-color-primary)] cursor-pointer" draggable="true" @dragstart="handleDragStart($event, action, 'action')">
                <div class="font-medium text-sm">{{ action.name }}</div>
                <div class="text-xs text-[var(--el-text-color-secondary)]">{{ action.description || '无描述' }}</div>
              </div>
              <el-empty v-if="publicActions.length === 0" description="暂无公开动作" :image-size="60" />
            </div>
          </div>

          <div class="mb-6">
            <h4 class="text-sm font-semibold mb-2 flex items-center gap-1">
              <el-icon><Tools /></el-icon>
              插件
            </h4>
            <div class="space-y-2">
              <div v-for="plugin in publicPlugins" :key="plugin.id" class="p-2 rounded border border-[var(--el-border-color)] hover:border-[var(--el-color-primary)] cursor-pointer" draggable="true" @dragstart="handleDragStart($event, plugin, 'plugin')">
                <div class="font-medium text-sm">{{ plugin.name }}</div>
                <div class="text-xs text-[var(--el-text-color-secondary)]">{{ plugin.description || '无描述' }}</div>
              </div>
              <el-empty v-if="publicPlugins.length === 0" description="暂无公开插件" :image-size="60" />
            </div>
          </div>

          <div>
            <h4 class="text-sm font-semibold mb-2 flex items-center gap-1">
              <el-icon><Folder /></el-icon>
              工作流
            </h4>
            <div class="space-y-2">
              <div v-for="workflow in publicWorkflows" :key="workflow.id" class="p-2 rounded border border-[var(--el-border-color)] hover:border-[var(--el-color-primary)] cursor-pointer" draggable="true" @dragstart="handleDragStart($event, workflow, 'workflow')">
                <div class="font-medium text-sm">{{ workflow.name }}</div>
                <div class="text-xs text-[var(--el-text-color-secondary)]">{{ workflow.description || '无描述' }}</div>
              </div>
              <el-empty v-if="publicWorkflows.length === 0" description="暂无公开工作流" :image-size="60" />
            </div>
          </div>
        </div>
      </el-tab-pane>

      <el-tab-pane label="工具" name="tools">
        <template #label>
          <div class="flex items-center gap-1">
            <el-icon><Tools /></el-icon>
            <span>工具</span>
          </div>
        </template>

        <div class="flex-1 overflow-auto p-4">
          <el-empty description="工具功能开发中" />
        </div>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>
