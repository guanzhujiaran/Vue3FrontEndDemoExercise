<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Minus } from '@element-plus/icons-vue'
import { updateCustomActionApiV1RpaBrowserControlCustomActionsUpdatePost } from '@/api/browser/hey-api'
import { useUserNavStore } from '@/stores/user_nav'
import biliMessage from '@/utils/message'
import DebugBox from './DebugBox.vue'
import MinimizeBar from './MinimizeBar.vue'
import type { DroppedItem } from './debugbox-types'

interface Props {
  modelValue: boolean
  actionDetail: Record<string, unknown> | null
  browserId: string
}

const props = defineProps<Props>()
const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'saved': []
}>()

const userNavStore = useUserNavStore()

const editItems = ref<DroppedItem[]>([])
const editingName = ref('')
const editingDescription = ref('')
const editingTags = ref<string[]>([])
const tagInputValue = ref('')
const saving = ref(false)
/** 每次打开弹窗递增，强制 DebugBox 重新挂载以加载 initialSteps */
const dialogKey = ref(0)
const debugBoxRef = ref<InstanceType<typeof DebugBox> | null>(null)

// ── 最小化状态 ─────────────────────────────────────────
const isMinimized = ref(false)
/** el-dialog 实际显示：外部打开且未最小化时才显示 */
const dialogVisible = computed(() => props.modelValue && !isMinimized.value)

function apiHeaders() {
  return {
    'x-bili-mid': userNavStore.user_nav.uid,
    'x-bili-level': String(userNavStore.user_nav.level_info.current_level),
  }
}

/** 将后端 steps 反序列化为前端可编辑的 DroppedItem[] */
function convertStepsToItems(steps: Record<string, unknown>[]): DroppedItem[] {
  return steps.map((step, i) => {
    const sp = { ...((step.params || {}) as Record<string, unknown>) }
    let trueBranch: DroppedItem[] | undefined
    let falseBranch: DroppedItem[] | undefined
    let loopBody: DroppedItem[] | undefined
    if (sp.TrueBranch && Array.isArray(sp.TrueBranch)) {
      trueBranch = convertStepsToItems(sp.TrueBranch as Record<string, unknown>[])
      delete sp.TrueBranch
    }
    if (sp.FalseBranch && Array.isArray(sp.FalseBranch)) {
      falseBranch = convertStepsToItems(sp.FalseBranch as Record<string, unknown>[])
      delete sp.FalseBranch
    }
    if (sp.loopBranch && Array.isArray(sp.loopBranch)) {
      loopBody = convertStepsToItems(sp.loopBranch as Record<string, unknown>[])
      delete sp.loopBranch
    }
    return {
      id: `edit-step-${i}-${Date.now()}`,
      name: (step.name as string) || (step.action_id as string) || `步骤${i + 1}`,
      action_id: (step.action_id as string) || '',
      action_type: (step.action_type as string) || (step.action_id as string) || '',
      description: (step.description as string) || '',
      type: 'action',
      formData: { ...sp },
      input_vars: (step.input_vars || {}) as Record<string, unknown>,
      output_vars: (step.output_vars || []) as string[],
      config_params: {},
      trueBranch, falseBranch, loopBody,
    }
  })
}

watch(() => props.modelValue, (visible) => {
  if (visible && props.actionDetail) {
    isMinimized.value = false
    editingName.value = (props.actionDetail.name as string) || ''
    editingDescription.value = (props.actionDetail.description as string) || ''
    editingTags.value = Array.isArray(props.actionDetail.tags) ? [...(props.actionDetail.tags as string[])] : []
    tagInputValue.value = ''
    const steps = props.actionDetail.steps
    editItems.value = steps && Array.isArray(steps) ? convertStepsToItems(steps as Record<string, unknown>[]) : []
    dialogKey.value++
  }
}, { immediate: true })

function handleAddTag() {
  const tag = tagInputValue.value.trim()
  if (!tag) return
  if (editingTags.value.includes(tag)) {
    biliMessage.warning('标签已存在')
    return
  }
  editingTags.value.push(tag)
  tagInputValue.value = ''
}

