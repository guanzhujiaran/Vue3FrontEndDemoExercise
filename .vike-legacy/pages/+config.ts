/**
 * Vike 页面配置（作用于 src/pages 下所有页面）。
 *
 * 采用「SPA + 构建后无头浏览器预渲染」形态：
 * - `ssr: false`：页面不在 Node 里渲染（组件里可以正常使用 window / localStorage，
 *   不需要为 SSR 做兼容）；
 * - `prerender: false`：不使用 Vike 自带的 `renderToString` 预渲染，
 *   改由 `scripts/prerender.mjs` 在构建后用 Playwright 打开每个 URL、
 *   等页面渲染完再把 DOM 快照写回 HTML（数据也一并注入 `window.__SSR_DATA__`）；
 * - `clientRouting: true`：保留 SPA 式站内跳转（由 vue-router 承接，见 renderer/+onRenderClient.ts）。
 */
import type { Config } from 'vike/types'

export default {
  ssr: false,
  prerender: false,
  clientRouting: true
} satisfies Config
