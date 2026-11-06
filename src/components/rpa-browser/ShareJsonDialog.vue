<script setup lang="ts">
import { computed } from 'vue'
import { ElMessage } from 'element-plus'
import { CopyDocument, Download } from '@element-plus/icons-vue'
import { stringifyShareJson, downloadJsonFile, copyText, shareFileName } from '@/utils/rpa/jsonShare'
import { errMsg } from '@/utils/rpa/jsonImport'

/**
 * RPA 分享弹窗（动作 / 工作流共用）。
 *
 * 「分享」对用户就是「把这份配置给到别人」：弹窗里给出与后端导入接口完全兼容的 JSON，
 * 用户可复制文本或下载 .json 文件；对方在对应管理页点「导入分享」选择该文件即可还原。
 */

interface Props {
  /** 分享对象类型，仅用于文案与默认文件名 */
  kind: 'action' | 'workflow'
  /** 分享对象名称（文件名前缀 / 弹窗副标题） */
  name: string
  /** 后端导出的 JSON 内容；null 表示还没拿到（配合 loading 展示） */
  payload: Record<string, unknown> | null
  /** 正在向后端请求分享内容 */
  loading?: boolean
}

const props = withDefaults(defineProps<Props>(), { loading: false })

const visible = defineModel<boolean>({ required: true })

const kindLabel = computed(() => (props.kind === 'action' ? '动作' : '工作流'))
const dialogTitle = computed(() => `分享${kindLabel.value}`)
const fileName = computed(() =>
  shareFileName(props.name, props.kind === 'action' ? 'rpa-action' : 'rpa-workflow')
)
const jsonText = computed(() => (props.payload ? stringifyShareJson(props.payload) : ''))
/** 提示里指向的导入入口，与两个管理页的按钮文案保持一致 */
const importEntryText = computed(() =>
  props.kind === 'action' ? '动作管理 → 导入分享' : '工作流管理 → 导入分享'
)

const handleCopy = async () => {
  if (!props.payload) return
  try {
    await copyText(jsonText.value)
    ElMessage.success('分享内容已复制，可直接发送给对方')
  } catch (e) {
    ElMessage.error(`复制失败：${errMsg(e)}`)
  }
}

const handleDownload = () => {
  if (!props.payload) return
  downloadJsonFile(fileName.value, props.payload)
  ElMessage.success(`已下载 ${fileName.value}`)
}
</script>

<template>
  <el-dialog
    v-model="visible"
    :title="dialogTitle"
    width="720px"
    :lock-scroll="false"
    class="share-json-dialog"
  >
    <div class="share-json-dialog__body flex flex-col gap-3">
      <div class="share-json-dialog__meta text-sm text-gray-400">
        <span class="share-json-dialog__name">分享「{{ name }}」</span>
        <span class="share-json-dialog__hint ml-2">对方在「{{ importEntryText }}」中选择这份 JSON 即可导入</span>
      </div>

      <div v-if="loading" class="share-json-dialog__loading py-10">
        <el-skeleton :rows="6" animated />
      </div>

      <el-input
        v-else
        :model-value="jsonText"
        type="textarea"
        :rows="16"
        readonly
        resize="vertical"
        class="share-json-dialog__preview font-mono text-xs"
      />

      <div class="share-json-dialog__tip text-xs text-gray-400">
        分享内容不包含你的账号信息与运行记录；导入后会以对方身份新建一份副本。
      </div>
    </div>

    <template #footer>
      <div class="share-json-dialog__actions flex items-center justify-end gap-2">
        <el-button :icon="CopyDocument" :disabled="loading || !payload" @click="handleCopy">
          复制 JSON
        </el-button>
        <el-button type="primary" :icon="Download" :disabled="loading || !payload" @click="handleDownload">
          下载 JSON
        </el-button>
        <el-button @click="visible = false">关闭</el-button>
      </div>
    </template>
  </el-dialog>
</template>
