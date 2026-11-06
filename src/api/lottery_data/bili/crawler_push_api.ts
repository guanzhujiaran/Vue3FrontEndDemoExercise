import { client } from '@/api/bili_lottery_data/hey-api/client.gen'
import type { RootObject } from '@/models/api/base_model'
import type {
  CrawlerPushSetReq,
  CrawlerPushStateResp
} from '@/models/admin/crawler_push_model'

/**
 * 爬虫「开始 / 结束」推送开关（**经 be-message 代理**，2.7x）。
 *
 * 为什么不直连 crawler：crawler 的 `/api/v1/background_service/*` 没有任何鉴权，
 * 只靠「网关不转发」保证不对公网开放；be-message 有 `AdminUser` 鉴权 + 管理端审计，
 * 是项目里既定的代理层（同一个先例见 LLM 配置页的 `/llm/*` 代理）。
 *
 * 实际后端：be-message `/api/v1/crawler/admin/push-switch*`
 * → 转发 crawler `.../BackgroundService/CrawlerPushSwitch*`。
 *
 * 这里手写 `client` 而不是用 hey-api 生成的 Service：新接口要等 vite 的 hey-api 插件
 * 重新拉取 openapi.json 才会生成，手写可立即生效、不阻塞开发
 * （做法与 `src/api/community/sys_config_api.ts` 一致，待 SDK 重新生成后可平滑替换）。
 */
const BASE = '/api/v1/crawler/admin/push-switch'

class CrawlerPushApi {
  /** 查询：文件内容 + 环境变量原值 + 每个爬虫的生效状态与来源 + 文件落盘路径 */
  async GetState(t: number = Date.now()): Promise<RootObject<CrawlerPushStateResp>> {
    const res = await client.get({ url: BASE, query: { t } })
    return res as any
  }

  /** 修改：按 crawler_name 覆盖写入（只传改动行），立即生效、重启保留 */
  async Set(req: CrawlerPushSetReq): Promise<RootObject<CrawlerPushStateResp>> {
    const res = await client.put({
      url: BASE,
      body: req,
      headers: { 'Content-Type': 'application/json' }
    })
    return res as any
  }

  /** 删除某个爬虫的文件配置，使其回退到环境变量 */
  async Delete(crawler_name: string): Promise<RootObject<CrawlerPushStateResp>> {
    const res = await client.post({
      url: `${BASE}/delete`,
      body: { crawler_name },
      headers: { 'Content-Type': 'application/json' }
    })
    return res as any
  }
}

export default new CrawlerPushApi()
