<template>
  <router-view v-slot="{ Component }">
    <transition
      enter-active-class="transition-opacity duration-300 ease-in-out"
      leave-active-class="transition-opacity duration-300 ease-in-out"
      enter-from-class="opacity-0"
      leave-to-class="opacity-0"
      mode="out-in"
    >
      <component :is="Component" />
    </transition>
  </router-view>
</template>

<script setup lang="ts">
// RPA浏览器布局组件
// 作为父路由的容器，包含router-view用于渲染子路由
</script>
