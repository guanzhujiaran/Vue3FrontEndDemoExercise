#!/usr/bin/env node
/**
 * 生成 RPA 动作图标清单 `src/utils/rpa/actionIconManifest.ts`（可反复执行）
 *
 * ## 为什么需要这份清单
 *
 * action-icons 是**内容图库**（当前 4000+ 张 png、约 580MB），已从 `src/assets/` 迁到
 * `public/action-icons/`：作为静态资源原样拷贝，不参与打包、不加 hash。
 * 代价是打包器不再知道「`icon_series` / `icon_id` → 文件」的映射（文件名里带的是中文名称，
 * 无法由编号反推），所以这里在构建前扫描目录、把映射固化成一份清单供运行时 import。
 *
 * ## 用法
 *
 * ```
 * node scripts/gen-action-icon-manifest.mjs            # 生成清单
 * node scripts/gen-action-icon-manifest.mjs --check    # 只校验清单是否最新（CI / pre-commit）
 * ```
 *
 * 目录约定（与 `src/utils/rpa/actionIcon.ts` 保持一致）：
 * `public/action-icons/{分类}/s_{系列编号}_{系列名称}/i_{图片编号}_{图片名称}.{扩展名}`
 * 分类层可省略；同一编号同时存在 svg 与位图时 svg 优先；系列编号需全局唯一。
 *
 * ⚠️ 新增/删除/重命名图标后必须重新执行本脚本（已接入 `npm run dev` / `npm run build` 的 pre 钩子）。
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const FRONTEND = resolve(HERE, '..')
const ICONS_ROOT = join(FRONTEND, 'public', 'action-icons')
const OUT_FILE = join(FRONTEND, 'src', 'utils', 'rpa', 'actionIconManifest.ts')

/** 清单版本：结构变更时自增，供运行时兼容判断 */
const MANIFEST_VERSION = 1
/** public 下的资源目录名，运行时会以 `${import.meta.env.BASE_URL}${PUBLIC_DIR}/` 为前缀拼 URL */
const PUBLIC_DIR = 'action-icons'

const SERIES_RE = /^s_(\d+)(?:_(.*))?$/
const FILE_RE = /^i_(\d+)(?:_(.*))?\.(\w+)$/
const VECTOR_EXTS = new Set(['svg'])
const RASTER_EXTS = new Set(['png', 'jpg', 'jpeg', 'webp', 'gif'])

/**
 * @typedef {{ category: string, dirName: string, relDir: string }} SeriesDir
 * @typedef {{ series: number, seriesName: string, category: string, relDir: string, icons: Map<number, { name: string, file: string, kind: 'svg' | 'image' }> }} SeriesEntry
 */

