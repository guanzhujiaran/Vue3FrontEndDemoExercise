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
    type: 'info' | 'success' | 'warning' | 'error' | 'debug'
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
