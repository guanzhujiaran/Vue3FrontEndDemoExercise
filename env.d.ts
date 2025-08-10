/// <reference types="vite/client" />
interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string
  readonly VITE_BILI_ENV: 'prod' | 'dev'
  readonly VITE_GRAPH_API: string
  readonly VITE_GRAPH_API_KEY: string

  // 更多环境变量...
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
