<script setup lang="ts">
import { ref, computed } from 'vue'
import type { 
  PredefinedActionDef, 
  CustomActionListItem,
  EnabledPlugin
} from '@/types/browser-automation-api'
import { Tools, Setting, Play } from '@element-plus/icons-vue'

interface Props {
  action: PredefinedActionDef | CustomActionListItem
  mode?: 'detail' | 'compact'
  draggable?: boolean
  showPlugins?: boolean
  plugins?: EnabledPlugin[]
}

const props = withDefaults(defineProps<Props>(), {
  mode: 'detail',
  draggable: true,
  showPlugins: false,
  plugins: () => []
})

const emit = defineEmits<{
  execute: []
  edit: []
  saveAsPlugin: []
  saveAsCustomAction: []
}>()

// 判断是否为预定义动作
const isPredefined = computed(() => {
  return 'core_params' in props.action
})

// 动作名称
const actionName = computed(() => props.action.name || '未命名动作')

// 动作描述
const actionDescription = computed(() => props.action.description || '暂无描述')

// 标签列表
const tags = computed(() => {
  if (isPredefined.value) {
    const action = props.action as PredefinedActionDef
    return [action.category]
  } else {
    const action = props.action as CustomActionListItem
    return action.tags || []
  }
})

// 是否可拖拽
const dragAttribute = computed(() => {
  return props.draggable ? 'true' : 'false'
})
</script>

<template>
  <div
    class="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 transition-all hover:shadow-md"
    :class="{ 'cursor-move': draggable, 'cursor-pointer': !draggable }"
    :draggable="dragAttribute"
    @click="$emit('execute')"
  >
    <!-- 紧凑模式 -->
    <div v-if="mode === 'compact'" class="p-3 flex items-center gap-2">
      <el-icon class="text-primary"><Tools /></el-icon>
      <span class="font-medium text-sm truncate flex-1">{{ actionName }}</span>
      <el-tag v-if="!isPredefined && (action as CustomActionListItem).is_composite" size="small" type="warning">
        组合
      </el-tag>
    </div>
    
    <!-- 详情模式 -->
    <div v-else class="p-4">
      <!-- 标题栏 -->
      <div class="flex items-start justify-between mb-2">
        <div class="flex items-center gap-2 flex-1 min-w-0">
          <el-icon class="text-xl text-primary"><Tools /></el-icon>
          <h4 class="font-semibold text-base truncate" :title="actionName">{{ actionName }}</h4>
        </div>
        
        <!-- 操作按钮 -->
        <div class="flex gap-1 ml-2" @click.stop>
          <el-tooltip content="执行" placement="top">
            <el-button
              type="success"
              size="small"
              :icon="Play"
              circle
              @click="$emit('execute')"
            />
          </el-tooltip>
          <el-tooltip content="编辑" placement="top">
            <el-button
              type="primary"
              size="small"
              :icon="Setting"
              circle
              @click="$emit('edit')"
            />
          </el-tooltip>
        </div>
      </div>
      
      <!-- 描述 -->
      <p class="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
        {{ actionDescription }}
      </p>
      
      <!-- 标签 -->
      <div class="flex flex-wrap gap-1 mb-3">
        <el-tag
          v-for="tag in tags"
          :key="tag"
          size="small"
          type="info"
        >
          {{ tag }}
        </el-tag>
        <el-tag v-if="isPredefined" size="small" type="success">预定义</el-tag>
        <el-tag v-else-if="(action as CustomActionListItem).is_composite" size="small" type="warning">组合动作</el-tag>
        <el-tag v-else size="small" type="primary">自定义</el-tag>
      </div>
      
      <!-- 插件插槽区域 -->
      <div v-if="showPlugins && plugins.length > 0" class="border-t border-gray-200 dark:border-gray-700 pt-3">
        <div class="text-xs text-gray-500 mb-2">已启用插件 ({{ plugins.length }})</div>
        <div class="space-y-2">
          <div
            v-for="plugin in plugins"
            :key="plugin.plugin_id"
            class="flex items-center justify-between p-2 rounded bg-gray-50 dark:bg-gray-900 text-xs"
          >
            <span class="truncate flex-1">{{ plugin.plugin_id }}</span>
            <el-tag size="small" type="info">{{ plugin.hook_type || 'before_action' }}</el-tag>
          </div>
        </div>
      </div>
      
      <!-- 保存选项 -->
      <div v-if="!isPredefined" class="flex gap-2 mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
        <el-button
          size="small"
          @click="$emit('saveAsPlugin')"
        >
          保存为插件
        </el-button>
        <el-button
          size="small"
          type="primary"
          @click="$emit('saveAsCustomAction')"
        >
          保存为动作
        </el-button>
      </div>
    </div>
  </div>
</template>
