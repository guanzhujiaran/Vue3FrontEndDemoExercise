<template>
  <div class="flex flex-col gap-3">
    <div class="flex items-center justify-between pb-2 border-b border-[var(--el-border-color-lighter)]">
      <span class="text-sm font-medium flex items-center gap-1.5">
        <el-icon><Edit /></el-icon>
        文本输入
      </span>
    </div>

    <div class="space-y-3">
      <el-form :model="inputForm" label-width="60px" size="small" label-position="top">
        <el-form-item label="选择器">
          <el-input v-model="inputForm.selector" placeholder="input[type='text']" />
        </el-form-item>
        <el-form-item label="输入文本">
          <el-input v-model="inputForm.text" type="textarea" :rows="3" placeholder="输入要填写的文本..." />
        </el-form-item>
      </el-form>

      <div class="flex gap-2">
        <el-button size="small" type="primary" :loading="inputting.value" class="flex-1" @click="handleInput">
          输入文本
        </el-button>
        <el-button size="small" :loading="inputting.value" class="flex-1" @click="handleClear">
          清空
        </el-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive } from 'vue'
import { Edit } from '@element-plus/icons-vue'
import { browserLiveControlApi } from '@/api/browser/browser_api'

const props = defineProps<{
  browserId: string
  browserRunning: boolean
  pageIndex: number
}>()

const emit = defineEmits<{
  log: [message: string, type: 'info' | 'success' | 'warning' | 'error']
}>()

const inputting = reactive({ value: false })

const inputForm = reactive({
  selector: '',
  text: ''
})

const handleInput = async () => {
  if (!props.browserRunning) return
  inputting.value = true
  try {
    emit('log', `执行输入操作: selector=${inputForm.selector}, text=${inputForm.text.substring(0, 30)}...`, 'info')
    const res = await browserLiveControlApi.executeAction({
      browser_id: props.browserId,
      req: {
        action_id: 'input',
        params: { selector: inputForm.selector, text: inputForm.text, clear: true },
        page_index: props.pageIndex
      }
    })
    if (res.code === 0) {
      emit('log', '输入成功', 'success')
    } else {
      emit('log', `输入失败: ${res.msg}`, 'error')
    }
  } catch (e) {
    emit('log', `输入异常: ${e}`, 'error')
  } finally {
    inputting.value = false
  }
}

const handleClear = async () => {
  if (!props.browserRunning) return
  inputting.value = true
  try {
    emit('log', `执行清空操作: selector=${inputForm.selector}`, 'info')
    const res = await browserLiveControlApi.executeAction({
      browser_id: props.browserId,
      req: {
        action_id: 'clear_input',
        params: { selector: inputForm.selector },
        page_index: props.pageIndex
      }
    })
    if (res.code === 0) {
      emit('log', '清空成功', 'success')
    } else {
      emit('log', `清空失败: ${res.msg}`, 'error')
    }
  } catch (e) {
    emit('log', `清空异常: ${e}`, 'error')
  } finally {
    inputting.value = false
  }
}
</script>