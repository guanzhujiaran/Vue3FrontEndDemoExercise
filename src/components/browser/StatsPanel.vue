<!--
 * @FilePath: \Vue3FrontEndDemoExercise\src\components\browser\StatsPanel.vue
 * @Description: 统计面板组件 - 重构为更现代的样式
-->
<template>
  <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
    <!-- 指纹总数 -->
    <div class="relative flex items-center gap-3 p-4 rounded-xl border border-[var(--el-border-color-lighter)] bg-[var(--el-bg-color)] overflow-hidden transition-all duration-200 hover:shadow-[0_2px_12px_rgba(0,0,0,0.08)] hover:-translate-y-0.5">
      <div class="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 bg-gradient-to-br from-blue-500 to-indigo-600">
        <el-icon :size="20" class="text-white"><UserFilled /></el-icon>
      </div>
      <div class="flex flex-col gap-0.5">
        <div class="text-2xl font-bold text-[var(--el-text-color-primary)] leading-none">{{ stats.total }}</div>
        <div class="text-xs text-[var(--el-text-color-secondary)]">指纹总数</div>
      </div>
    </div>

    <!-- Chrome 数量 -->
    <div class="relative flex items-center gap-3 p-4 rounded-xl border border-[var(--el-border-color-lighter)] bg-[var(--el-bg-color)] overflow-hidden transition-all duration-200 hover:shadow-[0_2px_12px_rgba(0,0,0,0.08)] hover:-translate-y-0.5">
      <div class="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 bg-gradient-to-br from-sky-400 to-cyan-500">
        <el-icon :size="20" class="text-white"><ChromeFilled /></el-icon>
      </div>
      <div class="flex flex-col gap-0.5">
        <div class="text-2xl font-bold text-[var(--el-text-color-primary)] leading-none">{{ stats.chrome }}</div>
        <div class="text-xs text-[var(--el-text-color-secondary)]">Chrome</div>
      </div>
      <div v-if="stats.total > 0" class="absolute bottom-0 left-0 right-0 h-1 bg-[var(--el-fill-color-lighter)]">
        <div
          class="h-1 rounded-full bg-gradient-to-r from-sky-400 to-cyan-500 transition-all duration-700"
          :style="{ width: `${Math.round(stats.chrome / stats.total * 100)}%` }"
        ></div>
      </div>
    </div>

    <!-- Edge 数量 -->
    <div class="relative flex items-center gap-3 p-4 rounded-xl border border-[var(--el-border-color-lighter)] bg-[var(--el-bg-color)] overflow-hidden transition-all duration-200 hover:shadow-[0_2px_12px_rgba(0,0,0,0.08)] hover:-translate-y-0.5">
      <div class="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 bg-gradient-to-br from-teal-400 to-emerald-500">
        <el-icon :size="20" class="text-white"><Monitor /></el-icon>
      </div>
      <div class="flex flex-col gap-0.5">
        <div class="text-2xl font-bold text-[var(--el-text-color-primary)] leading-none">{{ stats.edge }}</div>
        <div class="text-xs text-[var(--el-text-color-secondary)]">Edge</div>
      </div>
      <div v-if="stats.total > 0" class="absolute bottom-0 left-0 right-0 h-1 bg-[var(--el-fill-color-lighter)]">
        <div
          class="h-1 rounded-full bg-gradient-to-r from-teal-400 to-emerald-500 transition-all duration-700"
          :style="{ width: `${Math.round(stats.edge / stats.total * 100)}%` }"
        ></div>
      </div>
    </div>

    <!-- Windows 平台 -->
    <div class="relative flex items-center gap-3 p-4 rounded-xl border border-[var(--el-border-color-lighter)] bg-[var(--el-bg-color)] overflow-hidden transition-all duration-200 hover:shadow-[0_2px_12px_rgba(0,0,0,0.08)] hover:-translate-y-0.5">
      <div class="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 bg-gradient-to-br from-violet-500 to-purple-600">
        <el-icon :size="20" class="text-white"><Platform /></el-icon>
      </div>
      <div class="flex flex-col gap-0.5">
        <div class="text-2xl font-bold text-[var(--el-text-color-primary)] leading-none">{{ stats.windows }}</div>
        <div class="text-xs text-[var(--el-text-color-secondary)]">Windows</div>
      </div>
      <div v-if="stats.total > 0" class="absolute bottom-0 left-0 right-0 h-1 bg-[var(--el-fill-color-lighter)]">
        <div
          class="h-1 rounded-full bg-gradient-to-r from-violet-500 to-purple-600 transition-all duration-700"
          :style="{ width: `${Math.round(stats.windows / stats.total * 100)}%` }"
        ></div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { UserFilled, ChromeFilled, Monitor, Platform } from '@element-plus/icons-vue'

interface Props {
  stats: {
    total: number
    chrome: number
    edge: number
    windows: number
  }
}

const props = defineProps<Props>()
</script>


