<script setup lang="ts">
import { computed, ref, reactive } from 'vue'
import { Rank, VideoPlay, View, Check, FolderAdd, ArrowUp, ArrowDown, Delete } from '@element-plus/icons-vue'
import ActionCard from './ActionCard.vue'
import ActionParamsForm from './ActionParamsForm.vue'
import OperationFeedbackPanel from './OperationFeedbackPanel.vue'
import ConditionEditor from './ConditionEditor.vue'

/**
 * 分支容器 —— True/False/Loop 分支的拖拽区域，含条目列表与操作栏。
 * 条目卡片渲染与 DebugBox 主列表统一，支持 if_else/loop 的递归嵌套渲染。
 */

interface DroppedItem {
  id: string
  name: string
  action_id: string
  action_type: string
  description?: string
  type: string
  json_schema?: Record<string, unknown>
  formData?: Record<string, unknown>
  config_params?: Record<string, unknown>
  input_vars?: Record<string, unknown>
  output_vars?: string[]
  trueBranch?: DroppedItem[]
  falseBranch?: DroppedItem[]
  loopBody?: DroppedItem[]
  [key: string]: unknown
}

interface OperationFeedback {
  kind: 'validate' | 'preview' | 'execute'
  success: boolean
  summary: string
  detail: Record<string, unknown>
  at: number
}

interface Props {
  /** 分支类型 */
  branch: 'true' | 'false' | 'loop'
  /** 分支内的条目 */
  items: DroppedItem[]
  /** 父级索引 */
  parentIndex: number
  /** 从主列表到当前容器的嵌套路径（用于跨层拖放定位源位置） */
  branchPath?: Array<{ parentIndex: number; branch: 'true' | 'false' | 'loop' }>
  /** 选中的子项索引集合 */
  selectedItems: Set<number>
  /** 展开的子项 key 集合 */
  expandedItems: Set<unknown>
  /** 操作反馈映射 */
  feedbackMap: Record<string, OperationFeedback>
  /** 执行中 mapping */
  operatingMap: Record<string, boolean>
  /** 是否操作全部 */
  executingAll?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  executingAll: false,
})

const emit = defineEmits<{
  drop: [event: DragEvent, insertIndex?: number]
  selectAll: []
  saveMulti: []
  executeAll: []
  'item:execute': [childIndex: number]
  'item:preview': [childIndex: number]
  'item:validate': [childIndex: number]
  'item:saveAs': [childIndex: number]
  'item:toggleExpand': [childIndex: number]
  'item:remove': [childIndex: number]
  'item:toggleSelect': [childIndex: number]
  'item:closeFeedback': [childIndex: number]
  /** 拖拽排序：from → to */
  reorder: [fromIndex: number, toIndex: number]
}>()

// ========== 分支内拖拽排序 & 外部拖入 ==========
const dragIdx = ref<number | null>(null)
const externalDropTarget = ref<number | null>(null)

const onItemDragStart = (e: DragEvent, index: number) => {
  dragIdx.value = index
  if (e.dataTransfer) {
    e.dataTransfer.effectAllowed = 'move'
    const payload: Record<string, unknown> = {
      __dragType: 'card',
      source: { container: 'branch', parentIndex: props.parentIndex, branch: props.branch, index, path: props.branchPath || [] }
    }
    // 多选时附带全部选中项的索引（升序）
    if (props.selectedItems.size > 1 && props.selectedItems.has(index)) {
      payload.selectedIndices = [...props.selectedItems].sort((a, b) => a - b)
    }
    const json = JSON.stringify(payload)
    e.dataTransfer.setData('text/plain', json)
    e.dataTransfer.setData('application/json', json)
  }
}

/** 提取 drop 数据（优先 text/plain） */
const getDragJSON = (e: DragEvent) => e.dataTransfer?.getData('text/plain') || e.dataTransfer?.getData('application/json') || ''

const hasDragData = (e: DragEvent) => {
  const dt = e.dataTransfer
  return dt && (dt.types.includes('application/json') || dt.types.includes('text/plain'))
}

const onItemDragOver = (e: DragEvent, index: number) => {
  e.preventDefault()
  e.stopPropagation()
  if (e.dataTransfer) {
    e.dataTransfer.dropEffect = 'move'
    if (hasDragData(e)) {
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
      externalDropTarget.value = e.clientY < rect.top + rect.height / 2 ? index : index + 1
    }
  }
}

