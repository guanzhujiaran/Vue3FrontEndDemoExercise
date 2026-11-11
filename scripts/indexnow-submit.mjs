#!/usr/bin/env node
/**
 * IndexNow 提交脚本：把站点 URL 主动推送给 IndexNow 生态的搜索引擎
 * （Bing / Yandex / Seznam / Naver；Google 不参与，仍靠 sitemap + 抓取）。
 *
 * IndexNow 不替代 sitemap，只负责「内容变了，请尽快来抓」的即时通知，
 * 所以标准流程是：`npm run build` → 部署 dist/client → 再跑本脚本。
 *
 * 用法：
 *   npm run indexnow                 # 读 dist/client/sitemap.xml，校验线上 key 文件后提交
 *   npm run indexnow:dry             # 只打印将要发送的 payload，不发任何请求
 *   node scripts/indexnow-submit.mjs --sitemap https://serena.dynv6.net/sitemap.xml
 *   node scripts/indexnow-submit.mjs --url https://serena.dynv6.net/ --url https://serena.dynv6.net/app/changelog
 *
 * IndexNow 的 key 校验方式：在站点根目录放一个 `<key>.txt`，内容就是 key 本身。
 * 本项目的 key 文件是 `public/d9c633ecc4af45499603aeff7d610d32.txt`，随 `nuxt generate`
 * 复制到 `dist/client/` 根目录，由 nginx 直接托管在 `https://<host>/<key>.txt`。
 * 脚本从 `public/` 里自动发现 key（文件名是 8-128 位十六进制 / 字母数字，且内容等于文件名），
 * 不需要在脚本里再写一遍，换 key 时只替换 public 下的文件即可。
 *
 * 退出码：0 全部成功；1 参数 / 校验 / 请求失败。
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { parseArgs } from 'node:util'

/** IndexNow 通用端点：一次提交会自动同步给所有参与引擎 */
const DEFAULT_ENDPOINT = 'https://api.indexnow.org/indexnow'
/** 单次请求的 URL 上限（IndexNow 规格：10000） */
const MAX_URLS_PER_REQUEST = 10_000
/** key 文件名的合法格式（IndexNow 允许 8-128 位 hex，这里放宽到字母数字与连字符） */
const KEY_RE = /^[A-Za-z0-9-]{8,128}$/
const DEFAULT_SITEMAP = join('dist', 'client', 'sitemap.xml')

const HELP = `IndexNow 提交脚本

选项：
  -n, --dry-run              只打印 payload，不发请求（也会跳过线上 key 校验）
  -u, --url <url>            指定要提交的 URL，可重复；给了就不读 sitemap
  -s, --sitemap <path|url>   sitemap 来源，默认 ${DEFAULT_SITEMAP}
  -k, --key <key>            指定 IndexNow key（默认从 public/ 自动发现）
      --key-location <url>   key 文件地址，默认 <host>/<key>.txt
      --host <host>          目标 host，默认取第一个 URL 的 host
  -e, --endpoint <url>       提交端点，默认 ${DEFAULT_ENDPOINT}
      --timeout <ms>         单个请求超时，默认 15000
      --verify-only          只校验线上 key 文件并列出待提交 URL，不提交
      --skip-verify          跳过「线上 key 文件可访问且内容正确」校验
  -h, --help                 显示本帮助
`

function fail(message) {
  console.error(`[indexnow] ✗ ${message}`)
  process.exit(1)
}

function log(message) {
  console.log(`[indexnow] ${message}`)
}

/** 解析命令行；位置参数也当作 URL，方便 `--` 之后的批量粘贴 */
function parseCli() {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      'dry-run': { type: 'boolean', short: 'n', default: false },
      url: { type: 'string', multiple: true, short: 'u', default: [] },
      sitemap: { type: 'string', short: 's' },
      key: { type: 'string', short: 'k' },
      'key-location': { type: 'string' },
      host: { type: 'string' },
      endpoint: { type: 'string', short: 'e' },
      timeout: { type: 'string' },
      'verify-only': { type: 'boolean', default: false },
      'skip-verify': { type: 'boolean', default: false },
      help: { type: 'boolean', short: 'h', default: false }
    }
  })
  return { values, positionals }
}

