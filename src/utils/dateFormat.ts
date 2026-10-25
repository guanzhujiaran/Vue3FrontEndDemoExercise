/**
 * 日期格式化的统一入口（**显式指定 locale 与 timeZone**）。
 *
 * 为什么必须显式：
 * - `toLocaleString()` 不带参数时用的是**运行环境的默认 locale** —— SSR 时是构建机的
 *   （本项目实测为 `en-US`），浏览器里是用户的语言（国内用户为 `zh-CN`）。
 *   同一个时间戳两端会渲染成不同字符串：
 *   `9/21/2026, 4:47:45 PM`（构建机） vs `2026/9/21 16:47:45`（用户），
 *   直接触发 `Hydration completed but contains mismatches`；
 * - 时区同理：构建机是 `Asia/Shanghai`，用户可能在其它时区；`getHours()` / `toLocaleString()`
 *   都会受影响。
 *
 * 本站面向中文用户、数据源（开奖时间 / 同步时间）本身就是国内时间，
 * 故统一按 `zh-CN` + `Asia/Shanghai` 输出：两端结果完全一致，且符合用户预期。
 *
 * 用法：凡是**会参与服务端渲染**的时间展示都走这里；纯客户端交互（点击后弹提示等）
 * 想显示用户本地时间，可自行用 `toLocaleString()` 或放进 `<ClientOnly>`。
 */
export const SITE_TIME_ZONE = 'Asia/Shanghai'
export const SITE_LOCALE = 'zh-CN'

/**
 * 把输入归一为毫秒时间戳。
 *
 * - `Date` / 空值：原样返回（空值交给各函数判空）；
 * - `string`：当作日期字符串 / 毫秒字符串交给 `new Date`；
 * - `number`：本项目后端出参统一为**秒级**时间戳（int32 epoch 秒），需 ×1000 转毫秒；
 *   但若已 ≥ 1e12（毫秒级，常见于原始 B 站/抽奖数据）则视为毫秒，原样返回，避免重复放大。
 */
function toMillis(input: number | string | Date): number {
  if (typeof input === 'number') {
    return input >= 1e12 ? input : input * 1000
  }
  return new Date(input).getTime()
}

/** 时间戳 / 日期字符串 → `2026/9/21 16:47:45`（24 小时制，固定时区与语言） */
export function formatDateTime(input: number | string | Date | null | undefined): string {
  if (input === null || input === undefined || input === '') return ''
  const date = input instanceof Date ? input : new Date(toMillis(input))
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleString(SITE_LOCALE, { timeZone: SITE_TIME_ZONE, hour12: false })
}

/** 时间戳 / 日期字符串 → `2026/9/21`（固定时区与语言） */
export function formatDate(input: number | string | Date | null | undefined): string {
  if (input === null || input === undefined || input === '') return ''
  const date = input instanceof Date ? input : new Date(toMillis(input))
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleDateString(SITE_LOCALE, { timeZone: SITE_TIME_ZONE })
}

/** 时间戳 / 日期字符串 → `16:47`（固定时区与语言，常用于列表里的时间） */
export function formatTimeShort(input: number | string | Date | null | undefined): string {
  if (input === null || input === undefined || input === '') return ''
  const date = input instanceof Date ? input : new Date(toMillis(input))
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleTimeString(SITE_LOCALE, {
    timeZone: SITE_TIME_ZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  })
}

/** 时间戳 / 日期字符串 → `9/21 16:47`（今天用短格式；固定时区与语言） */
export function formatMonthDayTime(input: number | string | Date | null | undefined): string {
  if (input === null || input === undefined || input === '') return ''
  const date = input instanceof Date ? input : new Date(toMillis(input))
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleString(SITE_LOCALE, {
    timeZone: SITE_TIME_ZONE,
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  })
}

/** 按站点时区取「年 / 月 / 日」三个数值（避免用运行环境时区，导致两端 SSR 结果不一致） */
function siteYmd(date: Date): { year: number; month: number; day: number } {
  const parts = new Intl.DateTimeFormat(SITE_LOCALE, {
    timeZone: SITE_TIME_ZONE,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric'
  }).formatToParts(date)
  const pick = (type: Intl.DateTimeFormatPartTypes): number => Number(parts.find((p) => p.type === type)?.value ?? NaN)
  return { year: pick('year'), month: pick('month'), day: pick('day') }
}

/**
 * 相对时间（对标 B 站）：`刚刚` / `N分钟前` / `N小时前` / `昨天` / `M月D日` / `YYYY年M月D日`。
 *
 * 只做纯展示，不传 `now` 时取当前时间；需要确定性渲染（如 SSR 预渲染、快照对比）时
 * 由调用方传入固定 `now`，否则同一输入在两次渲染中可能得到不同文案。
 */
export function formatRelativeTime(
  input: number | string | Date | null | undefined,
  now: number = Date.now()
): string {
  if (input === null || input === undefined || input === '') return ''
  const date = input instanceof Date ? input : new Date(toMillis(input))
  const ts = date.getTime()
  if (Number.isNaN(ts)) return ''
  const diff = now - ts
  const minute = 60_000
  const hour = 60 * minute
  const day = 24 * hour
  if (diff < minute) return '刚刚'
  if (diff < hour) return `${Math.floor(diff / minute)}分钟前`
  if (diff < day) return `${Math.floor(diff / hour)}小时前`
  if (diff < 2 * day) return '昨天'
  const { year, month, day: dayNum } = siteYmd(date)
  if (year === siteYmd(new Date(now)).year) return `${month}月${dayNum}日`
  return `${year}年${month}月${dayNum}日`
}
