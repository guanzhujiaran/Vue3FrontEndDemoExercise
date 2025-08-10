<script setup lang="ts"></script>

<template>
  <div class="container">
    <slot></slot>
  </div>
</template>

<style scoped>
.container {
  background-color: var(--el-bg-color);
  width: 100%;
  margin: 0.5rem auto;
  display: flex;
  position: relative;
  -webkit-box-orient: horizontal;
  -webkit-box-direction: normal;
  -ms-flex-direction: row;
  flex-direction: row;
  -webkit-box-align: stretch;
  -ms-flex-align: stretch;
  align-items: stretch;
  flex-grow: 1;
}
</style>
