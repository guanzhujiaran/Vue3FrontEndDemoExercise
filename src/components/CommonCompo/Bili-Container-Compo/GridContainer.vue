<template>
  <div ref="gridContainer" class="grid-container" :style="{ '--item-width': itemWidth }">
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
  }
})

</script>

<style scoped>
.grid-container {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(var(--item-width), 1fr));
  gap: 10px;
  justify-items: center;
}
</style>
