<!--
 * @Author: 星瞳 1944637830@qq.com
 * @Date: 2024-12-15 00:00:00
 * @LastEditors: 星瞳 1944637830@qq.com
 * @LastEditTime: 2024-12-24 00:00:00
 * @FilePath: \Vue3FrontEndDemoExercise\src\components\browser\RealTimeControlModal\ResultPanel.vue
 * @Description: 执行结果面板组件
-->
<template>
    <div class="panel-card result-card">
        <div class="panel-header">
            <el-icon><DocumentCopy /></el-icon>
            <span>执行结果</span>
        </div>
        <div class="panel-body">
            <el-input :model-value="result" type="textarea" :rows="4" placeholder="执行结果将显示在这里" readonly
                resize="none" />
            <div class="panel-actions">
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

<style scoped>
.panel-card {
    border: 1px solid var(--el-border-color);
    border-radius: 8px;
    margin-bottom: 16px;
    overflow: hidden;
    transition: box-shadow 0.3s ease;
}

.panel-card:last-child {
    margin-bottom: 0;
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