/** 分支列表容器 dragover：在条目间隙中也计算插入位置 */
const onContainerDragOver = (e: DragEvent) => {
  e.preventDefault()
  if (!hasDragData(e) && dragIdx.value === null) return
  const listEl = e.currentTarget as HTMLElement
  const items = Array.from(listEl.querySelectorAll('[data-branch-item]')) as HTMLElement[]
  const mouseY = e.clientY
  let insertAt = props.items.length
  for (let i = 0; i < items.length; i++) {
    const rect = items[i].getBoundingClientRect()
    if (mouseY < rect.top + rect.height / 2) { insertAt = i; break }
  }
  externalDropTarget.value = insertAt
}

const onItemDrop = (e: DragEvent, index: number) => {
  e.preventDefault()
  e.stopPropagation()

  if (e.dataTransfer) {
    try {
      const rawData = getDragJSON(e)
      if (rawData) {
        const parsed = JSON.parse(rawData)
        if (parsed.__dragType === 'card') {
          const src = parsed.source
          const selectedIndices: number[] = (parsed.selectedIndices as number[]) || [src.index]

          // 自身拖放检查
          if (selectedIndices.length <= 1 && src?.container === 'branch' && src.parentIndex === props.parentIndex && src.branch === props.branch && src.index === index) {
            dragIdx.value = null
            return
          }

          const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
          const insertIdx = e.clientY < rect.top + rect.height / 2 ? index : index + 1

          // 多选移动：同一容器内直接批量搬运
          if (selectedIndices.length > 1 && src?.container === 'branch' && src.parentIndex === props.parentIndex && src.branch === props.branch) {
            // 目标不在选中范围内
            if (selectedIndices.includes(index)) { dragIdx.value = null; return }
            // 降序排序，从后往前 splice 避免索引偏移
            const desc = [...selectedIndices].sort((a, b) => b - a)
            const moved: DroppedItem[] = []
            for (const si of desc) {
              moved.unshift(props.items.splice(si, 1)[0])
            }
            // 计算移除后实际插入位置
            let targetAt = insertIdx
            for (const si of desc) { if (si < targetAt) targetAt-- }
            props.items.splice(targetAt, 0, ...moved)
            // 依然 emit drop 让 DebugBox 感知数组变化（removeFromSource 会静默失败）
            emit('drop', e, targetAt)
            dragIdx.value = null
            externalDropTarget.value = null
            return
          }

          emit('drop', e, insertIdx)
          dragIdx.value = null
          externalDropTarget.value = null
          return
        }
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
        const insertIdx = e.clientY < rect.top + rect.height / 2 ? index : index + 1
        emit('drop', e, insertIdx)
        dragIdx.value = null
        externalDropTarget.value = null
        return
      }
    } catch { /* 不是 JSON 数据，走内部排序 */ }
  }

  if (dragIdx.value !== null) {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    let insertAt = e.clientY < rect.top + rect.height / 2 ? index : index + 1
    if (dragIdx.value < insertAt) insertAt--
    if (dragIdx.value !== insertAt) {
      emit('reorder', dragIdx.value, insertAt)
    }
  }
  dragIdx.value = null
}

const onItemDragEnd = () => {
  dragIdx.value = null
}

const onRootDragOver = (e: DragEvent) => {
  e.preventDefault()
  const dt = e.dataTransfer
  if (!dt) return
  dt.dropEffect = 'move'
}

const onRootDrop = (e: DragEvent) => {
  const idx = externalDropTarget.value
  externalDropTarget.value = null
  dragIdx.value = null
  emit('drop', e, idx ?? undefined)
}

const branchConfig = computed(() => {
  const map: Record<string, { label: string; borderClass: string; accentClass: string }> = {
    true: {
      label: 'True 分支',
      borderClass: 'border-(--el-color-success-light-5)',
      accentClass: 'text-(--el-color-success)',
    },
    false: {
      label: 'False 分支',
      borderClass: 'border-(--el-color-danger-light-5)',
      accentClass: 'text-(--el-color-danger)',
    },
    loop: {
      label: '循环体',
      borderClass: 'border-(--el-color-warning-light-5)',
      accentClass: 'text-(--el-color-warning)',
    },
  }
  return map[props.branch] || map.true
})

/** 子层 BranchContainer 的嵌套路径（累积当前层） */
const childBranchPath = computed(() => [
  ...(props.branchPath || []),
  { parentIndex: props.parentIndex, branch: props.branch },
])

