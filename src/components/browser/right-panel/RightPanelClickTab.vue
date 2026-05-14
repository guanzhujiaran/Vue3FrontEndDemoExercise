<template>
  <div class="flex flex-col gap-3">
    <div class="flex items-center justify-between pb-2 border-b border-[var(--el-border-color-lighter)]">
      <span class="text-sm font-medium flex items-center gap-1.5">
        <el-icon><Pointer /></el-icon>
        元素操作
      </span>
    </div>

    <div class="space-y-3">
      <el-form :model="clickForm" label-width="60px" size="small" label-position="top">
        <el-form-item label="选择器">
          <el-input v-model="clickForm.selector" placeholder="body" />
        </el-form-item>
        <el-form-item label="X坐标">
          <el-input-number v-model="clickForm.x" :min="0" :max="9999" />
        </el-form-item>
        <el-form-item label="Y坐标">
          <el-input-number v-model="clickForm.y" :min="0" :max="9999" />
        </el-form-item>
      </el-form>

      <div class="flex gap-2">
        <el-button size="small" type="primary" :loading="clicking.value" class="flex-1" @click="handleClick">
          单击
        </el-button>
        <el-button size="small" :loading="clicking.value" class="flex-1" @click="handleDoubleClick">
          双击
        </el-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive } from 'vue'
import { Pointer } from '@element-plus/icons-vue'
import { browserLiveControlApi } from '@/api/browser/browser_api'

const props = defineProps<{
  browserId: string
  browserRunning: boolean
  pageIndex: number
}>()

const emit = defineEmits<{
  log: [message: string, type: 'info' | 'success' | 'warning' | 'error']
}>()

const clicking = reactive({ value: false })

const clickForm = reactive({
  selector: 'body',
  x: 0,
  y: 0
})

const handleClick = async () => {
  if (!props.browserRunning) return
  clicking.value = true
  try {
    emit('log', `执行单击操作: selector=${clickForm.selector}, x=${clickForm.x}, y=${clickForm.y}`, 'info')
    const res = await browserLiveControlApi.executeAction({
      browser_id: props.browserId,
      req: {
        action_id: 'click',
        params: { selector: clickForm.selector, x: clickForm.x, y: clickForm.y, button: 'left', double_click: false },
        page_index: props.pageIndex
      }
    })
    if (res.code === 0) {
      emit('log', '单击成功', 'success')
    } else {
      emit('log', `单击失败: ${res.msg}`, 'error')
    }
  } catch (e) {
    emit('log', `单击异常: ${e}`, 'error')
  } finally {
    clicking.value = false
  }
}

const handleDoubleClick = async () => {
  if (!props.browserRunning) return
  clicking.value = true
  try {
    emit('log', `执行双击操作: selector=${clickForm.selector}, x=${clickForm.x}, y=${clickForm.y}`, 'info')
    const res = await browserLiveControlApi.executeAction({
      browser_id: props.browserId,
      req: {
        action_id: 'click',
        params: { selector: clickForm.selector, x: clickForm.x, y: clickForm.y, button: 'left', double_click: true },
        page_index: props.pageIndex
      }
    })
    if (res.code === 0) {
      emit('log', '双击成功', 'success')
    } else {
      emit('log', `双击失败: ${res.msg}`, 'error')
    }
  } catch (e) {
    emit('log', `双击异常: ${e}`, 'error')
  } finally {
    clicking.value = false
  }
}
</script>