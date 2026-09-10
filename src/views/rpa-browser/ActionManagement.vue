<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessageBox, ElMessage } from 'element-plus'
import { Delete, Edit, PriceTag, Refresh, Search, Loading, Promotion, SetUp } from '@element-plus/icons-vue'
import { useDebounceFn } from '@vueuse/core'
import FlexContainer from '@/components/CommonCompo/Bili-Container-Compo/FlexContainer.vue'
import BiliPageHeader from '@/components/CommonCompo/Bili-Container-Compo/BiliPageHeader.vue'
import { 自定义操作管理Service, 管理员管理Service } from '@/api/browser/hey-api'
import type { FilterType, SortBy, SortOrder } from '@/api/browser/hey-api'
import { useUserNavStore } from '@/stores/user_nav'
import { businessHandler } from '@/utils/businessHandler'
import ResourceInteractionBar from '@/components/interaction/ResourceInteractionBar.vue'

const router = useRouter()

interface ActionItem {
  action_id: string
  name: string
  action_type: string
  description: string
  steps_count: number
  tags: string[]
  is_enabled: boolean
  is_public: boolean
  likes_count: number
  forks_count: number
  created_at: string | null
  updated_at: string | null
}

const userNavStore = useUserNavStore()

const actionList = ref<ActionItem[]>([])
const total = ref(0)
const currentPage = ref(1)
const pageSize = ref(10)
const loading = ref(false)
const loadingMore = ref(false)
const searchText = ref('')
const filterTag = ref('')
const allTags = ref<string[]>([])

const hasMore = computed(() => actionList.value.length < total.value)

const getTooltipContent = (item: ActionItem) => {
  const parts: string[] = []
  if (item.description) parts.push(item.description)
  if (item.tags?.length) parts.push(`标签: ${item.tags.join(', ')}`)
  parts.push(`步骤数: ${item.steps_count}`)
  parts.push(`可见性: ${item.is_public ? '公开' : '私有'}`)
  parts.push(`点赞: ${item.likes_count}`)
  parts.push(`Fork: ${item.forks_count}`)
  parts.push(`ID: ${item.action_id}`)
  return parts.join('<br/>')
}

const getTooltipEffect = (item: ActionItem): 'dark' | 'light' => {
  return item.is_public ? 'light' : 'dark'
}

const loadActions = async (append = false) => {
  if (append) {
    if (loadingMore.value || !hasMore.value) return
    loadingMore.value = true
    currentPage.value++
  } else {
    loading.value = true
    currentPage.value = 1
  }

  const result = await businessHandler<{ items?: ActionItem[]; total?: number }>(
    自定义操作管理Service.listCustomActionsApiV1RpaBrowserControlCustomActionsListPost({
      body: {
        page: currentPage.value,
        per_page: pageSize.value,
        filter_type: 'private' as FilterType,
        sort_by: 'updated_at' as SortBy,
        sort_order: 'desc' as SortOrder,
        name: searchText.value || null,
        tag: filterTag.value || null,
      },
    }) as any,
    { successMessage: '', errorMessage: '获取动作列表失败', showSuccessToast: false }
  )
  if (result.success && result.data) {
    const items = result.data.items || []
    if (append) {
      actionList.value.push(...items)
    } else {
      actionList.value = items
    }
    total.value = result.data.total || 0
  } else if (append) {
    currentPage.value--
  }
  loading.value = false
  loadingMore.value = false
}

const loadMore = () => {
  loadActions(true)
}

const loadTags = async () => {
  const result = await businessHandler<string[]>(
    自定义操作管理Service.listCustomActionTagsApiV1RpaBrowserControlCustomActionsTagsPost({
    }) as any,
    { successMessage: '', errorMessage: '获取标签列表失败', showSuccessToast: false }
  )
  if (result.success && result.data) {
    allTags.value = result.data || []
  }
}

const handleSearch = useDebounceFn(() => {
  loadActions()
}, 400)

const handleTagFilter = () => {
  loadActions()
}

const handleRename = async (item: ActionItem) => {
  let newName: string
  try {
    const result = await ElMessageBox.prompt('请输入新的名称', '重命名', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      inputValue: item.name,
      inputPattern: /\S+/,
      inputErrorMessage: '名称不能为空',
    })
    newName = result.value
  } catch {
    return
  }
  if (newName === item.name) return

  const result = await businessHandler(
    自定义操作管理Service.updateCustomActionApiV1RpaBrowserControlCustomActionsUpdatePost({
      body: { action_id: item.action_id, name: newName },
    }) as any,
    { successMessage: '重命名成功', errorMessage: '重命名失败' }
  )
  if (result.success) {
    item.name = newName
  }
}

const handleTogglePublic = async (item: ActionItem) => {
  const result = await businessHandler(
    自定义操作管理Service.updateCustomActionApiV1RpaBrowserControlCustomActionsUpdatePost({
      body: { action_id: item.action_id, is_public: item.is_public },
    }) as any,
    {
      successMessage: item.is_public ? '已设为公开' : '已设为私有',
      errorMessage: '修改可见性失败',
    }
  )
  if (!result.success) {
    item.is_public = !item.is_public
  }
}

