/**
 * pinia-plugin-persistedstate 的 `storage` 适配器（惰性代理）。
 *
 * 背景：各 store 的 `persist` 选项在**模块加载时**就会求值。若直接写 `storage: localStorage`，
 * 服务端（SSR / `nuxt generate` 预渲染 / `nuxt dev` 的 Nitro 进程）会立刻读取 Node 的实验性
 * `localStorage` 全局，进程启动即报：
 *   ExperimentalWarning: localStorage is not available because --localstorage-file was not provided.
 *
 * 这里改为惰性读写：只有真正落到浏览器时才访问 `window.localStorage`，
 * 服务端自动退化为 no-op（持久化插件本身也只注册在客户端，见 plugins/pinia-persist.client.ts）。
 */
import type { StorageLike } from 'pinia-plugin-persistedstate'

export const browserPersistStorage: StorageLike = {
  getItem: (key) => (typeof window === 'undefined' ? null : window.localStorage.getItem(key)),
  setItem: (key, value) => {
    if (typeof window !== 'undefined') window.localStorage.setItem(key, value)
  }
}
