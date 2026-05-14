<template>
  <div class="debug-watch flex flex-col h-full bg-[#1e1e1e] rounded-lg overflow-hidden">
    <!-- 头部 -->
    <div class="flex items-center justify-between px-3 py-2 bg-[#252526] border-b border-[#3c3c3c] shrink-0">
      <span class="text-xs font-medium text-[#cccccc]">变量监视器</span>
      <div class="flex items-center gap-1 text-xs text-[#858585]">
        <span>{{ Object.keys(variables).length }} 个变量</span>
        <el-button size="small" text @click="expandAll = !expandAll">{{ expandAll ? '收起' : '展开' }}</el-button>
      </div>
    </div>

    <!-- 变量列表 -->
    <div class="flex-1 overflow-y-auto p-2 space-y-1">
      <div
        v-for="(value, key) in variables"
        :key="key"
        class="variable-item group"
      >
        <div
          class="flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer hover:bg-[#2a2a2a] transition-colors"
          @click="toggleExpand(key)"
        >
          <!-- 展开/收起图标 -->
          <el-icon :size="12" class="text-[#6a6a6a] shrink-0 transition-transform" :class="{ 'rotate-90': expandedKeys.has(key) }">
            <ArrowRight />
          </el-icon>

          <!-- 变量名 -->
          <span class="text-[#9cdcfe] font-mono text-xs shrink-0 min-w-[80px] truncate">{{ key }}</span>

          <!-- 类型标签 -->
          <el-tag
            size="small"
            :type="getTypeTagType(value)"
            effect="plain"
            class="shrink-0 text-[10px]"
          >
            {{ getTypeName(value) }}
          </el-tag>

          <!-- 值预览 -->
          <span
            class="flex-1 text-xs truncate font-mono"
            :class="getValueColor(value)"
          >
            {{ formatValue(value) }}
          </span>

          <!-- 复制按钮 -->
          <el-button
            size="small"
            text
            class="opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
            @click.stop="copyValue(key, value)"
          >
            <el-icon><CopyDocument /></el-icon>
          </el-button>
        </div>

        <!-- 展开的值详情 -->
        <div v-if="expandedKeys.has(key) && isComplex(value)" class="ml-6 pl-4 border-l border-[#3c3c3c] py-1">
          <pre class="text-xs font-mono text-[#dcdcaa] whitespace-pre-wrap break-all bg-[#252526] p-2 rounded m-0">{{ JSON.stringify(value, null, 2) }}</pre>
        </div>
      </div>

      <div v-if="Object.keys(variables).length === 0" class="flex flex-col items-center justify-center py-8 text-[#6a6a6a]">
        <el-icon :size="28"><View /></el-icon>
        <span class="mt-2 text-xs">暂无变量</span>
      </div>
    </div>

    <!-- 底部状态栏 -->
    <div class="px-3 py-1.5 bg-[#252526] border-t border-[#3c3c3c] text-xs text-[#858585] shrink-0">
      <span>最近更新: {{ lastUpdateTime ? formatTime(lastUpdateTime) : '-' }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { ArrowRight, CopyDocument, View } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'

const props = defineProps<{
  variables: Record<string, any>
  lastUpdate?: number
}>()

const expandedKeys = ref(new Set<string>())
const expandAll = ref(false)
const lastUpdateTime = ref<number | undefined>(props.lastUpdate)

watch(() => props.lastUpdate, (val) => {
  if (val) {
    lastUpdateTime.value = val
  }
})

watch(expandAll, (val) => {
  if (val) {
    expandedKeys.value = new Set(Object.keys(props.variables))
  } else {
    expandedKeys.value.clear()
  }
})

const toggleExpand = (key: string) => {
  if (expandedKeys.value.has(key)) {
    expandedKeys.value.delete(key)
  } else {
    expandedKeys.value.add(key)
  }
}

const getTypeName = (value: any): string => {
  if (value === null || value === undefined) return 'null'
  if (Array.isArray(value)) return `array[${value.length}]`
  const type = typeof value
  if (type === 'object') return 'object'
  return type
}

const getTypeTagType = (value: any): '' | 'success' | 'warning' | 'danger' | 'info' => {
  if (Array.isArray(value)) return 'success'
  if (typeof value === 'object') return 'warning'
  if (typeof value === 'string') return ''
  if (typeof value === 'number') return 'info'
  if (typeof value === 'boolean') return 'danger'
  return ''
}

const getValueColor = (value: any): string => {
  if (typeof value === 'string') return 'text-[#ce9178]'
  if (typeof value === 'number') return 'text-[#b5cea8]'
  if (typeof value === 'boolean') return value ? 'text-[#569cd6]' : 'text-[#f14c4c]'
  if (Array.isArray(value)) return 'text-[#dcdcaa]'
  if (typeof value === 'object') return 'text-[#dcdcaa]'
  return 'text-[#858585]'
}

const formatValue = (value: any): string => {
  if (value === null || value === undefined) return 'null'
  if (typeof value === 'string') return `"${value.length > 30 ? value.substring(0, 30) + '...' : value}"`
  if (typeof value === 'object') return Array.isArray(value) ? `[${value.length} items]` : '{...}'
  return String(value)
}

const isComplex = (value: any): boolean => {
  return typeof value === 'object' && value !== null
}

const copyValue = async (key: string, value: any) => {
  try {
    await navigator.clipboard.writeText(JSON.stringify(value, null, 2))
    ElMessage.success(`已复制变量 ${key}`)
  } catch {
    ElMessage.error('复制失败')
  }
}

const formatTime = (timestamp: number) => {
  return new Date(timestamp).toLocaleTimeString('zh-CN', { hour12: false })
}
</script>