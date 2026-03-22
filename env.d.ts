/// <reference types="vite/client" />
/// <reference types="vite-svg-loader" />
declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}

// 添加对全局声明文件的引用
/// <reference path="./src/utils/global.d.ts" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string
  readonly VITE_BILI_ENV: 'prod' | 'dev'
  readonly VITE_GRAPH_API: string
  readonly VITE_GRAPH_API_KEY: string
  readonly VITE_CLARITY_ID: string | undefined
  readonly VITE_CASDOOR_CLIENT_ID: string
  readonly VITE_CASDOOR_APPLICATION: string
  readonly VITE_CASDOOR_ORGANIZATION: string
  readonly VITE_CASDOOR_ORGANIZATION: string
  readonly VITE_CASDOOR_REDIRECT_PATH: string
  readonly VITE_CASDOOR_SERVER_URL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
