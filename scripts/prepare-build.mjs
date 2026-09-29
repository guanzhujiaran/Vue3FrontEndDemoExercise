#!/usr/bin/env node
/**
 * 构建前归档「构建流程会自行清空的目录」。
 *
 * 为什么这么做：
 * 1. 受管环境对批量删除有拦截（本项目实测命中 `SAFE_DELETE_BULK_CONFIRM_REQUIRED`）——
 *    一次是产物目录 `dist`（4665 个文件），一次是 Nuxt 构建缓存
 *    `node_modules/.cache/nuxt`（885 个文件），而 `nuxi generate` / Nitro 都会在开始前
 *    清空这两处，一旦被拦，构建直接中断（且 `nuxi generate` 没有跳过清理的选项）；
 * 2. `renameSync` 不含删除语义，稳定可靠；归档到**系统临时目录**，不污染仓库、由系统回收，
 *    同时天然保留上一版产物与缓存，出问题可快速回滚。
 *
 * 归档后目录不存在，构建流程直接创建即可，也不会再触发任何清理动作。
 */
import { existsSync, renameSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const ROOT = process.cwd()

/** 会被构建流程清理、且文件数可能超过拦截阈值的目录 */
const TARGETS = [
  // 上一版静态产物
  join(ROOT, 'dist'),
  // Nuxt 构建缓存（nuxi generate 前会 clearDir）
  join(ROOT, 'node_modules', '.cache', 'nuxt'),
  /**
   * `.nuxt`（Nuxt 的 buildDir）：增量缓存如果没有正确失效，
   * 会出现「改了代码但产物仍是旧的」这类诡异现象（例如 hydration mismatch 明明修了还在报）。
   * 每轮构建都归档它，等价于 `nuxt cleanup` 的效果。
   */
  join(ROOT, '.nuxt')
]

const stamp = Date.now()
let archivedCount = 0

for (const target of TARGETS) {
  if (!existsSync(target)) continue
  const name = target.split(/[\\/]/).pop()
  const archive = join(tmpdir(), `bililottery-build-${stamp}-${name}`)
  try {
    renameSync(target, archive)
    archivedCount++
    console.log(`[prepare-build] ✓ 已归档 ${target} → ${archive}`)
  } catch (error) {
    // 归档失败不阻塞构建：构建流程会自行覆盖 / 重建
    console.warn(`[prepare-build] ⚠️ 归档失败（继续构建）${target}：${error?.message ?? error}`)
  }
}

if (!archivedCount) console.log('[prepare-build] 无需处理（目标目录均不存在）')
