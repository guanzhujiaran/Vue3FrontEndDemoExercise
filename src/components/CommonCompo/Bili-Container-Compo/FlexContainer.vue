<script setup lang="ts"></script>

<template>
  <div class="flex-container">
    <slot><span>无内容！！</span></slot>
  </div>
</template>

<style scoped>
.flex-container {
  background-color: var(--el-bg-color);
  width: -webkit-fill-available;
  display: flex;
  flex-direction: column;
  flex: 1;
  align-items: stretch;
  height: -webkit-fill-available;
  box-sizing: border-box;
}
</style>