const isEmpty = computed(() => props.items.length === 0)
const allSelected = computed(() => props.items.length > 0 && props.selectedItems.size === props.items.length)
const someSelected = computed(() => props.selectedItems.size > 0 && props.selectedItems.size < props.items.length)

const feedbackKey = (childIndex: number) => `${props.parentIndex}-${props.branch}-${childIndex}`
const isExpanded = (childIndex: number) => props.expandedItems.has(feedbackKey(childIndex) as unknown as number)
const isOperating = (childIndex: number) => !!props.operatingMap[feedbackKey(childIndex)]

// ========== 递归嵌套分支状态（局部管理） ==========
/** 嵌套 if_else 的当前激活 tab (子项 index → 'true'|'false') */
const nestedIfElseActiveTab = reactive<Record<string, 'true' | 'false'>>({})
/** 嵌套 loop 的折叠状态 */
const nestedCollapseState = reactive<Record<string, string[]>>({})
/** 嵌套分支的选中项映射 "childIndex-true/false/loop" → Set<number> */
const nestedSelectedMap = reactive<Record<string, Set<number>>>({})

/** 确保嵌套分支数据存在 */
function ensureNestedBranch(item: DroppedItem) {
  if (!item.trueBranch) item.trueBranch = []
  if (!item.falseBranch) item.falseBranch = []
  if (!item.loopBody) item.loopBody = []
}

/** 获取嵌套选中集合 */
function getNestedSelected(childIndex: number, branch: string): Set<number> {
  const key = `${childIndex}-${branch}`
  if (!nestedSelectedMap[key]) nestedSelectedMap[key] = new Set()
  return nestedSelectedMap[key]
}

/** 处理拖入嵌套分支（支持工具箱新条目 + 本容器内卡片移入 + 多选批量移入 + 跨层向上传递） */
function handleNestedDrop(childIndex: number, nestedBranch: 'true' | 'false' | 'loop', event: DragEvent, insertAt?: number) {
  const item = props.items[childIndex]
  if (!item || !event.dataTransfer) return
  ensureNestedBranch(item)
  const targetArr = nestedBranch === 'true' ? item.trueBranch! : nestedBranch === 'false' ? item.falseBranch! : item.loopBody!

  try {
    // 优先 text/plain
    const rawData = event.dataTransfer.getData('text/plain') || event.dataTransfer.getData('application/json')
    if (!rawData) return
    const parsed = JSON.parse(rawData)

    // 本容器内卡片移到嵌套分支
    if (parsed.__dragType === 'card') {
      const src = parsed.source
      if (
        src?.container === 'branch' &&
        src.parentIndex === props.parentIndex &&
        src.branch === props.branch
      ) {
        const selectedIndices: number[] = (parsed.selectedIndices as number[]) || [src.index]
        // 不能拖入自身
        if (selectedIndices.length <= 1 && src.index === childIndex) return
        if (selectedIndices.length > 1 && selectedIndices.includes(childIndex)) return

        // 降序移除（从高索引到低索引）
        const desc = [...selectedIndices].sort((a, b) => b - a)
        const moved: DroppedItem[] = []
        for (const si of desc) {
          moved.unshift(props.items.splice(si, 1)[0])
        }
        // 计算移除后目标位置
        const at = insertAt ?? targetArr.length
        let adjustedAt = at
        if (selectedIndices.length > 1) {
          // 计数在目标位置之前被移除的项
          const removedBefore = desc.filter(si => si < childIndex).length
          adjustedAt = at - removedBefore
        } else {
          adjustedAt = src.index < childIndex ? at - 1 : at
        }
        targetArr.splice(Math.max(0, adjustedAt), 0, ...moved)
        dragIdx.value = null
        return
      }
      // 来源是其他层级的卡片——向上传递 drop 事件
      dragIdx.value = null
      emit('drop', event, insertAt ?? undefined)
      return
    }

    // 工具箱新条目
    const at = insertAt ?? targetArr.length
    targetArr.splice(at, 0, {
      ...parsed,
      id: `${parsed.id || parsed.action_id || parsed.action_type || 'item'}-${Date.now()}`,
      name: parsed.name || parsed.label || parsed.json_schema?.title || parsed.action_id || parsed.action_type || '未命名',
      action_id: parsed.action_id || parsed.action_type || 'custom',
      action_type: parsed.action_type || parsed.action_id || 'custom',
      description: parsed.description || parsed.json_schema?.description,
      type: parsed.type || 'action',
      formData: { ...(parsed.formData || {}) },
    })
  } catch (e) {
    console.error('嵌套分支 drop 解析失败:', e)
  }
}

