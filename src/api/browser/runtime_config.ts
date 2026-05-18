import type { CreateClientConfig } from './hey-api/client.gen';
import baseAxiosInstance from '@/api/base_axios/base_axios';
export const createClientConfig: CreateClientConfig = (config) => ({
    ...config,
    axios: baseAxiosInstance
});
