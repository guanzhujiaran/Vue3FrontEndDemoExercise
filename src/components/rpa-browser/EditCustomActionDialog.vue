<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Minus } from '@element-plus/icons-vue'
import { 自定义操作管理Service } from '@/api/browser/hey-api'
import { useUserNavStore } from '@/stores/user_nav'
import biliMessage from '@/utils/message'
import { pickBackendMsg } from '@/utils/backendErrorMsg'
import DebugBox from './DebugBox.vue'
import ActionIconPicker from './ActionIconPicker.vue'
import MinimizeBar from './MinimizeBar.vue'
import type { DroppedItem } from './debugbox-types'
import { stepsToDroppedItems } from '@/utils/rpa/jsonImport'

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
/** 作者声明的语义化版本（服务端不自动递增，由人决定何时升版） */
const editingVersion = ref('1.0.0')
/** 当前内容指纹（只读展示，用于核对"我这个版本对应哪份内容"） */
const editingContentHash = ref('')
/** 动作展示图标：系列 + 系列内编号，0/0 表示默认图标 */
const editingIconSeries = ref(0)
const editingIconId = ref(0)
/** 报错时是否记录页面关键元素快照（写入操作日志 page_snapshot） */
const editingLogPageSnapshot = ref(false)
const tagInputValue = ref('')
const saving = ref(false)
/** 每次打开弹窗递增，强制 DebugBox 重新挂载以加载 initialSteps */
const dialogKey = ref(0)
const debugBoxRef = ref<InstanceType<typeof DebugBox> | null>(null)

// ── 最小化状态 ─────────────────────────────────────────
const isMinimized = ref(false)
/** el-dialog 实际显示：外部打开且未最小化时才显示 */
const dialogVisible = computed(() => props.modelValue && !isMinimized.value)

watch(() => props.modelValue, (visible) => {
  if (visible && props.actionDetail) {
    isMinimized.value = false
    editingName.value = (props.actionDetail.name as string) || ''
    editingDescription.value = (props.actionDetail.description as string) || ''
    editingVersion.value = (props.actionDetail.version as string) || '1.0.0'
    editingContentHash.value = (props.actionDetail.content_hash as string) || ''
    editingTags.value = Array.isArray(props.actionDetail.tags) ? [...(props.actionDetail.tags as string[])] : []
    editingIconSeries.value = (props.actionDetail.icon_series as number) ?? 0
    editingIconId.value = (props.actionDetail.icon_id as number) ?? 0
    // 采集开关是动作级配置，未设置时后端默认关闭
    editingLogPageSnapshot.value = Boolean(props.actionDetail.log_record_page_snapshot)
    tagInputValue.value = ''
    const steps = props.actionDetail.steps
    editItems.value = steps && Array.isArray(steps) ? stepsToDroppedItems(steps as Record<string, unknown>[]) : []
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
  // action_id 是雪花 int：SDK 的 CompositeActionUpdateRequest.action_id 声明为 number，
  // 详情对象里是 unknown，这里统一转成数字（0/NaN 视为无效标识）
  const actionId = Number(props.actionDetail.action_id)
  if (!Number.isFinite(actionId) || actionId <= 0) return
  const steps = debugBoxRef.value?.getSteps() || []
  saving.value = true
  try {
    const response = await 自定义操作管理Service.updateCustomActionApiV1RpaBrowserControlCustomActionsUpdatePost({
      body: {
        action_id: actionId,
        name: editingName.value || undefined,
        description: editingDescription.value || undefined,
        // 为空表示不修改版本号（后端 version=None 时保持原值）
        version: editingVersion.value || undefined,
        tags: editingTags.value,
        steps,
        icon_series: editingIconSeries.value,
        icon_id: editingIconId.value,
      },
      headers: userNavStore.user_header,
      // 后端审批拒绝等失败走非 2xx 响应，默认（throwOnError:false）会丢弃响应体导致
      // 只能展示兜底文案；开启后 catch 中可直接拿到后端 { code, msg, data }
      throwOnError: true,
    })
    if (response?.code === 0) {
      biliMessage.success('自定义操作更新成功')
      emit('saved')
      emit('update:modelValue', false)
    } else {
      const msg = (response?.msg as string) || '更新失败'
      console.error('[EditCustomActionDialog] 自定义操作更新失败:', response.data)
      biliMessage.error(msg)
    }
  } catch (error: unknown) {
    // 优先直接展示后端 msg（如「该操作需要先提交并通过审批」）；无 msg 或默认 500 才用兜底文案
    const backendMsg = pickBackendMsg(error)
    console.error('[EditCustomActionDialog] 自定义操作更新异常:', error)
    biliMessage.error(backendMsg || '网络异常，更新失败')
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
      <div class="edit-custom-action__version-section border border-border rounded p-3 flex flex-col gap-2">
        <div class="flex items-center gap-3">
          <label class="text-xs text-color-secondary whitespace-nowrap">版本号</label>
          <el-input
            v-model="editingVersion"
            class="edit-custom-action__version-input max-w-40"
            placeholder="如 1.1.0"
            maxlength="50"
            show-word-limit
          />
          <el-text
            v-if="editingContentHash"
            class="edit-custom-action__content-hash text-xs font-mono"
            type="info"
          >内容指纹：{{ editingContentHash.slice(0, 8) }}</el-text>
        </div>
        <el-text class="edit-custom-action__version-tip text-xs" type="info">
          版本号由作者自行维护，服务端不会自动递增；改了步骤或参数后是否升版由你决定。判断内容是否真的变化，看上面的内容指纹。
        </el-text>
      </div>
      <div class="edit-custom-action__icon-section border border-border rounded p-3 flex flex-col gap-2">
        <label class="text-xs text-color-secondary">动作图标</label>
        <ActionIconPicker v-model:series="editingIconSeries" v-model:id="editingIconId" />
      </div>
      <div class="edit-custom-action__log-section border border-border rounded p-3 flex flex-col gap-2">
        <div class="flex items-center gap-3">
          <label class="text-xs text-color-secondary whitespace-nowrap">报错页面快照</label>
          <el-switch
            v-model="editingLogPageSnapshot"
            class="edit-custom-action__log-switch"
            inline-prompt
            active-text="开"
            inactive-text="关"
          />
        </div>
        <el-text class="edit-custom-action__log-tip text-xs" type="info">
          开启后，该动作执行失败时会把当前页面的可交互元素（标签 / 选择器 / 文本）一并写入操作日志，便于排查「元素未找到、验证码弹窗」等问题；成功执行不采集。
        </el-text>
      </div>
      <div class="h-[60vh] border border-border rounded flex flex-col overflow-hidden">
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