const handleApplyPublish = async (item: ActionItem) => {
  let desc: string
  try {
    const result = await ElMessageBox.prompt(
      `提交后需管理员审核通过，操作才会公开到社区（审核前保持私有）。`,
      `申请公开「${item.name}」`,
      {
        confirmButtonText: '提交申请',
        cancelButtonText: '取消',
        inputPlaceholder: '请输入申请说明（可选）',
        inputValue: '',
      }
    )
    desc = result.value || ''
  } catch {
    return
  }
  const res = await businessHandler(
    管理员管理Service.submitApprovalApiAdminRpaApprovalSubmitPost({
      body: {
        resource_type: 'action',
        resource_id: item.action_id,
        action: 'publish',
        title: item.name,
        description: desc,
      },
    }),
    { successMessage: '审批申请已提交，等待管理员审核', errorMessage: '提交失败' }
  )
  if (res.success) {
    ElMessage.success('可在「审批中心」查看审核进度')
  }
}

const goApprovalCenter = () => {
  router.push({ name: 'RPA_BROWSER_APPROVAL_CENTER' })
}

// ── Tag 编辑对话框 ──
const tagDialogVisible = ref(false)
const tagDialogLoading = ref(false)
const tagEditingItem = ref<ActionItem | null>(null)
const tagInputValue = ref('')

const openTagDialog = (item: ActionItem) => {
  tagEditingItem.value = item
  tagInputValue.value = ''
  tagDialogVisible.value = true
}

const handleAddTag = () => {
  const tag = tagInputValue.value.trim()
  if (!tag || !tagEditingItem.value) return
  if (tagEditingItem.value.tags.includes(tag)) {
    ElMessage.warning('标签已存在')
    return
  }
  tagEditingItem.value.tags.push(tag)
  tagInputValue.value = ''
}

const handleRemoveTag = (tag: string) => {
  if (!tagEditingItem.value) return
  tagEditingItem.value.tags = tagEditingItem.value.tags.filter(t => t !== tag)
}

const handleSaveTags = async () => {
  if (!tagEditingItem.value) return
  tagDialogLoading.value = true
  const result = await businessHandler(
    自定义操作管理Service.updateCustomActionApiV1RpaBrowserControlCustomActionsUpdatePost({
      body: { action_id: tagEditingItem.value.action_id, tags: tagEditingItem.value.tags },
    }) as any,
    { successMessage: '标签保存成功', errorMessage: '标签保存失败' }
  )
  tagDialogLoading.value = false
  if (result.success) {
    tagDialogVisible.value = false
    loadTags()
  }
}

