<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Star, Warning, Goods } from '@element-plus/icons-vue'
import { ElMessageBox } from 'element-plus'
import BiliPageHeader from '@/components/CommonCompo/Bili-Container-Compo/BiliPageHeader.vue'
import FlexContainer from '@/components/CommonCompo/Bili-Container-Compo/FlexContainer.vue'
import CenteredContainer from '@/components/CommonCompo/Bili-Container-Compo/CenteredContainer.vue'
import { listCommunityActionsApiV1RpaBrowserControlCommunityActionsListPost, listCommunityPluginsApiV1RpaBrowserControlCommunityPluginsListPost, listCommunityWorkflowsApiV1RpaBrowserControlCommunityWorkflowsListPost, likeActionApiV1RpaBrowserControlCommunityActionActionIdLikePost, likePluginApiV1RpaBrowserControlCommunityPluginPluginIdLikePost, likeWorkflowApiV1RpaBrowserControlCommunityWorkflowWorkflowIdLikePost, forkCustomActionApiV1RpaBrowserControlCustomActionsForkPost, forkPluginApiV1RpaBrowserControlPluginsForkPost, forkWorkflowApiV1RpaBrowserControlWorkflowsForkPost } from '@/api/browser/hey-api'
import { useUserNavStore } from '@/stores/user_nav'
import biliMessage from '@/utils/message'
import type { FilterType, SortBy, SortOrder } from '@/api/browser/hey-api/types.gen'

type TabType = 'actions' | 'plugins' | 'workflows'

const userNavStore = useUserNavStore()

const activeTab = ref<TabType>('actions')
const currentPage = ref(1)
const pageSize = ref(20)
const total = ref(0)
const loading = ref(false)

const actionsList = ref<unknown[]>([])
const pluginsList = ref<unknown[]>([])
const workflowsList = ref<unknown[]>([])

const sortBy = ref<SortBy>('updated_at')
const sortOrder = ref<SortOrder>('desc')
const filterType = ref<FilterType>('community')

const sortOptions = [
  { label: '更新时间', value: 'updated_at' },
  { label: '点赞数', value: 'likes_count' },
  { label: 'Fork数', value: 'forks_count' },
  { label: '创建时间', value: 'created_at' },
  { label: '名称', value: 'name' }
]

const loadActionsList = async () => {
  loading.value = true
  try {
    const response = await listCommunityActionsApiV1RpaBrowserControlCommunityActionsListPost({
      body: {
        page: currentPage.value,
        per_page: pageSize.value,
        filter_type: filterType.value,
        sort_by: sortBy.value,
        sort_order: sortOrder.value
      },
      headers: {
        'x-bili-mid': userNavStore.user_nav.uid,
        'x-bili-level': userNavStore.user_nav.level_info.current_level
      }
    })

    if (response.data?.code === 0 && response.data?.data) {
      const data = response.data.data as { items?: unknown[]; total?: number }
      actionsList.value = data.items || []
      total.value = data.total || 0
    }
  } catch (error) {
    biliMessage.error('获取动作列表失败')
  } finally {
    loading.value = false
  }
}

const loadPluginsList = async () => {
  loading.value = true
  try {
    const response = await listCommunityPluginsApiV1RpaBrowserControlCommunityPluginsListPost({
      body: {
        page: currentPage.value,
        per_page: pageSize.value,
        filter_type: filterType.value,
        sort_by: sortBy.value,
        sort_order: sortOrder.value
      },
      headers: {
        'x-bili-mid': userNavStore.user_nav.uid,
        'x-bili-level': userNavStore.user_nav.level_info.current_level
      }
    })

    if (response.data?.code === 0 && response.data?.data) {
      const data = response.data.data as { items?: unknown[]; total?: number }
      pluginsList.value = data.items || []
      total.value = data.total || 0
    }
  } catch (error) {
    biliMessage.error('获取插件列表失败')
  } finally {
    loading.value = false
  }
}

