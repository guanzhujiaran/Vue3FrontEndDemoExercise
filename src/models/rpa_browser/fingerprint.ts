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
  /** 指纹种子（DB 字段名 fingerprint；即 --fingerprint 的值，全局唯一） */
  fingerprint: number | null
  fingerprint_int: number | null
  fingerprint_platform: string | null
  fingerprint_platform_version: string | null
  fingerprint_browser: string | null
  /** 模拟版本：下发给页面的报告版本（由真实版本派生） */
  fingerprint_brand_version: string | null
  /** 真实版本：实际启动的 chromium 二进制版本（来自服务端 browser_exec_info 清单） */
  fingerprint_real_version: string | null
  fingerprint_hardware_concurrency: number | null
  fingerprint_gpu_vendor: string | null
  fingerprint_gpu_renderer: string | null
  lang: string | null
  accept_lang: string | null
  timezone: string | null
  proxy_server: string | null
  proxy_bypass: string | null
}

/**
 * `--fingerprint-gpu-vendor` / `--fingerprint-gpu-renderer` 在 Chrome 144 被内核移除，
 * 144+ 上实际 GPU 由 `--fingerprint` 种子决定，字段只被记录、不生效。
 */
export const GPU_OVERRIDE_LAST_SUPPORTED_MAJOR = 143

/** 给定真实版本，GPU 覆盖是否仍然生效（未选版本时不做提示） */
export function supportsGpuOverride(realVersion: string | null | undefined): boolean {
  const major = Number((realVersion || '').split('.')[0])
  if (!major) return true
  return major <= GPU_OVERRIDE_LAST_SUPPORTED_MAJOR
}
