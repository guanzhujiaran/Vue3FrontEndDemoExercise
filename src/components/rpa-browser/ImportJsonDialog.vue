<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Document, Upload } from '@element-plus/icons-vue'
import { pickJsonFileText, parseShareJsonText, errMsg, type ShareJsonKind } from '@/utils/rpa/jsonImport'

/**
 * RPA 导入分享弹窗（动作 / 工作流共用）。
 *
 * 「导入」对用户就是「把对方给的配置粘回来」：弹窗里可直接粘贴 JSON 文本，
 * 也可以点「从文件选择」把 .json 文件内容读进编辑框；确认后交给父页面 POST 到导入接口。
 * 校验只做「是不是一份能导入的 JSON」这一层，字段合法性由后端接口最终裁定。
 */

interface Props {
  /** 导入对象类型，决定文案与校验规则 */
  kind: ShareJsonKind
  /** 正在提交给后端 */
  importing?: boolean
}

const props = withDefaults(defineProps<Props>(), { importing: false })
const visible = defineModel<boolean>({ required: true })
const emit = defineEmits<{ submit: [payload: Record<string, unknown>] }>()

const kindLabel = computed(() => (props.kind === 'action' ? '动作' : '工作流'))
const dialogTitle = computed(() => `导入${kindLabel.value}分享`)

/** 编辑框内容（粘贴、文件读取都写这里） */
const jsonText = ref('')
/** 非解析类错误（读文件失败等），解析错误由 validation 派生 */
const fileError = ref('')
/** 最近一次读取的文件名，仅用于展示来源 */
const pickedFileName = ref('')

type Validation =
  | { status: 'empty' }
  | { status: 'ok'; payload: Record<string, unknown>; summary: string }
  | { status: 'error'; message: string }

/** 输入即校验：空 / 已识别 / 有错三种状态，供按钮可用性与提示使用 */
const validation = computed<Validation>(() => {
  const text = jsonText.value.trim()
  if (!text) return { status: 'empty' }
  try {
    const payload = parseShareJsonText(text, props.kind)
    return { status: 'ok', payload, summary: summarize(payload) }
  } catch (e) {
    return { status: 'error', message: errMsg(e) }
  }
})

const errorText = computed(() =>
  fileError.value || (validation.value.status === 'error' ? validation.value.message : '')
)

const parsedPayload = computed(() =>
  validation.value.status === 'ok' ? validation.value.payload : null
)

/** 识别成功后的摘要：动作给「名称 + 步骤数」，工作流给「名称」 */
function summarize(payload: Record<string, unknown>): string {
  const rawName = typeof payload.name === 'string' ? payload.name.trim() : ''
  const name = rawName || '未命名'
  if (props.kind === 'action') {
    const steps = Array.isArray(payload.steps) ? payload.steps.length : 0
    return `动作「${name}」· ${steps} 个步骤`
  }
  return `工作流「${name}」`
}

const handlePickFile = async () => {
  try {
    const picked = await pickJsonFileText()
    if (!picked) return // 用户取消
    jsonText.value = picked.text
    pickedFileName.value = picked.name
    fileError.value = ''
  } catch (e) {
    fileError.value = errMsg(e)
  }
}

const handleClear = () => {
  jsonText.value = ''
  pickedFileName.value = ''
  fileError.value = ''
}

const handleSubmit = () => {
  const payload = parsedPayload.value
  if (!payload) return
  emit('submit', payload)
}

// 每次打开都从空白开始，避免上一次的残留内容被误导入
watch(visible, (open) => {
  if (!open) return
  jsonText.value = ''
  fileError.value = ''
  pickedFileName.value = ''
})
</script>

<template>
  <el-dialog
    v-model="visible"
    :title="dialogTitle"
    width="720px"
    :lock-scroll="false"
    :close-on-click-modal="!importing"
    :close-on-press-escape="!importing"
    :show-close="!importing"
    class="import-json-dialog"
  >
    <div class="import-json-dialog__body flex flex-col gap-3">
      <el-text class="import-json-dialog__hint" type="info">
        把对方分享的 JSON 直接粘贴到下面，也可以点「从文件选择」读取 .json 文件；确认后会在你的名下新建一份{{ kindLabel }}副本，不影响线上已有内容。
      </el-text>

      <el-input
        v-model="jsonText"
        type="textarea"
        :rows="14"
        resize="vertical"
        placeholder='在此粘贴分享 JSON（Ctrl/Cmd + V），例如 {"name": "我的配置", "steps": [...]}'
        class="import-json-dialog__editor font-mono text-xs"
      />

      <div class="import-json-dialog__status flex flex-wrap items-center gap-3">
        <el-text v-if="pickedFileName" class="import-json-dialog__file" type="info">
          来源文件：{{ pickedFileName }}
        </el-text>
        <el-text v-if="validation.status === 'ok'" class="import-json-dialog__summary" type="success">
          已识别 {{ validation.summary }}
        </el-text>
        <el-text v-else-if="validation.status === 'empty'" class="import-json-dialog__empty" type="info">
          尚未输入内容
        </el-text>
      </div>

      <el-alert
        v-if="errorText"
        :title="errorText"
        type="error"
        :closable="false"
        class="import-json-dialog__error"
      />

      <el-text class="import-json-dialog__tip" type="info">
        分享内容不包含对方的账号信息与运行记录；导入生成的副本归你所有，可继续编辑。
      </el-text>
    </div>

    <template #footer>
      <div class="import-json-dialog__actions flex items-center justify-between gap-2">
        <div class="import-json-dialog__actions-left flex items-center gap-2">
          <el-button :icon="Document" :disabled="importing" @click="handlePickFile">
            从文件选择
          </el-button>
          <el-button
            link
            class="import-json-dialog__clear"
            :disabled="importing || !jsonText"
            @click="handleClear"
          >
            清空
          </el-button>
        </div>
        <div class="import-json-dialog__actions-right flex items-center gap-2">
          <el-button :disabled="importing" @click="visible = false">取消</el-button>
          <el-button
            type="primary"
            :icon="Upload"
            :loading="importing"
            :disabled="validation.status !== 'ok'"
            class="import-json-dialog__submit"
            @click="handleSubmit"
          >
            确认导入
          </el-button>
        </div>
      </div>
    </template>
  </el-dialog>
</template>
