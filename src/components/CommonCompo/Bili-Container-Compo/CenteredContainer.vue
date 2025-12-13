<template>
  <div class="centered-container">
    <div class="content">
      <slot></slot>
    </div>
  </div>
</template>

<script setup lang="ts">
// 这是一个居中的容器组件
</script>

<style scoped>
.centered-container {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  height: 100%;
}

.content {
  max-width: 100%;
  max-height: 100%;
}
</style>