const loadWorkflowsList = async () => {
  loading.value = true
  try {
    const response = await listCommunityWorkflowsApiV1RpaBrowserControlCommunityWorkflowsListPost({
      body: {
        page: currentPage.value,
        per_page: pageSize.value,
        filter_type: filterType.value,
        sort_by: sortBy.value,
        sort_order: sortOrder.value
      },
      headers: {
        'x-bili-mid': userNavStore.user_nav.uid,
        'x-bili-level': userNavStore.user_nav.level_info.current_level
      }
    })

    if (response.data?.code === 0 && response.data?.data) {
      const data = response.data.data as { items?: unknown[]; total?: number }
      workflowsList.value = data.items || []
      total.value = data.total || 0
    }
  } catch (error) {
    biliMessage.error('获取工作流列表失败')
  } finally {
    loading.value = false
  }
}

const loadData = async () => {
  switch (activeTab.value) {
    case 'actions':
      await loadActionsList()
      break
    case 'plugins':
      await loadPluginsList()
      break
    case 'workflows':
      await loadWorkflowsList()
      break
  }
}

const handleLikeAction = async (actionId: number) => {
  try {
    const response = await likeActionApiV1RpaBrowserControlCommunityActionActionIdLikePost({
      path: { action_id: actionId },
      headers: {
        'x-bili-mid': userNavStore.user_nav.uid,
        'x-bili-level': userNavStore.user_nav.level_info.current_level
      }
    })

    if (response.data?.code === 0) {
      biliMessage.success('点赞成功')
      loadData()
    } else {
      biliMessage.error(response.data?.msg || '点赞失败')
    }
  } catch (error) {
    biliMessage.error('点赞失败')
  }
}

const handleLikePlugin = async (pluginId: number) => {
  try {
    const response = await likePluginApiV1RpaBrowserControlCommunityPluginPluginIdLikePost({
      path: { plugin_id: pluginId },
      headers: {
        'x-bili-mid': userNavStore.user_nav.uid,
        'x-bili-level': userNavStore.user_nav.level_info.current_level
      }
    })

    if (response.data?.code === 0) {
      biliMessage.success('点赞成功')
      loadData()
    } else {
      biliMessage.error(response.data?.msg || '点赞失败')
    }
  } catch (error) {
    biliMessage.error('点赞失败')
  }
}

const handleLikeWorkflow = async (workflowId: number) => {
  try {
    const response = await likeWorkflowApiV1RpaBrowserControlCommunityWorkflowWorkflowIdLikePost({
      path: { workflow_id: workflowId },
      headers: {
        'x-bili-mid': userNavStore.user_nav.uid,
        'x-bili-level': userNavStore.user_nav.level_info.current_level
      }
    })

    if (response.data?.code === 0) {
      biliMessage.success('点赞成功')
      loadData()
    } else {
      biliMessage.error(response.data?.msg || '点赞失败')
    }
  } catch (error) {
    biliMessage.error('点赞失败')
  }
}

const handleForkAction = async (actionId: number) => {
  try {
    await ElMessageBox.confirm('确定要Fork这个动作吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'info'
    })

    const response = await forkCustomActionApiV1RpaBrowserControlCustomActionsForkPost({
      body: { id: actionId },
      headers: {
        'x-bili-mid': userNavStore.user_nav.uid,
        'x-bili-level': userNavStore.user_nav.level_info.current_level
      }
    })

    if (response.data?.code === 0) {
      biliMessage.success('Fork成功')
      loadData()
    } else {
      biliMessage.error(response.data?.msg || 'Fork失败')
    }
  } catch (error: unknown) {
    if (error !== 'cancel') {
      biliMessage.error('Fork失败')
    }
  }
}

const handleForkPlugin = async (pluginId: number) => {
  try {
    await ElMessageBox.confirm('确定要Fork这个插件吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'info'
    })

    const response = await forkPluginApiV1RpaBrowserControlPluginsForkPost({
      body: { id: pluginId },
      headers: {
        'x-bili-mid': userNavStore.user_nav.uid,
        'x-bili-level': userNavStore.user_nav.level_info.current_level
      }
    })

    if (response.data?.code === 0) {
      biliMessage.success('Fork成功')
      loadData()
    } else {
      biliMessage.error(response.data?.msg || 'Fork失败')
    }
  } catch (error: unknown) {
    if (error !== 'cancel') {
      biliMessage.error('Fork失败')
    }
  }
}

