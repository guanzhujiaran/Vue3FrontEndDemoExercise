<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import {
  RECORD_ID_PLACEHOLDER,
  RESOURCE_ID_PLACEHOLDER,
  RESOURCE_TYPE_PLACEHOLDER,
  buildLinkUrl,
  useResourceLinkTemplate,
} from '@/composables/useResourceLinkTemplate'

/**
 * 「前端跳转链接格式」配置弹窗（按工作流保存到浏览器本地）。
 *
 * 配置一条 URL 模板，表格里点「打开」时用该行业务主键替换 `{resource_id}`，
 * 例如 `https://www.bilibili.com/video/{resource_id}`。
 */
interface Props {
  modelValue: boolean
  /** 当前工作流ID（雪花字符串，同时作为本地存储的分组键） */
  workflowId: string
  /** 工作流名称，仅用于展示 */
  workflowName?: string
}

const props = withDefaults(defineProps<Props>(), { workflowName: '' })

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

const { getTemplate, setTemplate, removeTemplate } = useResourceLinkTemplate()

const visible = computed({
  get: () => props.modelValue,
  set: (value: boolean) => emit('update:modelValue', value),
})

/** 编辑中的模板（未保存前不影响表格） */
const draft = ref('')
/** 预览用的业务主键样例 */
const sampleId = ref('1000001')

const savedTemplate = computed(() => getTemplate(props.workflowId))
const hasPlaceholder = computed(
  () =>
    draft.value.includes(RESOURCE_ID_PLACEHOLDER) ||
    draft.value.includes(RECORD_ID_PLACEHOLDER)
)
const previewUrl = computed(() => {
  const template = draft.value.trim()
  if (!template) return ''
  return buildLinkUrl(template, {
    resource_id: sampleId.value.trim() || '0',
    record_id: 1,
    resource_type: 'bili_lottery_official',
  })
})

watch(
  () => props.modelValue,
  (open) => {
    if (open) draft.value = savedTemplate.value
  }
)

function handleSave() {
  const template = draft.value.trim()
  if (!template) {
    ElMessage.warning('请填写跳转链接格式')
    return
  }
  if (!hasPlaceholder.value) {
    ElMessage.warning(`链接格式中需要包含 ${RESOURCE_ID_PLACEHOLDER}，否则无法替换业务主键`)
    return
  }
  setTemplate(props.workflowId, template)
  ElMessage.success('已保存到本地（仅当前浏览器生效）')
  visible.value = false
}

function handleClear() {
  removeTemplate(props.workflowId)
  draft.value = ''
  ElMessage.success('已清除该工作流的跳转链接格式')
}

function handleClose() {
  visible.value = false
}
</script>

<template>
  <el-dialog
    v-model="visible"
    class="resource-link-template-dialog"
    title="前端跳转链接格式"
    width="640px"
    append-to-body
    :close-on-click-modal="false"
  >
    <div class="resource-link-template flex flex-col gap-4">
      <el-text class="resource-link-template__workflow text-text-secondary" size="default">
        当前工作流：{{ workflowName || workflowId || '-' }}
      </el-text>

      <div class="resource-link-template__field flex flex-col gap-2">
        <label class="text-text-secondary">链接格式</label>
        <el-input
          v-model="draft"
          class="resource-link-template__input"
          placeholder="https://www.bilibili.com/video/{resource_id}"
          clearable
        />
        <div class="resource-link-template__hint flex flex-col gap-1 text-text-secondary">
          <span>占位符会在表格里按行替换：</span>
          <span>
            <el-tag type="info" effect="plain">{{ RESOURCE_ID_PLACEHOLDER }}</el-tag>
            <span class="ml-1">业务主键（resource_id）</span>
          </span>
          <span>
            <el-tag type="info" effect="plain">{{ RECORD_ID_PLACEHOLDER }}</el-tag>
            <span class="ml-1">记录主键（去重表自增 id）</span>
            <el-tag class="ml-3" type="info" effect="plain">{{ RESOURCE_TYPE_PLACEHOLDER }}</el-tag>
            <span class="ml-1">资源类型</span>
          </span>
          <span>配置只保存在当前浏览器，按工作流分别保存，不写入后端。</span>
        </div>
      </div>

      <div class="resource-link-template__preview flex flex-col gap-2">
        <div class="flex items-center gap-2">
          <label class="text-text-secondary">预览业务主键</label>
          <el-input
            v-model="sampleId"
            class="resource-link-template__sample w-48"
            placeholder="预览用业务主键"
            clearable
          />
        </div>
        <el-text
          v-if="previewUrl"
          class="resource-link-template__preview-url break-all"
          type="primary"
        >
          {{ previewUrl }}
        </el-text>
        <el-text v-else class="resource-link-template__preview-empty text-text-secondary">
          填写链接格式后在此预览实际跳转地址
        </el-text>
      </div>
    </div>

    <template #footer>
      <div class="resource-link-template-dialog__footer flex items-center justify-between">
        <el-button
          class="resource-link-template-dialog__clear"
          :disabled="!savedTemplate"
          @click="handleClear"
        >
          清除配置
        </el-button>
        <div class="flex items-center gap-2">
          <el-button class="resource-link-template-dialog__cancel" @click="handleClose">
            取消
          </el-button>
          <el-button
            class="resource-link-template-dialog__save"
            type="primary"
            @click="handleSave"
          >
            保存
          </el-button>
        </div>
      </div>
    </template>
  </el-dialog>
</template>