/** 删除嵌套分支内的子项 */
function handleNestedRemove(childIndex: number, nestedBranch: 'true' | 'false' | 'loop', subIndex: number) {
  const item = props.items[childIndex]
  if (!item) return
  const targetArr = nestedBranch === 'true' ? item.trueBranch : nestedBranch === 'false' ? item.falseBranch : item.loopBody
  if (targetArr) targetArr.splice(subIndex, 1)
}

/** 嵌套分支全选切换 */
function handleNestedSelectAll(childIndex: number, nestedBranch: 'true' | 'false' | 'loop') {
  const item = props.items[childIndex]
  if (!item) return
  const targetArr = nestedBranch === 'true' ? item.trueBranch : nestedBranch === 'false' ? item.falseBranch : item.loopBody
  if (!targetArr) return
  const key = `${childIndex}-${nestedBranch}`
  const current = nestedSelectedMap[key]
  if (current && current.size === targetArr.length) {
    nestedSelectedMap[key] = new Set()
  } else {
    nestedSelectedMap[key] = new Set(targetArr.map((_, i) => i))
  }
}

/** 嵌套分支内排序 */
function handleNestedReorder(childIndex: number, nestedBranch: 'true' | 'false' | 'loop', from: number, to: number) {
  const item = props.items[childIndex]
  if (!item) return
  const targetArr = nestedBranch === 'true' ? item.trueBranch : nestedBranch === 'false' ? item.falseBranch : item.loopBody
  if (!targetArr || from >= targetArr.length || to >= targetArr.length) return
  const [moved] = targetArr.splice(from, 1)
  targetArr.splice(to, 0, moved)
}
</script>

