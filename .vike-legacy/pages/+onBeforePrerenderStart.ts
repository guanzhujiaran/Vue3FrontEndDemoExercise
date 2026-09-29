/**
 * 构建期告诉 Vike「要预渲染哪些 URL」。
 *
 * 本应用是 catch-all 路由（`/*`）+ vue-router，Vike 无法从文件系统推断 URL 列表，
 * 必须由本 hook 显式给出。清单与 `vite-plugin-sitemap` 共用 `SEO_INDEXABLE_ROUTES`，
 * 保证「预渲染出来的页面」与「提交给搜索引擎的页面」始终一致。
 *
 * 动态详情页（`/app/lot-data/card-detail?id=`、`?dynId=`、`/app/moment-detail/:id`、
 * `/app/space/:mid`）内容由接口生成且数量庞大，不在此列（后续如需覆盖，
 * 可在这里拉取 ID 列表后展开 URL）。
 */
import { SEO_INDEXABLE_ROUTES } from '@/config/seo_routes'

export async function onBeforePrerenderStart() {
  return [...SEO_INDEXABLE_ROUTES]
}
