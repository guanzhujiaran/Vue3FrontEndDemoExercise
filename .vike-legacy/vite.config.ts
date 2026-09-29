import path from 'path'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
import VueDevTools from 'vite-plugin-vue-devtools'
import Icons from 'unplugin-icons/vite'
import IconsResolver from 'unplugin-icons/resolver'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'
import Sitemap from 'vite-plugin-sitemap'
import tailwindcss from '@tailwindcss/vite'
import svgLoader from 'vite-svg-loader'
import { heyApiPlugin } from '@hey-api/vite-plugin'
import { type UserParser } from '@hey-api/shared'
// Vike：构建期预渲染（SSG）——产出静态 HTML，供搜索引擎与社交平台抓取
import vike from 'vike/plugin'
// 与 Vike 预渲染清单同源（该模块不依赖别名，可被 vite.config.ts 直接加载）
import { SEO_INDEXABLE_ROUTES } from './src/config/seo_routes'
const hey_api_parser: UserParser = {
  hooks: {
    symbols: {
      getFilePath: (symbol) => {
        // API 客户端类：按服务（tag）拆分到 services/
        if (symbol.kind === 'class' && symbol.name?.endsWith('Service')) {
          return `services/${symbol.name}`
        }
        return
      }
    }
  }
}
const pathSrc = path.resolve(__dirname, 'src')
export default defineConfig({
  plugins: [
    vue(),
    vike(),
    svgLoader({
      // svgo 3.x 的 convertPathData 在优化含相对 q 曲线的 B 站 SVG 时会崩溃
      // （reflectPoint 读取 undefined），禁用 svgo 优化，仅做组件化转换
      svgo: false,
      defaultImport: 'url'
    }),
    Sitemap({
      hostname: 'https://serena.dynv6.net',
      // 部署根目录是 dist/client（nginx 静态托管它），sitemap 必须落在同一层，
      // 否则站点根访问 /sitemap.xml 会 404（robots.txt 里已声明该地址）
      outDir: 'dist/client',
      // Google 站点验证文件不是页面，别进 sitemap（插件会把 public 下的 .html 扫成一条路由，
      // 生成的路由名不带后缀，故两种写法都排除）
      exclude: ['google22ac62fc624759d1.html', '/google22ac62fc624759d1', 'google22ac62fc624759d1'],
      // 展开为可变数组：清单本身是 readonly（多处共用，防误改）
      dynamicRoutes: [...SEO_INDEXABLE_ROUTES],
      // 按页面价值分配权重（插件支持 '*' 通配，未列出的用默认值）：
      // 首页 > 抽奖数据主列表页 > 其余抽奖列表 > 工具/内容页 > 状态页
      // 全部写 1.0 等于没给爬虫任何优先级信号，这里做一次显式分级。
      priority: {
        '*': 0.6,
        '/': 1.0,
        '/app/lot-data/home': 0.9,
        '/app/lot-data/bili-data/official': 0.9,
        '/app/lot-data/bili-data/reserve': 0.8,
        '/app/lot-data/bili-data/charge': 0.8,
        '/app/lot-data/bili-data/topic': 0.8,
        '/app/samsclub/info': 0.7,
        '/app/lot-data/bili-atari-ranking': 0.7,
        '/app/lot-data/scrapy-stat': 0.5,
        '/app/changelog': 0.5
      },
      changefreq: {
        '*': 'daily',
        '/app/changelog': 'weekly'
      },
      generateRobotsTxt: false // 禁用自动生成 robots.txt（沿用 public/robots.txt 里带 Sitemap 声明的版本）
    }),
    AutoImport({
      // Auto import functions from Vue, e.g. ref, reactive, toRef...
      // 自动导入 Vue 相关函数，如：ref, reactive, toRef 等
      imports: ['vue'],

      resolvers: [
        // Auto import icon components
        // 自动导入图标组件
        IconsResolver({
          prefix: 'Icon'
        })
      ],

      dts: path.resolve(pathSrc, 'auto-imports.d.ts')
    }),
    Components({
      resolvers: [
        // Auto register icon components
        // 自动注册图标组件
        IconsResolver({
          enabledCollections: ['ep']
        }),
        ElementPlusResolver({
          importStyle: false
        })
      ],

      dts: path.resolve(pathSrc, 'components.d.ts')
    }),
    Icons({
      autoInstall: true
    }),
    vueJsx(),
    VueDevTools({
      componentInspector: false
      // launchEditor: 'H:\\Trae CN\\Trae CN.exe'
      //'K:\\CodeBuddy\\CodeBuddy.exe'
      //'C:\\Users\\Acer\\AppData\\Local\\Programs\\Lingma\\Lingma.exe'
    }),
    tailwindcss(),
    heyApiPlugin({
      config: {
        input: 'http://localhost:28000/openapi.json', // sign up at app.heyapi.dev
        output: 'src/api/browser/hey-api',
        plugins: [
          {
            name: '@hey-api/client-ofetch',
            runtimeConfigPath: '@/api/browser/runtime_config'
          },
          { enums: 'javascript', name: '@hey-api/typescript' },

          {
            name: '@hey-api/sdk',
            responseStyle: 'data',
            paramsStructure: 'grouped',
            operations: {
              strategy: 'byTags',
              containerName: (name) => `${name}Service`
            }
          }
        ],
        parser: hey_api_parser
      }
    }),
    heyApiPlugin({
      config: {
        input: 'http://localhost:23333/openapi.json',
        output: 'src/api/bili_lottery_data/hey-api',
        plugins: [
          {
            name: '@hey-api/client-ofetch',
            runtimeConfigPath: '@/api/bili_lottery_data/runtime_config'
          },
          { enums: 'javascript', name: '@hey-api/typescript' },
          {
            name: '@hey-api/sdk',
            responseStyle: 'data',
            paramsStructure: 'grouped',
            operations: {
              strategy: 'byTags',
              containerName: (name) => `${name}Service`
            }
          }
        ],
        parser: hey_api_parser
      }
    }),
    heyApiPlugin({
      config: {
        input: 'http://localhost:18739/openapi.json',
        output: 'src/api/community/hey-api',
        plugins: [
          {
            name: '@hey-api/client-ofetch',
            runtimeConfigPath: '@/api/community/runtime_config'
          },
          { enums: 'javascript', name: '@hey-api/typescript' },
          {
            name: '@hey-api/sdk',
            responseStyle: 'data',
            paramsStructure: 'grouped',
            operations: {
              strategy: 'byTags',
              containerName: (name) => `${name}Service`
            }
          }
        ],
        parser: hey_api_parser
      }
    })
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@api': path.resolve(__dirname, 'src/api'),
      '@views': path.resolve(__dirname, 'src/views'),
      '@utils': path.resolve(__dirname, 'src/utils'),
      '@comp': path.resolve(__dirname, 'src/components'),
      '@assets': path.resolve(__dirname, 'src/assets')
    }
  },
  // Vike 会同时构建 client 与 ssr 两个环境；ssr 产物（dist/server）本形态下只给
  // `vike preview`（预渲染脚本的外壳来源）用，不需要静态资源副本——
  // 否则 public/（4000+ 图标）会被再复制一份，白白多占 500MB+ 磁盘与构建时间。
  environments: {
    ssr: {
      build: {
        copyPublicDir: false
      }
    }
  },
  // 预渲染脚本用 `vike preview` 起服务（它按 renderer/+onRenderHtml.ts 输出外壳 HTML，
  // 并注入正确的 client entry / preload / CSS），这里把 /api 反代到目标后端。
  // 目标由 PRERENDER_API_TARGET 指定，生产构建务必显式指向生产域名。
  preview: {
    port: 4180,
    proxy: {
      '/api': {
        target: process.env.PRERENDER_API_TARGET ?? 'http://localhost:9923',
        changeOrigin: true
      }
    }
  },
  server: {
    host: '0.0.0.0',
    // 固定 5173：nginx 反代与本地开发习惯都指向该端口（vike dev 默认是 3000）
    port: 5173,
    // 允许通过 nginx 反代访问的域名（Vite 8 默认只放行 localhost，反代 Host 头需显式放行）
    allowedHosts: ['serena.dynv6.net'],
    proxy: {
      '/api': {
        target: 'http://localhost:9923',
        changeOrigin: true,
        rewrite: (path) => path
      }
    }
  }
})
