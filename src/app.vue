<!--
  Nuxt 应用根。

  只做一层包装：真正的布局（头部 / 滚动容器 / 路由出口 / 全局弹层）仍在 `src/App.vue`，
  那里已经用 `<RouterView>` 渲染当前路由 —— 路由表由 `src/router.options.ts` 注入，
  所以不需要 Nuxt 的 `<NuxtPage>`（它只是 `<RouterView>` 的增强版，会与既有布局重复）。

  关于 Suspense：**不要**在这里再包一层 `<Suspense>`。
  页面组件里确实有 `await useAsyncData(...)`（SSR 取数必需），但 Nuxt 的渲染管线
  本身已经提供 Suspense；再包一层会与 `App.vue` 里的 `<keep-alive>` + `<transition>`
  组合出问题 —— 服务端渲染真实节点、客户端却渲染 KeepAlive 的占位注释，
  触发 `Hydration node mismatch`（`Symbol(v-cmt)`）。
-->
<template>
  <App />
</template>

<script setup lang="ts">
import App from './App.vue'
</script>
