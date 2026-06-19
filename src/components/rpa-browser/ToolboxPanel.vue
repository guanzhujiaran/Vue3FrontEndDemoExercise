<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { Search, Folder, Tools, Lock, Refresh, Box, Bell, Edit } from '@element-plus/icons-vue'
import { ElInput, ElTabs, ElTabPane, ElEmpty, ElTreeV2, ElButton, ElPagination, ElMessage } from 'element-plus'
import { listCustomActionsApiV1RpaBrowserControlCustomActionsListPost, listPluginsApiV1RpaBrowserControlPluginsListPost, listRegisteredActionsApiV1RpaBrowserControlActionsRegisteredPost, getCustomActionApiV1RpaBrowserControlCustomActionsGetPost } from '@/api/browser/hey-api'
import type { FilterType, SortBy, SortOrder } from '@/api/browser/hey-api/types.gen'
import { useUserNavStore } from '@/stores/user_nav'

interface Props {
  browserId: string
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'edit-action': [actionDetail: Record<string, unknown>]
}>()

const userNavStore = useUserNavStore()

const activeTab = ref('private')
const searchQuery = ref('')
const loading = ref(false)

// 树展开状态
const expandedKeys = ref<string[]>([])

// 私有数据
const privateActions = ref<unknown[]>([])
const privatePlugins = ref<unknown[]>([])
const privateActionsPage = ref(1)
const privatePluginsPage = ref(1)
const privateActionsTotal = ref(0)
const privatePluginsTotal = ref(0)

// 公开数据
const publicActions = ref<unknown[]>([])
const publicPlugins = ref<unknown[]>([])
const publicActionsPage = ref(1)
const publicPluginsPage = ref(1)
const publicActionsTotal = ref(0)
const publicPluginsTotal = ref(0)

// 基础操作数据
const registeredActions = ref<unknown[]>([])
const registeredActionsPage = ref(1)
const registeredActionsTotal = ref(0)

const perPage = 20

const actionTitleMap: Record<string, string> = {
  click: '点击',
  input: '输入',
  navigation: '导航',
  navigate: '页面导航',
  new_page: '新建页面',
  screenshot: '截图',
  wait: '等待',
  scroll: '滚动',
  hover: '悬停',
  evaluate: '执行JS',
  select: '选择',
  keyboard: '键盘',
  mouse: '鼠标',
  llm: 'LLM',
  loop: '循环',
  if_else: '条件',
  composite: '组合',
  custom: '自定义',
  plugin: '插件'
}

const getActionLabel = (actionId: string, jsonSchema?: Record<string, unknown>) => {
  return actionTitleMap[actionId] || jsonSchema?.title || actionId
}

// 生成树节点
const generateTreeData = (type: string) => {
  let data: unknown[] = []
  let actions: unknown[] = []
  let plugins: unknown[] = []

  if (type === 'private') {
    actions = privateActions.value
    plugins = privatePlugins.value
  } else if (type === 'public') {
    actions = publicActions.value
    plugins = publicPlugins.value
  } else {
    return registeredActions.value
      .filter(action => action.action_id !== 'composite')
      .map(action => ({
      id: `action-${action.action_id}`,
      label: action.name || getActionLabel(action.action_id, action.json_schema),
      children: [],
      type: 'action',
      action_id: action.action_id,
      action_type: action.action_id,
      json_schema: action.json_schema,
      name: action.name || action.json_schema?.title || action.action_id,
      description: action.json_schema?.description
    }))
  }

  const actionNode = {
    id: 'actions',
    label: '自定义动作',
    icon: Folder,
    children: actions.map(action => ({
      id: `action-${action.id}`,
      label: action.name,
      children: [],
      type: 'action',
      // 优先使用 action 本身的 action_id，然后是 action_type，最后才是自定义
      action_id: action.action_id || action.action_type || `custom-${action.id}`,
      action_type: action.action_type || action.action_id || 'custom',
      json_schema: action.json_schema,
      name: action.name,
      description: action.description,
      // 确保原始 action 的所有属性都能被访问
      ...action
    }))
  }

  const pluginNode = {
    id: 'plugins',
    label: '插件',
    icon: Box,
    children: plugins.map(plugin => ({
      id: `plugin-${plugin.id}`,
      label: plugin.name,
      children: [],
      type: 'plugin',
      action_id: plugin.custom_action_id || `plugin-${plugin.id}`,
      action_type: plugin.action_type || plugin.custom_action_id || 'plugin',
      json_schema: plugin.json_schema,
      name: plugin.name,
      description: plugin.description,
      ...plugin
    }))
  }

  if (actions.length > 0) data.push(actionNode)
  if (plugins.length > 0) data.push(pluginNode)

  return data
}

