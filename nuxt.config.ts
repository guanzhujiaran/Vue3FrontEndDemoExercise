/**
 * Nuxt 配置（SSG：`nuxt generate` 产出纯静态文件，部署仍是 nginx 静态托管）。
 *
 * 迁移自 Vike + Playwright 预渲染方案，目录约定保持一致：
 * - `srcDir: 'src'`：沿用既有 `src/` 结构（components / composables / stores / api 等），
 *   新加入 Nuxt 约定的 `src/app.vue` / `src/router.options.ts` / `src/plugins/`；
 * - 路由**完全复用**原有 928 行 `src/router/index.ts`（见 `src/router.options.ts`），
 *   不做文件式路由重写；
 * - `vite.plugins` 承接原 vite.config.ts 里的构建插件（Tailwind v4 / svg / hey-api SDK 生成）。
 */
import path from 'node:path'
import { config as loadEnv } from 'dotenv'
import tailwindcss from '@tailwindcss/vite'
import svgLoader from 'vite-svg-loader'
import { heyApiPlugin } from '@hey-api/vite-plugin'
import { type UserParser } from '@hey-api/shared'
import type { Plugin, ResolvedConfig } from 'vite'
import {
  CANONICAL_QUERY_WHITELIST,
  DEFAULT_DESCRIPTION,
  DEFAULT_KEYWORDS,
  DEFAULT_LOCALE,
  SEO_INDEXABLE_ROUTES,
  SITE_NAME,
  SITE_URL
} from './src/config/seo_routes'
import { defineNuxtConfig } from 'nuxt/config'

/**
 * sitemap 条目权重：沿用 gen-sitemap.mjs 时代的分级
 * （首页 > 抽奖数据主列表页 > 其余抽奖列表 > 工具 / 内容页 > 状态页）。
 * `lastmod` 取 nuxt.config 求值时刻 = 构建时间：产物本身就是构建时刻的快照。
 */
const SITEMAP_LASTMOD = new Date().toISOString()
const SITEMAP_PRIORITY: Record<string, string> = {
  '*': '0.6',
  '/': '1.0',
  '/app/lot-data/home': '0.9',
  '/app/lot-data/bili-data/official': '0.9',
  '/app/lot-data/bili-data/reserve': '0.8',
  '/app/lot-data/bili-data/charge': '0.8',
  '/app/lot-data/bili-data/topic': '0.8',
  '/app/samsclub/info': '0.7',
  '/app/lot-data/bili-atari-ranking': '0.7',
  '/app/lot-data/scrapy-stat': '0.5',
  '/app/changelog': '0.5',
  '/app/privacy-policy': '0.3',
  '/app/disclaimer': '0.3'
}
/** 绝大多数是抽奖数据（每天变），更新日志随版本发布变，法律页基本不变 */
const SITEMAP_CHANGEFREQ: Record<string, string> = {
  '*': 'daily',
  '/app/changelog': 'weekly',
  '/app/privacy-policy': 'monthly',
  '/app/disclaimer': 'monthly'
}

// Nuxt 只按 NODE_ENV 加载 `.env` / `.env.production`；本项目的变量沿用原名
// （`.env.prod` / `.env.development`，Vike 时代按 `--mode` 加载），这里显式加载。
loadEnv({ path: process.env.NODE_ENV === 'production' ? '.env.prod' : '.env.development' })

/**
 * 把 `.env` 里的 `VITE_*` 变量同时注入**服务端与客户端**。
 *
 * 背景：Vite 默认只在 client bundle 里替换 `import.meta.env`，Nitro 服务端渲染时读不到
 * （典型症状：urql 的 `VITE_GRAPH_API` 为空 → 直接 `You are creating an urql-client without a url` 500）。
 * 用 `vite.define` 做静态替换后两端取值一致，全项目既有的 `import.meta.env.VITE_*` 写法无需改动。
 * 这些变量本来就是公开的（都会打进客户端产物），不存在额外泄露风险。
 */
