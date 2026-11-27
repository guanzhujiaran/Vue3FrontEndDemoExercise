import type { CookieData } from '@/api/browser/hey-api/types.gen'

/**
 * Cookie 导入 JSON 的解析与轻校验。
 *
 * 只保证「结构可用」：每项有非空 name / value / domain。
 * domain 归一化、sameSite 大小写、`sameSite=None` 补 secure 等语义修正全部由后端完成，
 * 前端不改写内容，避免与后端规则两处维护、互相打架。
 */

export interface ParsedCookieList {
  cookies: CookieData[]
  /** 其中会话 cookie（expires < 0）条数：浏览器重启后失效 */
  sessionCount: number
}

export interface ParsedCookieGroup {
  cookies: CookieData[]
  /** 该组里的会话 cookie 条数：重启浏览器后失效 */
  sessionCount: number
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function normalizeCookie(raw: unknown, index: number): CookieData {
  if (!isRecord(raw)) {
    throw new Error(`第 ${index + 1} 条 cookie 不是对象`)
  }

  const name = typeof raw.name === 'string' ? raw.name.trim() : ''
  const domain = typeof raw.domain === 'string' ? raw.domain.trim() : ''
  if (!name) {
    throw new Error(`第 ${index + 1} 条 cookie 缺少 name`)
  }
  if (!domain) {
    throw new Error(`第 ${index + 1} 条 cookie 缺少 domain`)
  }
  if (typeof raw.value !== 'string') {
    throw new Error(`第 ${index + 1} 条 cookie 的 value 必须是字符串`)
  }

  return {
    name,
    value: raw.value,
    domain,
    path: typeof raw.path === 'string' && raw.path ? raw.path : '/',
    expires: resolveExpires(raw),
    httpOnly: raw.httpOnly === true,
    secure: raw.secure === true,
    sameSite: typeof raw.sameSite === 'string' && raw.sameSite ? raw.sameSite : 'Lax'
  }
}

/** Playwright 允许的最大 expires（9999-12-31）；超出会让整批 add_cookies 直接失败 */
const MAX_COOKIE_EXPIRES = 253402300799

/**
 * 归一化过期时间（秒级时间戳，-1 = 会话 cookie）。
 *
 * 后端也会归一化（`normalize_cookie_expires`），这里提前处理是为了：
 * - 毫秒时间戳（13 位，JS `Date.now()` / 部分扩展导出）→ 秒，否则 Playwright 抛
 *   "Cookie should have a valid expires"；
 * - 0 / 负数 / NaN / 超上限 → -1（会话 cookie）。
 */
function normalizeExpires(value: number): number {
  if (!Number.isFinite(value) || value <= 0) {
    return -1
  }

  let seconds = value
  if (seconds > MAX_COOKIE_EXPIRES) {
    if (seconds < MAX_COOKIE_EXPIRES * 1000) {
      seconds = seconds / 1000
    }
    if (seconds > MAX_COOKIE_EXPIRES) {
      return -1
    }
  }
  return Math.floor(seconds)
}

/**
 * 解析过期时间。
 *
 * 不同导出工具字段名不一致：本项目导出是 `expires`，
 * Chrome 扩展（EditThisCookie 等）常用 `expirationDate`。
 * 只认 `expires` 会把带过期时间的持久 cookie 全降级成会话 cookie ——
 * 表现为「导入成功、重启浏览器登录态没了」，因此这里必须兼容。
 */
function resolveExpires(raw: Record<string, unknown>): number {
  const candidates = [raw.expires, raw.expirationDate, raw.expiration_date]
  for (const value of candidates) {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return normalizeExpires(value)
    }
  }
  return -1
}

function parseJson(text: string, emptyHint: string): unknown {
  const trimmed = text.trim()
  if (!trimmed) {
    throw new Error(emptyHint)
  }
  try {
    return JSON.parse(trimmed) as unknown
  } catch {
    throw new Error('JSON 解析失败，请检查格式')
  }
}

/** 解析单个浏览器的导入内容：导出文件里的 `cookies` 数组 */
export function parseCookieList(text: string): ParsedCookieList {
  const parsed = parseJson(text, '请粘贴或选择 cookie JSON')

  if (!Array.isArray(parsed)) {
    throw new Error('cookie 内容应为数组，可直接使用导出文件里的 cookies 数组')
  }
  if (!parsed.length) {
    throw new Error('cookie 数组为空')
  }

  const cookies = parsed.map((item, index) => normalizeCookie(item, index))
  return {
    cookies,
    sessionCount: cookies.filter((item) => (item.expires ?? -1) < 0).length
  }
}

/**
 * 解析多组 cookie：`[[cookie...], [cookie...]]`，也接受 `[{ cookies: [...] }, ...]`。
 *
 * 组与浏览器按索引配对（第 i 组给第 i 个浏览器），所以这里只负责「拆组 + 校验」，
 * 不关心浏览器数量；不匹配由弹窗提示、由后端统计。
 */
export function parseCookieGroups(text: string): ParsedCookieGroup[] {
  const parsed = parseJson(text, '请粘贴或选择多组 cookie JSON')

  if (!Array.isArray(parsed)) {
    throw new Error('内容应为数组，每个元素是一组 cookie（数组）')
  }
  if (!parsed.length) {
    throw new Error('没有解析到任何 cookie 组')
  }

  return parsed.map((raw, index) => {
    const list = Array.isArray(raw)
      ? raw
      : isRecord(raw) && Array.isArray(raw.cookies)
        ? raw.cookies
        : null
    if (!list) {
      throw new Error(`第 ${index + 1} 组应为 cookie 数组`)
    }
    if (!list.length) {
      throw new Error(`第 ${index + 1} 组 cookie 为空`)
    }

    const cookies = list.map((item, cookieIndex) => normalizeCookie(item, cookieIndex))
    return {
      cookies,
      sessionCount: cookies.filter((item) => (item.expires ?? -1) < 0).length
    }
  })
}
