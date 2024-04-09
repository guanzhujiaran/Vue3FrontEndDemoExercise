<template>
  <div class="card" style="display: block">
    <div class="loading">
      <div
        role="progress"
        class="link-progress-tv"
        style="
          background-color: rgb(255, 255, 255);
          animation-duration: 0.2s;
          color: rgb(51, 51, 51);
        "
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
defineExpose(
  
)
</script>
