<script setup lang="ts">
import { useDebounceFn } from '@vueuse/core'
import { Search } from '@element-plus/icons-vue'
import type { FilterType, SortBy, SortOrder } from '@/api/browser/hey-api'

/**
 * RPA 资源列表统一筛选栏（动作管理 / 工作流管理共用）
 *
 * 只负责筛选条件与样式；列表请求由使用方监听 `change` 后按各自接口发起，
 * 名称输入内置 400ms 防抖，下拉/排序变化即时触发。
 */
interface FilterOption {
  label: string
  value: FilterType
}

interface SortOption {
  label: string
  value: SortBy
}

interface Props {
  /** 名称搜索占位文案 */
  placeholder?: string
  /** filter_type 选项；默认 全部/私有/公开/认证 */
  filterOptions?: FilterOption[]
  /** 排序字段选项 */
  sortOptions?: SortOption[]
  /** 标签候选（showTag 时使用） */
  tags?: string[]
  /** 是否展示标签筛选（如工作流接口暂不支持标签过滤） */
  showTag?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: '搜索名称',
  filterOptions: () => [
    { label: '全部', value: 'all' },
    { label: '私有', value: 'private' },
    { label: '公开', value: 'public' },
    { label: '认证', value: 'verified' },
  ],
  sortOptions: () => [
    { label: '更新时间', value: 'updated_at' },
    { label: '创建时间', value: 'created_at' },
    { label: '名称', value: 'name' },
    { label: '点赞数', value: 'likes_count' },
    { label: 'Fork数', value: 'forks_count' },
  ],
  tags: () => [],
  showTag: false,
})

const keyword = defineModel<string>('keyword', { default: '' })
const filterType = defineModel<FilterType>('filterType', { default: 'all' })
const sortBy = defineModel<SortBy>('sortBy', { default: 'updated_at' })
const sortOrder = defineModel<SortOrder>('sortOrder', { default: 'desc' })
const tag = defineModel<string>('tag', { default: '' })

const emit = defineEmits<{ (e: 'change'): void }>()

/** 名称输入防抖，避免逐字符触发列表请求 */
const emitKeywordChange = useDebounceFn(() => emit('change'), 400)

const onChange = () => emit('change')
</script>

<template>
  <div class="rpa-resource-filter flex items-center gap-3 mb-4 flex-wrap">
    <el-input
      v-model="keyword"
      :placeholder="placeholder"
      :prefix-icon="Search"
      clearable
      class="rpa-resource-filter__keyword w-60"
      @input="emitKeywordChange"
      @clear="onChange"
    />

    <el-select
      v-model="filterType"
      placeholder="筛选类型"
      class="rpa-resource-filter__type w-36"
      @change="onChange"
    >
      <el-option
        v-for="option in filterOptions"
        :key="option.value"
        :label="option.label"
        :value="option.value"
      />
    </el-select>

    <el-select
      v-if="showTag"
      v-model="tag"
      placeholder="按标签筛选"
      clearable
      class="rpa-resource-filter__tag w-45"
      @change="onChange"
      @clear="onChange"
    >
      <el-option v-for="t in props.tags" :key="t" :label="t" :value="t" />
    </el-select>

    <el-select
      v-model="sortBy"
      placeholder="排序字段"
      class="rpa-resource-filter__sort w-36"
      @change="onChange"
    >
      <el-option
        v-for="option in sortOptions"
        :key="option.value"
        :label="option.label"
        :value="option.value"
      />
    </el-select>

    <el-radio-group
      v-model="sortOrder"
      class="rpa-resource-filter__order"
      @change="onChange"
    >
      <el-radio-button value="desc">降序</el-radio-button>
      <el-radio-button value="asc">升序</el-radio-button>
    </el-radio-group>
  </div>
</template>
