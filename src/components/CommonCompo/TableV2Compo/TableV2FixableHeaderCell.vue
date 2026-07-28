<script setup lang="ts">
/**
 * el-table-v2 通用自定义表头单元格
 * - 显示列标题（或通过默认插槽自定义内容）
 * - 提供"固定/取消固定"切换图标
 *
 * 用法（在 el-table-v2 的 #header-cell 插槽内）：
 * <template #header-cell="{ column }">
 *   <TableV2FixableHeaderCell
 *     :title="column.title"
 *     :column-key="column.key"
 *     :align="column.align"
 *     :fixed="isColumnFixed(column.key)"
 *     @toggle-fixed="toggleColumnFixed"
 *   />
 * </template>
 */
import { Lock, Unlock } from '@element-plus/icons-vue'

withDefaults(
  defineProps<{
    /** 列标题文本，使用默认插槽时可省略 */
    title?: string
    /** 列的唯一 key，toggle-fixed 事件会带上它 */
    columnKey?: PropertyKey
    /** 当前列是否处于固定状态 */
    fixed?: boolean
    /** 对齐方式，与 el-table-v2 列的 align 保持一致 */
    align?: 'left' | 'center' | 'right'
    /** 是否允许该列被固定（false 时不渲染切换图标） */
    fixable?: boolean
    /** 固定/取消固定的 tooltip 文案 */
    fixedTip?: string
    unfixedTip?: string
  }>(),
  {
    title: '',
    columnKey: undefined,
    fixed: false,
    align: 'left',
    fixable: true,
    fixedTip: '取消固定该列',
    unfixedTip: '固定该列'
  }
)

const emit = defineEmits<{
  (e: 'toggle-fixed', columnKey: PropertyKey | undefined): void
}>()
</script>

<template>
  <div
    class="tablev2-fixable-header-cell flex w-full items-center gap-1"
    :class="align === 'right' ? 'justify-end' : align === 'center' ? 'justify-center' : 'justify-between'"
  >
    <span class="truncate font-semibold">
      <slot>{{ title }}</slot>
    </span>
    <el-tooltip v-if="fixable" :content="fixed ? fixedTip : unfixedTip" placement="top">
      <el-icon
        class="header-fix-toggle cursor-pointer"
        :class="{ 'is-fixed': fixed }"
        @click.stop="emit('toggle-fixed', columnKey)"
      >
        <Lock v-if="fixed" />
        <Unlock v-else />
      </el-icon>
    </el-tooltip>
  </div>
</template>

<style scoped>
.header-fix-toggle {
  flex-shrink: 0;
  color: var(--el-text-color-placeholder);
  transition: color 0.2s;
}

.header-fix-toggle:hover,
.header-fix-toggle.is-fixed {
  color: var(--el-color-primary);
}
</style>
