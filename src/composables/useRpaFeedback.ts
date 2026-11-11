import { useRoute, useRouter } from 'vue-router'
import { RouteName } from '@/models/router'

/**
 * RPA 反馈入口跳转
 *
 * Stream 控制台页头的反馈按钮使用该逻辑（其余页面走侧边导航的「反馈问题」项，
 * 由路由直接进入）：自动带上「出错的页面 URL」与「当前浏览器 id」预填，
 * 省得用户手抄上下文。站内 SPA 跳转，不产生文档请求，无需 referrer 处理。
 */
export function useRpaFeedback() {
  const route = useRoute()
  const router = useRouter()

  function goFeedback() {
    const browserId = route.params.browserId
    void router.push({
      name: RouteName.RPA_BROWSER_FEEDBACK,
      query: {
        page_url: typeof window !== 'undefined' ? window.location.href : undefined,
        ...(browserId ? { browser_id: String(browserId) } : {})
      }
    })
  }

  return { goFeedback }
}