<template>
  <div
    :class="['rounded border border-dashed p-2', branchConfig.borderClass]"
    @drop="onRootDrop"
    @dragover="onRootDragOver"
    @dragleave="externalDropTarget = null"
  >
    <!-- 空状态 -->
    <div v-if="isEmpty" class="text-xs text-text-placeholder py-4 text-center space-y-1">
      <p>拖拽动作到此处</p>
      <p v-if="branch === 'true'" class="text-(--el-color-warning)">条件满足 → 执行此分支步骤；若为空 → 跳过并视为成功</p>
      <p v-if="branch === 'false'" class="text-(--el-color-warning)">条件不满足 / 未设条件 → 执行此分支步骤；若为空 → 跳过并视为成功</p>
      <p v-if="branch === 'loop'" class="text-(--el-color-warning)">提示：循环体为空时跳过执行</p>
    </div>

    <!-- 条目列表：与 DebugBox 主列表使用相同的卡片样式 -->
    <div v-else class="space-y-2" @dragover="onContainerDragOver">
      <div
        v-for="(branchItem, bi) in items"
        :key="branchItem.id"
        data-branch-item
        class="group relative"
        @dragover="(e: DragEvent) => onItemDragOver(e, bi)"
        @drop="(e: DragEvent) => onItemDrop(e, bi)"
        @dragend="onItemDragEnd"
      >
        <div class="flex items-start gap-2 p-1 rounded border border-border hover:border-(--el-color-primary) transition-colors">
          <!-- 多选框 -->
          <div class="mt-1.5 shrink-0">
            <input
              type="checkbox"
              :checked="selectedItems.has(bi)"
              @change="emit('item:toggleSelect', bi)"
              class="w-4 h-4 rounded border-gray-300 text-(--el-color-primary) cursor-pointer focus:ring-2 focus:ring-(--el-color-primary-light-5)"
            />
          </div>

          <!-- 拖拽手柄 -->
          <div class="mt-2 cursor-move drag-handle" draggable="true" @dragstart="(e: DragEvent) => onItemDragStart(e, bi)">
            <el-icon class="text-gray-400"><Rank /></el-icon>
          </div>

          <!-- 内容区 -->
          <div class="flex-1 min-w-0">
            <div class="flex items-start gap-3">
              <div class="flex-1 min-w-0">
                <ActionCard
                  :action="{
                    action_id: branchItem.action_type || branchItem.action_id,
                    json_schema: branchItem.json_schema,
                    name: branchItem.name,
                    description: branchItem.description,
                  }"
                  :config-params="branchItem.config_params"
                />
              </div>
              <div class="grid grid-cols-2 gap-3 shrink-0 py-1 button-stack">
                <el-button size="small" :icon="VideoPlay" type="primary" :loading="isOperating(bi)" @click="emit('item:execute', bi)" class="execute-btn w-20">执行</el-button>
                <el-button size="small" :icon="View" :loading="isOperating(bi)" @click="emit('item:preview', bi)" class="preview-btn w-20 ml-0">预览</el-button>
                <el-button size="small" :icon="Check" :loading="isOperating(bi)" @click="emit('item:validate', bi)" class="validate-btn w-20 ml-0">验证</el-button>
                <el-button size="small" :icon="FolderAdd" @click="emit('item:saveAs', bi)" class="save-btn w-20 ml-0">另存为</el-button>
              </div>
            </div>

            <!-- 参数展开 -->
            <div v-if="isExpanded(bi)" class="mt-2 p-3 rounded border border-border space-y-4">
              <!-- if_else 类型：条件编辑器 + 分支容器 -->
              <template v-if="branchItem.action_type === 'if_else' || branchItem.action_id === 'if_else'">
                <div class="pb-3 border-b border-(--el-border-color-lighter)">
                  <ConditionEditor
                    :model-value="(branchItem.formData?.condition as any) || null"
                    @update:model-value="val => { if (!branchItem.formData) branchItem.formData = {}; (branchItem.formData as any).condition = val }"
                  />
                </div>
                <div>
                  <div class="flex items-center gap-2 mb-2">
                    <span class="text-sm font-semibold text-(--el-text-color-primary)">分支操作</span>
                    <span class="text-xs text-text-secondary">拖拽动作到对应分支中</span>
                  </div>
                  <el-tabs
                    :model-value="nestedIfElseActiveTab[`${bi}`] ?? 'true'"
                    type="border-card"
                    class="if-else-branch-tabs"
                    @update:model-value="nestedIfElseActiveTab[`${bi}`] = $event as 'true' | 'false'"
                  >
                    <el-tab-pane name="true">
                      <template #label>
                        <span class="text-xs font-medium text-(--el-color-success)">
                          True 分支<span v-if="branchItem.trueBranch && branchItem.trueBranch.length > 0" class="text-text-placeholder ml-1">({{ branchItem.trueBranch.length }} 步)</span>
                        </span>
                      </template>
                      <div class="p-2 overflow-auto">
                        <BranchContainer
                          branch="true"
                          :items="branchItem.trueBranch || []"
                          :parent-index="bi"
                          :branch-path="childBranchPath"
                          :selected-items="getNestedSelected(bi, 'true')"
                          :expanded-items="props.expandedItems"
                          :feedback-map="{}"
                          :operating-map="{}"
                          @drop="(e: DragEvent, idx?: number) => handleNestedDrop(bi, 'true', e, idx)"
                          @select-all="handleNestedSelectAll(bi, 'true')"
                          @reorder="(from: number, to: number) => handleNestedReorder(bi, 'true', from, to)"
                          @item:remove="(sub: number) => handleNestedRemove(bi, 'true', sub)"
                          @item:toggle-select="(sub: number) => { const s = getNestedSelected(bi, 'true'); s.has(sub) ? s.delete(sub) : s.add(sub); }"
                        />
                      </div>
                    </el-tab-pane>
                    <el-tab-pane name="false">
                      <template #label>
                        <span class="text-xs font-medium text-(--el-color-danger)">
                          False 分支<span v-if="branchItem.falseBranch && branchItem.falseBranch.length > 0" class="text-text-placeholder ml-1">({{ branchItem.falseBranch.length }} 步)</span>
                        </span>
                      </template>
                      <div class="p-2 overflow-auto">
                        <BranchContainer
                          branch="false"
                          :items="branchItem.falseBranch || []"
                          :parent-index="bi"
                          :branch-path="childBranchPath"
                          :selected-items="getNestedSelected(bi, 'false')"
                          :expanded-items="props.expandedItems"
                          :feedback-map="{}"
                          :operating-map="{}"
                          @drop="(e: DragEvent, idx?: number) => handleNestedDrop(bi, 'false', e, idx)"
                          @select-all="handleNestedSelectAll(bi, 'false')"
                          @reorder="(from: number, to: number) => handleNestedReorder(bi, 'false', from, to)"
                          @item:remove="(sub: number) => handleNestedRemove(bi, 'false', sub)"
                          @item:toggle-select="(sub: number) => { const s = getNestedSelected(bi, 'false'); s.has(sub) ? s.delete(sub) : s.add(sub); }"
                        />
                      </div>
                    </el-tab-pane>
                  </el-tabs>
                </div>
              </template>

              <!-- loop 类型：循环体容器 -->
              <template v-else-if="branchItem.action_type === 'loop' || branchItem.action_id === 'loop'">
                <div>
                  <div class="flex items-center gap-2 mb-2">
                    <span class="text-sm font-semibold text-(--el-color-warning)">循环体</span>
                    <span class="text-xs text-text-secondary">拖拽动作到循环体内</span>
                  </div>
                  <el-collapse v-model="nestedCollapseState[`${bi}`]" accordion class="bg-transparent">
                    <el-collapse-item name="loop">
                      <template #title>
                        <div class="flex items-center justify-between w-full">
                          <span class="text-xs font-medium text-(--el-color-warning)">循环体</span>
                          <span v-if="branchItem.loopBody && branchItem.loopBody.length > 0" class="text-xs text-text-placeholder">{{ branchItem.loopBody.length }} 步</span>
                        </div>
                      </template>
                      <div class="mt-1">
                        <BranchContainer
                          branch="loop"
                          :items="branchItem.loopBody || []"
                          :parent-index="bi"
                          :branch-path="childBranchPath"
                          :selected-items="getNestedSelected(bi, 'loop')"
                          :expanded-items="props.expandedItems"
                          :feedback-map="{}"
                          :operating-map="{}"
                          @drop="(e: DragEvent, idx?: number) => handleNestedDrop(bi, 'loop', e, idx)"
                          @select-all="handleNestedSelectAll(bi, 'loop')"
                          @reorder="(from: number, to: number) => handleNestedReorder(bi, 'loop', from, to)"
                          @item:remove="(sub: number) => handleNestedRemove(bi, 'loop', sub)"
                          @item:toggle-select="(sub: number) => { const s = getNestedSelected(bi, 'loop'); s.has(sub) ? s.delete(sub) : s.add(sub); }"
                        />
                      </div>
                    </el-collapse-item>
                  </el-collapse>
                </div>
              </template>

              <!-- 普通类型：参数表单 -->
              <template v-else>
                <ActionParamsForm
                  v-model:form-data="branchItem.formData"
                  :json-schema="branchItem.json_schema"
                  :input-vars="branchItem.input_vars"
                  :output-vars="branchItem.output_vars"
                  @update:input-vars="branchItem.input_vars = $event"
                  @update:output-vars="branchItem.output_vars = $event"
                />
              </template>
            </div>

            <!-- 操作反馈 -->
            <div v-if="feedbackMap[feedbackKey(bi)]" class="mt-2">
              <OperationFeedbackPanel
                :feedback="feedbackMap[feedbackKey(bi)]"
                @close="emit('item:closeFeedback', bi)"
              />
            </div>
          </div>

          <!-- 展开/删除按钮 -->
          <div class="flex flex-col gap-1 mt-2">
            <button
              class="expand-more-params-btn p-1 rounded hover:bg-(--el-fill-color) transition-colors"
              @click.stop="emit('item:toggleExpand', bi)"
            >
              <el-icon class="text-(--el-text-color-primary)">
                <component :is="isExpanded(bi) ? ArrowUp : ArrowDown" />
              </el-icon>
            </button>
            <button
              class="p-1 rounded hover:bg-(--el-color-danger-light) transition-colors"
              @click.stop="emit('item:remove', bi)"
            >
              <el-icon class="text-red-500"><Delete /></el-icon>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 操作栏 -->
    <div v-if="!isEmpty" class="mt-3 pt-2 border-t border-border">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <input
            type="checkbox"
            :checked="allSelected"
            :indeterminate="someSelected"
            @change="emit('selectAll')"
            class="w-4 h-4 rounded border-gray-300 text-(--el-color-primary) cursor-pointer focus:ring-2 focus:ring-(--el-color-primary-light-5)"
          />
          <span class="text-xs text-color-secondary">
            {{ someSelected || allSelected
              ? `已选 ${selectedItems.size} / ${items.length} 个动作`
              : `共 ${items.length} 个动作`
            }}
          </span>
        </div>
        <div class="flex gap-2">
          <el-button size="small" @click="emit('saveMulti')">保存为动作</el-button>
          <el-button size="small" type="primary" :loading="executingAll" @click="emit('executeAll')">执行全部</el-button>
        </div>
      </div>
    </div>
  </div>
</template>
