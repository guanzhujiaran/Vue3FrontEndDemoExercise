<script setup lang="ts">
import { ref, computed, inject, type Ref } from 'vue'
import { Delete, Rank, ArrowDown, ArrowUp, VideoPlay, FolderAdd, View, Check, Close } from '@element-plus/icons-vue'
import ActionCard from './ActionCard.vue'
import ActionParamsForm from './ActionParamsForm.vue'
import ConditionEditor from './ConditionEditor.vue'
import LoopEditor from './LoopEditor.vue'
import OperationFeedbackPanel from './OperationFeedbackPanel.vue'
import BranchContainer from './BranchContainer.vue'
import type { DroppedItem, BranchPathStep, LoopConfig } from './debugbox-types'
import { defaultLoopConfig } from './debugbox-types'
import { useDebugboxItems } from './useDebugboxItems'
import { useDebugboxExecution } from './useDebugboxExecution'
import { useDebugboxSave } from './useDebugboxSave'
import { useThemeStore } from '@/stores/theme'

const themeStore = useThemeStore()

// ── Props ──────────────────────────────────────────────
interface Props {
  browserId: string
  initialSteps?: DroppedItem[]
  editMode?: boolean
}
const props = defineProps<Props>()

// 通过 inject 获取响应式的会话连接状态
const isSessionConnected = inject<Ref<boolean>>('isSessionConnected', ref(false))

// ── 条目管理 ──────────────────────────────────────────
const {
  droppedItems, dragOverIndex, expandedItems, ifElseActiveTab,
  handleDrop,
  handleItemDragStart, handleItemDragEnter, handleItemDragEnd, handleItemDrop,
  handleBranchDrop, removeBranchItem, reorderBranchItem,
  toggleExpand, toggleExpandAll, toggleBranchExpand, removeItem,
  serializeBranchSteps, getActionParams, getInputVars, getOutputVars, getStepChildren, getSteps,
} = useDebugboxItems(props.browserId, props.editMode ?? false, props.initialSteps)

// ── 循环配置 ──────────────────────────────────────────
/** 确保 loop 类型的 item 有 loopConfig */
function ensureLoopConfig(item: DroppedItem): LoopConfig {
  if (!item.loopConfig) {
    item.loopConfig = defaultLoopConfig()
  }
  return item.loopConfig
}

// ── 选择逻辑 ──────────────────────────────────────────
/** 选中状态以 item.id 为 key，重排序后依然跟随卡片 */
const selectedIds = ref<Set<string>>(new Set())
const branchSelectedMap = ref<Record<string, Set<string>>>({})

function toggleSelect(index: number) {
  const item = droppedItems.value[index]
  if (!item) return
  const next = new Set(selectedIds.value)
  next.has(item.id) ? next.delete(item.id) : next.add(item.id)
  selectedIds.value = next
}
function toggleSelectAll() {
  selectedIds.value = selectedIds.value.size === droppedItems.value.length
    ? new Set()
    : new Set(droppedItems.value.map(i => i.id))
}

const getBranchSelectedKey = (parentIndex: number, branch: string) => `${parentIndex}-${branch}`
function getBranchSelected(parentIndex: number, branch: string): Set<string> {
  return branchSelectedMap.value[getBranchSelectedKey(parentIndex, branch)] ?? new Set()
}
function toggleBranchSelect(parentIndex: number, branch: string, childIndex: number) {
  const parent = droppedItems.value[parentIndex]
  if (!parent) return
  const targetBranch = branch === 'true' ? parent.trueBranch : branch === 'false' ? parent.falseBranch : parent.loopBody
  const child = targetBranch?.[childIndex]
  if (!child) return
  const key = getBranchSelectedKey(parentIndex, branch)
  const current = new Set(branchSelectedMap.value[key] ?? [])
  current.has(child.id) ? current.delete(child.id) : current.add(child.id)
  branchSelectedMap.value = { ...branchSelectedMap.value, [key]: current }
}
function toggleBranchSelectAll(parentIndex: number, branch: string) {
  const item = droppedItems.value[parentIndex]
  if (!item) return
  const targetBranch = branch === 'true' ? item.trueBranch : branch === 'false' ? item.falseBranch : item.loopBody
  if (!targetBranch) return
  const key = getBranchSelectedKey(parentIndex, branch)
  const current = branchSelectedMap.value[key]
  branchSelectedMap.value = {
    ...branchSelectedMap.value,
    [key]: current && current.size === targetBranch.length ? new Set() : new Set(targetBranch.map(i => i.id)),
  }
}

