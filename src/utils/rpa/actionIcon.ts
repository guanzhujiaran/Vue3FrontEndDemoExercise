import { ACTION_ICON_MANIFEST, ACTION_ICON_PUBLIC_DIR } from './actionIconManifest'

/**
 * RPA 自定义动作图标注册表（清单驱动，放入资源 + 重建清单即生效）
 *
 * ## 资源位置与目录约定
 *
 * 动作图标是「内容图库」而非打包资产（4000+ 张 png、约 580MB），资源放在**项目根**
 * `action-icons/`（不在 `public/`，也不在 `src/assets/`）：作为静态资源原样托管、
 * **不参与构建、不加内容 hash**（放 `public/` 会让产物膨胀到 580MB，且每次构建都要
 * 复制/清理这 4000+ 文件）。部署时单独同步到站点根，见 `docs/前端部署说明.md`。
 *
 * ```
 * action-icons/{分类}/s_{系列编号}_{系列名称}/i_{图片编号}_{图片名称}.{扩展名}
 * ```
 *
 * | 示例 | 解析结果 |
 * | --- | --- |
 * | `FGO头像/s_1_saber/i_100100_阿尔托莉雅.png` | 分类=FGO头像, series=1 saber, id=100100 阿尔托莉雅 |
 * | `s_2_数据抓取/i_1_提取标题.png` | 分类=空, series=2 数据抓取, id=1 提取标题 |
 *
 * - **分类层可省略**（允许多层嵌套，只有紧邻系列目录的那一层会被当作分类名）；
 * - 系列名 / 图片名可省略（写 `s_1/i_3.png` 也可解析），**仅供前端展示**；
 * - **后端只存 `icon_series` / `icon_id` 两个 int**，因此：
 *   分类只用于前端组织展示，`s_{系列编号}` **必须在所有分类下全局唯一**，
 *   否则同编号图标会互相覆盖（生成清单时会打印冲突告警）；
 * - 同一「系列+编号」同时存在 SVG 与位图时 **SVG 优先**（在清单生成阶段去重）；
 * - 新增/改名资源需重建清单：`npm run icons:manifest`（扫描 4000 个文件约 1 秒）。
 *
 * ## 为什么不直接用 `import.meta.glob`
 *
 * glob 会把每个资源编译成一个「导出 URL 的 JS 模块」，构建期产生数千个碎片 chunk、运行时
 * 还要先加载该模块才知道图片地址（双重请求）。改为「静态托管 + 清单」后：
 * dist 体积回到几 MB、运行时零额外请求、图片可由 Nginx / CDN 单独分发。
 *
 * ## 清单与 URL 拼装
 *
 * 文件名含中文业务名，无法由 `series/id` 反推，故由 `scripts/gen-action-icon-manifest.mjs`
 * 生成 `actionIconManifest.ts`（自动生成，勿手改）。运行时 URL：
 *
 * ```
 * `/action-icons/${dir}/${file}`   // 路径分段各自 encodeURIComponent
 * ```
 *
 * ⚠️ **不要用 `import.meta.env.BASE_URL` 拼这个 URL**：Nuxt 客户端把 Vite 的 base 设为
 * `/_nuxt/`（用于产物寻址），拼出来是 `/_nuxt/action-icons/...`，静态目录里没有这条路径
 * → 请求全部 404，界面上表现为「破图」。故由 `ACTION_ICON_URL_PREFIX` 固定为站点根绝对路径。
 *
 * ⚠️ 代价：失去内容 hash，资源更新不受打包器校验。清单生成脚本即校验手段
 * （`npm run icons:manifest -- --check` 可放进 CI）。
 *
 * ## 兜底规则
 *
 * 本模块只负责「具体图标」的查找：命中返回 URL，未命中一律返回 `null`。
 * - 未命中场景：`series/id` 为 0（未选择自定义图标）、编号不存在、清单为空等；
 * - **默认图标由调用方通过 `fallback` 插槽提供**（沿用前端既有的动作类型图标 /
 *   `QuestionFilled`，见 `@/utils/rpa/actionTypeIcon`），因此图库**无需**提供默认资源；
 * - 调用方（`ActionIcon.vue`）还需在图片加载失败时回落 `fallback`（资源缺失也不破图）；
 * - `icon_series = 0` 或 `icon_id = 0` 是「未选择自定义图标」的协议约定（见 `isDefaultActionIcon`）。
 */

/** 默认图标占位：系列 0 / 编号 0 */
export const DEFAULT_ICON_SERIES = 0
export const DEFAULT_ICON_ID = 0

/** 资源根目录（展示用，如 `action-icons/`；运行时以站点根绝对路径引用） */
export const ACTION_ICON_DIR = ACTION_ICON_PUBLIC_DIR

/**
 * 图标 URL 前缀：**站点根绝对路径**，与部署约定一致
 * （站点根下直接有 `action-icons/`，见 `docs/前端部署说明.md`）。
 *
 * 这里刻意不用 `import.meta.env.BASE_URL`：Nuxt 客户端把它设为 `/_nuxt/`，
 * 拼出来会变成 `/_nuxt/action-icons/...` 而 404。
 */
const ACTION_ICON_URL_PREFIX = `/${ACTION_ICON_PUBLIC_DIR}/`

interface IconEntry {
  /** 图片名称（来自文件名，可缺省） */
  name: string
  /** 静态资源 URL（站点根绝对路径） */
  url: string
}

interface SeriesEntry {
  /** 系列名称（来自目录名，可缺省） */
  seriesName: string
  /** 分类名称（系列目录的上一级目录，可缺省） */
  category: string
  /** 该系列下的图标，key 为 icon_id */
  icons: Map<number, IconEntry>
}

