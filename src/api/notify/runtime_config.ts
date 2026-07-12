import type { CreateClientConfig } from './hey-api/client.gen'
import { useJwtStore } from '@/stores/jwt_token'

export const createClientConfig: CreateClientConfig = (config) => ({
  ...config,
  baseUrl:'',
  timeout:30000,
  responseStyle: 'data',
  onRequest: ({ options }) => {
    const JwtStore = useJwtStore()
    const token = JwtStore.jwt
    if (token) {
      options.headers.set('Authorization', `Bearer ${token}`)
    }
  }
})
