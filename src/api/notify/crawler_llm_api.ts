/**
 * 管理端 crawler LLM 配置 API 封装（be-message `/api/v1/crawler/admin/llm`）。
 *
 * 后端职责：代理 crawler 的 `/llm/*`（crawler 侧无鉴权、网关不转发），因此前端只认这里。
 * 契约要点：
 * - 数值一律字符串传输（`requests_per_second: '0.5'`），避免浮点精度与类型歧义；
 * - `token` 读取态是脱敏值（`前4****后4`），保存时**留空或原样回传**表示沿用原密钥；
 * - 保存后立即热更新，并持久化到 crawler 的 `runtime/llm_apis.json`，
 *   **crawler 重启后仍然生效**（事实来源：本地文件 > `.env`，不回写 `.env`）；
 * - 状态机的「不可恢复自动摘除」只改运行时内存、不落盘，重启后该实例会恢复；
 * - 「测试」只发一次最小请求验证连通性，不参与健康状态机 / 统计，也不保存配置。
 */
import { CrawlerLlmAdminService } from '@/api/community/hey-api'
import type {
  CrawlerLlmConfigResp,
  CrawlerLlmModelsReq,
  CrawlerLlmModelsResp,
  CrawlerLlmSaveItem,
  CrawlerLlmTestReq,
  CrawlerLlmTestResp,
} from '@/api/community/hey-api'
import { request, requestOk } from '@/api/http'

export type {
  CrawlerLlmConfigItem,
  CrawlerLlmConfigResp,
  CrawlerLlmModelsReq,
  CrawlerLlmModelsResp,
  CrawlerLlmSaveItem,
  CrawlerLlmStatsItem,
  CrawlerLlmTestReq,
  CrawlerLlmTestResp,
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
 * 整体覆盖保存（顺序即索引，保存后即时热更新并落盘）。
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
      successMessage: 'LLM 配置已保存并持久化，crawler 重启后仍生效',
    }
  )
}

/**
 * 测试单条实例是否可用（crawler 侧发一次 `max_tokens=1` 的最小请求，不重试）。
 *
 * `ok=false` 也是**正常响应**（页面就地显示原因），只有 crawler 不可达才返回 `null`。
 */
export async function testCrawlerLlmConfig(
  payload: CrawlerLlmTestReq
): Promise<CrawlerLlmTestResp | null> {
  return request<CrawlerLlmTestResp | null>(
    () =>
      CrawlerLlmAdminService.testLlmConfigApiV1CrawlerAdminLlmConfigTestPost({
        body: payload,
      }),
    null,
    { errorMessage: '测试请求失败（crawler 不可达？）' }
  )
}

/**
 * 获取某条实例可选的模型列表（crawler 拉上游 `GET {base_url}/models`，不产生推理调用）。
 *
 * - `base_url + token` 填好即可拉取，**不要求先填模型名**（主要用法就是先拉列表再选）；
 * - `token` 留空 / 传脱敏值 → 按 `index` 沿用原密钥，新增行必须传明文；
 * - `ok=false` 也是**正常响应**（页面就地显示原因），只有 crawler 不可达才返回 `null`。
 */
export async function fetchCrawlerLlmModels(
  payload: CrawlerLlmModelsReq
): Promise<CrawlerLlmModelsResp | null> {
  return request<CrawlerLlmModelsResp | null>(
    () =>
      CrawlerLlmAdminService.listLlmModelsApiV1CrawlerAdminLlmModelsPost({
        body: payload,
      }),
    null,
    { errorMessage: '获取模型列表失败（crawler 不可达？）' }
  )
}

/**
 * 撤销人工保存：删除 crawler 的 `runtime/llm_apis.json`，热切回 `.env` 的 `llm_apis`。
 *
 * 破坏性操作：会丢弃管理页保存过的全部人工修改，调用方必须二次确认。
 *
 * @returns 切换后的配置 + 统计；失败返回 `null`（提示由统一请求层弹出）
 */
export async function resetCrawlerLlmConfig(): Promise<CrawlerLlmConfigResp | null> {
  return request<CrawlerLlmConfigResp | null>(
    () => CrawlerLlmAdminService.resetLlmConfigApiV1CrawlerAdminLlmConfigDelete(),
    null,
    {
      errorMessage: '撤销人工保存失败',
      showSuccessToast: true,
      successMessage: '已撤销人工保存，crawler 已恢复为 .env 配置',
    }
  )
}
