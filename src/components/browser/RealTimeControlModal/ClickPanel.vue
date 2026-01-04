<!--
 * @Author: 星瞳 1944637830@qq.com
 * @Date: 2024-12-15 00:00:00
 * @LastEditors: 星瞳 1944637830@qq.com
 * @LastEditTime: 2024-12-24 00:00:00
 * @FilePath: \Vue3FrontEndDemoExercise\src\components\browser\RealTimeControlModal\ClickPanel.vue
 * @Description: 点击操作面板组件
-->
<template>
    <div class="panel-card">
        <div class="panel-header">
            <el-icon><Mouse /></el-icon>
            <span>点击操作</span>
        </div>
        <div class="panel-body">
            <div class="click-inputs">
                <div class="click-input-item">
                    <span class="click-label">X 坐标:</span>
                    <el-input-number v-model="clickX" :min="0" :max="1920" controls-position="right" />
                </div>
                <div class="click-input-item">
                    <span class="click-label">Y 坐标:</span>
                    <el-input-number v-model="clickY" :min="0" :max="1080" controls-position="right" />
                </div>
            </div>
            <el-button @click="$emit('performClick', { x: clickX, y: clickY })" type="primary" style="width: 100%; margin-top: 12px;">
                <el-icon><Mouse /></el-icon>
                执行点击
            </el-button>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { Mouse } from '@element-plus/icons-vue'

defineEmits<{
    performClick: [coords: { x: number; y: number }]
}>()

const clickX = ref(50)
const clickY = ref(50)
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

.click-inputs {
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.click-input-item {
    display: flex;
    align-items: center;
    gap: 12px;
}

.click-label {
    font-size: 13px;
    color: var(--el-text-color-primary);
    min-width: 60px;
}
</style>
