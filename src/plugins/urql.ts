/**
 * urql（GraphQL）客户端注册（对应原 createApp.ts 里的 `app.use(urql, ...)`）。
 */
import urql, { cacheExchange, fetchExchange } from '@urql/vue'

export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.vueApp.use(urql, {
    url: import.meta.env.VITE_GRAPH_API,
    requestPolicy: 'cache-and-network',
    exchanges: [cacheExchange, fetchExchange],
    preferGetMethod: false
  })
})
