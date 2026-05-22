<script setup lang="ts">
import { computed } from 'vue'
import { Mouse, Edit, Top, View, Timer, Camera, Connection, SetUp, RefreshRight, Star, Grid, Cpu } from '@element-plus/icons-vue'

interface Props {
  action: {
    action_id: string
    json_schema?: {
      description?: string
    }
  }
  selected?: boolean
}

const props = defineProps<Props>()

const actionIcon = computed(() => {
  const iconMap: Record<string, any> = {
    click: Mouse,
    input: Edit,
    navigation: Top,
    screenshot: Camera,
    wait: Timer,
    scroll: View,
    hover: Mouse,
    evaluate: Cpu,
    select: Grid,
    keyboard: SetUp,
    mouse: Mouse,
    llm: Star,
    loop: RefreshRight,
    if_else: Connection,
    composite: Connection,
    custom: Grid
  }
  return iconMap[props.action.action_id] || Grid
})

const actionTitle = computed(() => {
  const titleMap: Record<string, string> = {
    click: '点击',
    input: '输入',
    navigation: '导航',
    screenshot: '截图',
    wait: '等待',
    scroll: '滚动',
    hover: '悬停',
    evaluate: '执行JS',
    select: '选择',
    keyboard: '键盘',
    mouse: '鼠标',
    llm: 'LLM',
    loop: '循环',
    if_else: '条件',
    composite: '组合',
    custom: '自定义'
  }
  return titleMap[props.action.action_id] || props.action.action_id
})
</script>

<template>
  <div :class="[
    'p-3 rounded-lg border cursor-pointer transition-all duration-200',
    selected
      ? 'border-[var(--el-color-primary)] bg-[var(--el-color-primary-light-9)] shadow-md'
      : 'border-[var(--el-border-color)] bg-[var(--el-bg-color)] hover:border-[var(--el-color-primary)] hover:shadow-sm'
  ]">
    <div class="flex items-center gap-2">
      <el-icon class="text-xl">
        <component :is="actionIcon" />
      </el-icon>
      <div class="flex-1 min-w-0">
        <div class="font-medium text-sm truncate">{{ actionTitle }}</div>
        <div class="text-xs text-[var(--el-text-color-secondary)] truncate">{{ action.action_id }}</div>
      </div>
    </div>
  </div>
</template>
