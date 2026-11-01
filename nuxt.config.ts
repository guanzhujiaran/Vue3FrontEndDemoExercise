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
import { SITE_URL, SEO_INDEXABLE_ROUTES } from './src/config/seo_routes'
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

  modules: ['@pinia/nuxt', '@element-plus/nuxt', '@nuxtjs/sitemap'],

  /**
   * 站点配置（nuxt-site-config）：@nuxtjs/sitemap 依赖它拼出绝对 URL，
   * canonical / OG 等仍由 useRouteSeo 单独维护，互不影响。
   */
  site: { url: SITE_URL },

  /**
   * sitemap 模块：`nuxt generate` 时由 Nitro 预渲染出 `dist/client/sitemap.xml`，
   * 替代原「构建后脚本生成」方案（scripts/gen-sitemap.mjs 已删除）。
   * 路由清单唯一来源仍是 `src/config/seo_routes.ts`，与 `nitro.prerender.routes` 同源。
   */
  sitemap: {
    autoLastmod: false,
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

  // 站点级 head 兜底：SSR 出来的每个 HTML 都带这些标签；
  // 标题 / 描述 / canonical / OG / JSON-LD 由 composables/useRouteSeo.ts 按路由维护。
  app: {
    head: {
      htmlAttrs: { lang: 'zh-CN' },
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1.0' },
        { name: 'referrer', content: 'no-referrer' },
        { name: 'format-detection', content: 'telephone=no' },
        { name: 'author', content: '爆破哔哩哔哩弹幕视频网' },
        { name: 'application-name', content: '爆破哔哩哔哩弹幕视频网' },
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
        { rel: 'dns-prefetch', href: '//cdn.busuanzi.cc' }
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
      // 只预渲染有收录价值的页面（与 sitemap 清单同源），其余路由留作 SPA 兜底
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
