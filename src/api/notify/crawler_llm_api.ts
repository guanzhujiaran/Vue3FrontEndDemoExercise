/**
 * 管理端 crawler LLM 配置 API 封装（be-message `/api/v1/crawler/admin/llm`）。
 *
 * 后端职责：代理 crawler 的 `/llm/*`（crawler 侧无鉴权、网关不转发），因此前端只认这里。
 * 契约要点：
 * - 数值一律字符串传输（`requests_per_second: '0.5'`），避免浮点精度与类型歧义；
 * - `token` 读取态是脱敏值（`前4****后4`），保存时**留空或原样回传**表示沿用原密钥；
 * - 配置只在 crawler 进程内存生效，**重启回退 `.env` 的 `llm_apis`**。
 */
import { CrawlerLlmAdminService } from '@/api/community/hey-api'
import type { CrawlerLlmConfigResp, CrawlerLlmSaveItem } from '@/api/community/hey-api'
import { request, requestOk } from '@/api/http'

export type {
  CrawlerLlmConfigItem,
  CrawlerLlmConfigResp,
  CrawlerLlmSaveItem,
  CrawlerLlmStatsItem,
} from '@/api/community/hey-api'

/**
 * 读取 crawler LLM 实例配置 + 运行统计。
 *
 * 失败返回 `null`（错误提示由统一请求层弹出），调用方据此保留原表单、不清空页面。
 */
export async function fetchCrawlerLlmConfig(): Promise<CrawlerLlmConfigResp | null> {
  return request<CrawlerLlmConfigResp | null>(
    () => CrawlerLlmAdminService.getLlmConfigApiV1CrawlerAdminLlmConfigGet(),
    null,
    { errorMessage: '读取 crawler LLM 配置失败' }
  )
}

/**
 * 整体覆盖保存（顺序即索引，保存后即时热更新）。
 *
 * @param items 完整实例列表；`token` 留空 = 沿用该索引上的原密钥
 * @returns 是否保存成功（失败提示由统一请求层弹出）
 */
export async function saveCrawlerLlmConfig(
  items: CrawlerLlmSaveItem[]
): Promise<boolean> {
  return requestOk(
    () =>
      CrawlerLlmAdminService.saveLlmConfigApiV1CrawlerAdminLlmConfigPut({
        body: { items },
      }),
    {
      errorMessage: '保存 crawler LLM 配置失败',
      showSuccessToast: true,
      successMessage: 'LLM 配置已保存，已即时生效',
    }
  )
}
