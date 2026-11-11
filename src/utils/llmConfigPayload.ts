/**
 * 管理端 LLM 配置：卡片 ↔ 提交载荷的纯逻辑（组件与单测共用）。
 *
 * 规格见 `docs/frontend_requirements/be_crawler_llm_config.md` §4.2 / §4.3：
 * - **读取**：同一个 `base_url` + 同一个密钥下的多个模型，合并成**一张卡片**
 *   （crawler 侧一条配置仍然只对应一个模型，槽位 / 冷却 / 摘除都按模型算，
 *   这里只做展示与编辑层级的合并，不改变存储结构）；
 * - **保存**：一张卡片勾了 N 个模型就展开成 N 条实例配置，共用该卡片的
 *   地址 / 密钥 / 限流（crawler 侧会按 `base_url` 沿用同源密钥）。
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

/** 读取态的一条实例配置（只取分组需要的字段，兼容 hey-api 生成的类型） */
export interface LlmConfigLike {
  base_url: string
  model_name: string
  /** 脱敏密钥（`前4****后4`）；同源实例的脱敏值一定相同，可直接当分组键 */
  token: string
  requests_per_second: string | number
}

/** 同源（同地址 + 同密钥）的一组配置 = 管理页的一张卡片 */
export interface LlmConfigGroup<T extends LlmConfigLike> {
  /** 分组键：归一化地址 + 脱敏密钥，仅前端使用（不要作为 `:key` 之外的用途） */
  key: string
  /** 归一化后的接口地址（去尾斜杠） */
  baseUrl: string
  /** 服务端回显的脱敏密钥（只做 placeholder） */
  tokenHint: string
  /** 限流：同组取第一条的值（保存时会统一回写到组内每条） */
  rps: number
  /** 组内原始条目，保持服务端顺序（每条的 `index` 用于测试 / 拉模型列表） */
  items: T[]
  /** 组内模型名（去重，保持出现顺序） */
  models: string[]
}

/** 与服务端 `pool.normalize_base_url` 同口径：去空白 + 去尾斜杠 */
export function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.trim().replace(/\/+$/, '')
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
 * 读取态列表 → 卡片分组：同 `base_url` + 同密钥的多个模型合并成一组。
 *
 * 分组键用**脱敏密钥**而不是明文：管理页永远拿不到明文，但同源实例的脱敏值
 * 一定相同（`前4****后4`），既能分开不同密钥，也不需要把明文带到前端。
 * `base_url` 两侧都做归一化（crawler 已归一化，这里再兜一次），
 * 避免 `…/v1` 与 `…/v1/` 把同一张卡片拆成两张。
 */
export function groupLlmConfigs<T extends LlmConfigLike>(
  items: T[]
): LlmConfigGroup<T>[] {
  const groups = new Map<string, LlmConfigGroup<T>>()
  for (const item of items) {
    const baseUrl = normalizeBaseUrl(item.base_url)
    const key = `${baseUrl}||${item.token}`
    const existing = groups.get(key)
    if (existing) {
      existing.items.push(item)
      if (item.model_name && !existing.models.includes(item.model_name)) {
        existing.models.push(item.model_name)
      }
      continue
    }
    groups.set(key, {
      key,
      baseUrl,
      tokenHint: item.token,
      rps: Number(item.requests_per_second) || 0.5,
      items: [item],
      models: item.model_name ? [item.model_name] : [],
    })
  }
  return [...groups.values()]
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
