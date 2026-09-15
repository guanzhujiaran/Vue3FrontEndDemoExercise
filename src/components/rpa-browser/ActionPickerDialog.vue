<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Search, Refresh, Lock, Folder, CircleCheck } from '@element-plus/icons-vue'
import { 自定义操作管理Service } from '@/api/browser/hey-api'
import type { FilterType, SortBy, SortOrder } from '@/api/browser/hey-api'
import { useUserNavStore } from '@/stores/user_nav'
import { businessHandler } from '@/utils/businessHandler'
import biliMessage from '@/utils/message'

/**
 * 动作选择器
 *
 * 工作流是「调度外壳」：只引用一个已存在的自定义操作（多对一共享），
 * 不在此处编辑步骤。步骤的编辑与调试在动作侧（BrowserStream 调试页）完成。
 */
interface Props {
  modelValue: boolean
  /** 已选中的动作ID，用于回显高亮 */
  selectedActionId?: string
}

const props = defineProps<Props>()
const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'select': [actionId: string, summary: Record<string, unknown>]
}>()

const userNavStore = useUserNavStore()

type PickerTab = 'private' | 'public'

interface TabOption {
  value: PickerTab
  label: string
  icon: typeof Lock
}
const TAB_OPTIONS: TabOption[] = [
  { value: 'private', label: '私有', icon: Lock },
  { value: 'public', label: '公开', icon: Folder },
]

interface ActionOption {
  action_id: string
  name?: string
  description?: string
  steps_count?: number
  tags?: string[]
  is_public?: boolean
}

const PER_PAGE = 20

const activeTab = ref<PickerTab>('private')
const searchInput = ref('')
const searchQuery = ref('')
const loading = ref(false)
const actionList = ref<ActionOption[]>([])
const selectedId = ref('')
const totalCount = ref(0)
const currentPage = ref(1)

const hasMore = computed(() => actionList.value.length < totalCount.value)

const dialogVisible = computed({
  get: () => props.modelValue,
  set: (val: boolean) => emit('update:modelValue', val),
})

function actionName(item: ActionOption): string {
  return item.name || item.action_id || '未命名动作'
}

async function fetchActions(append = false) {
  if (append) {
    if (!hasMore.value || loading.value) return
  } else {
    currentPage.value = 1
  }
  loading.value = true
  const page = append ? currentPage.value + 1 : 1
  const result = await businessHandler<{ items?: ActionOption[]; total?: number }>(
    自定义操作管理Service.listCustomActionsApiV1RpaBrowserControlCustomActionsListPost({
      body: {
        page,
        per_page: PER_PAGE,
        filter_type: activeTab.value as FilterType,
        sort_by: 'updated_at' as SortBy,
        sort_order: 'desc' as SortOrder,
        name: searchQuery.value || undefined,
      },
      headers: userNavStore.user_header,
    }) as any,
    { successMessage: '', errorMessage: '获取动作列表失败', showSuccessToast: false }
  )
  if (result.success && result.data) {
    const items = (result.data.items || []) as ActionOption[]
    actionList.value = append ? [...actionList.value, ...items] : items
    totalCount.value = result.data.total || 0
    currentPage.value = page
  } else if (!append) {
    actionList.value = []
    totalCount.value = 0
  }
  loading.value = false
}

function handleSearch() {
  searchQuery.value = searchInput.value.trim()
  fetchActions()
}

function handleRefresh() {
  searchInput.value = ''
  searchQuery.value = ''
  fetchActions()
}

function handleTabChange(tab: string | number | boolean) {
  const next = tab as PickerTab
  if (next === activeTab.value) return
  activeTab.value = next
  selectedId.value = ''
  fetchActions()
}

function toggleSelect(item: ActionOption) {
  if (!item.action_id) return
  selectedId.value = selectedId.value === item.action_id ? '' : item.action_id
}

function handleConfirm() {
  if (!selectedId.value) {
    biliMessage.warning('请先选择一个动作')
    return
  }
  const picked = actionList.value.find(i => i.action_id === selectedId.value)
  emit('select', selectedId.value, (picked || { action_id: selectedId.value }) as unknown as Record<string, unknown>)
  emit('update:modelValue', false)
}

