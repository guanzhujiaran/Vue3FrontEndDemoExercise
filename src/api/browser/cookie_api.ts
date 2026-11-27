import { 自动化控制Service } from '@/api/browser/hey-api'
import { businessHandler, type BusinessHandlerResult } from '@/utils/businessHandler'
import type {
  ClearLoginStateBatchResponse,
  ClearLoginStateResponse,
  CookieData,
  ExportCookiesBatchResponse,
  ExportCookiesResponse,
  ImportCookiesBatchResponse,
  ImportCookiesResponse
} from '@/api/browser/hey-api/types.gen'

/**
 * 浏览器登录态（Cookie）接口封装。
 *
 * 约束（与后端一致，不要在前端绕过）：
 * - cookie 的唯一真相源是浏览器 profile，这里只做「读一次」和「写一次」，
 *   前端不得把结果存进 localStorage / IndexedDB 或提交到任何自建持久化接口；
 * - 导出结果等同于账号凭证，只在内存中交给下载；
 * - 导入写完后服务端不再持有副本，刷新与落盘由浏览器负责。
 *
 * 接口函数取自生成的 `services/自动化控制Service.gen.ts`，不手改生成产物。
 */

/** 与 `useUserNavStore().user_header` 同构的身份头 */
export interface CookieRequestHeaders {
  'x-bili-mid'?: string
  'x-bili-level'?: string
  'x-bili-role'?: string
}

export interface CookieImportOptions {
  /** 浏览器未运行时是否顺带启动（默认 false：避免隐式占用启动队列与时长配额） */
  launchIfNotRunning?: boolean
  /** 导入后是否刷新已打开页面，默认 true */
  reloadPages?: boolean
}

export interface CookieExportOptions {
  /**
   * 浏览器未运行时是否顺带启动再导出（默认 false）。
   *
   * cookie 只能从运行中的 context 读取，不启动就导不出任何东西；启动是串行的、
   * 受启动队列约束且占用时长配额，因此由调用方显式决定。
   */
  launchIfNotRunning?: boolean
}


/** 导出 cookie（只读）：domains 为空表示全部；未启动浏览器时按需先启动 */
export async function exportBrowserCookies(
  browserId: string,
  domains: string[],
  headers: CookieRequestHeaders,
  options: CookieExportOptions = {}
): Promise<BusinessHandlerResult<ExportCookiesResponse>> {
  return businessHandler<ExportCookiesResponse>(
    自动化控制Service.exportCookiesApiV1RpaBrowserControlOperationExportCookiesPost({
      query: { browser_id: browserId },
      body: {
        ...(domains.length ? { domains } : {}),
        launch_if_not_running: options.launchIfNotRunning ?? false
      },
      headers
    }) as never,
    { successMessage: '', errorMessage: '导出 cookie 失败', showSuccessToast: false }
  )
}

/** 单个浏览器导入 cookie（一次性写入，服务端不保留副本） */
export async function importBrowserCookies(
  browserId: string,
  cookies: CookieData[],
  headers: CookieRequestHeaders,
  options: CookieImportOptions = {}
): Promise<BusinessHandlerResult<ImportCookiesResponse>> {
  return businessHandler<ImportCookiesResponse>(
    自动化控制Service.importCookiesApiV1RpaBrowserControlOperationImportCookiesPost({
      query: { browser_id: browserId },
      body: {
        cookies,
        launch_if_not_running: options.launchIfNotRunning ?? false,
        reload_pages: options.reloadPages ?? true
      },
      headers
    }) as never,
    { successMessage: '', errorMessage: '导入 cookie 失败', showSuccessToast: false }
  )
}

/**
 * 批量导入：`cookieGroups[i]` 写入 `browserIds[i]`（按索引配对）。
 *
 * 两侧数量不匹配时后端「尽力导入」：多出的组忽略并在响应里统计条数，
 * 多余的浏览器标记为 `unassigned` —— 都不算请求失败。
 */
export async function importBrowserCookiesBatch(
  browserIds: string[],
  cookieGroups: CookieData[][],
  headers: CookieRequestHeaders,
  options: CookieImportOptions = {}
): Promise<BusinessHandlerResult<ImportCookiesBatchResponse>> {
  return businessHandler<ImportCookiesBatchResponse>(
    自动化控制Service.importCookiesBatchApiV1RpaBrowserControlOperationImportCookiesBatchPost({
      body: {
        browser_ids: browserIds,
        cookie_groups: cookieGroups,
        launch_if_not_running: options.launchIfNotRunning ?? false,
        reload_pages: options.reloadPages ?? true
      },
      headers
    }) as never,
    { successMessage: '', errorMessage: '批量导入 cookie 失败', showSuccessToast: false }
  )
}

/** 清空登录态（换号）：cookie + 权限 + 页面 web storage */
export async function clearBrowserLoginState(
  browserId: string,
  headers: CookieRequestHeaders,
  reloadPages = true
): Promise<BusinessHandlerResult<ClearLoginStateResponse>> {
  return businessHandler<ClearLoginStateResponse>(
    自动化控制Service.clearLoginStateApiV1RpaBrowserControlOperationClearLoginStatePost({
      query: { browser_id: browserId },
      body: { reload_pages: reloadPages },
      headers
    }) as never,
    { successMessage: '', errorMessage: '清空登录态失败', showSuccessToast: false }
  )
}

/**
 * 批量导出 cookie（只读，逐项隔离）。
 *
 * 只处理运行中的浏览器：未启动项由后端返回 `not_running`，前端不隐式启动
 * （启动会占启动队列与时长配额）。`domains` 非法是请求级错误，整批直接失败。
 */
export async function exportBrowserCookiesBatch(
  browserIds: string[],
  domains: string[],
  headers: CookieRequestHeaders
): Promise<BusinessHandlerResult<ExportCookiesBatchResponse>> {
  return businessHandler<ExportCookiesBatchResponse>(
    自动化控制Service.exportCookiesBatchApiV1RpaBrowserControlOperationExportCookiesBatchPost({
      body: {
        browser_ids: browserIds,
        ...(domains.length ? { domains } : {})
      },
      headers
    }) as never,
    { successMessage: '', errorMessage: '批量导出 cookie 失败', showSuccessToast: false }
  )
}

/**
 * 批量清空登录态（换号，逐项隔离）。
 *
 * 语义与单浏览器一致：cookie + 权限 + 页面 web storage，不关闭、不重建浏览器。
 * 工作流执行中的项由后端返回 `workflow_running` 并跳过，不会打断正在跑的工作流。
 */
export async function clearBrowserLoginStateBatch(
  browserIds: string[],
  headers: CookieRequestHeaders,
  reloadPages = true
): Promise<BusinessHandlerResult<ClearLoginStateBatchResponse>> {
  return businessHandler<ClearLoginStateBatchResponse>(
    自动化控制Service.clearLoginStateBatchApiV1RpaBrowserControlOperationClearLoginStateBatchPost({
      body: { browser_ids: browserIds, reload_pages: reloadPages },
      headers
    }) as never,
    { successMessage: '', errorMessage: '批量清空登录态失败', showSuccessToast: false }
  )
}
