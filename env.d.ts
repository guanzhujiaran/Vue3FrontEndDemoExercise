/// <reference types="vite/client" />
interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string
  readonly VITE_BILI_ENV: 'prod' | 'dev'
  // 更多环境变量...
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
