/**
 * HTML 外壳（Vike 在 dev / preview 请求时使用）。
 *
 * 本应用是「SPA + 构建后无头浏览器预渲染」：
 * - 这里**不做任何服务端渲染**，直接以 `index.html` 为外壳输出；
 * - 预渲染由 `scripts/prerender.mjs` 在构建后用 Playwright 完成
 *   （打开每个 URL → 等渲染完 → 把 DOM 快照写回 `dist/client/*.html`）；
 * - `index.html` 里的静态 SEO 兜底标签保持不变，客户端挂载后由
 *   `useRouteSeo` 移除并按当前路由重写。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { dangerouslySkipEscape } from 'vike/server'

/** HTML shell：只读一次（进程内复用） */
const INDEX_HTML = readFileSync(resolve(process.cwd(), 'index.html'), 'utf-8')

/** 旧的 SPA 入口脚本：Vike 会注入自己的 client entry，必须移除避免重复挂载 */
const LEGACY_ENTRY_RE = /[ \t]*<script[^>]*src="\/src\/main\.ts"[^>]*><\/script>\n?/g

export async function onRenderHtml() {
  const html = INDEX_HTML.replace(LEGACY_ENTRY_RE, '')
  return { documentHtml: dangerouslySkipEscape(html) }
}
