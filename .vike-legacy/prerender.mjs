/**
 * 构建后预渲染（无头浏览器方案）。
 *
 * 流程：`vike build` 产出前端资源 → 本脚本起 `vike preview`（外壳 HTML + `/api` 反代）
 * → 用 Playwright 逐个打开要收录的 URL → 等页面把数据渲染完 → 把渲染后的 DOM
 * 连同页面实际加载到的数据（`window.__PRERENDER_DATA__` → 注入为 `window.__SSR_DATA__`）
 * 写回 `dist/client/<path>/index.html`。
 *
 * 为什么用浏览器而不是 renderToString：组件里的 `window` / `onMounted` 取数逻辑无需改动，
 * HTML 天然就是「数据已加载」的状态。客户端启动时用 `createApp().mount()`（非 hydrate）
 * 接管，配合注入的数据快照，首屏内容与静态 HTML 一致，不会闪空白、也不会水合报错。
 *
 * ⚠️ 数据源（重要）：HTML 里的数据来自 `PRERENDER_API_TARGET`，且是**构建时刻的快照**。
 * 生产构建必须指向生产接口，否则会把本地开发库的数据写进上线产物：
 *   `PRERENDER_API_TARGET=https://serena.dynv6.net npm run build`
 * 客户端加载后仍会重新拉取最新数据，所以快照只影响「首屏 / 爬虫看到的版本」。
 *
 * 环境变量：
 * - `PRERENDER_API_TARGET`：后端地址，默认 `http://localhost:9923`（本地网关，仅用于本地调试）
 * - `PRERENDER_COOKIE`：抓取时附带 Cookie（需要登录态的页面用）
 * - `PRERENDER_CHROMIUM`：chromium 可执行文件路径（默认用 Playwright 自带；缺失时提示安装）
 * - `PRERENDER_SKIP_THIRD_PARTY=0`：不屏蔽第三方脚本（默认屏蔽 GTM / Adsense / busuanzi 等以加速）
 */
import { spawn } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { chromium } from 'playwright'

const ROOT = resolve(import.meta.dirname, '..')
const DIST = join(ROOT, 'dist/client')
const API_TARGET = process.env.PRERENDER_API_TARGET ?? 'http://localhost:9923'
const PRERENDER_COOKIE = process.env.PRERENDER_COOKIE ?? ''
const SKIP_THIRD_PARTY = process.env.PRERENDER_SKIP_THIRD_PARTY !== '0'
const IS_LOCAL_TARGET = /^https?:\/\/(localhost|127\.0\.0\.1)/.test(API_TARGET)
const PORT = 4180
const BASE_URL = `http://localhost:${PORT}`
/** 页面渲染完成的判定：`#app` 里有实际内容（不是空的加载遮罩） */
const READY_TIMEOUT = 30000

/** 从 src/config/seo_routes.ts 读取清单，保证与 sitemap / robots 同源（脚本不便 import TS） */
function readPrerenderRoutes() {
  const src = readFileSync(join(ROOT, 'src/config/seo_routes.ts'), 'utf-8')
  const block = src.match(/SEO_INDEXABLE_ROUTES[^=]*=\s*\[([\s\S]*?)\]/)
  if (!block) throw new Error('未能在 src/config/seo_routes.ts 中找到 SEO_INDEXABLE_ROUTES')
  return [...block[1].matchAll(/'([^']+)'/g)].map((m) => m[1])
}

/** 端口是否已被占用（多半是上次异常退出遗留的 preview：会导致新进程起不来、抓到旧产物） */
async function isPortBusy() {
  try {
    await fetch(`${BASE_URL}/`, { redirect: 'manual', signal: AbortSignal.timeout(1500) })
    return true
  } catch {
    return false
  }
}

/** 启动 `vike preview`：它按 renderer/+onRenderHtml.ts 输出外壳 HTML，并把 /api 反代到后端 */
async function startPreview() {
  if (await isPortBusy()) {
    throw new Error(
      `端口 ${PORT} 已被占用（通常是上次残留的 vike preview）。` +
        `请先结束它再重试：pkill -f "vike preview"`
    )
  }
  // detached 形成独立进程组：结束时按组 kill，避免 npx 退出但 preview 子进程残留
  const child = spawn('npx', ['vike', 'preview', '--mode', 'prod', '--port', String(PORT)], {
    cwd: ROOT,
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: true,
    env: { ...process.env, PRERENDER_API_TARGET: API_TARGET }
  })
  child.stdout.on('data', () => {})
  child.stderr.on('data', (d) => process.stderr.write(`[preview] ${d}`))

  const deadline = Date.now() + 60000
  while (Date.now() < deadline) {
    if (await isPortBusy()) return child
    await new Promise((r) => setTimeout(r, 500))
  }
  stopPreview(child)
  throw new Error('vike preview 启动超时')
}

/** 结束 preview 及其子进程组 */
function stopPreview(child) {
  try {
    process.kill(-child.pid, 'SIGTERM')
  } catch {
    try {
      child.kill('SIGTERM')
    } catch {
      // 已退出
    }
  }
}