/**
 * 拼图标 URL
 *
 * 文件名与目录名含中文业务名（如 `i_220_概念礼装经验卡：九字兼定.png`），
 * 必须逐段编码，不能用裸字符串拼进 `src`。
 */
function buildIconUrl(dir: string, file: string): string {
  const encoded = [...dir.split('/'), file].map(encodeURIComponent).join('/')
  return `${ACTION_ICON_URL_PREFIX}${encoded}`
}

/** 系列编号 → 系列信息 */
const iconRegistry = new Map<number, SeriesEntry>()

// 清单已在生成阶段完成「series/id 解析 + 排序 + SVG 优先」，这里直接构表
for (const [seriesKey, series] of Object.entries(ACTION_ICON_MANIFEST.series)) {
  const seriesNumber = Number(seriesKey)
  if (!Number.isFinite(seriesNumber) || seriesNumber === DEFAULT_ICON_SERIES) continue

  const icons = new Map<number, IconEntry>()
  for (const [idKey, icon] of Object.entries(series.icons)) {
    const id = Number(idKey)
    if (!Number.isFinite(id) || id === DEFAULT_ICON_ID) continue
    icons.set(id, {
      name: icon.name,
      url: buildIconUrl(series.dir, icon.file),
    })
  }

  iconRegistry.set(seriesNumber, {
    seriesName: series.seriesName,
    category: series.category,
    icons,
  })
}

/** 精确查找（不触发默认回落） */
function findExact(series: number, id: number): IconEntry | undefined {
  return iconRegistry.get(series)?.icons.get(id)
}

/**
 * 解析动作图标 URL
 *
 * 位图与 SVG 统一按 URL 渲染 `<img>`：SVG 以 URL 形式加载时无法响应 `currentColor`，
 * 需要跟随文字颜色变化的图标请用 `@/utils/rpa/actionTypeIcon` 的内置图标。
 *
 * @param series 图标系列编号（后端 `icon_series`）
 * @param id     系列内编号（后端 `icon_id`）
 * @returns 图标 URL；未命中返回 `null`（由调用方渲染 `fallback`）
 */
export function resolveActionIconUrl(
  series?: number | null,
  id?: number | null
): string | null {
  const s = typeof series === 'number' && Number.isFinite(series) ? series : DEFAULT_ICON_SERIES
  const i = typeof id === 'number' && Number.isFinite(id) ? id : DEFAULT_ICON_ID

  return findExact(s, i)?.url ?? null
}

/** 是否等价于「默认图标」（系列或编号为 0 / 未设置） */
export function isDefaultActionIcon(series?: number | null, id?: number | null): boolean {
  return (
    typeof series !== 'number' ||
    Number.isNaN(series) ||
    series === DEFAULT_ICON_SERIES ||
    typeof id !== 'number' ||
    Number.isNaN(id) ||
    id === DEFAULT_ICON_ID
  )
}

/** 精确命中判断（用于选择器高亮，不触发默认回落） */
export function hasActionIcon(series?: number | null, id?: number | null): boolean {
  if (typeof series !== 'number' || typeof id !== 'number') return false
  return findExact(series, id) !== undefined
}

/** 获取某张图片的名称（来自文件名，可能为空字符串） */
export function getActionIconName(series?: number | null, id?: number | null): string {
  if (typeof series !== 'number' || typeof id !== 'number') return ''
  return findExact(series, id)?.name ?? ''
}

/** 获取某个系列的名称（来自目录名，可能为空字符串） */
export function getActionIconSeriesName(series?: number | null): string {
  if (typeof series !== 'number' || Number.isNaN(series)) return ''
  return iconRegistry.get(series)?.seriesName ?? ''
}

/** 获取某个系列所属的分类名称（来自目录名，可能为空字符串） */
export function getActionIconCategory(series?: number | null): string {
  if (typeof series !== 'number' || Number.isNaN(series)) return ''
  return iconRegistry.get(series)?.category ?? ''
}

export interface ActionIconOption {
  id: number
  name: string
}

export interface ActionIconSeriesOption {
  series: number
  seriesName: string
  category: string
  icons: ActionIconOption[]
}

/**
 * 调用方（图标选择器）可选的系列与编号
 *
 * 已按系列编号升序、编号升序排列；不含默认系列（0）。
 * 名称/分类来自目录名，可能为空字符串。
 */
export function getActionIconSeries(): ActionIconSeriesOption[] {
  return [...iconRegistry.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([series, entry]) => ({
      series,
      seriesName: entry.seriesName,
      category: entry.category,
      icons: [...entry.icons.entries()]
        .sort((a, b) => a[0] - b[0])
        .map(([id, icon]) => ({ id, name: icon.name })),
    }))
}

/** 已出现的分类名称（去重、按名称排序；不含空分类） */
export function getActionIconCategories(): string[] {
  const categories = new Set<string>()
  for (const entry of iconRegistry.values()) {
    if (entry.category) categories.add(entry.category)
  }
  return [...categories].sort((a, b) => a.localeCompare(b))
}

/** 系列在选择器中的展示文本，例如 `1 · saber`（可选带分类前缀 `FGO头像 / 1 · saber`） */
export function formatActionIconSeriesLabel(
  series: number,
  seriesName?: string,
  category?: string
): string {
  const name = (seriesName ?? '').trim()
  const base = name ? `${series} · ${name}` : `系列 ${series}`
  const cate = (category ?? '').trim()
  return cate ? `${cate} / ${base}` : base
}

/** 是否已加载到任何可选图标资源 */
export function hasAnyActionIcon(): boolean {
  return getActionIconSeries().length > 0
}
