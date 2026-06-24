<template>
  <div v-if="filterParams.length > 0" class="lottery-filter-bar">
    <el-collapse v-model="activeNames" accordion class="filter-collapse">
      <el-collapse-item name="filter">
        <template #title>
          <div class="flex w-full items-center justify-between pr-3">
            <span class="text-sm font-semibold text-text-primary">筛选条件</span>
            <el-button
              v-if="activeNames === 'filter'"
              size="small"
              text
              @click.stop="resetFilters"
            >
              重置
            </el-button>
          </div>
        </template>

        <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <template v-for="param in visibleParams" :key="param.param_name">
            <!-- 下拉选择（enum + widget=select） -->
            <div v-if="param.widget === 'select' && param.enum_values" class="filter-item">
              <label class="mb-1 block text-xs font-medium text-text-secondary">
                {{ param.display_name }}
                <el-tooltip v-if="param.description" :content="param.description" placement="top">
                  <el-icon :size="12" class="ml-1 cursor-help text-text-placeholder"><QuestionFilled /></el-icon>
                </el-tooltip>
                <el-tag v-if="param.param_name === 'created_at_preset' || param.param_name === 'pub_time_preset'" type="warning" size="small" effect="plain" class="ml-1 align-middle" style="--el-tag-font-size: 10px; padding: 0 4px; height: 18px; line-height: 18px;">
                  优先级最高
                </el-tag>
              </label>
              <el-select
                :model-value="getFilterValue(param.param_name)"
                :placeholder="param.placeholder || '请选择' + param.display_name"
                size="small"
                clearable
                class="w-full!"
                @update:model-value="(val: any) => setFilterValue(param.param_name, val)"
              >
                <el-option
                  v-for="opt in param.enum_values"
                  :key="opt.value"
                  :label="opt.label"
                  :value="opt.value"
                />
              </el-select>
            </div>

            <!-- 布尔开关（bool + widget=switch） -->
            <div v-else-if="param.widget === 'switch'" class="filter-item">
              <label class="mb-1 block text-xs font-medium text-text-secondary">
                {{ param.display_name }}
              </label>
              <el-switch
                :model-value="getFilterValue(param.param_name)"
                size="small"
                @update:model-value="(val: any) => setFilterValue(param.param_name, val)"
              />
            </div>

            <!-- 日期时间选择器（int + widget=datetime） -->
            <div v-else-if="param.widget === 'datetime'" class="filter-item">
              <label class="mb-1 block text-xs font-medium text-text-secondary">
                {{ param.display_name }}
                <el-tooltip v-if="param.description" :content="param.description" placement="top">
                  <el-icon :size="12" class="ml-1 cursor-help text-text-placeholder"><QuestionFilled /></el-icon>
                </el-tooltip>
              </label>
              <el-date-picker
                :model-value="tsToDate(getFilterValue(param.param_name))"
                type="datetime"
                :placeholder="param.placeholder || '选择日期时间'"
                size="small"
                clearable
                class="w-full!"
                @update:model-value="(val: any) => setFilterValue(param.param_name, dateToTs(val))"
              />
            </div>

            <!-- 数字输入（int + widget=number） -->
            <div v-else-if="param.widget === 'number'" class="filter-item">
              <label class="mb-1 block text-xs font-medium text-text-secondary">
                {{ param.display_name }}
                <el-tooltip v-if="param.description" :content="param.description" placement="top">
                  <el-icon :size="12" class="ml-1 cursor-help text-text-placeholder"><QuestionFilled /></el-icon>
                </el-tooltip>
              </label>
              <el-input-number
                :model-value="getFilterValue(param.param_name)"
                :placeholder="param.placeholder || '输入' + param.display_name"
                :min="0"
                size="small"
                controls-position="right"
                class="w-full!"
                @update:model-value="(val: any) => setFilterValue(param.param_name, val)"
              />
            </div>

            <!-- 文本输入（str + widget=input，默认） -->
            <div v-else class="filter-item">
              <label class="mb-1 block text-xs font-medium text-text-secondary">
                {{ param.display_name }}
                <el-tooltip v-if="param.description" :content="param.description" placement="top">
                  <el-icon :size="12" class="ml-1 cursor-help text-text-placeholder"><QuestionFilled /></el-icon>
                </el-tooltip>
              </label>
              <el-input
                :model-value="getFilterValue(param.param_name)"
                :placeholder="param.placeholder || '输入' + param.display_name"
                size="small"
                clearable
                class="w-full!"
                @update:model-value="(val: any) => setFilterValue(param.param_name, val)"
              />
            </div>
          </template>
        </div>

        <div class="mt-3 flex justify-end">
          <el-button type="primary" size="small" @click="$emit('apply')">
            <el-icon class="el-icon--left"><Search /></el-icon>
            应用筛选
          </el-button>
        </div>
      </el-collapse-item>
    </el-collapse>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { QuestionFilled, Search } from '@element-plus/icons-vue'
