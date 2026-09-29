<script setup lang="ts">
/**
 * Vike 的唯一页面（配合 catch-all 路由 `/*`）。
 *
 * 直接渲染现有 App.vue：里面已有 RouterView + keep-alive + 全局 SEO（useRouteSeo），
 * 因此路由切换、布局、head 维护等行为与改造前完全一致。
 */
import App from '@/App.vue'
</script>

<template>
  <App />
</template>
