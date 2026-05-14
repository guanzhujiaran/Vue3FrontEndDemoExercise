<template>
  <div class="variable-watch-panel flex flex-col h-full bg-white overflow-hidden">
    <!-- 工具栏 -->
    <div class="toolbar flex items-center justify-between px-3 py-2 border-b border-[var(--el-border-color-lighter)] shrink-0">
      <div class="flex items-center gap-2">
        <label class="text-xs font-medium text-[var(--el-text-color-secondary)]">变量监控</label>
        <el-badge :value="Object.keys(variables).length" :max="99" />
      </div>

      <div class="flex items-center gap-2">
        <el-select v-model="scopeFilter" placeholder="作用域" size="small" clearable class="w-28">
          <el-option label="全部" value="" />
          <el-option label="user_data" value="user_data" />
          <el-option label="state" value="state" />
          <el-option label="global" value="global" />
        </el-select>

        <el-button size="small" text :icon="Refresh" @click="$emit('refresh')" :disabled="!lastUpdate">
          刷新
        </el-button>
      </div>
    </div>

    <!-- 变量列表 -->
    <div class="variables-content flex-1 overflow-y-auto p-3 space-y-2">
      <transition-group name="var-item">
        <div
          v-for="(value, key) in filteredVariables"
          :key="key"
          class="variable-item bg-base-50 rounded-lg border border-[var(--el-border-color-lighter)] overflow-hidden"
        >
          <!-- 变量名头部 -->
          <div
            class="flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-base-100/50 transition-colors"
            @click="toggleVariable(key)"
          >
            <div class="flex items-center gap-2 min-w-0">
              <el-icon :class="{ 'rotate-90': expandedVars.has(key) }" class="transition-transform text-primary">
                <ArrowRight />
              </el-icon>
              <span class="text-xs font-mono font-medium text-purple-600 truncate">{{ key }}</span>
            </div>

            <div class="flex items-center gap-2 shrink-0">
              <el-tag size="small" effect="plain" class="!text-[10px]">{{ getTypeTag(value) }}</el-tag>
              <span v-if="isRecentlyUpdated(key)" class="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            </div>
          </div>

          <!-- 变量值内容（可展开） -->
          <transition name="expand">
            <div v-show="expandedVars.has(key)" class="px-3 pb-3 pt-0 border-t border-dashed border-[var(--el-border-color-lighter)]">
              <pre class="text-xs font-mono text-[var(--el-text-color-secondary)] mt-2 whitespace-pre-wrap break-all max-h-48 overflow-y-auto bg-[#f5f5f5] p-2 rounded">{{ formatValue(value) }}</pre>

              <!-- 复制按钮 -->
              <el-button
                size="small"
                text
                class="mt-1 !text-[10px]"
                @click.stop="copyToClipboard(key, value)"
              >
                复制值
              </el-button>
            </div>
          </transition>
        </div>
      </transition-group>

      <!-- 空状态 -->
      <div v-if="Object.keys(filteredVariables).length === 0" class="empty-state flex flex-col items-center justify-center py-8 text-[var(--el-text-color-placeholder)]">
        <el-icon :size="32"><DataLine /></el-icon>
        <span class="mt-2 text-sm">{{ scopeFilter ? '该作用域无变量' : '暂无变量数据' }}</span>
      </div>
    </div>

    <!-- 底部状态栏 -->
    <div class="status-bar flex items-center justify-between px-3 py-1.5 bg-base-50 border-t border-[var(--el-border-color-lighter)] text-[10px] text-[var(--el-text-color-placeholder)] shrink-0">
      <span>{{ Object.keys(filteredVariables).length }} 个变量</span>
      <span v-if="lastUpdate">最后更新: {{ formatTime(lastUpdate) }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { ArrowRight, Refresh, DataLine } from '@element-plus/icons-vue'

const props = defineProps<{
  variables: Record<string, any>
  lastUpdate?: number
}>()

defineEmits<{
  refresh: []
}>()

// 状态
const expandedVars = ref<Set<string>>(new Set())
const scopeFilter = ref('')

// 计算属性
const filteredVariables = computed(() => {
  if (!scopeFilter.value) return props.variables

  const result: Record<string, any> = {}
  Object.entries(props.variables).forEach(([key, value]) => {
    if (key.startsWith(scopeFilter.value)) {
      result[key] = value
    }
  })
  return result
})

// 方法
const toggleVariable = (key: string) => {
  if (expandedVars.value.has(key)) {
    expandedVars.value.delete(key)
  } else {
    expandedVars.value.add(key)
  }
}

const getTypeTag = (value: any): string => {
  if (value === null || value === undefined) return 'null'
  const type = typeof value
  if (type === 'object') return Array.isArray(value) ? 'array' : 'object'
  return type
}

const formatValue = (value: any): string => {
  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return String(value)
  }
}

const isRecentlyUpdated = (key: string): boolean => {
  // 简单实现：假设最近更新的变量会在最近500ms内更新
  return false
}

const copyToClipboard = async (key: string, value: any) => {
  try {
    await navigator.clipboard.writeText(formatValue(value))
    console.log(`Copied ${key} to clipboard`)
  } catch (e) {
    console.error('Failed to copy:', e)
  }
}

const formatTime = (timestamp: number): string =>
  new Date(timestamp).toLocaleTimeString('zh-CN', { hour12: false })
</script>

<style scoped>
.variable-watch-panel {
  animation: fadeIn 0.2s ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(5px); }
  to { opacity: 1; transform: translateY(0); }
}

.var-item-enter-active {
  animation: slideIn 0.2s ease-out;
}

@keyframes slideIn {
  from { opacity: 0; transform: translateX(-10px); }
  to { opacity: 1; transform: translateX(0); }
}

.expand-enter-active,
.expand-leave-active {
  transition: all 0.2s ease;
  overflow: hidden;
}

.expand-enter-from,
.expand-leave-to {
  opacity: 0;
  max-height: 0;
}
</style>