const handleForkWorkflow = async (workflowId: number) => {
  try {
    await ElMessageBox.confirm('确定要Fork这个工作流吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'info'
    })

    const response = await forkWorkflowApiV1RpaBrowserControlWorkflowsForkPost({
      body: { id: workflowId },
      headers: {
        'x-bili-mid': userNavStore.user_nav.uid,
        'x-bili-level': userNavStore.user_nav.level_info.current_level
      }
    })

    if (response.data?.code === 0) {
      biliMessage.success('Fork成功')
      loadData()
    } else {
      biliMessage.error(response.data?.msg || 'Fork失败')
    }
  } catch (error: unknown) {
    if (error !== 'cancel') {
      biliMessage.error('Fork失败')
    }
  }
}

const handleReport = async (item: unknown, type: string) => {
  try {
    await ElMessageBox.prompt('请输入举报原因', '举报', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    biliMessage.info('举报功能开发中')
  } catch (error) {
  }
}

const handlePageChange = (page: number) => {
  currentPage.value = page
  loadData()
}

const handleSortChange = () => {
  currentPage.value = 1
  loadData()
}

const handleTabChange = () => {
  currentPage.value = 1
  total.value = 0
  loadData()
}

onMounted(() => {
  loadData()
})
</script>

<template>
  <FlexContainer>
    <BiliPageHeader title="社区广场" description="发现和分享自定义动作、插件和工作流">
    </BiliPageHeader>

    <div class="mt-4 flex items-center gap-4 flex-wrap">
      <el-radio-group v-model="activeTab" @change="handleTabChange">
        <el-radio-button value="actions">自定义动作</el-radio-button>
        <el-radio-button value="plugins">插件</el-radio-button>
        <el-radio-button value="workflows">工作流</el-radio-button>
      </el-radio-group>

      <el-select v-model="sortBy" class="w-32" @change="handleSortChange">
        <el-option v-for="option in sortOptions" :key="option.value" :label="option.label" :value="option.value" />
      </el-select>

      <el-radio-group v-model="sortOrder" @change="handleSortChange">
        <el-radio-button value="desc">降序</el-radio-button>
        <el-radio-button value="asc">升序</el-radio-button>
      </el-radio-group>
    </div>

    <FlexContainer class="mt-4">
      <div v-if="loading" class="w-full">
        <div class="grid gap-4" style="grid-template-columns: repeat(auto-fill, minmax(350px, 1fr))">
          <div v-for="i in 6" :key="i" class="rounded-xl  p-5 border border-[var(--el-border-color-light)]">
            <el-skeleton :rows="4" animated></el-skeleton>
          </div>
        </div>
      </div>

      <div v-else-if="activeTab === 'actions' && actionsList.length > 0" class="w-full">
        <div class="grid gap-4" style="grid-template-columns: repeat(auto-fill, minmax(350px, 1fr))">
          <div v-for="item in actionsList" :key="item.id"
            class="rounded-xl  p-5 border border-[var(--el-border-color-light)] hover:border-[var(--el-color-primary)] transition-all duration-300">
            <div class="flex flex-col gap-3">
              <div class="flex items-center justify-between">
                <el-text class="text-lg font-semibold truncate flex-1 mr-2">{{ item.name }}</el-text>
                <el-tag size="small" type="info">{{ item.action_type || 'custom' }}</el-tag>
              </div>

              <el-text class="text-sm text-text-secondary line-clamp-2">
                {{ item.description || '无描述' }}
              </el-text>

              <div class="flex items-center gap-4 text-sm text-text-secondary">
                <div class="flex items-center gap-1">
                  <el-icon><Star /></el-icon>
                  <span>{{ item.likes_count || 0 }}</span>
                </div>
                <div class="flex items-center gap-1">
                  <el-icon><ForkSpoon /></el-icon>
                  <span>{{ item.forks_count || 0 }}</span>
                </div>
                <div class="flex-1"></div>
                <span class="text-xs">{{ new Date(item.created_at).toLocaleDateString() }}</span>
              </div>

              <div class="flex items-center gap-2 mt-2">
                <el-button size="small" type="primary" @click="handleForkAction(item.id)">Fork</el-button>
                <el-button size="small" @click="handleLikeAction(item.id)">点赞</el-button>
                <el-button size="small" type="warning" @click="handleReport(item, 'action')">举报</el-button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-else-if="activeTab === 'plugins' && pluginsList.length > 0" class="w-full">
        <div class="grid gap-4" style="grid-template-columns: repeat(auto-fill, minmax(350px, 1fr))">
          <div v-for="item in pluginsList" :key="item.id"
            class="rounded-xl  p-5 border border-[var(--el-border-color-light)] hover:border-[var(--el-color-primary)] transition-all duration-300">
            <div class="flex flex-col gap-3">
              <div class="flex items-center justify-between">
                <el-text class="text-lg font-semibold truncate flex-1 mr-2">{{ item.name }}</el-text>
                <el-tag size="small" type="info">{{ item.hook_type || 'plugin' }}</el-tag>
              </div>

              <el-text class="text-sm text-text-secondary line-clamp-2">
                {{ item.description || '无描述' }}
              </el-text>

              <div class="flex items-center gap-4 text-sm text-text-secondary">
                <div class="flex items-center gap-1">
                  <el-icon><Star /></el-icon>
                  <span>{{ item.likes_count || 0 }}</span>
                </div>
                <div class="flex items-center gap-1">
                  <el-icon><Goods /></el-icon>
                  <span>{{ item.forks_count || 0 }}</span>
                </div>
                <div class="flex-1"></div>
                <span class="text-xs">{{ new Date(item.created_at).toLocaleDateString() }}</span>
              </div>

              <div class="flex items-center gap-2 mt-2">
                <el-button size="small" type="primary" @click="handleForkPlugin(item.id)">Fork</el-button>
                <el-button size="small" @click="handleLikePlugin(item.id)">点赞</el-button>
                <el-button size="small" type="warning" @click="handleReport(item, 'plugin')">举报</el-button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-else-if="activeTab === 'workflows' && workflowsList.length > 0" class="w-full">
        <div class="grid gap-4" style="grid-template-columns: repeat(auto-fill, minmax(350px, 1fr))">
          <div v-for="item in workflowsList" :key="item.id"
            class="rounded-xl  p-5 border border-[var(--el-border-color-light)] hover:border-[var(--el-color-primary)] transition-all duration-300">
            <div class="flex flex-col gap-3">
              <div class="flex items-center justify-between">
                <el-text class="text-lg font-semibold truncate flex-1 mr-2">{{ item.name }}</el-text>
                <el-tag size="small" type="info">工作流</el-tag>
              </div>

              <el-text class="text-sm text-text-secondary line-clamp-2">
                {{ item.description || '无描述' }}
              </el-text>

              <div class="flex items-center gap-4 text-sm text-text-secondary">
                <div class="flex items-center gap-1">
                  <el-icon><Star /></el-icon>
                  <span>{{ item.likes_count || 0 }}</span>
                </div>
                <div class="flex items-center gap-1">
                  <el-icon><Goods /></el-icon>
                  <span>{{ item.forks_count || 0 }}</span>
                </div>
                <div class="flex-1"></div>
                <span class="text-xs">{{ new Date(item.created_at).toLocaleDateString() }}</span>
              </div>

              <div class="flex items-center gap-2 mt-2">
                <el-button size="small" type="primary" @click="handleForkWorkflow(item.id)">Fork</el-button>
                <el-button size="small" @click="handleLikeWorkflow(item.id)">点赞</el-button>
                <el-button size="small" type="warning" @click="handleReport(item, 'workflow')">举报</el-button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <CenteredContainer v-else class="py-20">
        <el-empty description="暂无内容">
          <el-button type="primary">成为第一个分享者</el-button>
        </el-empty>
      </CenteredContainer>

      <div v-if="total > 0" class="mt-6 flex justify-center">
        <el-pagination
          v-model:current-page="currentPage"
          :page-size="pageSize"
          :total="total"
          layout="prev, pager, next, total"
          @current-change="handlePageChange"
        />
      </div>
    </FlexContainer>
  </FlexContainer>
</template>
