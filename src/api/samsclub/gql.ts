import { fetchExchange, cacheExchange, createClient } from '@urql/core'
import type { DocumentInput } from '@urql/vue'

export const client = createClient({
  url: import.meta.env.VITE_GRAPH_API,
  requestPolicy: 'cache-and-network',
  exchanges: [cacheExchange, fetchExchange]
})
export const query = async (query: DocumentInput<any, {}>, variables = {}) => {
  return client.query(query, variables).toPromise()
}
