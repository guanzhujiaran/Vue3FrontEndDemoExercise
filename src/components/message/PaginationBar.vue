<template>
  <div class="message-pagination-bar flex items-center justify-between py-4">
    <span class="message-pagination-bar__total text-sm text-msg-muted">共 {{ total }} 条</span>
    <el-pagination
      layout="prev, pager, next, sizes"
      :total="total"
      :page-size="pageSize"
      :page-sizes="pageSizes"
      :current-page="currentPage"
      size="default"
      @current-change="$emit('update:currentPage', $event)"
      @size-change="$emit('update:pageSize', $event)"
    />
  </div>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{ total: number; pageSize: number; currentPage: number; pageSizes?: number[] }>(),
  { pageSizes: () => [10, 20, 50, 100] }
)
defineEmits<{ 'update:currentPage': [number]; 'update:pageSize': [number] }>()
</script>
