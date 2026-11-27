import { 浏览器指纹管理Service } from '@/api/browser/hey-api'
import { startBrowserSession } from '@/api/browser/session_api'
import { businessHandler } from '@/utils/businessHandler'
import type { CookieRequestHeaders } from '@/api/browser/cookie_api'
import type { UserBrowserInfo } from '@/models/rpa_browser'

/**
 * 批量 Cookie 操作（导出 / 清空）的共用定义。
 *
 * - `COOKIE_BATCH_LIMIT` 与后端 `COOKIE_BATCH_MAX_BROWSERS` 默认值对齐：只做交互层
 *   拦截，真正拒绝由后端请求模型完成（即使前端漏改也不会静默截断）；
 * - 状态 Tag 映射集中一处，避免两个弹窗与批量导入出现多套文案。
 */

export const COOKIE_BATCH_LIMIT = 50

export interface CookieBatchBrowserOption {
  browserId: string
  name: string
}

export type CookieBatchTagType = 'success' | 'info' | 'warning' | 'danger' | 'primary'

interface CookieBatchStatusMeta {
  label: string
  type: CookieBatchTagType
}

const COOKIE_BATCH_STATUS_META: Record<string, CookieBatchStatusMeta> = {
  success: { label: '成功', type: 'success' },
  not_running: { label: '未启动', type: 'info' },
  workflow_running: { label: '工作流执行中', type: 'warning' },
  forbidden: { label: '无权访问', type: 'danger' },
  invalid: { label: '参数非法', type: 'danger' },
  launch_failed: { label: '启动失败', type: 'danger' },
  failed: { label: '失败', type: 'danger' }
}

export function cookieBatchStatusMeta(status: string): CookieBatchStatusMeta {
  return COOKIE_BATCH_STATUS_META[status] ?? { label: status, type: 'info' }
}

/** 拉取当前用户浏览器（弹窗内多选，不依赖列表页行选择） */
export async function loadCookieBatchBrowsers(
  headers: CookieRequestHeaders
): Promise<CookieBatchBrowserOption[]> {
  const result = await businessHandler<{ items?: UserBrowserInfo[]; total?: number }>(
    浏览器指纹管理Service.listFingerprintRouterApiV1RpaBrowserListFingerprintPost({
      body: { page: 1, per_page: 200 },
      headers
    }) as never,
    { successMessage: '', errorMessage: '获取浏览器列表失败', showSuccessToast: false }
  )

  if (!result.success || !result.data) {
    return []
  }

  return (result.data.items ?? []).map((item) => {
    const id = String(item.browser_id_str || item.browser_id)
    return { browserId: id, name: item.custom_name || id }
  })
}

/** 站点输入：逗号 / 空格分隔；前端只做轻清洗，格式由后端归一化 */
export function parseCookieDomains(text: string): string[] {
  return text
    .split(/[,，\s]+/)
    .map((item) => item.trim())
    .filter(Boolean)
}

/** 下载文件名用的本地时间戳：yyyyMMddHHmmss */
export function cookieBatchTimestampText(date = new Date()): string {
  const pad = (value: number) => String(value).padStart(2, '0')
  return (
    `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}` +
    `${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`
  )
}

export interface CookieBatchLaunchOutcome {
  /** 启动成功、可以继续操作的浏览器 id */
  launched: string[]
  /** 内存不足进入启动队列的项数（启动在后台继续，稍后重试） */
  queued: number
  /** 启动失败项数 */
  failed: number
}

/**
 * 逐项启动未启动的浏览器（导出 / 清空前的准备动作）。
 *
 * **必须逐项独立请求**：一次批量请求里串行启动 N 个浏览器会跑成分钟级长请求，
 * 撞上网关读超时后前端报失败、后端仍在启动。逐项请求超时隔离，还能展示进度。
 * 串行而不是并发：启动受内存准入与队列约束，并发提交只会让排队更久。
 */
export async function launchCookieBatchBrowsers(
  browserIds: string[],
  headers: CookieRequestHeaders,
  onProgress?: (current: number, total: number) => void
): Promise<CookieBatchLaunchOutcome> {
  const outcome: CookieBatchLaunchOutcome = { launched: [], queued: 0, failed: 0 }

  for (const [index, browserId] of browserIds.entries()) {
    onProgress?.(index + 1, browserIds.length)
    const result = await startBrowserSession(browserId, headers)
    const info = result.data

    if (result.success && info && !info.queued) {
      outcome.launched.push(browserId)
    } else if (info?.queued) {
      outcome.queued += 1
    } else {
      outcome.failed += 1
    }
  }

  return outcome
}

/** 启动结果的一句话汇总（用于结果上方的 Alert） */
export function cookieBatchLaunchNotice(outcome: CookieBatchLaunchOutcome): string {
  const parts: string[] = []
  if (outcome.launched.length > 0) parts.push(`${outcome.launched.length} 个已启动`)
  if (outcome.queued > 0) parts.push(`${outcome.queued} 个内存不足在排队（稍后重试）`)
  if (outcome.failed > 0) parts.push(`${outcome.failed} 个启动失败`)
  return parts.length > 0 ? `启动结果：${parts.join('；')}` : ''
}