/** 辅佐函数：从集合中移除指定 id */
function removeFromSelectedSet(prev: Set<string>, id: string): Set<string> {
  const next = new Set(prev)
  next.delete(id)
  return next
}

// 删除主列表条目时同步清理多选
function handleRemoveItem(index: number) {
  const item = droppedItems.value[index]
  if (item) selectedIds.value = removeFromSelectedSet(selectedIds.value, item.id)
  removeItem(index)
}

// 删除分支条目时同步清理分支多选
function handleRemoveBranchItem(parentIndex: number, branch: 'true' | 'false' | 'loop', childIndex: number) {
  const parent = droppedItems.value[parentIndex]
  const targetBranch = parent ? (branch === 'true' ? parent.trueBranch : branch === 'false' ? parent.falseBranch : parent.loopBody) : undefined
  const child = targetBranch?.[childIndex]
  const key = getBranchSelectedKey(parentIndex, branch)
  const current = branchSelectedMap.value[key]
  if (current && child) {
    branchSelectedMap.value = { ...branchSelectedMap.value, [key]: removeFromSelectedSet(current, child.id) }
  }
  removeBranchItem(parentIndex, branch, childIndex)
}

// ── 执行引擎 ──────────────────────────────────────────
const {
  operatingId, operatingKind, operationFeedback, executingSelected, branchOperating,
  executeAction, previewAction, validateAction,
  handleExecuteSelected, handleExecuteBranchAll,
  executeBranchItem, previewBranchItem, validateBranchItem,
  closeOperationFeedback,
  execResultSteps, previewReplacedParams, previewFoundParams, previewVariables, nestedPreviewTree,
  validateMissingParams, validateInvalidParams, validateErrors,
} = useDebugboxExecution(
  droppedItems, props.browserId, isSessionConnected,
  getActionParams, getInputVars, getOutputVars, getStepChildren, serializeBranchSteps, selectedIds,
)

// ── 保存 ───────────────────────────────────────────────
const {
  saveDialogVisible, saveDialogLoading, saveDialogForm, saveDialogItem, saveDialogIndex, saveMultiItems,
  openSaveDialog, openSaveBranchDialog, handleSaveMulti, handleSaveBranchMulti, handleSaveDialogConfirm,
} = useDebugboxSave(droppedItems, selectedIds, serializeBranchSteps)

// ── 计算属性 ──────────────────────────────────────────
const selectedCount = computed(() => selectedIds.value.size)
const totalCount = computed(() => droppedItems.value.length)

// ── 暴露给父组件 ─────────────────────────────────────
defineExpose({ droppedItems, getSteps })
</script>