const viteEnvDefines = Object.fromEntries(
  Object.entries(process.env)
    .filter(([key]) => key.startsWith('VITE_'))
    .map(([key, value]) => [`import.meta.env.${key}`, JSON.stringify(value ?? '')])
)

/** hey-api 代码生成：按服务（tag）把 API 客户端类拆分到 services/ 目录 */
const hey_api_parser: UserParser = {
  hooks: {
    symbols: {
      getFilePath: (symbol) => {
        if (symbol.kind === 'class' && symbol.name?.endsWith('Service')) {
          return `services/${symbol.name}`
        }
        return
      }
    }
  }
}

const pathSrc = path.resolve(__dirname, 'src')

/**
 * hey-api 的 vite 插件在 `configResolved` 阶段实时拉取后端 `openapi.json` 生成 SDK，
 * 拉不到就直接抛错，导致 `nuxt dev` / `nuxt build` 整个起不来。
 *
 * 本地开发时三个后端未必都在线：crawler(23333) 由 dev 编排的 api 容器提供，
 * 但 rpa-browser(28000) / message(18739) 要本地手动起，连远端网关时也可能缺 ——
 * 这时应该沿用仓库里已经生成好的 SDK 继续开发，而不是因为「后端没起」把前端也带崩。
 *
 * 因此给每个生成插件套一层：生成失败只告警（提示去起对应后端 / 手动 gen），
 * 不再阻断启动；后端可达时行为与原来完全一致。
 */
type ConfigResolvedHook = (config: ResolvedConfig) => void | Promise<void>

const tolerantSdkGen = (input: string, plugin: Plugin): Plugin => {
  const inner = plugin.configResolved as ConfigResolvedHook | undefined
  return {
    ...plugin,
    async configResolved(config: ResolvedConfig) {
      try {
        await inner?.(config)
      } catch (error) {
        console.warn(
          `[hey-api] 无法从 ${input} 生成 SDK（后端未启动？），沿用已生成的代码：${String(error)}`
        )
      }
    }
  }
}

/**
 * 本机开发时的 API 目标（仅 `nuxt dev` 生效，见下方 vite.server.proxy）。
 *
 * 生产与开发是完全分开的两套部署，唯一共用的是「查询」：本机只跑一个只读查询容器
 * （docker-compose.dev.yml 的 be-bilibili-crawler-query），它连的就是生产库 / 生产 Redis，
 * 所以开发时看到的是真实数据，不需要把生产数据同步到本地。
 *
 *   - 抽奖查询（Get* / Search* / lottery_*）→ 本机查询容器 23336；
 *   - 其余一切（Add* 写入、Get*ScrapyStatus、zhuanlan、rpa、message、casdoor）
 *     → 9923 的网关。
 *
 * 两个地址都是常量，不引入环境变量；需要指向别处时改这两行即可。
 */
const QUERY_API = 'http://localhost:23336'
const GATEWAY_API = 'http://localhost:9923'

/**
 * 三个后端的 SDK 生成目标（配置与原 vite.config.ts 完全一致，
 * 只有 input / output / runtimeConfigPath 不同，其余插件栈相同）。
 */
const sdkTargets = [
  {
    input: 'http://localhost:28000/openapi.json',
    output: 'src/api/browser/hey-api',
    runtimeConfigPath: '@/api/browser/runtime_config'
  },
  {
    input: 'http://localhost:23333/openapi.json',
    output: 'src/api/bili_lottery_data/hey-api',
    runtimeConfigPath: '@/api/bili_lottery_data/runtime_config'
  },
  {
    input: 'http://localhost:18739/openapi.json',
    output: 'src/api/community/hey-api',
    runtimeConfigPath: '@/api/community/runtime_config'
  }
] as const

