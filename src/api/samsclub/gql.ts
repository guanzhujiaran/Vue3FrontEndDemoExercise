import { fetchExchange, createClient } from '@urql/core'
import type { DocumentInput } from '@urql/vue'

const client = createClient({
  url: import.meta.env.VITE_GRAPH_API,
  requestPolicy: 'network-only',
  exchanges: [fetchExchange]
})
export const query = async (query: DocumentInput<any, {}>, params = {}) => {
  return client.query(query, params).toPromise()
}
