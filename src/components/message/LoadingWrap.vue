<template>
  <div class="message-loading-wrap">
    <el-skeleton v-if="loading" :rows="rows" animated class="message-loading-wrap__skeleton px-4 py-4" />
    <slot v-else />
  </div>
</template>

<script setup lang="ts">
defineProps<{ loading?: boolean; rows?: number }>()
</script>
