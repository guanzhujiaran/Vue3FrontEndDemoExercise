/**
 * LLM 配置卡片 → 提交载荷的纯逻辑单测
 *
 * 规格见 docs/frontend_requirements/be_crawler_llm_config.md §4.2 / §4.3
 * 覆盖：多模型展开、去空白去重、空模型兜底、地址 / 密钥 / 限流归一
 */
import { describe, expect, it } from 'vitest'
import { buildLlmSaveItems, normalizeCardModels } from '@/utils/llmConfigPayload'

const BASE = 'https://api.example.com/v1'

describe('normalizeCardModels', () => {
  it('去掉空白项并 trim', () => {
    expect(normalizeCardModels([' deepseek-chat ', '', '   '])).toEqual(['deepseek-chat'])
  })

  it('去重且保留勾选顺序', () => {
    expect(normalizeCardModels(['b', 'a', 'b ', 'a'])).toEqual(['b', 'a'])
  })

  it('空数组原样返回', () => {
    expect(normalizeCardModels([])).toEqual([])
  })
})

describe('buildLlmSaveItems', () => {
  it('单模型 → 一条配置', () => {
    const items = buildLlmSaveItems([
      { baseUrl: BASE, models: ['deepseek-chat'], token: 'sk-1', rps: 0.5 },
    ])
    expect(items).toEqual([
      {
        base_url: BASE,
        model_name: 'deepseek-chat',
        token: 'sk-1',
        requests_per_second: '0.5',
      },
    ])
  })

  it('多模型 → 按模型展开成多条，共用地址 / 密钥 / 限流', () => {
    const items = buildLlmSaveItems([
      { baseUrl: BASE, models: ['model-a', 'model-b', 'model-c'], token: 'sk-1', rps: 2 },
    ])
    expect(items.map((i) => i.model_name)).toEqual(['model-a', 'model-b', 'model-c'])
    expect(items.every((i) => i.base_url === BASE)).toBe(true)
    expect(items.every((i) => i.token === 'sk-1')).toBe(true)
    expect(items.every((i) => i.requests_per_second === '2')).toBe(true)
  })

  it('多张卡片按顺序拼接（卡片内展开顺序稳定）', () => {
    const items = buildLlmSaveItems([
      { baseUrl: BASE, models: ['a1', 'a2'], token: '', rps: 0.5 },
      { baseUrl: 'https://other.example.com/v1', models: ['b1'], token: 'sk-2', rps: 1 },
    ])
    expect(items.map((i) => i.model_name)).toEqual(['a1', 'a2', 'b1'])
    expect(items.map((i) => i.base_url)).toEqual([
      BASE,
      BASE,
      'https://other.example.com/v1',
    ])
  })

  it('模型名为空仍提交一条（交给后端给出「缺少模型名」）', () => {
    const items = buildLlmSaveItems([{ baseUrl: BASE, models: [], token: 'sk-1', rps: 0.5 }])
    expect(items).toHaveLength(1)
    expect(items[0].model_name).toBe('')
  })

  it('地址与密钥去首尾空白，限流转字符串', () => {
    const items = buildLlmSaveItems([
      { baseUrl: ` ${BASE} `, models: [' model-a '], token: ' sk-9 ', rps: 0.25 },
    ])
    expect(items[0]).toEqual({
      base_url: BASE,
      model_name: 'model-a',
      token: 'sk-9',
      requests_per_second: '0.25',
    })
  })
})
