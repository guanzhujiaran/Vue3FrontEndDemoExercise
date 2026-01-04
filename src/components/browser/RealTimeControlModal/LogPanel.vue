<!--
 * @Author: 星瞳 1944637830@qq.com
 * @Date: 2024-12-15 00:00:00
 * @LastEditors: 星瞳 1944637830@qq.com
 * @LastEditTime: 2024-12-24 00:00:00
 * @FilePath: \Vue3FrontEndDemoExercise\src\components\browser\RealTimeControlModal\LogPanel.vue
 * @Description: 日志面板组件
-->
<template>
    <div class="log-panel">
        <div class="log-panel-header">
            <div class="log-title">
                <el-icon><Document /></el-icon>
                <span>系统日志</span>
            </div>
            <el-button size="small" text @click="$emit('clearLog')">
                <el-icon><Delete /></el-icon>
                清空
            </el-button>
        </div>
        <div class="log-panel-body" ref="logContentRef">
            <div v-for="(log, index) in logs" :key="index" class="log-entry" :class="log.type">
                <span class="log-timestamp">{{ log.time }}</span>
                <span class="log-msg">{{ log.message }}</span>
            </div>
            <div v-if="logs.length === 0" class="log-empty">
                暂无日志
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, nextTick, watch } from 'vue'
import { Document, Delete } from '@element-plus/icons-vue'

interface LogItem {
    time: string
    message: string
    type: 'info' | 'success' | 'warning' | 'error'
}

interface Props {
    logs: LogItem[]
}

defineProps<Props>()

defineEmits<{
    clearLog: []
}>()

const logContentRef = ref<HTMLElement>()

const scrollToBottom = () => {
    nextTick(() => {
        if (logContentRef.value) {
            logContentRef.value.scrollTop = logContentRef.value.scrollHeight
        }
    })
}

defineExpose({
    scrollToBottom
})
</script>

<style scoped>
.log-panel {
    height: 140px;
    border: 1px solid var(--el-border-color);
    border-radius: 8px;
    overflow: hidden;
    display: flex;
    flex-direction: column;
}

.log-panel-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 14px;
    background: var(--el-bg-color-page);
    border-bottom: 1px solid var(--el-border-color);
}

.log-title {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    font-weight: 500;
    color: var(--el-text-color-primary);
}

.log-title :deep(.el-icon) {
    font-size: 16px;
}

.log-panel-body {
    flex: 1;
    overflow-y: auto;
    padding: 8px 12px;
    font-family: 'Consolas', 'Monaco', monospace;
    font-size: 12px;
    line-height: 1.6;
    background: var(--el-fill-color-lighter);
}

.log-entry {
    display: flex;
    gap: 12px;
    padding: 4px 0;
    border-bottom: 1px solid var(--el-border-color-extra-light);
}

.log-timestamp {
    color: var(--el-text-color-placeholder);
    font-size: 11px;
    min-width: 55px;
}

.log-msg {
    flex: 1;
    word-break: break-all;
}

.log-entry.info .log-msg {
    color: var(--el-text-color-primary);
}

.log-entry.success .log-msg {
    color: var(--el-color-success);
}

.log-entry.warning .log-msg {
    color: var(--el-color-warning);
}

.log-entry.error .log-msg {
    color: var(--el-color-danger);
}

.log-empty {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    color: var(--el-text-color-placeholder);
    font-size: 13px;
}
</style>
