import { describe, expect, it } from 'vitest'
import {
  buildLlmSaveItems,
  groupLlmConfigs,
  normalizeBaseUrl,
  normalizeCardModels,
} from '@/utils/llmConfigPayload'
import type { LlmConfigLike } from '@/utils/llmConfigPayload'

/** 造一条读取态配置（字段与 `CrawlerLlmConfigItem` 对齐，只保留分组用到的） */
function item(
  model: string,
  baseUrl = 'https://api.example.com/v1',
  token = 'sk-1234****abcd',
  rps = '0.50'
): LlmConfigLike {
  return {
    base_url: baseUrl,
    model_name: model,
    token,
    requests_per_second: rps,
  }
}

describe('normalizeBaseUrl', () => {
  it('去空白与尾斜杠', () => {
    expect(normalizeBaseUrl('  https://a.com/v1/  ')).toBe('https://a.com/v1')
    expect(normalizeBaseUrl('https://a.com/v1')).toBe('https://a.com/v1')
  })
})

describe('normalizeCardModels', () => {
  it('去空白、去重并保留顺序', () => {
    expect(normalizeCardModels([' b ', 'a', 'b', ''])).toEqual(['b', 'a'])
  })
})

describe('groupLlmConfigs', () => {
  it('同地址 + 同密钥的多个模型合并成一张卡片', () => {
    const groups = groupLlmConfigs([item('m1'), item('m2'), item('m3')])
    expect(groups).toHaveLength(1)
    expect(groups[0].models).toEqual(['m1', 'm2', 'm3'])
    expect(groups[0].items).toHaveLength(3)
    expect(groups[0].baseUrl).toBe('https://api.example.com/v1')
  })

  it('不同密钥（哪怕同一地址）拆成两张卡片', () => {
    const groups = groupLlmConfigs([
      item('m1', 'https://a.com/v1', 'sk-aaaa****1111'),
      item('m2', 'https://a.com/v1', 'sk-bbbb****2222'),
    ])
    expect(groups).toHaveLength(2)
    expect(groups.map((g) => g.models)).toEqual([['m1'], ['m2']])
  })

  it('尾斜杠不影响分组', () => {
    const groups = groupLlmConfigs([
      item('m1', 'https://a.com/v1'),
      item('m2', 'https://a.com/v1/'),
    ])
    expect(groups).toHaveLength(1)
    expect(groups[0].models).toEqual(['m1', 'm2'])
  })

  it('限流取同组第一条，密钥回显沿用脱敏值', () => {
    const groups = groupLlmConfigs([
      item('m1', 'https://a.com/v1', 'sk-1****2', '0.80'),
      item('m2', 'https://a.com/v1', 'sk-1****2', '0.20'),
    ])
    expect(groups[0].rps).toBeCloseTo(0.8)
    expect(groups[0].tokenHint).toBe('sk-1****2')
  })

  it('模型名为空的条目仍成组，但不产生空模型名', () => {
    const groups = groupLlmConfigs([item('')])
    expect(groups).toHaveLength(1)
    expect(groups[0].models).toEqual([])
  })
})

describe('buildLlmSaveItems', () => {
  it('一张卡片勾 N 个模型就展开成 N 条，共用地址/密钥/限流', () => {
    const items = buildLlmSaveItems([
      {
        baseUrl: ' https://api.example.com/v1 ',
        models: ['m1', 'm2 '],
        token: ' sk-xxx ',
        rps: 0.5,
      },
    ])
    expect(items).toHaveLength(2)
    expect(items.map((i) => i.model_name)).toEqual(['m1', 'm2'])
    expect(items.every((i) => i.base_url === 'https://api.example.com/v1')).toBe(true)
    expect(items.every((i) => i.token === 'sk-xxx')).toBe(true)
    expect(items.every((i) => i.requests_per_second === '0.5')).toBe(true)
  })

  it('模型名为空的卡片仍提交一条空 model_name（交给后端报错，不静默丢行）', () => {
    const items = buildLlmSaveItems([
      { baseUrl: 'https://a.com', models: [], token: '', rps: 1 },
    ])
    expect(items).toHaveLength(1)
    expect(items[0].model_name).toBe('')
  })
})
