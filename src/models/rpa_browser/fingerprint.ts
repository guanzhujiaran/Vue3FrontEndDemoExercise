/**
 * 浏览器指纹模型
 *
 * 对应后端指纹列表接口 `list_fingerprint` 返回的 UserBrowserInfo
 * （hey-api 生成的 `BasePaginationRespUserBrowserInfo` 未展开 item 结构，故在此手工声明）
 */
export interface UserBrowserInfo {
  browser_id: string | number
  browser_id_str: string | null
  custom_name: string | null
  created_at: string
  updated_at: string
  platform: string
  browser: string
  fingerprint_int: number | null
  fingerprint_platform: string | null
  fingerprint_platform_version: string | null
  fingerprint_browser: string | null
  fingerprint_brand_version: string | null
  fingerprint_hardware_concurrency: number | null
  fingerprint_gpu_vendor: string | null
  fingerprint_gpu_renderer: string | null
  lang: string | null
  accept_lang: string | null
  timezone: string | null
  proxy_server: string | null
}
