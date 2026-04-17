<!--
 * @Author: 星瞳 1944637830@qq.com
 * @Date: 2024-12-15 00:00:00
 * @LastEditors: 星瞳 1944637830@qq.com
 * @LastEditTime: 2024-12-24 00:00:00
 * @FilePath: \Vue3FrontEndDemoExercise\src\components\browser\RealTimeControlModal\ClickPanel.vue
 * @Description: 点击操作面板组件
-->
<template>
    <div class="border border-[var(--el-border-color)] rounded-lg mb-4 overflow-hidden transition-shadow duration-300 hover:shadow-[var(--el-box-shadow-light)]">
        <div class="flex items-center gap-2 px-4 py-3 bg-[var(--el-bg-color-page)] border-b border-[var(--el-border-color)] text-[14px] font-medium text-[var(--el-text-color-primary)] [&_.el-icon]:text-[18px] [&_.el-icon]:text-[var(--el-color-primary)]">
            <el-icon><Mouse /></el-icon>
            <el-text tag="span">点击操作</el-text>
        </div>
        <div class="p-4">
            <div class="flex flex-col gap-3">
                <div class="flex items-center gap-3">
                    <el-text class="text-[13px] text-[var(--el-text-color-primary)] min-w-[60px]" tag="span">X 坐标:</el-text>
                    <el-input-number v-model="clickX" :min="0" :max="1920" controls-position="right" />
                </div>
                <div class="flex items-center gap-3">
                    <el-text class="text-[13px] text-[var(--el-text-color-primary)] min-w-[60px]" tag="span">Y 坐标:</el-text>
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
