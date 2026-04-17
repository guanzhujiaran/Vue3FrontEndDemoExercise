<template>
  <div ref="gridContainer" class="grid justify-items-center" :style="{ '--item-width': itemWidth, '--min-columns': minColumns, '--gap': gap + 'px', gridTemplateColumns: `repeat(var(--min-columns), minmax(max(var(--item-width), calc((100% - var(--gap) * (var(--min-columns) - 1)) / var(--min-columns))), 1fr))`, gap: 'var(--gap)' }">
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