/**
 * 归一化资源地址：Vike 注入的 `<script>` / `<link modulepreload>` 用的是**预渲染时的请求 Host**
 * （`http://localhost:4180`）。若原样写回产物，上线后浏览器会去请求用户自己的 localhost，
 * 导致 JS（以及由 JS 注入的 CSS）全部加载失败——页面变成「有 DOM、没样式、没交互」。
 */
function normalizeAssetUrls(html) {
  return html.split(`${BASE_URL}/`).join('/').split(BASE_URL).join('')
}

/** 把数据快照注入 HTML（放在 head 末尾，早于客户端脚本执行） */
function injectSsrData(html, data) {
  if (!data || Object.keys(data).length === 0) return html
  const json = JSON.stringify(data).replace(/</g, '\\u003c')
  return html.replace('</head>', `<script>window.__SSR_DATA__=${json}</script>\n</head>`)
}

/**
 * 抓快照前清理「瞬时浮动层」。
 *
 * Element Plus 的 ElMessage / ElNotification / ElLoading / ElMessageBox，以及
 * el-dialog、el-popper（tooltip / dropdown / select 面板）都会把节点挂到 body 上。
 * 预渲染时页面若恰好弹过通知（本站在 App.vue 全局挂了 SponsorNotification）或仍在
 * loading 态，这些节点会被 documentElement.outerHTML 原样写进静态 HTML。
 *
 * 客户端是 `createApp` 重建（非 hydrate），不会接管这些节点 —— 它们会永远留在页面上：
 * 通知的关闭按钮点了没反应（「消息提示删不掉」），loading 遮罩更会整体挡住点击。
 * 必须在抓取前删掉。
 */
async function removeTransientLayers(page) {
  await page.evaluate(() => {
    const selectors = [
      '.el-notification',
      '.el-message',
      '.el-message-box__wrapper',
      '.el-loading-mask',
      '.el-overlay',
      '[id^="el-popper-container-"]',
      '.el-popper'
    ]
    document.querySelectorAll(selectors.join(',')).forEach((el) => el.remove())
  })
}

function writeHtml(routePath, html) {
  const target =
    routePath === '/'
      ? join(DIST, 'index.html')
      : join(DIST, routePath.replace(/^\/|\/$/g, ''), 'index.html')
  mkdirSync(dirname(target), { recursive: true })
  writeFileSync(target, html, 'utf-8')
  return target
}

async function main() {
  if (!existsSync(DIST)) throw new Error(`未找到构建产物 ${DIST}，请先执行 vike build`)

  const routes = readPrerenderRoutes()
  if (IS_LOCAL_TARGET) {
    console.warn(
      '[prerender] ⚠️ 数据源是本地环境，抓到的数据会写进产物！\n' +
        '            生产构建请显式指定：PRERENDER_API_TARGET=https://serena.dynv6.net npm run build'
    )
  }
  const preview = await startPreview()
  console.log(`[prerender] preview 已就绪 ${BASE_URL}（/api → ${API_TARGET}）`)

  const launchOptions = {}
  if (process.env.PRERENDER_CHROMIUM) launchOptions.executablePath = process.env.PRERENDER_CHROMIUM
  const browser = await chromium.launch(launchOptions)
  const context = await browser.newContext(
    PRERENDER_COOKIE ? { extraHTTPHeaders: { cookie: PRERENDER_COOKIE } } : {}
  )
  const page = await context.newPage()

  if (SKIP_THIRD_PARTY) {
    // 屏蔽统计 / 广告等第三方脚本：加速构建、避免在无外网环境下卡住
    await page.route('**/*', (route) => {
      const host = new URL(route.request().url()).hostname
      const thirdParty = /googletagmanager|googlesyndication|google-analytics|busuanzi|clarity|casdoor/i
      return thirdParty.test(host) ? route.abort() : route.continue()
    })
  }
  page.on('pageerror', (e) => console.warn(`  [页面错误] ${String(e).slice(0, 120)}`))

  let failed = 0
  for (const routePath of routes) {
    try {
      await page.goto(`${BASE_URL}${routePath}`, { waitUntil: 'domcontentloaded', timeout: READY_TIMEOUT })
      // 等首屏渲染出内容（含接口数据），再抓快照
      await page.waitForFunction(
        () => {
          const app = document.getElementById('app')
          return !!app && app.innerText.trim().length > 120
        },
        undefined,
        { timeout: READY_TIMEOUT }
      )
      await page.waitForTimeout(800)
      await removeTransientLayers(page)

      const html = await page.evaluate(() => `<!DOCTYPE html>\n${document.documentElement.outerHTML}`)
      const data = await page.evaluate(() => window.__PRERENDER_DATA__ ?? null)
      const out = writeHtml(routePath, injectSsrData(normalizeAssetUrls(html), data))
      const size = statSync(out).size
      console.log(
        `  ✓ ${routePath.padEnd(38)} (${(size / 1024).toFixed(0)} KB, 数据键 ${data ? Object.keys(data).length : 0})`
      )
    } catch (e) {
      failed++
      console.error(`  ✗ ${routePath} 预渲染失败: ${String(e).slice(0, 200)}`)
    }
  }

  await browser.close()
  stopPreview(preview)
  console.log(`[prerender] 完成：成功 ${routes.length - failed}/${routes.length}`)
  if (failed) process.exitCode = 1
}

main().catch((e) => {
  console.error('[prerender] 失败:', e)
  process.exitCode = 1
})
