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

/** 时间戳 / 日期字符串 → `2026/9/21 16:47:45`（24 小时制，固定时区与语言） */
export function formatDateTime(input: number | string | Date | null | undefined): string {
  if (input === null || input === undefined || input === '') return ''
  const date = input instanceof Date ? input : new Date(input)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleString(SITE_LOCALE, { timeZone: SITE_TIME_ZONE, hour12: false })
}

/** 时间戳 / 日期字符串 → `2026/9/21`（固定时区与语言） */
export function formatDate(input: number | string | Date | null | undefined): string {
  if (input === null || input === undefined || input === '') return ''
  const date = input instanceof Date ? input : new Date(input)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleDateString(SITE_LOCALE, { timeZone: SITE_TIME_ZONE })
}

/** 时间戳 / 日期字符串 → `16:47`（固定时区与语言，常用于列表里的时间） */
export function formatTimeShort(input: number | string | Date | null | undefined): string {
  if (input === null || input === undefined || input === '') return ''
  const date = input instanceof Date ? input : new Date(input)
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
  const date = input instanceof Date ? input : new Date(input)
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