import type { FilterParamMeta } from '@/api/lottery_data/bili/lottery_database_bili_api'

const props = defineProps<{
  filterParams: FilterParamMeta[]
  filterValues: Record<string, any>
}>()

const emit = defineEmits<{
  (e: 'update:filterValues', values: Record<string, any>): void
  (e: 'apply'): void
}>()

// 手风琴模式，默认收起（无激活项）
const activeNames = ref<string>('')

// 只显示非分页参数（分页参数在表格组件中处理）
const visibleParams = computed(() =>
  props.filterParams.filter(p => p.param_name !== 'page_num' && p.param_name !== 'page_size')
)

function getFilterValue(paramName: string): any {
  return props.filterValues[paramName] ?? null
}

// Unix 时间戳（秒） <-> Date 转换，用于日期组件展示与传值
function tsToDate(ts: any): Date | null {
  if (ts === null || ts === undefined || ts === '' || ts === 0) return null
  const n = Number(ts)
  if (Number.isNaN(n)) return null
  // 兼容秒 / 毫秒
  return new Date(n > 1e12 ? n : n * 1000)
}

function dateToTs(date: any): number | null {
  if (!date) return null
  const d = date instanceof Date ? date : new Date(date)
  if (Number.isNaN(d.getTime())) return null
  // 统一转成秒级时间戳
  return Math.floor(d.getTime() / 1000)
}

function setFilterValue(paramName: string, value: any) {
  const newValues = { ...props.filterValues }

  // 处理枚举 bool 类型（字符串 "true"/"false" 转为布尔值）
  if (value === 'true') {
    newValues[paramName] = true
  } else if (value === 'false') {
    newValues[paramName] = false
  } else if (value === '' || value === undefined) {
    // 清空时设为 null
    newValues[paramName] = null
  } else {
    newValues[paramName] = value
  }

  emit('update:filterValues', newValues)
}

function resetFilters() {
  const resetValues: Record<string, any> = {}
  for (const param of props.filterParams) {
    if (param.default_value !== undefined && param.default_value !== null) {
      resetValues[param.param_name] = param.default_value
    } else {
      resetValues[param.param_name] = null
    }
  }
  emit('update:filterValues', resetValues)
  emit('apply')
}
</script>

<style scoped>
.lottery-filter-bar {
  width: 100%;
}

.filter-item {
  min-width: 0;
}

.filter-collapse {
  border: 1px solid var(--el-border-color-light);
  border-radius: 8px;
  background-color: var(--el-fill-color-light);
}

.filter-collapse :deep(.el-collapse-item__header) {
  padding: 0 12px;
  border-bottom: none;
  background-color: transparent;
}

.filter-collapse :deep(.el-collapse-item__wrap) {
  background-color: transparent;
}

.filter-collapse :deep(.el-collapse-item__content) {
  padding: 12px;
}
</style>
