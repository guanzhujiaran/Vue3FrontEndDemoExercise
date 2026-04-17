<!--
 * @Author: 星瞳 1944637830@qq.com
 * @Date: 2024-12-15 00:00:00
 * @LastEditors: 星瞳 1944637830@qq.com
 * @LastEditTime: 2024-12-24 00:00:00
 * @FilePath: \Vue3FrontEndDemoExercise\src\components\browser\RealTimeControlModal\ResultPanel.vue
 * @Description: 执行结果面板组件
-->
<template>
    <div class="border border-[var(--el-border-color)] rounded-lg mb-4 last:mb-0 overflow-hidden transition-shadow duration-300 hover:shadow-[var(--el-box-shadow-light)]">
        <div class="flex items-center gap-2 px-4 py-3 bg-[var(--el-bg-color-page)] border-b border-[var(--el-border-color)] text-[14px] font-medium text-[var(--el-text-color-primary)] [&_.el-icon]:text-[18px] [&_.el-icon]:text-[var(--el-color-primary)]">
            <el-icon><DocumentCopy /></el-icon>
            <span>执行结果</span>
        </div>
        <div class="p-4">
            <el-input :model-value="result" type="textarea" :rows="4" placeholder="执行结果将显示在这里" readonly
                resize="none" />
            <div class="flex gap-2 justify-end mt-3">
                <el-button @click="$emit('clear')" size="small">
                    <el-icon><Delete /></el-icon>
                    清空
                </el-button>
                <el-button @click="copyResult" size="small">
                    <el-icon><DocumentCopy /></el-icon>
                    复制
                </el-button>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import biliMessage from '@/utils/message'
import { DocumentCopy, Delete } from '@element-plus/icons-vue'

interface Props {
    result: string
}

defineProps<Props>()

defineEmits<{
    clear: []
}>()

const copyResult = async (text: string) => {
    try {
        await navigator.clipboard.writeText(text)
        biliMessage.success('结果已复制到剪贴板')
    } catch (error) {
        biliMessage.error('复制失败')
    }
}
</script>
