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
@import '@/assets/components/dropdown/header-avatar-dropdown-item-tailwind.css';
</style>