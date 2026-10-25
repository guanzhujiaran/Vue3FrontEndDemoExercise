/**
 * 动作参数「对象数组」列表元素纯逻辑单测
 *
 * 规格见 docs/frontend_requirements/动作参数数组编辑器.md
 * 覆盖：排序、默认项构造、字段即时校验（必填 / uri / maxLength）
 */
import { describe, expect, it } from 'vitest'
import {
  buildDefaultItem,
  isBlankValue,
  moveItem,
  validateFieldValue,
} from '@/utils/actionParamsArray'

describe('moveItem', () => {
  const items = [{ id: 1 }, { id: 2 }, { id: 3 }]

  it('上移一位', () => {
    expect(moveItem(items, 1, -1).map(i => i.id)).toEqual([2, 1, 3])
  })

  it('下移一位', () => {
    expect(moveItem(items, 1, 1).map(i => i.id)).toEqual([1, 3, 2])
  })

  it('首项上移越界时返回副本', () => {
    const result = moveItem(items, 0, -1)
    expect(result.map(i => i.id)).toEqual([1, 2, 3])
    expect(result).not.toBe(items)
  })

  it('末项下移越界时返回副本', () => {
    expect(moveItem(items, 2, 1).map(i => i.id)).toEqual([1, 2, 3])
  })

  it('不修改入参', () => {
    const source = [{ id: 1 }, { id: 2 }]
    moveItem(source, 0, 1)
    expect(source.map(i => i.id)).toEqual([1, 2])
  })

  it('非法下标不抛错', () => {
    expect(moveItem(items, -1, 1).map(i => i.id)).toEqual([1, 2, 3])
    expect(moveItem(items, 9, -1).map(i => i.id)).toEqual([1, 2, 3])
  })

  it('单项数组上下移都无变化', () => {
    expect(moveItem([{ id: 1 }], 0, -1)).toEqual([{ id: 1 }])
    expect(moveItem([{ id: 1 }], 0, 1)).toEqual([{ id: 1 }])
  })
})

describe('buildDefaultItem', () => {
  it('按类型给初值', () => {
    const item = buildDefaultItem({
      model: { type: 'string' },
      limit: { type: 'number' },
      enabled: { type: 'boolean' },
      mode: { type: 'string', enum: ['a', 'b'] },
    })
    expect(item).toEqual({ model: '', limit: null, enabled: false, mode: null })
  })

  it('优先使用 default', () => {
    const item = buildDefaultItem({
      model: { type: 'string', default: 'gpt-4o-mini' },
      limit: { type: 'number', default: 3 },
    })
    expect(item).toEqual({ model: 'gpt-4o-mini', limit: 3 })
  })

  it('空 schema 返回空对象', () => {
    expect(buildDefaultItem({})).toEqual({})
  })
})

describe('isBlankValue', () => {
  it('null / undefined / 空白字符串都算空', () => {
    expect(isBlankValue(null)).toBe(true)
    expect(isBlankValue(undefined)).toBe(true)
    expect(isBlankValue('   ')).toBe(true)
    expect(isBlankValue('')).toBe(true)
  })

  it('0 / false 不算空', () => {
    expect(isBlankValue(0)).toBe(false)
    expect(isBlankValue(false)).toBe(false)
  })
})

describe('validateFieldValue', () => {
  it('必填为空报错', () => {
    expect(validateFieldValue({ value: '  ', required: true })).toBe('该字段必填')
  })

  it('非必填为空不报错', () => {
    expect(validateFieldValue({ value: '', required: false })).toBe('')
  })

  it('有值但非必填通过', () => {
    expect(validateFieldValue({ value: 'x' })).toBe('')
  })

  it('uri 格式校验', () => {
    const format = 'uri'
    expect(validateFieldValue({ value: 'https://api.deepseek.com/v1', format })).toBe('')
    expect(validateFieldValue({ value: 'http://x.y', format })).toBe('')
    expect(validateFieldValue({ value: 'api.deepseek.com', format })).toBe(
      '请填写 http(s) 开头的地址',
    )
    expect(validateFieldValue({ value: 'ftp://x.y', format })).toBe(
      '请填写 http(s) 开头的地址',
    )
  })

  it('maxLength 超限报错', () => {
    expect(validateFieldValue({ value: 'abc', maxLength: 3 })).toBe('')
    expect(validateFieldValue({ value: 'abcd', maxLength: 3 })).toBe('最多 3 个字符')
  })

  it('必填优先于格式校验', () => {
    expect(validateFieldValue({ value: '', required: true, format: 'uri' })).toBe(
      '该字段必填',
    )
  })
})
