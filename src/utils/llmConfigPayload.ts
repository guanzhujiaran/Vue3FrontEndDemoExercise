/**
 * 管理端 LLM 配置：卡片 → 提交载荷的纯逻辑（组件与单测共用）。
 *
 * 规格见 `docs/frontend_requirements/be_crawler_llm_config.md` §4.2 / §4.3：
 * 一张卡片可以勾选多个模型，保存时**按模型展开成多条实例配置**
 * （共用该卡片的地址 / 密钥 / 限流；crawler 侧会按 `base_url` 沿用同源密钥）。
 */
import type { CrawlerLlmSaveItem } from '@/api/notify/crawler_llm_api'

/** 一张卡片的可提交字段（与组件的表单行解耦，便于单测） */
export interface LlmConfigCard {
  /** OpenAI 兼容接口地址 */
  baseUrl: string
  /** 该卡片勾选 / 手写的模型名 */
  models: string[]
  /** 明文密钥；空串 / 脱敏值 = 沿用原密钥 */
  token: string
  /** 限流：每秒请求数 */
  rps: number
}

/** 卡片勾选的模型：去空白 + 去重（保留勾选顺序），空值丢弃 */
export function normalizeCardModels(models: string[]): string[] {
  const seen = new Set<string>()
  for (const raw of models) {
    const model = raw.trim()
    if (model) seen.add(model)
  }
  return [...seen]
}

/**
 * 卡片列表 → 提交载荷：一张卡片勾了 N 个模型就展开成 N 条。
 *
 * 模型名为空的卡片仍提交一条（`model_name: ''`）：让后端的「缺少模型名」校验
 * 给出明确文案，而不是前端静默丢行导致保存后配置莫名少一条。
 */
export function buildLlmSaveItems(cards: LlmConfigCard[]): CrawlerLlmSaveItem[] {
  return cards.flatMap((card) => {
    const models = normalizeCardModels(card.models)
    const targets = models.length > 0 ? models : ['']
    return targets.map((model) => ({
      base_url: card.baseUrl.trim(),
      model_name: model,
      token: card.token.trim(),
      requests_per_second: String(card.rps),
    }))
  })
}
