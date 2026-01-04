<!--
 * @Author: 星瞳 1944637830@qq.com
 * @Date: 2024-12-15 00:00:00
 * @LastEditors: 星瞳 1944637830@qq.com
 * @LastEditTime: 2024-12-24 00:00:00
 * @FilePath: \Vue3FrontEndDemoExercise\src\components\browser\RealTimeControlModal\JavaScriptPanel.vue
 * @Description: JavaScript执行面板组件
-->
<template>
    <div class="panel-card">
        <div class="panel-header">
            <el-icon><Edit /></el-icon>
            <span>JavaScript 执行</span>
        </div>
        <div class="panel-body">
            <el-input v-model="javascriptCode" type="textarea" :rows="6" placeholder="输入JavaScript代码..."
                resize="none" />
            <div class="panel-actions">
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

<style scoped>
.panel-card {
    border: 1px solid var(--el-border-color);
    border-radius: 8px;
    margin-bottom: 16px;
    overflow: hidden;
    transition: box-shadow 0.3s ease;
}

.panel-card:hover {
    box-shadow: var(--el-box-shadow-light);
}

.panel-header {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px 16px;
    background: var(--el-bg-color-page);
    border-bottom: 1px solid var(--el-border-color);
    font-size: 14px;
    font-weight: 500;
    color: var(--el-text-color-primary);
}

.panel-header :deep(.el-icon) {
    font-size: 18px;
    color: var(--el-color-primary);
}

.panel-body {
    padding: 16px;
}

.panel-actions {
    display: flex;
    gap: 8px;
    justify-content: flex-end;
    margin-top: 12px;
}
</style>
