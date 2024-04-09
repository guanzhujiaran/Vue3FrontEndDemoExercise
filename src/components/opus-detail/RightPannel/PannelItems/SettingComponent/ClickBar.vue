/** 下弹框组件 */
<template>
  <div class="title">
    <span> {{ title }}</span>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  title: string
}>()
</script>
