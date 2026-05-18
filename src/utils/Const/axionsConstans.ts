export const AXIOS_CONFIG = {
    baseURL: import.meta.env.VITE_API_BASE_URL || window.location.origin, // 设置基础 API 地址
    timeout: 30e3, // 设置请求超时时间
    headers: {
        'content-type': 'application/json'
    }
}