function handleRemoveTag(tag: string) {
  editingTags.value = editingTags.value.filter(t => t !== tag)
}

function handleMinimize() {
  isMinimized.value = true
}

function handleRestore() {
  isMinimized.value = false
}

function handleClose() {
  isMinimized.value = false
  emit('update:modelValue', false)
}

/** el-dialog 关闭（用户点击 close 按钮） */
function handleDialogUpdate(val: boolean) {
  if (!val) {
    // 最小化导致 dialog 隐藏时，不要重置最小化状态或关闭弹窗
    if (isMinimized.value) return
    emit('update:modelValue', false)
  }
}

async function handleSave() {
  if (!props.actionDetail) return
  const actionId = props.actionDetail.action_id as string
  if (!actionId) return
  const steps = debugBoxRef.value?.getSteps() || []
  saving.value = true
  try {
    const response = await updateCustomActionApiV1RpaBrowserControlCustomActionsUpdatePost({
      body: {
        action_id: actionId,
        name: editingName.value || undefined,
        description: editingDescription.value || undefined,
        tags: editingTags.value,
        steps,
      },
      headers: apiHeaders(),
    })
    if (response?.code === 0) {
      biliMessage.success('自定义操作更新成功')
      emit('saved')
      emit('update:modelValue', false)
    } else {
      const msg = (response?.msg as string) || `更新失败 (code: ${response?.code})`
      console.error('[EditCustomActionDialog] 自定义操作更新失败:', response.data)
      biliMessage.error(msg)
    }
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('[EditCustomActionDialog] 自定义操作更新异常:', error)
    biliMessage.error(msg ? `更新失败: ${msg}` : '网络异常，更新失败')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <el-dialog
    :model-value="dialogVisible"
    width="80%"
    :modal-penetrable="true"
    :modal="false"
    :lock-scroll="false"
    :draggable="true"
    :close-on-click-modal="false"
    @update:model-value="handleDialogUpdate"
  >
    <template #header>
      <div class="relative w-full">
        <span class="font-medium text-sm">编辑自定义操作</span>
        <button
          class="absolute top-1/2 -translate-y-1/2 right-8 w-5 h-5 flex items-center justify-center cursor-pointer hover:text-color-secondary"
          title="最小化"
          @click="handleMinimize"
        >
          <el-icon :size="14"><Minus /></el-icon>
        </button>
      </div>
    </template>
    <div class="flex flex-col gap-3">
      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="text-xs text-color-secondary">名称</label>
          <el-input v-model="editingName" size="small" placeholder="操作名称" maxlength="50" show-word-limit />
        </div>
        <div>
          <label class="text-xs text-color-secondary">标签</label>
          <div class="flex flex-wrap gap-1.5 items-center tag-editor">
            <el-tag
              v-for="tag in editingTags"
              :key="tag"
              size="small"
              closable
              @close="handleRemoveTag(tag)"
            >{{ tag }}</el-tag>
            <div class="w-32">
              <el-input
                v-model="tagInputValue"
                size="small"
                placeholder="回车添加"
                @keyup.enter="handleAddTag"
              />
            </div>
          </div>
        </div>
      </div>
      <div>
        <label class="text-xs text-color-secondary">描述</label>
        <el-input
          v-model="editingDescription"
          type="textarea"
          :rows="2"
          placeholder="操作描述"
          maxlength="200"
          show-word-limit
        />
      </div>
      <div class="h-[60vh] border border-border rounded">
        <DebugBox
          :key="dialogKey"
          ref="debugBoxRef"
          :browser-id="browserId"
          :initial-steps="editItems"
          edit-mode
        />
      </div>
    </div>
    <template #footer>
      <el-button @click="handleClose">取消</el-button>
      <el-button type="primary" :loading="saving" @click="handleSave">保存</el-button>
    </template>
  </el-dialog>

  <!-- 最小化浮动标签 -->
  <MinimizeBar
    v-if="isMinimized"
    :title="editingName || '编辑自定义操作'"
    @restore="handleRestore"
    @close="handleClose"
  />
</template>