const handleDelete = async (item: ActionItem) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除动作「${item.name}」吗？此操作不可恢复。`,
      '删除确认',
      { confirmButtonText: '删除', cancelButtonText: '取消', type: 'warning' }
    )
  } catch {
    return
  }
  const result = await businessHandler(
    自定义操作管理Service.deleteCustomActionApiV1RpaBrowserControlCustomActionsDeletePost({
      body: { action_id: item.action_id },
    }) as any,
    { successMessage: '删除成功', errorMessage: '删除失败' }
  )
  if (result.success) {
    loadActions()
  }
}

const handleScroll = (e: Event) => {
  const target = e.target as HTMLElement
  const { scrollTop, scrollHeight, clientHeight } = target
  if (scrollHeight - scrollTop - clientHeight < 100 && hasMore.value && !loadingMore.value) {
    loadMore()
  }
}

const handleRefresh = () => {
  loadActions()
  loadTags()
}

const formatTime = (t: string | null) => {
  if (!t) return '-'
  return new Date(t).toLocaleString('zh-CN')
}

onMounted(() => {
  loadActions()
  loadTags()
})
</script>

<template>
  <FlexContainer>
    <BiliPageHeader title="动作管理" description="管理你的自定义动作" tag-text="私有动作">
      <template #extra>
        <el-button :icon="SetUp" @click="goApprovalCenter">审批中心</el-button>
        <el-button :icon="Refresh" @click="handleRefresh">刷新</el-button>
      </template>
    </BiliPageHeader>

    <FlexContainer class="mt-4 bg-bg rounded-2xl p-4">
      <!-- 搜索栏 -->
      <div class="flex items-center gap-3 mb-4 flex-wrap">
        <el-input
          v-model="searchText"
          placeholder="搜索动作名称"
          :prefix-icon="Search"
          clearable
          style="width: 240px"
          @input="handleSearch"
          @clear="handleSearch"
        />
        <el-select
          v-model="filterTag"
          placeholder="按标签筛选"
          clearable
          style="width: 180px"
          @change="handleTagFilter"
          @clear="handleTagFilter"
        >
          <el-option v-for="t in allTags" :key="t" :label="t" :value="t" />
        </el-select>
      </div>

      <!-- 加载骨架 -->
      <div v-if="loading" class="w-full">
        <div class="grid gap-4" style="grid-template-columns: repeat(auto-fill, minmax(340px, 1fr))">
          <div v-for="i in 6" :key="i" class="rounded-xl p-5 border border-border-light">
            <el-skeleton :rows="4" animated />
          </div>
        </div>
      </div>

      <!-- 空状态 -->
      <div v-else-if="actionList.length === 0" class="flex flex-col items-center justify-center py-20 text-gray-400">
        <el-empty description="暂无自定义动作" />
      </div>

      <!-- 动作卡片列表（滚动容器） -->
      <div v-else class="overflow-auto" style="max-height: calc(100vh - 280px)" @scroll="handleScroll">
        <div class="grid gap-4" style="grid-template-columns: repeat(auto-fill, minmax(340px, 1fr))">
          <el-tooltip
            v-for="item in actionList"
            :key="item.action_id"
            :content="getTooltipContent(item)"
            :effect="getTooltipEffect(item)"
            raw-content
            placement="top"
            :show-after="500"
            popper-class="toolbox-tooltip"
          >
            <div
              class="rounded-xl p-5 border border-border-light hover:border-primary transition-colors flex flex-col gap-3"
            >
              <!-- 名称行 -->
              <div class="flex items-start justify-between gap-2">
                <div class="flex-1 min-w-0">
                  <h3 class="text-base font-semibold truncate" :title="item.name">{{ item.name }}</h3>
                  <p class="text-sm text-gray-400 mt-1 line-clamp-2" style="min-height: 2.5em">
                    {{ item.description || '暂无描述' }}
                  </p>
                </div>
                <el-tag size="small" :type="item.is_public ? 'success' : 'info'">
                  {{ item.is_public ? '公开' : '私有' }}
                </el-tag>
              </div>

              <!-- 标签 -->
              <div class="flex flex-wrap gap-1.5" style="min-height: 24px">
                <el-tag
                  v-for="tag in item.tags"
                  :key="tag"
                  size="small"
                  effect="plain"
                >
                  {{ tag }}
                </el-tag>
                <span v-if="!item.tags?.length" class="text-xs text-gray-500">无标签</span>
              </div>

              <!-- 元信息 -->
              <div class="flex items-center gap-4 text-xs text-gray-400">
                <span>步骤: {{ item.steps_count }}</span>
                <span>更新: {{ formatTime(item.updated_at) }}</span>
              </div>

              <!-- 收藏/点赞（2.17.0：动作走 be-message 通用互动） -->
              <div class="flex items-center pt-1">
                <ResourceInteractionBar biz-type="rpa_action" :biz-id="item.action_id" />
              </div>

              <!-- 操作栏 -->
              <div class="flex items-center gap-2 pt-2 border-t border-border-lighter">
                <el-button size="small" :icon="Edit" @click="handleRename(item)">重命名</el-button>
                <el-button size="small" :icon="PriceTag" @click="openTagDialog(item)">标签</el-button>
                <el-button v-if="!item.is_public" size="small" type="primary" plain :icon="Promotion"
                  @click="handleApplyPublish(item)">申请发布</el-button>
                <el-switch
                  v-model="item.is_public"
                  size="small"
                  inline-prompt
                  active-text="公开"
                  inactive-text="私有"
                  @change="handleTogglePublic(item)"
                />
                <el-button size="small" type="danger" :icon="Delete" @click="handleDelete(item)">删除</el-button>
              </div>
            </div>
          </el-tooltip>
        </div>

        <!-- 加载更多状态 -->
        <div v-if="loadingMore" class="flex justify-center py-6">
          <el-icon class="is-loading" :size="24"><Loading /></el-icon>
          <span class="ml-2 text-sm text-gray-400">加载中...</span>
        </div>
        <div v-else-if="!hasMore && actionList.length > 0" class="flex justify-center py-6 text-sm text-gray-400">
          没有更多了
        </div>
      </div>
    </FlexContainer>

    <!-- 标签编辑对话框 -->
    <el-dialog v-model="tagDialogVisible" title="编辑标签" width="420px">
      <div v-if="tagEditingItem" class="flex flex-col gap-4">
        <div class="text-sm text-gray-400">动作: {{ tagEditingItem.name }}</div>
        <div class="flex flex-wrap gap-2">
          <el-tag
            v-for="tag in tagEditingItem.tags"
            :key="tag"
            closable
            @close="handleRemoveTag(tag)"
          >
            {{ tag }}
          </el-tag>
          <span v-if="!tagEditingItem.tags.length" class="text-sm text-gray-500">暂无标签</span>
        </div>
        <el-input
          v-model="tagInputValue"
          placeholder="输入标签后按回车添加"
          @keyup.enter="handleAddTag"
        >
          <template #append>
            <el-button @click="handleAddTag">添加</el-button>
          </template>
        </el-input>
      </div>
      <template #footer>
        <el-button @click="tagDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="tagDialogLoading" @click="handleSaveTags">保存</el-button>
      </template>
    </el-dialog>
  </FlexContainer>
</template>
