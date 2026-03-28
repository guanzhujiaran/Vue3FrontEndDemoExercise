<template>
  <div ref="gridContainer" class="grid-container" :style="{ '--item-width': itemWidth, '--min-columns': minColumns, '--gap': gap + 'px' }">
    <slot></slot>
  </div>
</template>

<script setup>
const props = defineProps({
  itemWidth: {
    type: String,
    default: '200px'
  },
  gap: {
    type: Number,
    default: 10
  },
  minColumns: {
    type: Number,
    default: 2
  }
})

</script>

<style scoped>
.grid-container {
  display: grid;
  /* 使用 min-columns 作为固定列数，而不是 auto-fit */
  grid-template-columns: repeat(var(--min-columns), minmax(max(var(--item-width), calc((100% - var(--gap) * (var(--min-columns) - 1)) / var(--min-columns))), 1fr));
  gap: var(--gap);
  justify-items: center;
}
</style>
