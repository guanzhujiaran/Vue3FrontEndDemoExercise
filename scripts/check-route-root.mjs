/**
 * 顶层路由组件「单根元素」体检脚本
 *
 * 背景：路由组件的模板根层若出现「多个节点 / 注释」，会被编译成 fragment。
 * fragment 没有唯一的根 DOM，`<transition>` 的 leave 钩子拿不到确定的 el，
 * 会造成过渡状态异常；同时也让 fallthrough class（App.vue 传的 main-inner）
 * 无处安放。本脚本用于在提交前把这类问题拦下来。
 *
 * 注意：曾经流传的「页面内容整块消失」故障，根因**不是** fragment 或根节点形态，
 * 而是 App.vue 上 `<transition mode="out-in">` 与 `<keep-alive>` 的组合（已修复）。
 * 详见 .codebuddy/rules/顶层路由组件单根.mdc。
 *
 * 用法：
 *   npm run check:route-root                      # 体检路由表引用的全部路由组件，有违规时 exit 1
 *   npm run check:route-root -- src/views/a.vue   # 只体检指定文件（改动自查用）
 *
 * 体检范围：`src/router/index.ts` 里所有 `component: () => import('@/views/**')` 的 .vue，
 * 顶层路由与其 children 一并检查（子路由同样会被各自的 transition 渲染）。
 *
 * 纯 .mjs，不引入 tsx 等额外依赖；用到的 @vue/compiler-* 是 vue 自带的传递依赖。
 */
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parse as parseSfc } from '@vue/compiler-sfc'
import { NodeTypes } from '@vue/compiler-dom'

const __dirname = dirname(fileURLToPath(import.meta.url))
const projectRoot = resolve(__dirname, '..')
const routerFile = resolve(projectRoot, 'src/router/index.ts')

function checkTemplate(file) {
  const { descriptor, errors } = parseSfc(readFileSync(file, 'utf-8'), { filename: file })
  if (errors.length) return [{ file, reason: `SFC 解析失败：${errors[0]}` }]
  const tpl = descriptor.template
  if (!tpl) return [{ file, reason: '没有 <template> 块' }]

  const roots = tpl.ast.children.filter(
    (child) => child.type === NodeTypes.ELEMENT || child.type === NodeTypes.COMMENT
  )

  if (roots.length === 0) return [{ file, reason: '模板根层没有任何节点' }]

  if (roots.length > 1) {
    const detail = roots
      .map((n) => (n.type === NodeTypes.COMMENT ? '<!-- 注释 -->' : `<${n.tag}>`))
      .join(' + ')
    return [{ file, reason: `根层有 ${roots.length} 个节点（${detail}）→ 编译为 fragment` }]
  }

  if (roots[0].type === NodeTypes.COMMENT) {
    return [{ file, reason: '根层只有注释 → 编译成 fragment' }]
  }

  return []
}

/** 从路由表里抽出所有 `import('@/views/xxx.vue')` 目标 */
function collectRouteComponents() {
  const routerSrc = readFileSync(routerFile, 'utf-8')
  const files = new Set()
  const re = /import\(\s*['"](@\/views\/[^'"]+\.vue)['"]\s*\)/g
  let m
  while ((m = re.exec(routerSrc))) {
    files.add(resolve(projectRoot, 'src', m[1].replace(/^@\//, '')))
  }
  return [...files]
}

const cliFiles = process.argv.slice(2).filter((a) => !a.startsWith('-'))
const targets = cliFiles.length ? cliFiles.map((f) => resolve(projectRoot, f)) : collectRouteComponents()
const violations = targets.flatMap(checkTemplate)
const rel = (f) => f.replace(`${projectRoot}/`, '')

if (violations.length === 0) {
  console.log(`✅ 顶层路由组件根节点体检通过（检查 ${targets.length} 个路由组件）`)
  process.exit(0)
}

console.error(`❌ 发现 ${violations.length} 处顶层路由组件根节点违规：\n`)
for (const v of violations) {
  console.error(`  - ${rel(v.file)}\n      ${v.reason}`)
}
console.error(
  '\n修复方式：根层只保留一个节点；v-if / v-else 分支与说明注释全部写进根元素「内部」。'
)
process.exit(1)
