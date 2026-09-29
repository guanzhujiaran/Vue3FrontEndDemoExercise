/**
 * SSR 预取数据快照（服务端渲染 → 序列化进 HTML → 客户端首屏复用）。
 *
 * 为什么需要它：预渲染（SSG）时服务端会把接口数据渲染进 HTML；如果客户端首屏
 * 重新从空数据渲染，两边 DOM 不一致 → 水合不匹配（内容闪烁、Vue 告警），
 * 且白白多一次接口请求。标准做法是把服务端取到的数据随 HTML 下发，客户端首屏直接复用。
 *
 * 用法：
 * - 页面组件：`onServerPrefetch(async () => { await load(); setSsrData(key, 快照) })`
 * - 数据消费方（composable / store）：初始化时 `getSsrData(key)`，有值就直接用
 * - `+onRenderHtml.ts`：渲染前 `clearSsrData()`，渲染后 `dumpSsrData()` 注入 HTML
 * - `+onRenderClient.ts`：挂载前 `loadSsrData(window.__SSR_DATA__)`
 */
const ssrData = new Map<string, unknown>()

/**
 * 采集模式：仅当预渲染脚本以 `VITE_PRERENDER_COLLECT=1` 构建时开启。
 * 页面在无头浏览器里正常加载数据后调用 `collectSsrData()` 登记快照，
 * 脚本随后读取 `window.__PRERENDER_DATA__` 并注入静态 HTML。
 */
export const isCollectMode = Boolean(import.meta.env.VITE_PRERENDER_COLLECT)

/** 采集模式下登记一份数据快照（非采集模式为空操作，零运行时开销） */
export function collectSsrData(key: string, value: unknown) {
  if (!isCollectMode) return
  ssrData.set(key, JSON.parse(JSON.stringify(value)))
}

/** SSR 起始处调用：每个页面独立快照，避免串页 */
export function clearSsrData() {
  ssrData.clear()
}

export function setSsrData(key: string, value: unknown) {
  ssrData.set(key, value)
}

export function getSsrData<T = unknown>(key: string): T | undefined {
  return ssrData.get(key) as T | undefined
}

/** 是否有某份快照（用于判断「客户端首屏是否复用 SSR 数据」） */
export function hasSsrData(key: string): boolean {
  return ssrData.has(key)
}

/** 序列化为可注入 HTML 的普通对象 */
export function dumpSsrData(): Record<string, unknown> {
  return Object.fromEntries(ssrData)
}

/** 客户端启动时载入 HTML 里下发的快照 */
export function loadSsrData(data: unknown) {
  if (!data || typeof data !== 'object') return
  for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
    ssrData.set(key, value)
  }
}
