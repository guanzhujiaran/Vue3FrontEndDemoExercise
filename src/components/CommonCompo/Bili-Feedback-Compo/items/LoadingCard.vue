<template>
  <div class="card" style="display: block">
    <div class="loading">
      <div
        role="progressbar"
        class="link-progress-tv"
        :style="{
          backgroundColor: 'var(--el-color-white)',
          animationDuration: '0.2s',
          color: 'var(--el-text-color-primary)'
        }"
      >
        <div class="text">{{ text }}</div>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
withDefaults(
  defineProps<{
    text?: string
  }>(),
  {
    text: ''
  }
)
defineExpose()
</script>
<style scoped>
@import '@/assets/components/feedback/loading-card-tailwind.css';
</style>
