<template>
  <div class="message-empty-state flex flex-col items-center justify-center py-16 text-center">
    <el-icon class="message-empty-state__icon text-5xl text-msg-muted">
      <DocumentDelete />
    </el-icon>
    <p class="message-empty-state__text mt-3 text-base text-msg-muted">{{ text }}</p>
  </div>
</template>

<script setup lang="ts">
defineProps<{ text?: string }>()
</script>
