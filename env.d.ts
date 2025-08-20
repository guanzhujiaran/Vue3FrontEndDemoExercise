/// <reference types="vite/client" />

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
  // 更多环境变量...
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