/**
 * 从 public/ 里自动发现 IndexNow key 文件。
 * 判定条件：`*.txt`、文件名合法、内容（trim 后）与文件名一致 —— 这正是 IndexNow 的校验规则。
 */
function discoverKeys(publicDir) {
  if (!existsSync(publicDir)) return []
  const found = []
  for (const file of readdirSync(publicDir)) {
    if (!file.endsWith('.txt')) continue
    const key = file.slice(0, -'.txt'.length)
    if (!KEY_RE.test(key)) continue
    const content = readFileSync(join(publicDir, file), 'utf8').trim()
    if (content === key) found.push({ key, file: join(publicDir, file) })
  }
  return found
}

function resolveKey(cliKey) {
  if (cliKey) {
    if (!KEY_RE.test(cliKey)) fail(`--key 格式非法（需 8-128 位字母数字 / 连字符）：${cliKey}`)
    return cliKey
  }
  const candidates = discoverKeys('public')
  if (candidates.length === 1) return candidates[0].key
  if (candidates.length === 0) {
    fail(
      'public/ 下没有找到 IndexNow key 文件。\n' +
        '  请新建 public/<key>.txt（内容 = 文件名里的 key），或显式传 --key。'
    )
  }
  fail(
    `public/ 下发现多个候选 key 文件：${candidates.map((item) => item.file).join(', ')}\n` +
      '  请只保留一个，或用 --key 指定。'
  )
}

/** 读取 sitemap（本地文件或远端 URL），抽出 <loc> 列表 */
async function readSitemap(source, timeout) {
  const isRemote = /^https?:\/\//i.test(source)
  if (!isRemote && !existsSync(source)) {
    fail(`找不到 sitemap：${source}\n  先执行 npm run build 生成 dist/client/sitemap.xml。`)
  }
  let xml
  if (isRemote) {
    log(`拉取远端 sitemap：${source}`)
    let response
    try {
      response = await fetch(source, {
        headers: { 'user-agent': 'bililottery-indexnow/1.0' },
        signal: AbortSignal.timeout(timeout)
      })
    } catch (error) {
      fail(`拉取 sitemap 失败：${String(error)}`)
    }
    if (!response.ok) fail(`拉取 sitemap 失败：HTTP ${response.status} ${response.statusText}`)
    xml = await response.text()
  } else {
    xml = readFileSync(source, 'utf8')
  }
  const locs = [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi)].map((match) => match[1])
  if (locs.length === 0) fail(`sitemap 里没有 <loc> 条目：${source}`)
  return locs.map((loc) =>
    loc.replaceAll('&amp;', '&').replaceAll('&lt;', '<').replaceAll('&gt;', '>')
  )
}

/** 规范化 URL（去掉 hash，保留 path / query），并去重 */
function normalizeUrls(rawUrls) {
  const seen = new Set()
  const urls = []
  for (const raw of rawUrls) {
    let url
    try {
      url = new URL(raw.trim())
    } catch {
      fail(`非法 URL：${raw}`)
    }
    if (url.protocol !== 'https:' && url.protocol !== 'http:') fail(`只支持 http(s)：${raw}`)
    url.hash = ''
    const normalized = url.toString()
    if (seen.has(normalized)) continue
    seen.add(normalized)
    urls.push(normalized)
  }
  return urls
}

/** 校验线上 key 文件：内容必须与 key 完全一致，否则 IndexNow 会拒收整批 URL */
async function verifyKeyFile(keyLocation, key, timeout) {
  log(`校验线上 key 文件：${keyLocation}`)
  let response
  try {
    response = await fetch(keyLocation, {
      headers: { 'user-agent': 'bililottery-indexnow/1.0' },
      signal: AbortSignal.timeout(timeout)
    })
  } catch (error) {
    fail(`无法访问 key 文件（部署未完成 / 域名不通？）：${String(error)}\n  确认无误可加 --skip-verify。`)
  }
  if (!response.ok) {
    fail(`key 文件返回 HTTP ${response.status}：${keyLocation}\n  确认无误可加 --skip-verify。`)
  }
  const body = (await response.text()).trim()
  if (body !== key) {
    fail(`key 文件内容与 key 不一致：期望「${key}」，实际「${body.slice(0, 64)}」`)
  }
  log('✓ key 文件校验通过')
}