<template>
  <div
    class="debug-box-wrapper bg-bg/70 h-full flex flex-col"
    @dragover.prevent
    @drop="handleDrop"
  >
    <div class="flex-0 p-3 border-b border-border text-(--el-text-color-primary)">
      <h3 class="font-medium text-sm">{{ props.editMode ? '步骤列表' : '调试面板' }}</h3>
      <p class="text-xs text-color-secondary mt-1">
        {{ props.editMode ? '拖拽动作到此处调整步骤' : '从工具箱拖拽动作到此处，构建工作流' }}
      </p>
    </div>

    <el-scrollbar class="debug-box-content p-3 h-full">
      <div v-if="totalCount === 0" class="flex-1 flex flex-col items-center justify-center text-text-secondary">
        <el-icon size="48" class="mb-2 opacity-30"><Rank /></el-icon>
        <p class="text-sm">拖拽动作到此处</p>
        <p class="text-xs mt-1">从右侧工具箱选择动作插件</p>
      </div>

      <div v-else class="space-y-3" @dragover.prevent>
        <!-- 批量执行总览横幅 -->
        <div v-if="operationFeedback['__batch__']" class="p-3 rounded border text-xs" :class="(operationFeedback['__batch__'] as any).success ? 'border-(--el-color-primary) bg-(--el-color-primary-light-9)' : 'border-(--el-color-warning) bg-(--el-color-warning-light-9)'">
          <div class="flex items-center gap-2">
            <span :class="(operationFeedback['__batch__'] as any).success ? 'text-(--el-color-primary)' : 'text-(--el-color-warning)'">{{ (operationFeedback['__batch__'] as any).success ? '✓' : '⚠' }}</span>
            <span class="font-medium">{{ (operationFeedback['__batch__'] as any).summary }}</span>
            <button class="ml-auto p-0.5 rounded hover:bg-(--el-fill-color) transition-colors" @click="delete operationFeedback['__batch__']"><el-icon class="text-text-secondary text-xs"><Close /></el-icon></button>
          </div>
        </div>

        <div
          v-for="(item, index) in droppedItems"
          :key="item.id"
          data-drag-item
          class="group relative"
          :class="{ 'opacity-50': dragOverIndex === index }"
          @dragenter="(e: DragEvent) => handleItemDragEnter(e, index)"
          @drop="(e: DragEvent) => handleItemDrop(e, index)"
        >
          <div class="flex items-start gap-2 p-1 rounded border border-border hover:border-(--el-color-primary) transition-colors">
            <div v-if="!props.editMode" class="mt-1.5 shrink-0">
              <input type="checkbox" :checked="selectedIds.has(item.id)" @change="toggleSelect(index)"
                class="w-4 h-4 rounded border-gray-300 text-(--el-color-primary) cursor-pointer focus:ring-2 focus:ring-(--el-color-primary-light-5)" />
            </div>
            <div class="mt-2 cursor-move drag-handle" draggable="true" @dragstart="(e: DragEvent) => handleItemDragStart(e, index)" @dragend="handleItemDragEnd" @mousedown.stop>
              <el-icon class="text-gray-400"><Rank /></el-icon>
            </div>

            <div class="flex-1 min-w-0">
              <div class="flex items-start gap-3">
                <div class="flex-1 min-w-0">
                  <ActionCard :action="{ action_id: item.action_type || item.action_id, json_schema: item.json_schema, name: item.name, description: item.description }" :config-params="item.config_params" />
                </div>
                <div class="grid grid-cols-2 gap-3 shrink-0 py-1 button-stack">
                  <el-button size="small" :icon="VideoPlay" type="primary" :loading="operatingId === item.id && operatingKind === 'execute'" @click="executeAction(index)" class="execute-btn w-20">执行</el-button>
                  <el-button size="small" :icon="View" :loading="operatingId === item.id && operatingKind === 'preview'" @click="previewAction(index)" class="preview-btn w-20 ml-0">预览</el-button>
                  <el-button size="small" :icon="Check" :loading="operatingId === item.id && operatingKind === 'validate'" @click="validateAction(index)" class="validate-btn w-20 ml-0">验证</el-button>
                  <el-button size="small" :icon="FolderAdd" @click="openSaveDialog(index)" class="save-btn w-20 ml-0">另存为</el-button>
                </div>
              </div>

              <div v-if="expandedItems.has(item.id)" class="mt-2 p-3 rounded border border-border space-y-4">
                <!-- if_else 类型 -->
                <template v-if="item.action_type === 'if_else' || item.action_id === 'if_else'">
                  <div class="pb-3 border-b border-(--el-border-color-lighter)">
                    <ConditionEditor :model-value="(item.formData?.condition as any) || null"
                      @update:model-value="val => { if (!item.formData) item.formData = {}; (item.formData as any).condition = val }" />
                  </div>
                  <div>
                    <div class="flex items-center gap-2 mb-2">
                      <span class="text-sm font-semibold text-(--el-text-color-primary)">分支操作</span>
                      <span class="text-xs text-text-secondary">拖拽动作到对应分支中</span>
                    </div>
                    <el-alert class="mb-2" type="info" :effect="themeStore.themeEffectString" :closable="true" show-icon>
                      <template #title><span class="text-xs"><b>执行规则</b>：未设条件 → 走 <b>False 分支</b>；命中分支为空 → <b>跳过</b>并视为成功；分支有步骤 → <b>顺序执行</b></span></template>
                    </el-alert>
                    <el-tabs :model-value="ifElseActiveTab[item.id] ?? 'true'" type="border-card" class="if-else-branch-tabs"
                      @update:model-value="ifElseActiveTab[item.id] = $event as 'true' | 'false'">
                      <el-tab-pane name="true">
                        <template #label><span class="text-xs font-medium text-(--el-color-success)">True 分支<span v-if="item.trueBranch && item.trueBranch.length > 0" class="text-text-placeholder ml-1">({{ item.trueBranch.length }} 步)</span></span></template>
                        <div class="p-2 overflow-auto">
                          <BranchContainer branch="true" :items="item.trueBranch || []" :parent-index="index"
                            :selected-items="getBranchSelected(index, 'true')" :expanded-items="expandedItems"
                            :feedback-map="operationFeedback" :operating-map="branchOperating"
                            @drop="(e: DragEvent, insertIndex?: number) => handleBranchDrop(e, index, 'true', insertIndex)"
                            @select-all="toggleBranchSelectAll(index, 'true')"
                            @save-multi="handleSaveBranchMulti(index, 'true')"
                            @execute-all="handleExecuteBranchAll(index, 'true')"
                            @item:execute="(bi: number, p?: BranchPathStep[]) => executeBranchItem(index, 'true', bi, p)"
                            @item:preview="(bi: number, p?: BranchPathStep[]) => previewBranchItem(index, 'true', bi, p)"
                            @item:validate="(bi: number, p?: BranchPathStep[]) => validateBranchItem(index, 'true', bi, p)"
                            @item:toggle-expand="(bi: number) => toggleBranchExpand(index, 'true', bi)"
                            @item:remove="(bi: number) => handleRemoveBranchItem(index, 'true', bi)"
                            @item:toggle-select="(bi: number) => toggleBranchSelect(index, 'true', bi)"
                            @item:save-as="(bi: number, p?: BranchPathStep[]) => openSaveBranchDialog(index, 'true', bi, p)"
                            @item:close-feedback="(id: string) => closeOperationFeedback(id)"
                            @reorder="(from: number, to: number) => reorderBranchItem(index, 'true', from, to)" />
                        </div>
                      </el-tab-pane>
                      <el-tab-pane name="false">
                        <template #label><span class="text-xs font-medium text-(--el-color-danger)">False 分支<span v-if="item.falseBranch && item.falseBranch.length > 0" class="text-text-placeholder ml-1">({{ item.falseBranch.length }} 步)</span></span></template>
                        <div class="p-2 overflow-auto">
                          <BranchContainer branch="false" :items="item.falseBranch || []" :parent-index="index"
                            :selected-items="getBranchSelected(index, 'false')" :expanded-items="expandedItems"
                            :feedback-map="operationFeedback" :operating-map="branchOperating"
                            @drop="(e: DragEvent, insertIndex?: number) => handleBranchDrop(e, index, 'false', insertIndex)"
                            @select-all="toggleBranchSelectAll(index, 'false')"
                            @save-multi="handleSaveBranchMulti(index, 'false')"
                            @execute-all="handleExecuteBranchAll(index, 'false')"
                            @item:execute="(bi: number, p?: BranchPathStep[]) => executeBranchItem(index, 'false', bi, p)"
                            @item:preview="(bi: number, p?: BranchPathStep[]) => previewBranchItem(index, 'false', bi, p)"
                            @item:validate="(bi: number, p?: BranchPathStep[]) => validateBranchItem(index, 'false', bi, p)"
                            @item:toggle-expand="(bi: number) => toggleBranchExpand(index, 'false', bi)"
                            @item:remove="(bi: number) => handleRemoveBranchItem(index, 'false', bi)"
                            @item:toggle-select="(bi: number) => toggleBranchSelect(index, 'false', bi)"
                            @item:save-as="(bi: number, p?: BranchPathStep[]) => openSaveBranchDialog(index, 'false', bi, p)"
                            @item:close-feedback="(id: string) => closeOperationFeedback(id)"
                            @reorder="(from: number, to: number) => reorderBranchItem(index, 'false', from, to)" />
                        </div>
                      </el-tab-pane>
                    </el-tabs>
                  </div>
                </template>

                <!-- loop 类型 -->
                <template v-else-if="item.action_type === 'loop' || item.action_id === 'loop'">
                  <div class="pb-3 border-b border-(--el-border-color-lighter)">
                    <LoopEditor
                      :model-value="ensureLoopConfig(item)"
                      @update:model-value="val => { item.loopConfig = val }"
                    />
                  </div>
                  <div>
                    <el-card shadow="never" body-style="padding: 12px;">
                      <div class="flex items-center gap-2 mb-2">
                        <span class="text-sm font-semibold text-(--el-text-color-primary)">循环体</span>
                        <span class="text-xs text-text-secondary">拖拽动作到此处</span>
                        <el-tag size="small" type="primary" effect="plain" v-if="item.loopBody && item.loopBody.length > 0">{{ item.loopBody.length }} 步</el-tag>
                      </div>
                      <BranchContainer branch="loop" :items="item.loopBody || []" :parent-index="index"
                        :selected-items="getBranchSelected(index, 'loop')" :expanded-items="expandedItems"
                        :feedback-map="operationFeedback" :operating-map="branchOperating"
                        @drop="(e: DragEvent, insertIndex?: number) => handleBranchDrop(e, index, 'loop', insertIndex)"
                        @select-all="toggleBranchSelectAll(index, 'loop')"
                        @save-multi="handleSaveBranchMulti(index, 'loop')"
                        @execute-all="handleExecuteBranchAll(index, 'loop')"
                        @item:execute="(bi: number, p?: BranchPathStep[]) => executeBranchItem(index, 'loop', bi, p)"
                        @item:preview="(bi: number, p?: BranchPathStep[]) => previewBranchItem(index, 'loop', bi, p)"
                        @item:validate="(bi: number, p?: BranchPathStep[]) => validateBranchItem(index, 'loop', bi, p)"
                        @item:toggle-expand="(bi: number) => toggleBranchExpand(index, 'loop', bi)"
                        @item:remove="(bi: number) => handleRemoveBranchItem(index, 'loop', bi)"
                        @item:toggle-select="(bi: number) => toggleBranchSelect(index, 'loop', bi)"
                        @item:save-as="(bi: number, p?: BranchPathStep[]) => openSaveBranchDialog(index, 'loop', bi, p)"
                        @item:close-feedback="(id: string) => closeOperationFeedback(id)"
                        @reorder="(from: number, to: number) => reorderBranchItem(index, 'loop', from, to)" />
                    </el-card>
                  </div>
                </template>

                <!-- 通用参数表单 -->
                <template v-else>
                  <ActionParamsForm v-model:form-data="item.formData" :json-schema="item.json_schema"
                    :input-vars="item.input_vars" :output-vars="item.output_vars"
                    @update:input-vars="item.input_vars = $event"
                    @update:output-vars="item.output_vars = $event" />
                </template>
              </div>

              <!-- 操作反馈面板 -->
              <div v-if="operationFeedback[item.id]" class="mt-2">
                <OperationFeedbackPanel :feedback="operationFeedback[item.id] as any"
                  :exec-steps="execResultSteps(item.id)"
                  :preview-replaced-params="previewReplacedParams(item.id)"
                  :preview-found-params="previewFoundParams(item.id)"
                  :preview-variables="previewVariables(item.id)"
                  :preview-nested-tree="nestedPreviewTree(item.id)"
                  :validate-missing-params="validateMissingParams(item.id)"
                  :validate-invalid-params="validateInvalidParams(item.id)"
                  :validate-errors="validateErrors(item.id)"
                  @close="closeOperationFeedback(item.id)" />
              </div>
            </div>

            <div class="flex flex-col gap-1 mt-2">
              <button class="expand-more-params-btn p-1 rounded hover:bg-(--el-fill-color) transition-colors" @click.stop="toggleExpand(index)">
                <el-icon class="text-(--el-text-color-primary)"><component :is="expandedItems.has(item.id) ? ArrowUp : ArrowDown" /></el-icon>
              </button>
              <button class="p-1 rounded hover:bg-(--el-color-danger-light) transition-colors" @click.stop="handleRemoveItem(index)">
                <el-icon class="text-red-500"><Delete /></el-icon>
              </button>
            </div>
          </div>

          <div v-if="dragOverIndex === index && dragOverIndex !== null"
            class="absolute inset-x-0 bottom-0 h-0.5 bg-(--el-color-primary) rounded"></div>
        </div>
      </div>
    </el-scrollbar>

    <!-- 底部工具栏 -->
    <div v-if="!props.editMode && totalCount > 0" class="flex-0 p-3 border-t border-border bg-(--el-fill-color-light)">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <el-button size="small" :icon="expandedItems.size === 0 ? ArrowDown : ArrowUp" @click="toggleExpandAll">
            {{ expandedItems.size === 0 ? '展开全部' : '收起全部' }}
          </el-button>
          <input type="checkbox" :checked="selectedCount === totalCount && totalCount > 0"
            :indeterminate="selectedCount > 0 && selectedCount < totalCount"
            @change="toggleSelectAll"
            class="w-4 h-4 rounded border-gray-300 text-(--el-color-primary) cursor-pointer focus:ring-2 focus:ring-(--el-color-primary-light-5)" />
          <span class="text-xs text-color-secondary">
            {{ selectedCount > 0 ? `已选 ${selectedCount} / ${totalCount} 个动作` : `共 ${totalCount} 个动作` }}
          </span>
        </div>
        <div class="flex gap-2">
          <el-button size="small" @click="handleSaveMulti">保存为动作</el-button>
          <el-button size="small" type="primary" :loading="executingSelected"
            :disabled="selectedCount === 0 || !isSessionConnected" @click="handleExecuteSelected">
            {{ selectedCount === totalCount && totalCount > 0 ? `执行全部（${selectedCount}）` : selectedCount > 0 ? `执行选中（${selectedCount}）` : '执行选中' }}
          </el-button>
        </div>
      </div>
    </div>

    <!-- 保存对话框 -->
    <el-dialog v-model="saveDialogVisible"
      :title="saveMultiItems.length > 1 ? '保存为自定义动作' : '另存为自定义操作'"
      width="500px" :close-on-click-modal="false" :modal="false" :lock-scroll="false" :draggable="true" :modal-penetrable="true">
      <el-form :model="saveDialogForm" label-width="100px" label-position="left">
        <el-form-item label="操作名称" required>
          <el-input v-model="saveDialogForm.name" placeholder="请输入自定义操作名称" maxlength="200" show-word-limit />
        </el-form-item>
        <el-form-item label="操作描述">
          <el-input v-model="saveDialogForm.description" type="textarea" :rows="3" placeholder="请输入操作描述（可选）" maxlength="500" show-word-limit />
        </el-form-item>
        <el-form-item label="是否公开">
          <div class="flex flex-col">
            <el-switch v-model="saveDialogForm.isPublic" />
            <span class="text-xs text-text-secondary mt-1">公开后所有用户都可以使用此操作</span>
          </div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="saveDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saveDialogLoading" @click="handleSaveDialogConfirm">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>
