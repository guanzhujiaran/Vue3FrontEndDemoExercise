<template>
  <!-- 统一分页组件：强制「只有一页时隐藏」，其余能力全部透传给 el-pagination，
       业务侧只改这里即可统一调整分页外观与行为 -->
  <el-pagination
    v-bind="$attrs"
    :hide-on-single-page="true"
    class="bili-pagination"
  />
</template>

<script setup lang="ts">
// 不声明任何 props：所有属性（total / current-page / page-size / layout / size /
// page-sizes / pager-count / background / 事件等）通过 $attrs 原样传递给 el-pagination，
// 保证替换 <el-pagination> 时调用方无需改动参数。
defineOptions({ inheritAttrs: false })
</script>
