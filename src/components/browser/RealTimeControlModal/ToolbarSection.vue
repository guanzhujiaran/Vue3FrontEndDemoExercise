<!--
 * @Author: 星瞳 1944637830@qq.com
 * @Date: 2024-12-15 00:00:00
 * @LastEditors: 星瞳 1944637830@qq.com
 * @LastEditTime: 2024-12-24 00:00:00
 * @FilePath: \Vue3FrontEndDemoExercise\src\components\browser\RealTimeControlModal\ToolbarSection.vue
 * @Description: 工具栏组件
-->
<template>
    <div class="toolbar-section">
        <div class="toolbar-item">
            <span class="toolbar-label">URL导航</span>
            <div class="url-input-wrapper">
                <el-input v-model="navigateUrl" placeholder="输入URL地址" clearable @keyup.enter="handleNavigate" size="default">
                    <template #prepend>
                        <el-icon><Promotion /></el-icon>
                    </template>
                </el-input>
                <el-button type="primary" @click="handleNavigate">前往</el-button>
            </div>
        </div>

        <div class="toolbar-divider"></div>

        <div class="toolbar-item">
            <span class="toolbar-label">操作控制</span>
            <div class="quick-actions">
                <el-button @click="toggleVideoStream" :icon="VideoPlay" :type="isStreaming ? 'danger' : 'primary'">
                    {{ isStreaming ? '停止视频' : '开始视频' }}
                </el-button>
                <el-button @click="takeScreenshot" :icon="Camera">截图</el-button>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import {
    VideoPlay,
    Camera,
    Promotion,
    User,
    Switch,
    Refresh
} from '@element-plus/icons-vue'

interface Props {
    isManualMode: boolean
    arePluginsPaused: boolean
    isStreaming: boolean
}

interface Emits {
    (e: 'navigate', url: string): void
    (e: 'toggleManual'): void
    (e: 'togglePlugins'): void
    (e: 'sendHeartbeat'): void
    (e: 'takeScreenshot'): void
    (e: 'toggleVideo'): void
}

defineProps<Props>()
const emit = defineEmits<Emits>()

const navigateUrl = ref('')

const handleNavigate = () => {
    emit('navigate', navigateUrl.value)
    navigateUrl.value = ''
}

const toggleManualMode = () => emit('toggleManual')
const togglePlugins = () => emit('togglePlugins')
const sendHeartbeat = () => emit('sendHeartbeat')
const takeScreenshot = () => emit('takeScreenshot')
const toggleVideoStream = () => emit('toggleVideo')
</script>

<style scoped>
.toolbar-section {
    display: flex;
    align-items: center;
    gap: 24px;
    padding: 16px 20px;
    border-radius: 8px;
    box-shadow: var(--el-box-shadow-lighter);
    margin-bottom: 16px;
}

.toolbar-item {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.toolbar-label {
    font-size: 12px;
    color: var(--el-text-color-secondary);
    font-weight: 500;
}

.url-input-wrapper {
    display: flex;
    gap: 8px;
    width: 100%;
}

.url-input-wrapper :deep(.el-input-group) {
    flex: 1;
}

.url-input-wrapper :deep(.el-input__inner) {
    font-family: 'Consolas', 'Monaco', monospace;
}

.quick-actions {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
}

.quick-actions :deep(.el-button) {
    font-size: 13px;
}

.toolbar-divider {
    width: 1px;
    height: 50px;
    background: var(--el-border-color);
}

@media (max-width: 768px) {
    .toolbar-section {
        flex-direction: column;
        align-items: stretch;
    }

    .toolbar-divider {
        width: 100%;
        height: 1px;
    }

    .quick-actions {
        justify-content: center;
    }
}
</style>
