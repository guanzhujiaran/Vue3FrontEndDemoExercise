import { onMounted } from 'vue'

/**
 * 客户端挂载后再强制拉取一次数据。
 *
 * ## 为什么需要
 * SSG（`nuxt generate`）页面里，首屏列表的数据是**构建那一刻的快照**，随 HTML 一起下发。
 * 直接打开收录页时，`useAsyncData` 会命中内联 payload 而**不重新请求**，
 * 于是列表会一直停留在构建时的数据上 —— 数据「是旧的」，只是看起来没坏。
 * 这里在挂载后（水合已完成）再请求一次，保证用户看到的是当前数据。
 *
 * ## 为什么不会引发 hydration mismatch
 * `onMounted` 在水合结束之后才执行，此时更新组件状态属于普通响应式更新，
 * 不参与服务端 / 客户端首帧比对。
 *
 * ## 代价（可接受）
 * 站内路由跳转进入同一页面时，setup 阶段的 `useAsyncData` 已经请求过一次，
 * 这里会再请求一次。两次是串行的、不会并发打爆网关，换来的是「首屏数据一定是新的」。
 * 如果哪天想省掉这次重复请求，可以改成「只在首屏来自预渲染快照时才刷新」
 * （即在 `useAsyncData` 返回值里带上 `import.meta.server` 标记）。
 */
export function useRefreshAfterMount(refresh: () => unknown) {
  onMounted(() => {
    refresh()
  })
}
