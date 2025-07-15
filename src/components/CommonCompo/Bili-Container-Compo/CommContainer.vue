<script setup lang="ts"></script>

<template>
  <div class="container">
    <slot></slot>
  </div>
</template>

<style scoped>
.container {
  background-color: var(--el-bg-color);
  margin: 0.5rem auto;
  min-height: 100vh;
  padding: 0 0.3rem;
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

@media screen and (max-width: 880px) {
  .container {
    padding: 0;
    margin: 0.3rem auto;
  }
}
</style>