function handleClose() {
  emit('update:modelValue', false)
}

watch(
  () => props.modelValue,
  (visible) => {
    if (!visible) return
    activeTab.value = 'private'
    searchInput.value = ''
    searchQuery.value = ''
    selectedId.value = props.selectedActionId || ''
    actionList.value = []
    totalCount.value = 0
    fetchActions()
  },
  { immediate: true }
)
</script>

<template>
  <el-dialog
    v-model="dialogVisible"
    title="选择动作"
    width="720px"
    :append-to-body="true"
    :close-on-click-modal="false"
    :destroy-on-close="false"
    class="action-picker-dialog"
  >
    <div class="action-picker flex flex-col gap-3">
      <el-alert
        class="action-picker__hint"
        type="info"
        :closable="false"
        show-icon
        title="工作流只引用已有动作，不在此处编辑步骤。步骤的编辑与调试请在动作侧「调试页」完成。"
      />

      <el-segmented
        class="action-picker__tabs"
        :model-value="activeTab"
        :options="TAB_OPTIONS"
        block
        @change="handleTabChange"
      >
        <template #default="{ item }">
          <div class="flex items-center gap-1">
            <el-icon><component :is="item.icon" /></el-icon>
            <span>{{ item.label }}</span>
          </div>
        </template>
      </el-segmented>

      <div class="action-picker__search flex items-center gap-2">
        <el-input
          v-model="searchInput"
          placeholder="搜索动作名称"
          clearable
          :prefix-icon="Search"
          class="action-picker__search-input flex-1"
          @keyup.enter="handleSearch"
          @clear="handleSearch"
        />
        <el-button type="primary" :icon="Search" @click="handleSearch">搜索</el-button>
        <el-button :icon="Refresh" @click="handleRefresh">重置</el-button>
      </div>

      <div v-loading="loading" class="action-picker__list h-[46vh] overflow-auto border border-border rounded">
        <template v-if="actionList.length > 0">
          <div
            v-for="item in actionList"
            :key="item.action_id"
            class="action-picker__item flex items-start gap-3 p-3 cursor-pointer border-b border-border-lighter transition-colors hover:bg-fill-light"
            :class="{ 'bg-primary-light-9': selectedId === item.action_id }"
            @click="toggleSelect(item)"
          >
            <el-icon
              class="action-picker__item-check mt-0.5 shrink-0"
              :class="selectedId === item.action_id ? 'text-primary' : 'text-text-placeholder'"
              :size="18"
            >
              <CircleCheck />
            </el-icon>
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 flex-wrap">
                <span class="action-picker__item-name font-medium text-text-primary">{{ actionName(item) }}</span>
                <span class="text-xs text-text-secondary font-mono">{{ item.action_id }}</span>
                <el-tag v-if="item.is_public" type="success" effect="plain">公开</el-tag>
                <el-tag type="info" effect="plain">{{ item.steps_count ?? 0 }} 步</el-tag>
              </div>
              <div v-if="item.description" class="text-xs text-text-secondary mt-1 line-clamp-2">
                {{ item.description }}
              </div>
              <div v-if="item.tags && item.tags.length > 0" class="flex flex-wrap gap-1 mt-1.5">
                <el-tag v-for="tag in item.tags" :key="tag" type="primary" effect="plain">{{ tag }}</el-tag>
              </div>
            </div>
          </div>
        </template>
        <el-empty v-else class="action-picker__empty" description="暂无匹配动作" />
      </div>

      <div class="action-picker__footer-bar flex items-center justify-between text-xs text-text-secondary">
        <span>已加载 {{ actionList.length }} / {{ totalCount }}</span>
        <el-button v-if="hasMore" link type="primary" @click="fetchActions(true)">加载更多</el-button>
      </div>
    </div>

    <template #footer>
      <el-button @click="handleClose">取消</el-button>
      <el-button type="primary" :disabled="!selectedId" @click="handleConfirm">确定</el-button>
    </template>
  </el-dialog>
</template>
