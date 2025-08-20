<script setup lang="ts"></script>

<template>
  <div class="header-dropdown-item">
    <slot name="text"></slot>
    <div class="header-dropdown-item-icon">
      <el-icon-arrow-right></el-icon-arrow-right>
    </div>
  </div>
</template>

<style scoped>
.header-dropdown-item {
  display: inline-flex;
  margin-left: 10px;
  width: -webkit-fill-available;
}
.header-dropdown-item-icon {
  margin-left: auto;
}

svg {
  width: 10px;
  height: 10px;
}
</style>