const apiSdkPlugins = sdkTargets.map(({ input, output, runtimeConfigPath }) =>
  tolerantSdkGen(
    input,
    heyApiPlugin({
      config: {
        input,
        output,
        plugins: [
          { name: '@hey-api/client-ofetch', runtimeConfigPath },
          { enums: 'javascript', name: '@hey-api/typescript' },
          {
            name: '@hey-api/sdk',
            responseStyle: 'data',
            paramsStructure: 'grouped',
            operations: { strategy: 'byTags', containerName: (name) => `${name}Service` }
          }
        ],
        parser: hey_api_parser
      }
    }) as Plugin
  )
)

export default defineNuxtConfig({
  compatibilityDate: '2026-09-21',
  // SSG：构建期在 Node 里完成渲染，产出静态 HTML；部署无需常驻 Node 进程
  ssr: true,
  srcDir: 'src',
  devtools: { enabled: true },

  /**
   * 布局断位常量（public runtimeConfig，可用 NUXT_PUBLIC_* 环境变量覆盖）。
   * - minLayoutWidth：前端最小内容宽度（px）。轮播 / 网格等按容器宽度是否达到该值
   *   切换「宽列（4 列）」与「窄列（2 列）」布局，避免窄容器下卡片被挤压变形。
   */
  runtimeConfig: {
    public: {
      minLayoutWidth: 690
    }
  },

  /**
   * SEO 全家桶：一个模块装上 site-config / seo-utils / robots / sitemap / og-image /
   * schema.org / link-checker / ai-ready / skew-protection，各自用下面的同名配置键。
   * 不再单独注册 @nuxtjs/sitemap 等子模块（Nuxt 会自动安装一次）。
   */
  modules: ['@pinia/nuxt', '@element-plus/nuxt', '@nuxtjs/seo'],

  /**
   * 站点配置（nuxt-site-config）：全家桶统一从这里取权威域名 / 站点名 / 默认文案，
   * 自动生成 canonical、og:url、og:site_name、`<html lang>` / og:locale、标题模板与绝对图片 URL。
   * `indexable` 不写死：生产构建可索引，`nuxt dev` 自动 Disallow 全部。
   */
  site: {
    url: SITE_URL,
    name: SITE_NAME,
    description: DEFAULT_DESCRIPTION,
    defaultLocale: DEFAULT_LOCALE,
    // 标题模板 `%s %separator %siteName`：保持「页面标题 - 站点名」口径
    separator: '-',
    trailingSlash: false
  },

  /** seo-utils：站点级 head 兜底 + canonical 的 query 白名单（跟踪参数由模块剔除） */
  seo: {
    canonicalQueryWhitelist: CANONICAL_QUERY_WHITELIST,
    meta: { keywords: DEFAULT_KEYWORDS.join(',') }
  },

  /**
   * robots：robots.txt 由模块生成（不再维护 public/robots.txt），sitemap 链接由 sitemap 模块自动写入。
   * `metaTag: false`：页面级 `<meta name="robots">` 交给 `useRouteSeo` 的 `useSeoMeta()` 统一输出，
   * 这样 SSR 与 SPA 客户端导航都会跟着路由更新，且纯静态托管不需要在 nginx 补 `X-Robots-Tag`。
   */
  robots: {
    disallow: ['/app/casdoor-callback', '/test'],
    metaTag: false
  },

  /** schema.org：WebSite / WebPage / Organization 默认图 + 页面级节点（见 useRouteSeo） */
  schemaOrg: {
    defaults: true,
    reactive: true,
    identity: { type: 'Organization' as const, name: SITE_NAME, url: SITE_URL }
  },

  /**
   * og-image：纯静态托管（`nuxt generate`）不需要运行时渲染器 / `NUXT_APP_SECRET`；
   * 社交分享图由 seo-utils 从 `public/og-image.png` + `og-image.alt.txt` 自动注入。
   */
  ogImage: { zeroRuntime: true },

  /**
   * link-checker：预渲染后扫描站内链接，只报告不阻断发布。
   * `/app/lot-data` 与 `/app/lot-data/bili-data` 是 SPA 容器路由（导航面包屑指向它，
   * 生产由 nginx fallback 到 index.html），静态产物没有对应 HTML，
   * 扫描器会误报 403 / 建议加尾斜杠，故显式排除。
   */
  linkChecker: {
    // 官方 guide 建议把链接检查作为发布门禁：当前 12 个预渲染页 0 error，
    // 出现死链时直接阻断构建（外链不抓取，不会受第三方波动影响）。
    failOnError: true,
    excludeLinks: ['/api/**', '/action-icons/**', '/app/lot-data', '/app/lot-data/bili-data']
  },

  /**
   * AI Ready（nuxt-ai-ready）：把站点内容直接暴露给 LLM / AI Agent。
   *
   * 构建期产出 `/llms.txt`（索引）、`/llms-full.txt`（正文合集）、`/sitemap.md`
   * 以及每个预渲染页的 Markdown 副本（如 `/app/lot-data/home.md`），
   * 页面清单唯一来源仍是 sitemap（= `SEO_INDEXABLE_ROUTES`），与 robots / 预渲染同源。
   *
   * 纯静态 nginx 托管没有常驻 Node 运行时，因此：
   * - 关闭按 `Accept` 头的内容协商（`contentNegotiation` / `botNegotiation`）：
   *   只提供显式 `.md` 路径，不向 AI 客户端宣告静态托管做不到的能力；
   * - MCP / WebMCP / Agent Skills / API Catalog 全部依赖运行时，一律关闭，不产出空壳入口；
   * - `runtimeSync` / `cron` 需要数据库，保持默认关闭，索引只在构建期生成。
   */
  aiReady: {
    contentNegotiation: false,
    botNegotiation: false,
    webmcp: false,
    agentSkills: false,
    apiCatalog: false,
    llmsTxt: {
      // 只收录 sitemap 中的可索引页，登录 / 管理端页面不进 AI 索引
      pages: 'sitemap',
      // 页面链接指向 Markdown 副本，agent 不必解析 HTML
      markdownLinks: true,
      // 只在 `.md` 顶部插入 llms.txt 指路；HTML 不再注入视觉隐藏链接。
      // Google 安全浏览把「视觉隐藏的链接」视为 cloaking 信号，安全整改后保持关闭：
      // 爬虫与访客看到的页面内容必须完全一致。
      directive: { markdown: true, html: false },
      // 补充静态产物无法自动表达的信息（数据来源 / 更新频率 / 读取方式）
      notes: [
        '站点数据来自 B 站公开接口，抽奖列表每日更新，每条记录都带 B 站原文链接。',
        '站点为纯静态产物，全部内容以 Markdown 提供：先读 llms.txt 找页面，再按需读取对应 .md。'
      ]
    },
    llmsFullTxt: true,
    sitemapMd: true,
    // HTML / .md 响应通过 Link: rel="describedby" 指向 llms.txt（llms.txt v2 规范）
    describedby: true,
    /**
     * robots.txt 的 Content-Signal：允许搜索收录与 AI 检索引用，不允许训练。
     * 写成对象而不是留空：留空默认只输出 search / ai-input 两项，
     * 这里显式写出 ai-train=no，让抓取方一眼看到完整策略。
     */
    contentSignal: { search: true, aiInput: true, aiTrain: false },
    // 生成 .md 时要逐页 SSR，与 nitro.prerender 一样串行，避免并发把后端打限流
    prerender: { concurrency: 1 }
  },

  /** Skew Protection 是给常驻 Node 服务做版本轮询用的，纯静态 nginx 托管关掉 */
  skewProtection: false,

  /**
   * sitemap 模块：`nuxt generate` 时由 Nitro 预渲染出 `dist/client/sitemap.xml`，
   * 路由清单唯一来源仍是 `src/config/seo_routes.ts`，与 `nitro.prerender.routes` 同源。
   * 模块还会把预渲染路由自动并入并去重；这里的 urls 负责补 lastmod / changefreq / priority。
   */
  sitemap: {
    // 关闭内置 XSL 样式表：模块默认会在 sitemap.xml 顶部插入
    // `<?xml-stylesheet href="/__sitemap__/style.xsl"?>`，Chrome 132+ 已移除 XSLT，
    // 打开 sitemap.xml 会提示「此网站使用 XSLT，该功能将从此浏览器中移除」。
    // 关掉后浏览器直接以原生 XML 树展示，搜索引擎抓取不受影响。
    xsl: false,
    autoLastmod: false,
    // 官方推荐：纯静态输出用 zeroRuntime，构建期预渲染 sitemap 并移除运行时 sitemap 代码。
    zeroRuntime: true,
    // 关闭预渲染页面 `<img>` 的自动图片条目：首页只有第三方访问计数图片
    // （count.getloli.com），不该作为站点自有图片写进 sitemap。
    discoverImages: false,
    urls: SEO_INDEXABLE_ROUTES.map((route) => ({
      loc: route,
      lastmod: SITEMAP_LASTMOD,
      changefreq: SITEMAP_CHANGEFREQ[route] ?? SITEMAP_CHANGEFREQ['*'],
      priority: SITEMAP_PRIORITY[route] ?? SITEMAP_PRIORITY['*']
    }))
  },

  // Element Plus 样式已在 assets/app-tailwind.css 里全量引入（并参与 Tailwind 分层），
  // 故模块只负责组件按需注册，不再注入样式，避免重复加载与层级错乱。
  elementPlus: { importStyle: false },

  css: [
    // mavon-editor / md-editor-v3 的 CSS 已移除：全项目 src/ 中没有任何地方
    // import 这两个编辑器，却在 dev 模式被全局注入到每个页面（含 HMR 依赖链），
    // 平白增加请求与体积。如需重新启用，请在使用组件的页面里按需引入 CSS。
    '~/assets/app-tailwind.css'
  ],

  /**
   * 组件自动注册：`pathPrefix: false` 保持与原 unplugin-vue-components 一致的行为 ——
   * 组件名只取文件名（`components/CommonCompo/GlobalLoadingMask.vue` → `<GlobalLoadingMask />`），
   * 否则 Nuxt 默认会拼上目录前缀（`<CommonCompoGlobalLoadingMask />`），全项目模板都会解析失败。
   */
  components: [{ path: '~/components', pathPrefix: false }],

  // 站点级 head 兜底：只放全家桶不生成的第三方 / 浏览器相关标签。
  // `<html lang>` 由 site.defaultLocale 生成；标题 / 描述 / canonical / OG / robots /
  // JSON-LD / llms 链接等全部由 @nuxtjs/seo 输出（业务差异见 useRouteSeo.ts）。
  app: {
    head: {
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1.0' },
        { name: 'referrer', content: 'no-referrer' },
        { name: 'format-detection', content: 'telephone=no' },
        { name: 'author', content: 'BiliExplosion（非官方第三方数据工具）' },
        { name: 'application-name', content: 'BiliExplosion（非官方第三方数据工具）' },
        { name: 'theme-color', content: '#00AEEC', media: '(prefers-color-scheme: light)' },
        { name: 'theme-color', content: '#0F172A', media: '(prefers-color-scheme: dark)' },
        { name: 'google-adsense-account', content: 'ca-pub-5783205065512010' },
        { name: 'msvalidate.01', content: '92B4FA6867933856FF110F303BAA953F' }
      ],
      link: [
        { rel: 'icon', href: '/favicon.ico' },
        // 提前建连：统计 / 广告域名的 DNS + TLS 预握手
        { rel: 'preconnect', href: 'https://www.googletagmanager.com', crossorigin: '' },
        { rel: 'preconnect', href: 'https://pagead2.googlesyndication.com', crossorigin: '' },
        // 站点访问量计数器图片域名（见 src/views/HomeView.vue 的计数图片）
        { rel: 'dns-prefetch', href: '//count.getloli.com' }
      ]
    }
  },

  alias: {
    '@api': path.resolve(pathSrc, 'api'),
    '@views': path.resolve(pathSrc, 'views'),
    '@utils': path.resolve(pathSrc, 'utils'),
    '@comp': path.resolve(pathSrc, 'components'),
    '@assets': path.resolve(pathSrc, 'assets')
  },

  // 本地开发固定 5173（nginx 反代与既有习惯都指向该端口），并把 /api 反代到本地网关
  devServer: { host: '0.0.0.0', port: 5173 },

  vite: {
    // 沿用 VITE_ 前缀，避免改动全项目的 import.meta.env.VITE_* 写法
    envPrefix: ['VITE_', 'NUXT_'],

    /**
     * 开发态依赖预构建（解决 dev 模式页面加载 10s+ 的核心配置）。
     *
     * 背景：Vite dev 不打包，浏览器用原生 ESM 一个模块一个请求地拉依赖。
     * 实测首页经预构建前会产生 ~1800 个请求、56MB 明文传输，其中
     * element-plus 源码模块被直出引用 4000+ 次、vue 1700+ 次 —— 这些重型库
     * 没有被完整预构建成单个 chunk，浏览器要跑几百轮请求瀑布（同域 6 并发限制）。
     *
     * 显式 include 后，Vite 在启动时就把这些库各自打成一个 chunk，
     * 把上千个请求合并成几十个；同时避免「运行时发现新依赖 → 重新预构建
     * → 整页 reload」导致的首次/改码后偶发卡顿。
     */
    optimizeDeps: {
      include: [
        // Vue 核心全家桶
        'vue',
        'vue-router',
        'pinia',
        'pinia-plugin-persistedstate',
        'vue-i18n',
        // UI 组件库（首屏最重，源码模块引用次数最高）
        'element-plus',
        '@element-plus/icons-vue',
        '@vueuse/core',
        '@vueuse/components',
        // 数据请求 / 状态
        '@urql/vue',
        '@urql/core',
        'graphql',
        'ofetch',
        'axios',
        // 图表
        'echarts/core',
        'echarts/charts',
        'echarts/components',
        'echarts/renderers',
        'vue-echarts',
        // 工具库
        'crypto-js/aes',
        'dayjs',
        'mitt',
        'sanitize-html',
        'vue-json-pretty',
        'casdoor-vue-sdk',
        '@microsoft/clarity'
      ]
    },

    // 让服务端渲染也能读到 VITE_*（Vite 默认只注入客户端，见文件顶部说明）。
    //
    // `__SSR_API_TARGET__`：SSR 取数（预渲染）时的后端绝对地址，构建期由
    // PRERENDER_API_TARGET 指定生产域名，保证产物里的列表数据来自线上而不是本地库。
    // 用自定义全局标识符而不是 `import.meta.env.X`：后者会被 Vite 自身的 env 处理接管，
    // 实测在 Nitro 的 server bundle 里替换不生效（预渲染时请求打到了默认本地地址而失败）。
    define: {
      ...viteEnvDefines,
      __SSR_API_TARGET__: JSON.stringify(
        process.env.PRERENDER_API_TARGET ?? 'http://localhost:9923'
      )
    },
    plugins: [
      tailwindcss(),
      svgLoader({
        // svgo 3.x 的 convertPathData 在优化含相对 q 曲线的 B 站 SVG 时会崩溃
        // （reflectPoint 读取 undefined），禁用 svgo 优化，仅做组件化转换
        svgo: false,
        defaultImport: 'url'
      }),
      ...apiSdkPlugins
    ],
    server: {
      allowedHosts: ['serena.dynv6.net'],
      /**
       * 按路径分流（顺序敏感：更具体的前缀必须排在前面）。
       * 爬虫状态读的是爬虫进程内存，本地没有爬虫，必须走远端；
       * 其余 `lottery_database/bili/*` 全给本地查询容器 —— Add* 写接口在那边没有路由，
       * 自然返回 404，等于本地开发不可能误写生产库。
       */
      proxy: {
        '/api/v1/lottery_database/bili/GetAllLotScrapyStatus': {
          target: GATEWAY_API,
          changeOrigin: true
        },
        '/api/v1/lottery_database/bili/GetSingleScrapyStatus': {
          target: GATEWAY_API,
          changeOrigin: true
        },
        '/api/v1/lottery_database/bili': {
          target: QUERY_API,
          changeOrigin: true
        },
        '/api': { target: GATEWAY_API, changeOrigin: true }
      }
    }
  },

  nitro: {
    /**
     * SSR 取数目标（服务端 bundle 的字符串替换）。
     *
     * 为什么不用 `vite.define` / `import.meta.env`：实测这两者在 Nitro 的 server bundle 里
     * 都不生效（`__SSR_API_TARGET__` 原样留在产物中，预渲染时请求打到了本地默认地址而失败），
     * 而 `nitro.replace` 是 Nitro 官方的服务端替换钩子，稳定可靠。
     */
    replace: {
      __SSR_API_TARGET__: JSON.stringify(process.env.PRERENDER_API_TARGET ?? 'http://localhost:9923')
    },
    prerender: {
      // 只预渲染有收录价值的页面（与 sitemap 清单同源），其余路由留作 SPA 兜底；
      // robots.txt / sitemap.xml / llms.txt / .md 等由 @nuxtjs/seo 自动追加预渲染
      routes: [...SEO_INDEXABLE_ROUTES],
      crawlLinks: false,
      // 迁移期先不因单页失败中断整轮构建：失败页会退回 SPA 外壳，便于逐项修复
      failOnError: false,
      /**
       * 串行预渲染。
       * 每个列表页在 SSR 阶段都要真实请求后端，并发抓取会被网关限流 / 拖长单页耗时
       * （实测并发时 4 个列表页全部取数失败，串行时正常）。页面只有 10 个，
       * 牺牲几十秒换稳定取数是划算的。
       */
      concurrency: 1
    },
    /**
     * `action-icons/`（4087 个文件、581MB）放在项目根而非 `public/`：它不随代码发布变化，
     * 部署时单独同步即可，避免每次构建复制/清理这 4000+ 文件（产物从 589MB 降到几十 MB）。
     * 这里只在**开发模式**把它挂成静态目录，保证本地能正常预览图标；生产产物不含它。
     */
    publicAssets:
      process.env.NODE_ENV === 'production'
        ? []
        : [{ dir: path.resolve(__dirname, 'action-icons'), baseURL: '/action-icons', fallthrough: true }],
    // 产物与既有部署路径对齐（nginx 静态托管 dist/client），部署脚本无需改动
    output: { dir: 'dist', serverDir: 'dist/server', publicDir: 'dist/client' }
  },

  experimental: {
    /**
     * 关闭 payload 抽取，把数据**内联**进 HTML。
     *
     * `nuxt generate` 默认会把 `useAsyncData` 的结果抽成 `_payload.json`，
     * HTML 里只留一个占位（如 `{"lot:GetOfficialLottery:firstPage":-1}`）。
     * 于是客户端 hydration 时数据尚未就绪：SSR 渲染出的 355 条列表，客户端首帧渲染成 0 条，
     * 触发 `Hydration completed but contains mismatches`（之后异步加载 payload 才补上内容）。
     * `nuxt dev` 不走抽取，所以这个问题只在生产构建暴露。
     *
     * 关闭后数据随 HTML 一起下发：hydration 一次对齐、少一个 `_payload.json` 请求；
     * 代价是 HTML 变大（但正文本来就要放在 HTML 里，符合 SSG 的初衷）。
     */
    payloadExtraction: false
  },

  typescript: { typeCheck: false, shim: false }
})
