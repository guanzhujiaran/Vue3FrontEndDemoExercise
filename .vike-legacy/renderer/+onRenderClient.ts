/**
 * 客户端渲染入口（Vike 接管后替代原 src/main.ts）。
 *
 * 本应用是 SPA + 构建后无头浏览器预渲染：
 * - 容器里可能是「预渲染好的静态 HTML」。这里用 `createApp`（**不是 hydrate**）挂载，
 *   Vue 会接管并重建这份 DOM，因此没有水合不匹配问题；首屏数据由预渲染时注入的
 *   `window.__SSR_DATA__` 提供（见 `src/app/ssrData.ts`），所以重建后内容与静态 HTML 一致，不会闪空白。
 * - 后续站内跳转由 Vike clientRouting 再次调用本函数，这里交给 vue-router 处理并保持幂等。
 */
import type { PageContextClient } from 'vike/types'
import { createAppBundle, type AppBundle } from '@/app/createApp'
import { dumpSsrData, loadSsrData } from '@/app/ssrData'

let bundle: AppBundle | null = null

/**
 * 采集模式（仅预渲染脚本运行时开启，见 scripts/prerender.mjs）：
 * 把页面实际加载到的数据暴露到 window，供脚本抓取后注入静态 HTML。
 */
function startCollecting() {
  if (!import.meta.env.VITE_PRERENDER_COLLECT) return
  const tick = () => {
    ;(window as unknown as { __PRERENDER_DATA__?: unknown }).__PRERENDER_DATA__ = dumpSsrData()
  }
  tick()
  setInterval(tick, 300)
}

/**
 * 清理静态 HTML 里残留的 Element Plus 浮层（预渲染快照带下来的「即时态」节点）。
 *
 * Element Plus 的 ElMessage / ElNotification / ElLoading / ElMessageBox 与 el-dialog、
 * el-popper 都会把节点挂到 body 上；预渲染抓快照时页面若正弹着通知或还在 Loading，
 * 它们就被写进了 HTML。客户端用 `createApp` 重建（非 hydrate），不会接管这些节点 ——
 * 于是通知的关闭按钮点了没反应，loading 遮罩还会整体挡住页面点击。
 *
 * 新产物已在 `scripts/prerender.mjs` 的 `removeTransientLayers()` 里清理，
 * 这里是**兜底**：让「已部署的旧 HTML + 新 JS」也能恢复正常交互。
 */
function removePrerenderedLayers() {
  const selectors = [
    '.el-notification',
    '.el-message',
    '.el-message-box__wrapper',
    '.el-loading-mask',
    '.el-overlay',
    '[id^="el-popper-container-"]',
    '.el-popper'
  ].join(',')
  document.querySelectorAll(selectors).forEach((el) => el.remove())
}

export async function onRenderClient(pageContext: PageContextClient) {
  if (!bundle) {
    // 复用预渲染时注入的数据：首屏即为真实内容，避免「先空后满」的闪动与重复请求
    loadSsrData((window as unknown as { __SSR_DATA__?: unknown }).__SSR_DATA__)
    startCollecting()
    // 必须先清残留再挂载：此时尚未创建任何运行时浮层，删除是安全的（Vue 会重建自己的）
    removePrerenderedLayers()
    bundle = createAppBundle()
    // 客户端 router 是 WebHistory 单例，会自行从 window.location 解析当前 URL
    await bundle.router.isReady()
    bundle.app.mount(document.getElementById('app')!)
    return
  }

  // ⚠️ `urlParsed.search` 是**解析后的对象**（vike 的 parseUrl 产物），
  // 直接做字符串拼接会得到 `[object Object]` 并污染 URL——
  // 原始查询串要用 `searchOriginal`（形如 `?a=1`）。
  const target = `${pageContext.urlParsed?.pathname ?? '/'}${pageContext.urlParsed?.searchOriginal ?? ''}`
  if (bundle.router.currentRoute.value.fullPath !== target) {
    await bundle.router.push(target)
  }
}
