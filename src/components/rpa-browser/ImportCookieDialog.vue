<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import {
  submitImportCookiesTask,
  waitOperationTask
} from '@/api/browser/operation_task_api'
import { useUserNavStore } from '@/stores/user_nav'
import { parseCookieList, type ParsedCookieList } from '@/utils/rpa/cookieJson'

/**
 * 单个浏览器的 Cookie 导入弹窗。
 *
 * 只负责「收集 JSON → 轻校验 → 调接口」，不缓存任何内容：
 * 关闭即清空输入，导入成功后数据由浏览器自己接管。
 */

const props = defineProps<{
  visible: boolean
  browserId: string
  browserName?: string
}>()

const emit = defineEmits<{
  'update:visible': [visible: boolean]
  success: [importedCount: number]
}>()

const userNavStore = useUserNavStore()

const visibleModel = computed({
  get: () => props.visible,
  set: (value: boolean) => emit('update:visible', value)
})

const cookieText = ref('')
const fileName = ref('')
const parseState = ref<ParsedCookieList | null>(null)
const parseError = ref('')
const launchIfNotRunning = ref(false)
const submitting = ref(false)
const taskMessage = ref('')
const fileInputRef = ref<HTMLInputElement | null>(null)

function revalidate() {
  parseState.value = null
  parseError.value = ''
  if (!cookieText.value.trim()) {
    return
  }
  try {
    parseState.value = parseCookieList(cookieText.value)
  } catch (error) {
    parseError.value = error instanceof Error ? error.message : '解析失败'
  }
}

function triggerFilePick() {
  fileInputRef.value?.click()
}

async function handleFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  // 清空 value，允许重复选择同一个文件
  input.value = ''
  if (!file) {
    return
  }
  fileName.value = file.name
  try {
    cookieText.value = await file.text()
    revalidate()
  } catch {
    ElMessage.error('读取文件失败')
  }
}

async function submit() {
  if (!parseState.value) {
    revalidate()
    return
  }
  if (!props.browserId) {
    ElMessage.error('缺少浏览器 ID')
    return
  }

  submitting.value = true
  taskMessage.value = '正在提交任务…'
  const submitted = await submitImportCookiesTask(
    [props.browserId],
    [parseState.value.cookies],
    userNavStore.user_header,
    { launchIfNotRunning: launchIfNotRunning.value }
  )

  if (!submitted.success || !submitted.data) {
    submitting.value = false
    taskMessage.value = ''
    return
  }

  try {
    const final = await waitOperationTask(
      submitted.data.task_id,
      userNavStore.user_header,
      {
        onUpdate: (status) => {
          taskMessage.value = status.message || '写入中…'
        }
      }
    )

    if (final.status === 'failed') {
      ElMessage.error(final.error || '导入任务失败')
      return
    }

    const item = final.import_result?.results?.[0]
    if (!item) {
      ElMessage.error('任务完成但没有返回结果，请重试')
      return
    }
    if (item.status !== 'success') {
      ElMessage.error(item.message || '导入失败')
      return
    }

    const importedCount = item.imported_count ?? 0
    ElMessage.success(`已写入 ${importedCount} 条 cookie`)
    if ((item.session_cookie_count ?? 0) > 0) {
      ElMessage.warning(
        `其中 ${item.session_cookie_count} 条为会话 cookie，浏览器重启后会失效`
      )
    }

    emit('success', importedCount)
    visibleModel.value = false
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '导入任务失败')
  } finally {
    submitting.value = false
    taskMessage.value = ''
  }
}

/** 关闭即丢弃输入，避免明文凭证停留在页面上 */
watch(visibleModel, (visible) => {
  if (visible) {
    return
  }
  cookieText.value = ''
  fileName.value = ''
  parseState.value = null
  parseError.value = ''
  launchIfNotRunning.value = false
  submitting.value = false
})
</script>

<template>
  <el-dialog
    v-model="visibleModel"
    title="导入 Cookie"
    width="760px"
    :close-on-click-modal="false"
    lock-scroll
    destroy-on-close
    class="import-cookie-dialog"
  >
    <div class="import-cookie-dialog__body flex flex-col gap-3">
      <el-text class="import-cookie-dialog__target text-text-secondary">
        目标浏览器：{{ browserName || browserId }}
      </el-text>

      <el-text class="import-cookie-dialog__hint text-text-secondary">
        粘贴导出文件里的 cookies 数组，或选择 .json 文件。导入会覆盖同名 cookie（domain + path + name），
        但不会删除其它旧 cookie；要彻底换号请先「清空登录态」。
      </el-text>

      <div class="import-cookie-dialog__file flex items-center gap-2 flex-wrap">
        <el-button @click="triggerFilePick">选择 JSON 文件</el-button>
        <el-text class="import-cookie-dialog__file-name text-text-placeholder">
          {{ fileName || '未选择文件' }}
        </el-text>
        <input
          ref="fileInputRef"
          class="import-cookie-dialog__file-input hidden"
          type="file"
          accept=".json,application/json"
          @change="handleFileChange"
        />
      </div>

      <el-input
        v-model="cookieText"
        class="import-cookie-dialog__editor"
        type="textarea"
        :rows="12"
        placeholder='[{"name": "SESSDATA", "value": "...", "domain": ".bilibili.com", "path": "/", "expires": 1830153655}]'
        @input="revalidate"
      />

      <div
        v-if="parseState"
        class="import-cookie-dialog__preview flex items-center gap-2 flex-wrap"
      >
        <el-tag type="success" effect="plain">{{ parseState.cookies.length }} 条 cookie</el-tag>
        <el-tag v-if="parseState.sessionCount > 0" type="warning" effect="plain">
          {{ parseState.sessionCount }} 条会话 cookie，重启后失效
        </el-tag>
      </div>
      <el-text
        v-else-if="parseError"
        class="import-cookie-dialog__error"
        type="danger"
      >
        {{ parseError }}
      </el-text>

      <el-checkbox v-model="launchIfNotRunning" class="import-cookie-dialog__launch">
        浏览器未运行时顺带启动（会占用启动队列与时长配额）
      </el-checkbox>
    </div>

    <template #footer>
      <div class="import-cookie-dialog__footer flex items-center justify-end gap-2">
        <el-button @click="visibleModel = false">取消</el-button>
        <el-button
          type="primary"
          :loading="submitting"
          :disabled="!parseState"
          @click="submit"
        >
          导入
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>