// 每个 Tab 使用独立的 computed，避免共用 filteredTreeData 导致的串数据问题
const privateTreeData = computed(() => applySearchFilter(generateTreeData('private')))
const publicTreeData = computed(() => applySearchFilter(generateTreeData('public')))
const basicTreeData = computed(() => applySearchFilter(generateTreeData('basic')))

const applySearchFilter = (data: unknown[]) => {
  const query = searchQuery.value.toLowerCase()
  if (!query) return data

  const filterNode = (nodes: unknown[]): unknown[] => {
    return nodes
      .map(node => {
        const n = node as Record<string, unknown>
        const hasMatch = String(n.label || '').toLowerCase().includes(query)
        const children = n.children as unknown[] | undefined
        const filteredChildren = children ? filterNode(children) : []
        if (hasMatch || filteredChildren.length > 0) {
          return { ...n, children: filteredChildren }
        }
        return null
      })
      .filter(Boolean)
  }
  return filterNode(data)
}

const loadPrivateActions = async (page: number = 1) => {
  try {
    const response = await listCustomActionsApiV1RpaBrowserControlCustomActionsListPost({
      body: {
        page,
        per_page: perPage,
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
      const data = response.data.data as { items?: unknown[]; total?: number }
      privateActions.value = data.items || []
      privateActionsTotal.value = data.total || 0
      privateActionsPage.value = page
    }
  } catch (error) {
    console.error('Failed to load private actions')
  }
}

const loadPrivatePlugins = async (page: number = 1) => {
  try {
    const response = await listPluginsApiV1RpaBrowserControlPluginsListPost({
      body: {
        page,
        per_page: perPage,
        filter_type: 'private' as FilterType
      },
      headers: {
        'x-bili-mid': userNavStore.user_nav.uid,
        'x-bili-level': String(userNavStore.user_nav.level_info.current_level)
      }
    })

    if (response.data?.code === 0 && response.data?.data) {
      const data = response.data.data as { items?: unknown[]; total?: number }
      privatePlugins.value = data.items || []
      privatePluginsTotal.value = data.total || 0
      privatePluginsPage.value = page
    }
  } catch (error) {
    console.error('Failed to load private plugins')
  }
}

const loadPublicActions = async (page: number = 1) => {
  try {
    const response = await listCustomActionsApiV1RpaBrowserControlCustomActionsListPost({
      body: {
        page,
        per_page: perPage,
        filter_type: 'public' as const,
        sort_by: 'updated_at' as const,
        sort_order: 'desc' as const
      },
      headers: {
        'x-bili-mid': userNavStore.user_nav.uid,
        'x-bili-level': String(userNavStore.user_nav.level_info.current_level)
      }
    })

    if (response.data?.code === 0 && response.data?.data) {
      const data = response.data.data as { items?: unknown[]; total?: number }
      publicActions.value = data.items || []
      publicActionsTotal.value = data.total || 0
      publicActionsPage.value = page
    }
  } catch (error) {
    console.error('Failed to load public actions')
  }
}

const loadPublicPlugins = async (page: number = 1) => {
  try {
    const response = await listPluginsApiV1RpaBrowserControlPluginsListPost({
      body: {
        page,
        per_page: perPage,
        filter_type: 'public' as const
      },
      headers: {
        'x-bili-mid': userNavStore.user_nav.uid,
        'x-bili-level': String(userNavStore.user_nav.level_info.current_level)
      }
    })

    if (response.data?.code === 0 && response.data?.data) {
      const data = response.data.data as { items?: unknown[]; total?: number }
      publicPlugins.value = data.items || []
      publicPluginsTotal.value = data.total || 0
      publicPluginsPage.value = page
    }
  } catch (error) {
    console.error('Failed to load public plugins')
  }
}

const loadRegisteredActions = async () => {
  try {
    const response = await listRegisteredActionsApiV1RpaBrowserControlActionsRegisteredPost({
      headers: {
        'x-bili-mid': userNavStore.user_nav.uid,
        'x-bili-level': String(userNavStore.user_nav.level_info.current_level)
      }
    })

    if (response.data?.code === 0 && response.data?.data) {
      const data = response.data.data as unknown[]
      registeredActions.value = data
      registeredActionsTotal.value = data.length
    }
  } catch (error) {
    console.error('Failed to load registered actions')
  }
}

const loadPrivateData = async () => {
  loading.value = true
  await Promise.all([
    loadPrivateActions(),
    loadPrivatePlugins()
  ])
  loading.value = false
}

const loadPublicData = async () => {
  loading.value = true
  await Promise.all([
    loadPublicActions(),
    loadPublicPlugins()
  ])
  loading.value = false
}

const loadBasicActions = async () => {
  loading.value = true
  await loadRegisteredActions()
  loading.value = false
}

const handleDragStart = (event: DragEvent, nodeData: unknown) => {
  if (event.dataTransfer && nodeData) {
    console.log('拖拽开始，原始数据:', nodeData)
    // el-tree-v2 的 node 对象中，实际数据在 data 属性中
    const actualData = (nodeData as Record<string, unknown>).data || nodeData as Record<string, unknown>
    
    // 只提取必要的数据，避免包含 parent 等循环引用
    const actionData = { ...actualData as Record<string, unknown> }
    // 移除可能导致循环引用的字段
    delete actionData.parent
    delete actionData.children
    delete actionData.expanded
    delete actionData.checked
    delete actionData.indeterminate
    
    console.log('拖拽数据:', actionData)
    const jsonData = JSON.stringify(actionData)
    event.dataTransfer.setData('application/json', jsonData)
    event.dataTransfer.effectAllowed = 'copy'
  }
}

const handleNodeExpand = (node: { id: string }) => {
  if (node.id && !expandedKeys.value.includes(node.id)) {
    expandedKeys.value.push(node.id)
  }
}

const handleNodeCollapse = (node: { id: string }) => {
  const index = expandedKeys.value.indexOf(node.id)
  if (index > -1) {
    expandedKeys.value.splice(index, 1)
  }
}

const handlePrivateActionsPageChange = (page: number) => {
  loadPrivateActions(page)
}

const handlePrivatePluginsPageChange = (page: number) => {
  loadPrivatePlugins(page)
}

const handlePublicActionsPageChange = (page: number) => {
  loadPublicActions(page)
}

const handlePublicPluginsPageChange = (page: number) => {
  loadPublicPlugins(page)
}

const handleRegisteredActionsPageChange = () => {
  loadRegisteredActions()
}

const handleTabChange = () => {
  expandedKeys.value = []
  if (activeTab.value === 'private') {
    loadPrivateData()
  } else if (activeTab.value === 'public') {
    loadPublicData()
  } else {
    loadBasicActions()
  }
}

const handleRefresh = () => {
  handleTabChange()
}

const elTreeV2Props = {
  children: 'children',
  label: 'label'
}

const treeHeight = computed(() => {
  return Math.floor(55 * 16)
})

onMounted(() => {
  loadAllData()
})

const loadAllData = async () => {
  loading.value = true
  await Promise.all([
    loadPrivateActions(),
    loadPrivatePlugins(),
    loadPublicActions(),
    loadPublicPlugins(),
    loadRegisteredActions()
  ])
  loading.value = false
}

// ========== 编辑自定义操作（通过事件传递给父组件） ==========

const handleEditCustomAction = async (nodeData: Record<string, unknown>) => {
  const actionId = nodeData.action_id as string
  if (!actionId) {
    ElMessage.warning('无效的操作标识')
    return
  }
  try {
    const response = await getCustomActionApiV1RpaBrowserControlCustomActionsGetPost({
      body: { id: actionId },
      headers: {
        'x-bili-mid': userNavStore.user_nav.uid,
        'x-bili-level': String(userNavStore.user_nav.level_info.current_level)
      }
    })
    if (response.data?.code === 0 && response.data?.data) {
      const detail = response.data.data as Record<string, unknown>
      emit('edit-action', detail)
    } else {
      ElMessage.error('获取操作详情失败')
    }
  } catch {
    ElMessage.error('获取操作详情失败')
  }
}
</script>

<template>
  <div class="h-full flex flex-col bg-bg" v-loading="loading">
    <!-- 搜索栏 -->
    <div class="p-3 border-b border-border flex items-center gap-2">
      <el-input 
        v-model="searchQuery" 
        placeholder="搜索插件/动作" 
        :prefix-icon="Search" 
        clearable
        size="small"
        class="flex-1"
      />
      <el-button size="small" :icon="Refresh" @click="handleRefresh" />
    </div>

    <!-- 标签页 -->
    <el-tabs v-model="activeTab" class="flex-1 overflow-hidden flex flex-col" @change="handleTabChange">
      <!-- 私有标签 -->
      <el-tab-pane label="私有" name="private">
        <template #label>
          <div class="flex items-center gap-1">
            <el-icon><Lock /></el-icon>
            <span>私有</span>
          </div>
        </template>

        <div class="flex-1 overflow-auto p-3">
          <el-tree-v2
            v-if="privateTreeData.length > 0"
            :data="privateTreeData"
            :props="elTreeV2Props"
            :height="treeHeight"
            :expanded-keys="expandedKeys"
            :expand-on-click-node="true"
            @node-expand="handleNodeExpand"
            @node-collapse="handleNodeCollapse"
            class="tree-drag-drop"
          >
            <template #default="{ node }">
              <div 
                v-if="!node.children || node.children.length === 0"
                class="flex items-center justify-between w-full gap-2"
                :class="{ 'cursor-grab active:cursor-grabbing': true }"
                :draggable="true"
                @dragstart="handleDragStart($event, node)"
              >
                <span class="flex items-center gap-2 min-w-0">
                  <component :is="node.data.type === 'plugin' ? Box : Bell" class="w-4 h-4 shrink-0" />
                  <span class="truncate">{{ node.label }}</span>
                </span>
                <span class="flex items-center gap-1 shrink-0">
                  <el-button
                    v-if="node.data.type === 'action'"
                    size="small"
                    text
                    :icon="Edit"
                    class="p-0.5 h-auto"
                    @click.stop="handleEditCustomAction(node.data as Record<string, unknown>)"
                  />
                  <span class="text-xs text-text-secondary">
                    {{ node.data.type === 'plugin' ? '插件' : '动作' }}
                  </span>
                </span>
              </div>
              <div v-else class="flex items-center gap-2">
                <component :is="node.icon || Folder" class="w-4 h-4" />
                <span>{{ node.label }}</span>
              </div>
            </template>
          </el-tree-v2>
          <el-empty v-else description="暂无匹配内容" :image-size="60" />
        </div>

        <!-- 分页 -->
        <div v-if="!searchQuery && (privateActionsTotal > 0 || privatePluginsTotal > 0)" class="p-3 border-t border-border bg-[var(--el-fill-color-lighter)]">
          <div v-if="privateActionsTotal > 0" class="mb-2">
            <span class="text-xs text-text-secondary">自定义动作</span>
            <el-pagination
              v-model:current-page="privateActionsPage"
              :total="privateActionsTotal"
              :page-size="perPage"
              size="small"
              layout="prev, pager, next"
              @current-change="handlePrivateActionsPageChange"
              class="float-right"
            />
          </div>
          <div v-if="privatePluginsTotal > 0">
            <span class="text-xs text-text-secondary">插件</span>
            <el-pagination
              v-model:current-page="privatePluginsPage"
              :total="privatePluginsTotal"
              :page-size="perPage"
              size="small"
              layout="prev, pager, next"
              @current-change="handlePrivatePluginsPageChange"
              class="float-right"
            />
          </div>
        </div>
      </el-tab-pane>

      <!-- 公开标签 -->
      <el-tab-pane label="公开" name="public">
        <template #label>
          <div class="flex items-center gap-1">
            <el-icon><Folder /></el-icon>
            <span>公开</span>
          </div>
        </template>

        <div class="flex-1 overflow-auto p-3">
          <el-tree-v2
            v-if="publicTreeData.length > 0"
            :data="publicTreeData"
            :props="elTreeV2Props"
            :height="treeHeight"
            :expanded-keys="expandedKeys"
            :expand-on-click-node="true"
            @node-expand="handleNodeExpand"
            @node-collapse="handleNodeCollapse"
            class="tree-drag-drop"
          >
            <template #default="{ node }">
              <div 
                v-if="!node.children || node.children.length === 0"
                class="flex items-center justify-between w-full gap-2"
                :class="{ 'cursor-grab active:cursor-grabbing': true }"
                :draggable="true"
                @dragstart="handleDragStart($event, node)"
              >
                <span class="flex items-center gap-2 min-w-0">
                  <component :is="node.data.type === 'plugin' ? Box : Bell" class="w-4 h-4 shrink-0" />
                  <span class="truncate">{{ node.label }}</span>
                </span>
                <span class="flex items-center gap-1 shrink-0">
                  <el-button
                    v-if="node.data.type === 'action'"
                    size="small"
                    text
                    :icon="Edit"
                    class="!p-0.5 !h-auto"
                    @click.stop="handleEditCustomAction(node.data as Record<string, unknown>)"
                  />
                  <span class="text-xs text-text-secondary">
                    {{ node.data.type === 'plugin' ? '插件' : '动作' }}
                  </span>
                </span>
              </div>
              <div v-else class="flex items-center gap-2">
                <component :is="node.icon || Folder" class="w-4 h-4" />
                <span>{{ node.label }}</span>
              </div>
            </template>
          </el-tree-v2>
          <el-empty v-else description="暂无匹配内容" :image-size="60" />
        </div>

        <!-- 分页 -->
        <div v-if="!searchQuery && (publicActionsTotal > 0 || publicPluginsTotal > 0)" class="p-3 border-t border-border bg-[var(--el-fill-color-lighter)]">
          <div v-if="publicActionsTotal > 0" class="mb-2">
            <span class="text-xs text-text-secondary">自定义动作</span>
            <el-pagination
              v-model:current-page="publicActionsPage"
              :total="publicActionsTotal"
              :page-size="perPage"
              size="small"
              layout="prev, pager, next"
              @current-change="handlePublicActionsPageChange"
              class="float-right"
            />
          </div>
          <div v-if="publicPluginsTotal > 0">
            <span class="text-xs text-text-secondary">插件</span>
            <el-pagination
              v-model:current-page="publicPluginsPage"
              :total="publicPluginsTotal"
              :page-size="perPage"
              size="small"
              layout="prev, pager, next"
              @current-change="handlePublicPluginsPageChange"
              class="float-right"
            />
          </div>
        </div>
      </el-tab-pane>

      <!-- 基础操作标签 -->
      <el-tab-pane label="基础操作" name="basic">
        <template #label>
          <div class="flex items-center gap-1">
            <el-icon><Tools /></el-icon>
            <span>基础操作</span>
          </div>
        </template>

        <div class="flex-1 overflow-auto p-3">
          <el-tree-v2
            v-if="basicTreeData.length > 0"
            :data="basicTreeData"
            :props="elTreeV2Props"
            :height="treeHeight"
            class="tree-drag-drop"
          >
            <template #default="{ node }">
              <div 
                class="flex items-center justify-between w-full cursor-grab active:cursor-grabbing"
                draggable="true"
                @dragstart="handleDragStart($event, node)"
              >
                <span class="flex items-center gap-2">
                  <el-icon><Tools class="w-4 h-4" /></el-icon>
                  <span>{{ node.label }}</span>
                </span>
                <span class="text-xs text-text-secondary">预置动作</span>
              </div>
            </template>
          </el-tree-v2>
          <el-empty v-else description="暂无匹配内容" :image-size="60" />
        </div>

        <!-- 分页 -->
        <div v-if="!searchQuery && registeredActionsTotal > 0" class="p-3 border-t border-border bg-[var(--el-fill-color-lighter)]">
          <el-pagination
            v-model:current-page="registeredActionsPage"
            :total="registeredActionsTotal"
            :page-size="perPage"
            size="small"
            layout="prev, pager, next"
            @current-change="handleRegisteredActionsPageChange"
            class="float-right"
          />
        </div>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>