/** 单个分片提交；返回是否成功 */
async function submitChunk(endpoint, payload, timeout) {
  let response
  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'content-type': 'application/json; charset=utf-8',
        'user-agent': 'bililottery-indexnow/1.0'
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(timeout)
    })
  } catch (error) {
    console.error(`[indexnow] ✗ 请求失败：${String(error)}`)
    return false
  }
  // 200 = 已接收；202 = 已接收但 key 待校验，均视为成功
  if (response.status === 200 || response.status === 202) {
    log(`✓ 提交成功：HTTP ${response.status}（${payload.urlList.length} 条 URL）`)
    return true
  }
  const hints = {
    400: '请求格式错误',
    403:
      'key 校验失败：确认 key 文件能从公网 IPv4 访问且内容与 key 完全一致' +
      '（域名只有 AAAA 记录、无 A 记录时 IndexNow 取不到 key 文件，必然 403）',
    422: 'URL 与 host 不匹配，或 key 不符合规范',
    429: '请求过于频繁（被限流）'
  }
  const hint = hints[response.status] ?? '未知错误'
  const text = await response.text().catch(() => '')
  console.error(
    `[indexnow] ✗ 提交失败：HTTP ${response.status} ${response.statusText} —— ${hint}` +
      (text ? `\n  ${text.slice(0, 500)}` : '')
  )
  return false
}

async function main() {
  const { values, positionals } = parseCli()
  if (values.help) {
    console.log(HELP)
    return
  }

  const timeout = Number(values.timeout ?? 15_000)
  if (!Number.isFinite(timeout) || timeout <= 0) fail(`--timeout 非法：${values.timeout}`)

  const key = resolveKey(values.key)
  const endpoint = values.endpoint ?? DEFAULT_ENDPOINT
  const sitemapSource = values.sitemap ?? DEFAULT_SITEMAP

  const rawUrls = [...values.url, ...positionals]
  const sourceUrls = rawUrls.length > 0 ? rawUrls : await readSitemap(sitemapSource, timeout)
  const urls = normalizeUrls(sourceUrls)

  const firstUrl = new URL(urls[0])
  const host = values.host ?? firstUrl.host

  // host 必须与全部 URL 一致，否则 IndexNow 整批 422
  const foreign = urls.filter((url) => new URL(url).host !== host)
  if (foreign.length > 0) {
    fail(`以下 URL 不属于 host ${host}：\n  ${foreign.slice(0, 5).join('\n  ')}`)
  }

  const keyLocation = values['key-location'] ?? new URL(`${key}.txt`, `${firstUrl.protocol}//${host}/`).toString()

  log(
    `目标 host=${host}，${urls.length} 条 URL，key=${key}，endpoint=${endpoint}` +
      (values['dry-run'] ? '（dry-run）' : '')
  )

  if (values['dry-run']) {
    const preview = {
      host,
      key,
      keyLocation,
      urlList: urls
    }
    console.log(JSON.stringify(preview, null, 2))
    return
  }

  if (!values['skip-verify']) await verifyKeyFile(keyLocation, key, timeout)

  if (values['verify-only']) {
    log(`✓ 校验通过，未提交（${urls.length} 条 URL 待提交）`)
    return
  }

  let failed = 0
  for (let index = 0; index < urls.length; index += MAX_URLS_PER_REQUEST) {
    const chunk = urls.slice(index, index + MAX_URLS_PER_REQUEST)
    const ok = await submitChunk(endpoint, { host, key, keyLocation, urlList: chunk }, timeout)
    if (!ok) failed++
  }

  if (failed > 0) fail(`${failed} 个分片提交失败`)
  log(`✓ 全部完成：${urls.length} 条 URL 已提交`)
}

await main()