/** 收集所有系列目录（分类层可选，最多两层） */
function collectSeriesDirs() {
  /** @type {SeriesDir[]} */
  const dirs = []
  if (!existsSync(ICONS_ROOT)) {
    throw new Error(`找不到图标目录：${ICONS_ROOT}`)
  }
  for (const entry of readdirSync(ICONS_ROOT, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue
    if (SERIES_RE.test(entry.name)) {
      // 分类层省略：系列目录直接位于根节点下
      dirs.push({ category: '', dirName: entry.name, relDir: entry.name })
      continue
    }
    for (const child of readdirSync(join(ICONS_ROOT, entry.name), { withFileTypes: true })) {
      if (!child.isDirectory() || !SERIES_RE.test(child.name)) continue
      dirs.push({ category: entry.name, dirName: child.name, relDir: `${entry.name}/${child.name}` })
    }
  }
  return dirs
}

/** 读取每个系列下的图标文件，构建 series → entry */
function buildRegistry() {
  /** @type {Map<number, SeriesEntry>} */
  const registry = new Map()
  /** @type {Set<number>} */
  const conflicted = new Set()
  /** @type {string[]} */
  const skipped = []

  for (const dir of collectSeriesDirs()) {
    const matched = SERIES_RE.exec(dir.dirName)
    if (!matched) continue
    const series = Number(matched[1])
    const seriesName = (matched[2] ?? '').trim()

    let entry = registry.get(series)
    if (!entry) {
      entry = {
        series,
        seriesName,
        category: dir.category,
        relDir: dir.relDir,
        icons: new Map(),
      }
      registry.set(series, entry)
    } else if (dir.category && entry.category && entry.category !== dir.category) {
      // 后端只存 series+id：同编号跨分类会互相覆盖，显式告警
      if (!conflicted.has(series)) {
        conflicted.add(series)
        console.warn(
          `⚠️ 系列编号 ${series} 同时出现在分类「${entry.category}」与「${dir.category}」下；` +
            '后端只存 icon_series/icon_id，同编号会互相覆盖，请保证系列编号全局唯一'
        )
      }
    }
    if (!entry.seriesName && seriesName) entry.seriesName = seriesName
    if (!entry.category && dir.category) entry.category = dir.category

    for (const file of readdirSync(join(ICONS_ROOT, dir.relDir), { withFileTypes: true })) {
      if (!file.isFile()) continue
      const fileMatched = FILE_RE.exec(file.name)
      if (!fileMatched) {
        skipped.push(`${dir.relDir}/${file.name}`)
        continue
      }
      const ext = fileMatched[3].toLowerCase()
      const kind = VECTOR_EXTS.has(ext) ? 'svg' : RASTER_EXTS.has(ext) ? 'image' : null
      if (!kind) {
        skipped.push(`${dir.relDir}/${file.name}`)
        continue
      }
      const id = Number(fileMatched[1])
      const name = (fileMatched[2] ?? '').trim()
      const existing = entry.icons.get(id)
      // svg 优先：已有 svg 时不被同编号位图覆盖
      if (existing && existing.kind === 'svg') continue
      entry.icons.set(id, { name, file: file.name, kind })
    }
  }
  return { registry, skipped }
}

/** 生成清单文件内容（TS 模块，带类型注解以避免 TS 对超大字面量做逐键推断） */
function render(registry, skipped) {
  const series = [...registry.values()].sort((a, b) => a.series - b.series)
  const iconCount = series.reduce((sum, s) => sum + s.icons.size, 0)
  const generatedAt = new Date().toISOString().replace(/\.\d+Z$/, 'Z')

  const body = series
    .map(s => {
      const icons = [...s.icons.entries()]
        .sort((a, b) => a[0] - b[0])
        .map(([id, icon]) => {
          const value = `{ name: ${JSON.stringify(icon.name)}, file: ${JSON.stringify(icon.file)}, kind: ${JSON.stringify(icon.kind)} }`
          return `        ${id}: ${value},`
        })
        .join('\n')
      return [
        `    ${s.series}: {`,
        `      seriesName: ${JSON.stringify(s.seriesName)},`,
        `      category: ${JSON.stringify(s.category)},`,
        `      dir: ${JSON.stringify(s.relDir)},`,
        `      icons: {`,
        icons,
        `      },`,
        `    },`,
      ].join('\n')
    })
    .join('\n')

  return `/**
 * 本文件由 scripts/gen-action-icon-manifest.mjs 自动生成，请勿手动修改
 *
 * 内容：RPA 动作图标「系列编号 / 图片编号 → 静态资源路径」映射。
 * 资源本体位于 public/${PUBLIC_DIR}/（不参与打包），这里的 dir/file 是相对该目录的路径。
 * 运行时 URL = \`\${import.meta.env.BASE_URL}${PUBLIC_DIR}/\${dir}/\${file}\`（路径分段各自 encodeURIComponent）。
 */
/* eslint-disable */

/** 清单结构版本 */
export const ACTION_ICON_MANIFEST_VERSION = ${MANIFEST_VERSION}

/** public 下的资源目录名 */
export const ACTION_ICON_PUBLIC_DIR = ${JSON.stringify(PUBLIC_DIR)}

export interface ActionIconManifestIcon {
  /** 图片名称（来自文件名，可缺省） */
  name: string
  /** 文件名 */
  file: string
  /** 资源类型：svg 走站内同等 rule 处理，位图走 <img> */
  kind: 'svg' | 'image'
}

export interface ActionIconManifestSeries {
  /** 系列名称（来自目录名，可缺省） */
  seriesName: string
  /** 分类名称（系列目录的上一级目录，可缺省） */
  category: string
  /** 系列目录相对 \`public/${PUBLIC_DIR}/\` 的路径 */
  dir: string
  /** 图片编号 → 图标 */
  icons: Record<string, ActionIconManifestIcon>
}

export interface ActionIconManifest {
  version: number
  generatedAt: string
  iconCount: number
  /** 系列编号 → 系列信息（不含默认系列 0） */
  series: Record<string, ActionIconManifestSeries>
}

export const ACTION_ICON_MANIFEST: ActionIconManifest = {
  version: ${MANIFEST_VERSION},
  generatedAt: ${JSON.stringify(generatedAt)},
  iconCount: ${iconCount},
  series: {
${body}
  },
}
`
}

function main() {
  const check = process.argv.includes('--check')
  const { registry, skipped } = buildRegistry()
  const content = render(registry, skipped)
  const iconCount = [...registry.values()].reduce((sum, s) => sum + s.icons.size, 0)

  console.log(
    `系列数: ${registry.size}  图标数: ${iconCount}  ` +
      `资源体积: ${ICONS_ROOT}`
  )
  if (skipped.length) {
    console.warn(`⚠️ 跳过不符合命名约定的 ${skipped.length} 个文件（例：${skipped.slice(0, 3).join(' / ')}）`)
  }

  if (check) {
    if (!existsSync(OUT_FILE)) {
      console.error(`❌ 清单不存在：${OUT_FILE}`)
      process.exit(1)
    }
    // generatedAt 每次都变，比较时忽略该值（只替换带时间戳的那一行，勿动 interface 声明）
    const strip = text => text.replace(/generatedAt: ".*"/g, '')
    if (strip(readFileSync(OUT_FILE, 'utf-8')) !== strip(content)) {
      console.error('❌ 清单已过期，请执行 npm run icons:manifest')
      process.exit(1)
    }
    console.log('✅ 清单已是最新')
    return
  }

  mkdirSync(dirname(OUT_FILE), { recursive: true })
  writeFileSync(OUT_FILE, content, 'utf-8')
  console.log(`✅ 清单已写入 ${OUT_FILE}`)
}

main()
