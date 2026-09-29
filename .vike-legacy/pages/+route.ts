/**
 * Vike 路由：catch-all（所有 URL 都命中同一个 page）。
 *
 * 应用真正的路由由 vue-router 承担（`src/router/index.ts`，27KB 的守卫 / meta / keep-alive 策略都在那边），
 * Vike 只负责「按 URL 在构建期渲染出一份 HTML」。这样迁移成本最低，也保留了既有路由行为。
 *
 * 预渲染的 URL 列表见 `+onBeforePrerenderStart.ts`。
 */
export default '/*'
