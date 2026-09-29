/**
 * Pinia 持久化插件。
 *
 * `@pinia/nuxt` 已负责创建并注入 pinia 实例，这里只追加 persistedstate 能力
 * （原本在 src/main.ts 里 `pinia.use(piniaPluginPersistedstate)`）。
 */
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'

export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.$pinia.use(piniaPluginPersistedstate)
})
