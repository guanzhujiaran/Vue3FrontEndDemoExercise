<!--
 * @Author: 星瞳 1944637830@qq.com
 * @Date: 2024-12-15 00:00:00
 * @LastEditors: 星瞳 1944637830@qq.com
 * @LastEditTime: 2024-12-24 00:00:00
 * @FilePath: \Vue3FrontEndDemoExercise\src\components\browser\RealTimeControlModal\JavaScriptPanel.vue
 * @Description: JavaScript执行面板组件
-->
<template>
    <div class="border border-[var(--el-border-color)] rounded-lg mb-4 overflow-hidden transition-shadow duration-300 hover:shadow-[var(--el-box-shadow-light)]">
        <div class="flex items-center gap-2 px-4 py-3 bg-[var(--el-bg-color-page)] border-b border-[var(--el-border-color)] text-[14px] font-medium text-[var(--el-text-color-primary)] [&_.el-icon]:text-[18px] [&_.el-icon]:text-[var(--el-color-primary)]">
            <el-icon><Edit /></el-icon>
            <el-text tag="span">JavaScript 执行</el-text>
        </div>
        <div class="p-4">
            <el-input v-model="javascriptCode" type="textarea" :rows="6" placeholder="输入JavaScript代码..."
                resize="none" />
            <div class="flex gap-2 justify-end mt-3">
                <el-button @click="$emit('execute', javascriptCode)" type="primary" size="small">
                    <el-icon><VideoPlay /></el-icon>
                    执行
                </el-button>
                <el-button @click="$emit('safeExecute', javascriptCode)" size="small">
                    <el-icon><Lock /></el-icon>
                    安全执行
                </el-button>
                <el-button @click="clearCode" size="small">
                    <el-icon><Delete /></el-icon>
                    清空
                </el-button>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { Edit, VideoPlay, Lock, Delete } from '@element-plus/icons-vue'

defineEmits<{
    execute: [code: string]
    safeExecute: [code: string]
}>()

const javascriptCode = ref('')

const clearCode = () => {
    javascriptCode.value = ''
}
</script>
