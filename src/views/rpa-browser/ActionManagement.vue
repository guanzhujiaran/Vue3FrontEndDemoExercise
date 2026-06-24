<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { ElMessageBox, ElMessage } from 'element-plus'
import { Delete, Edit, PriceTag, Refresh, Search } from '@element-plus/icons-vue'
import FlexContainer from '@/components/CommonCompo/Bili-Container-Compo/FlexContainer.vue'
import BiliPageHeader from '@/components/CommonCompo/Bili-Container-Compo/BiliPageHeader.vue'
import {
  listCustomActionsApiV1RpaBrowserControlCustomActionsListPost,
  updateCustomActionApiV1RpaBrowserControlCustomActionsUpdatePost,
  deleteCustomActionApiV1RpaBrowserControlCustomActionsDeletePost,
} from '@/api/browser/hey-api'
import type { FilterType, SortBy, SortOrder } from '@/api/browser/hey-api/types.gen'
import { useUserNavStore } from '@/stores/user_nav'
import { businessHandler } from '@/utils/businessHandler'

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
const pageSize = ref(12)
const loading = ref(false)
const searchText = ref('')
const filterTag = ref('')

const allTags = computed(() => {
  const tags = new Set<string>()
  actionList.value.forEach(a => a.tags?.forEach(t => tags.add(t)))
  return Array.from(tags)
})

const filteredList = computed(() => {
  if (!searchText.value && !filterTag.value) return actionList.value
  return actionList.value.filter(a => {
    const matchName = !searchText.value || a.name.toLowerCase().includes(searchText.value.toLowerCase())
    const matchTag = !filterTag.value || a.tags?.includes(filterTag.value)
    return matchName && matchTag
  })
})

function apiHeaders() {
  return {
    'x-bili-mid': userNavStore.user_nav.uid,
    'x-bili-level': String(userNavStore.user_nav.level_info.current_level),
  }
}

const loadActions = async () => {
  loading.value = true
  const result = await businessHandler<{ items?: ActionItem[]; total?: number }>(
    listCustomActionsApiV1RpaBrowserControlCustomActionsListPost({
      body: {
        page: currentPage.value,
        per_page: pageSize.value,
        filter_type: 'private' as FilterType,
        sort_by: 'updated_at' as SortBy,
        sort_order: 'desc' as SortOrder,
      },
      headers: apiHeaders(),
    }) as any,
    { successMessage: '', errorMessage: '获取动作列表失败', showSuccessToast: false }
  )
  if (result.success && result.data) {
    actionList.value = result.data.items || []
    total.value = result.data.total || 0
  }
  loading.value = false
}

const handlePageChange = (page: number) => {
  currentPage.value = page
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
    updateCustomActionApiV1RpaBrowserControlCustomActionsUpdatePost({
      body: { action_id: item.action_id, name: newName },
      headers: apiHeaders(),
    }) as any,
    { successMessage: '重命名成功', errorMessage: '重命名失败' }
  )
  if (result.success) {
    item.name = newName
  }
}

const handleTogglePublic = async (item: ActionItem) => {
  const result = await businessHandler(
    updateCustomActionApiV1RpaBrowserControlCustomActionsUpdatePost({
      body: { action_id: item.action_id, is_public: item.is_public },
      headers: apiHeaders(),
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
    updateCustomActionApiV1RpaBrowserControlCustomActionsUpdatePost({
      body: { action_id: tagEditingItem.value.action_id, tags: tagEditingItem.value.tags },
      headers: apiHeaders(),
    }) as any,
    { successMessage: '标签保存成功', errorMessage: '标签保存失败' }
  )
  tagDialogLoading.value = false
  if (result.success) {
    tagDialogVisible.value = false
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
    deleteCustomActionApiV1RpaBrowserControlCustomActionsDeletePost({
      body: { action_id: item.action_id },
      headers: apiHeaders(),
    }) as any,
    { successMessage: '删除成功', errorMessage: '删除失败' }
  )
  if (result.success) {
    if (actionList.value.length === 1 && currentPage.value > 1) {
      currentPage.value--
    }
    loadActions()
  }
}

const formatTime = (t: string | null) => {
  if (!t) return '-'
  return new Date(t).toLocaleString('zh-CN')
}

onMounted(() => {
  loadActions()
})
</script>

<template>
  <FlexContainer>
    <BiliPageHeader title="动作管理" description="管理你的自定义动作" tag="私有动作">
      <template #extra>
        <el-button :icon="Refresh" @click="loadActions">刷新</el-button>
      </template>
    </BiliPageHeader>

    <FlexContainer class="mt-4">
      <!-- 搜索栏 -->
      <div class="flex items-center gap-3 mb-4 flex-wrap">
        <el-input
          v-model="searchText"
          placeholder="搜索动作名称"
          :prefix-icon="Search"
          clearable
          style="width: 240px"
        />
        <el-select
          v-if="allTags.length"
          v-model="filterTag"
          placeholder="按标签筛选"
          clearable
          style="width: 180px"
        >
          <el-option v-for="t in allTags" :key="t" :label="t" :value="t" />
        </el-select>
      </div>

      <!-- 加载骨架 -->
      <div v-if="loading" class="w-full">
        <div class="grid gap-4" style="grid-template-columns: repeat(auto-fill, minmax(340px, 1fr))">
          <div v-for="i in 6" :key="i" class="rounded-xl p-5 border border-[var(--el-border-color-light)]">
            <el-skeleton :rows="4" animated />
          </div>
        </div>
      </div>

      <!-- 空状态 -->
      <div v-else-if="filteredList.length === 0" class="flex flex-col items-center justify-center py-20 text-gray-400">
        <el-empty description="暂无自定义动作" />
      </div>

      <!-- 动作卡片列表 -->
      <div v-else class="grid gap-4" style="grid-template-columns: repeat(auto-fill, minmax(340px, 1fr))">
        <div
          v-for="item in filteredList"
          :key="item.action_id"
          class="rounded-xl p-5 border border-[var(--el-border-color-light)] hover:border-[var(--el-color-primary)] transition-colors flex flex-col gap-3"
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

          <!-- 操作栏 -->
          <div class="flex items-center gap-2 pt-2 border-t border-[var(--el-border-color-lighter)]">
            <el-button size="small" :icon="Edit" @click="handleRename(item)">重命名</el-button>
            <el-button size="small" :icon="PriceTag" @click="openTagDialog(item)">标签</el-button>
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
      </div>

      <!-- 分页 -->
      <div v-if="total > pageSize" class="flex justify-center mt-6">
        <el-pagination
          background
          layout="prev, pager, next"
          :total="total"
          :page-size="pageSize"
          :current-page="currentPage"
          @current-change="handlePageChange"
        />
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
