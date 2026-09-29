/**
 * 页面级 SEO 覆盖（详情页动态标题 / 描述 / 分享图 / 结构化数据）。
 *
 * 使用场景：`useRouteSeo` 只能拿到路由表里的静态文案，而动态详情页
 * （抽奖卡片详情、第三方抽奖动态详情、动态详情、用户空间）的标题与描述
 * 取决于接口返回的内容——这些页面在拿到数据后调用 `usePageSeo()` 覆盖，
 * 即可让分享卡片与搜索结果展示真实内容。
 *
 * 实现要点：
 * - 存的是 **getter 而不是快照**：接口数据异步返回后，`useRouteSeo` 的 computed
 *   重新求值时直接调用 getter，从而自动追踪到页面里的 ref（快照会导致首屏 null
 *   被永久固化）；
 * - 生命周期：顶层 `<keep-alive>` 会缓存页面组件，`onUnmounted` 不一定触发，
 *   故同时监听 `onDeactivated`，保证离开页面后覆盖被清除（否则会串到下一个页面）。
 */
import { onActivated, onDeactivated, onUnmounted, ref, type Ref } from 'vue'
import type { PageSeo } from '@/config/seo.ts'

/** 当前页面的 SEO 覆盖 getter（模块级单例：同一时刻只有一个活跃页面生效） */
const pageSeoGetter: Ref<(() => PageSeo | null) | null> = ref(null)

/** 供 `useRouteSeo` 读取当前页面覆盖（在 computed 内调用以获得响应式） */
export function getPageSeo(): PageSeo | null {
  const getter = pageSeoGetter.value
  if (!getter) return null
  try {
    return getter()
  } catch {
    // 页面数据未就绪时 getter 可能抛错：SEO 是弱依赖，不能因此打断渲染
    return null
  }
}

/**
 * 在当前页面覆盖 SEO 字段。
 *
 * @param seo 覆盖内容，传 getter（推荐，数据异步返回后自动生效）或 ref。
 */
export function usePageSeo(seo: Ref<PageSeo | null> | (() => PageSeo | null)) {
  const getter = typeof seo === 'function' ? seo : () => seo.value
  const apply = () => {
    pageSeoGetter.value = getter
  }
  const clear = () => {
    // 只清理自己写入的覆盖，避免误清下一个页面刚写入的值
    if (pageSeoGetter.value === getter) pageSeoGetter.value = null
  }

  apply()
  onActivated(apply)
  onDeactivated(clear)
  onUnmounted(clear)
}
