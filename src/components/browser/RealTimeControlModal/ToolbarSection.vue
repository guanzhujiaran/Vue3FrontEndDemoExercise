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
/* 所有样式已移至 tailwind.css 中的 .toolbar-section 相关类 */
/* 组件现在使用全局CSS变量，支持尺寸主题切换 */
</style>
