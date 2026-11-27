/**
 * 代理配置的展示文案与模式映射。
 *
 * 与后端 `app/utils/http/proxy_utils.py` 的语义严格保持一致：
 * - 空值 = 未配置 → 启动时回退服务端默认代理（IPv6 代理池）；
 * - `"none"` = 显式直连，**不会**回退默认代理；
 * - 其它 = 自定义代理 host:port。
 *
 * 三者不能用「空值」同时表达直连：空值会被服务端解释成「用默认代理」，
 * 用户选了直连却仍走池，是静默的行为不一致。
 */

/** 显式直连标记，必须与后端 `DIRECT_PROXY_SERVER` 一致 */
export const DIRECT_PROXY_VALUE = 'none'
/** 显式「IPv6 代理池」标记，必须与后端 `POOL_PROXY_SERVER` 一致 */
export const POOL_PROXY_VALUE = 'pool'

export type ProxyMode = 'pool' | 'none' | 'custom'

/** 把已保存的 proxy_server 反解成界面模式（历史空值按池处理） */
export function resolveProxyMode(proxyServer?: string | null): ProxyMode {
  const value = (proxyServer || '').trim().toLowerCase()
  if (!value || value === POOL_PROXY_VALUE) {
    return 'pool'
  }
  if (value === DIRECT_PROXY_VALUE) {
    return 'none'
  }
  return 'custom'
}

/** 展示用文案 */
export function formatProxyServer(proxyServer?: string | null): string {
  const mode = resolveProxyMode(proxyServer)
  if (mode === 'pool') {
    return 'IPv6 代理池（服务端默认）'
  }
  if (mode === 'none') {
    return '不使用代理（直连）'
  }
  return (proxyServer || '').trim()
}
