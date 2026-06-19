<script setup lang="ts">
import { computed, type Component } from 'vue'
import { Mouse, Edit, Top, View, Timer, Camera, Connection, SetUp, RefreshRight, Star, Grid, Cpu, Link, QuestionFilled } from '@element-plus/icons-vue'

interface Props {
  action: {
    action_id: string
    json_schema?: {
      title?: string
      description?: string
    }
    name?: string
    description?: string
  }
  selected?: boolean
  configParams?: Record<string, unknown>
}

const props = defineProps<Props>()

const actionIcon = computed<Component>(() => {
  const iconMap: Record<string, Component> = {
    click: Mouse,
    input: Edit,
    navigation: Top,
    navigate: Top,
    new_page: Top,
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
    composite: Grid,
    custom: Grid,
    plugin: Link
  }
  return iconMap[props.action.action_id] || QuestionFilled
})

const actionTitle = computed(() => {
  // 优先使用自定义名称
  if (props.action.name) {
    return props.action.name
  }
  
  const titleMap: Record<string, string> = {
    click: '点击',
    input: '输入',
    navigation: '导航',
    navigate: '页面导航',
    new_page: '新建页面',
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
    custom: '自定义',
    plugin: '插件'
  }
  
  return titleMap[props.action.action_id] || props.action.json_schema?.title || props.action.action_id
})

const actionDescription = computed(() => {
  // 优先使用自定义描述
  if (props.action.description) {
    return props.action.description
  }
  
  const desc = props.action.json_schema?.description || ''
  if (desc) return desc
  
  const descMap: Record<string, string> = {
    click: '点击页面元素',
    input: '在输入框中输入文本',
    navigation: '导航到指定URL',
    navigate: '导航到指定URL',
    new_page: '打开新页面或标签页',
    screenshot: '截取当前页面截图',
    wait: '等待指定时间或条件',
    scroll: '滚动页面到指定位置',
    hover: '悬停在页面元素上',
    evaluate: '执行JavaScript代码',
    select: '选择下拉框选项',
    keyboard: '模拟键盘输入',
    mouse: '模拟鼠标操作',
    llm: '调用大语言模型',
    loop: '循环执行操作',
    if_else: '条件判断分支',
    composite: '组合多个操作',
    custom: '自定义操作',
    plugin: '插件操作'
  }
  
  return descMap[props.action.action_id] || ''
})

const configParamsEntries = computed(() => {
  if (!props.configParams || Object.keys(props.configParams).length === 0) {
    return []
  }
  return Object.entries(props.configParams)
    .filter(([_, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => ({ key, value: String(value) }))
})
</script>

<template>
  <div :class="[
    'rounded-lg border cursor-pointer transition-all duration-200',
    selected
      ? 'border-[var(--el-color-primary)] shadow-md'
      : 'border-border hover:border-[var(--el-color-primary)] hover:shadow-sm'
  ]">
    <div class="p-3">
      <div class="flex items-start gap-3">
        <div class="flex items-center justify-center w-8 h-8 rounded-lg shrink-0">
          <el-icon class="text-lg text-[var(--el-text-color-primary)]">
            <component :is="actionIcon" />
          </el-icon>
        </div>
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 mb-1">
            <span class="font-medium text-sm text-[var(--el-text-color-primary)]">{{ actionTitle }}</span>
            <span class="text-xs text-text-secondary font-mono">{{ action.action_id }}</span>
          </div>
          <div v-if="actionDescription" class="text-xs text-text-secondary leading-relaxed line-clamp-2">{{ actionDescription }}</div>
        </div>
      </div>
      
      <!-- 插件配置参数 -->
      <div v-if="configParamsEntries.length > 0" class="mt-2 pt-2 border-t border-[var(--el-border-color-light)] space-y-1">
        <div 
          v-for="param in configParamsEntries" 
          :key="param.key"
          class="flex items-center gap-1 text-xs"
        >
          <span class="text-text-secondary font-medium">{{ param.key }}:</span>
          <span class="text-text-regular truncate">{{ param.value }}</span>
        </div>
      </div>
    </div>
  </div>
</template>
