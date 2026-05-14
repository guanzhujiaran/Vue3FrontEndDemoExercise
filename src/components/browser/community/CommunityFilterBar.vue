<!--
 * @FilePath: \Vue3FrontEndDemoExercise\src\components\browser\community\CommunityFilterBar.vue
 * @Description: 社区筛选/排序工具栏
-->
<template>
  <div class="flex flex-wrap items-center gap-2">
    <el-radio-group v-model="filter" size="small" @change="emitChange">
      <el-radio-button
        v-for="opt in filterOptions"
        :key="opt.value"
        :value="opt.value"
      >
        {{ opt.label }}
      </el-radio-button>
    </el-radio-group>

    <el-divider direction="vertical" class="!h-5" />

    <el-select v-model="sort" size="small" class="w-32" @change="emitChange">
      <el-option
        v-for="opt in sortOptions"
        :key="opt.value"
        :label="opt.label"
        :value="opt.value"
      />
    </el-select>

    <el-button-group size="small">
      <el-button :type="sortOrder === 'desc' ? 'primary' : ''" @click="toggleSortOrder">
        <el-icon><SortDown /></el-icon>
        降序
      </el-button>
      <el-button :type="sortOrder === 'asc' ? 'primary' : ''" @click="toggleSortOrder">
        <el-icon><SortUp /></el-icon>
        升序
      </el-button>
    </el-button-group>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { SortDown, SortUp } from '@element-plus/icons-vue'
import { useCommunity } from '@/composables/useCommunity'
import type { CommunityFilter, CommunitySortBy, CommunitySortOrder } from '@/types/browser-automation-api'

const props = withDefaults(defineProps<{
  defaultFilter?: CommunityFilter
  defaultSort?: CommunitySortBy
  defaultSortOrder?: CommunitySortOrder
}>(), {
  defaultFilter: 'all',
  defaultSort: 'updated_at',
  defaultSortOrder: 'desc'
})

const emit = defineEmits<{
  change: [filter: CommunityFilter, sort: CommunitySortBy, sortOrder: CommunitySortOrder]
}>()

const { filterOptions, sortOptions } = useCommunity()

const filter = ref<CommunityFilter>(props.defaultFilter)
const sort = ref<CommunitySortBy>(props.defaultSort)
const sortOrder = ref<CommunitySortOrder>(props.defaultSortOrder)

const toggleSortOrder = () => {
  sortOrder.value = sortOrder.value === 'desc' ? 'asc' : 'desc'
  emitChange()
}

const emitChange = () => {
  emit('change', filter.value, sort.value, sortOrder.value)
}
</script>
