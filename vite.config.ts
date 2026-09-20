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
/**
 * 允许搜索引擎收录的页面（与 src/router/index.ts 中「无需登录」的路由保持一致）。
 * 登录 / 管理端页面（用户中心、RPA 浏览器、消息中心、动态、管理后台等）不进 sitemap，
 * 它们由 useRouteSeo 输出 <meta name="robots" content="noindex,nofollow">。
 */
const SEO_INDEXABLE_ROUTES = [
  '/',
  '/app/lot-data/home',
  '/app/lot-data/scrapy-stat',
  '/app/lot-data/bili-atari-ranking',
  '/app/lot-data/bili-data/official',
  '/app/lot-data/bili-data/reserve',
  '/app/lot-data/bili-data/charge',
  '/app/lot-data/bili-data/topic',
  '/app/samsclub/info',
  '/app/changelog'
]
export default defineConfig({
  plugins: [
    vue(),
    svgLoader({
      // svgo 3.x 的 convertPathData 在优化含相对 q 曲线的 B 站 SVG 时会崩溃
      // （reflectPoint 读取 undefined），禁用 svgo 优化，仅做组件化转换
      svgo: false,
      defaultImport: 'url'
    }),
    Sitemap({
      hostname: 'https://serena.dynv6.net',
      exclude: ['google22ac62fc624759d1.html'],
      dynamicRoutes: SEO_INDEXABLE_ROUTES,
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
  server: {
    host: '0.0.0.0',
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
