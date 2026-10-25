/**
 * 工作流「输入变量」展示/校验纯逻辑单测
 *
 * 规格见 docs/frontend_requirements/工作流输入变量展示.md
 */
import { describe, expect, it } from 'vitest'
import {
  buildVariablesPatch,
  formatJsonText,
  isJsonVarType,
  isSensitiveVarName,
  parseVarInputText,
  shouldUseTextarea,
  toVarInputText,
  validateVarValue,
  varTypeLabel,
  type WorkflowVarField,
} from '@/utils/workflowVarFields'

const field = (patch: Partial<WorkflowVarField> = {}): WorkflowVarField => ({
  name: 'llm_model',
  type: 'string',
  required: false,
  description: '',
  defaultValue: undefined,
  ...patch,
})

describe('varTypeLabel', () => {
  it('常见类型转中文', () => {
    expect(varTypeLabel('string')).toBe('文本')
    expect(varTypeLabel('number')).toBe('数字')
    expect(varTypeLabel('integer')).toBe('数字')
    expect(varTypeLabel('boolean')).toBe('布尔')
    expect(varTypeLabel('array')).toBe('数组')
    expect(varTypeLabel('object')).toBe('对象')
  })

  it('未知类型原样返回', () => {
    expect(varTypeLabel('weird')).toBe('weird')
  })
})

describe('isJsonVarType / isSensitiveVarName', () => {
  it('数组与对象走 JSON 编辑', () => {
    expect(isJsonVarType('array')).toBe(true)
    expect(isJsonVarType('object')).toBe(true)
    expect(isJsonVarType('string')).toBe(false)
  })

  it('敏感名识别', () => {
    expect(isSensitiveVarName('llm_api_key')).toBe(true)
    expect(isSensitiveVarName('APIKEY')).toBe(true)
    expect(isSensitiveVarName('db_password')).toBe(true)
    expect(isSensitiveVarName('client_secret')).toBe(true)
    expect(isSensitiveVarName('auth_token')).toBe(true)
    expect(isSensitiveVarName('llm_model')).toBe(false)
  })
})

describe('shouldUseTextarea', () => {
  it('JSON 类型必多行', () => {
    expect(shouldUseTextarea(field({ type: 'array' }))).toBe(true)
    expect(shouldUseTextarea(field({ type: 'object' }))).toBe(true)
  })

  it('短文本单行', () => {
    expect(shouldUseTextarea(field({ defaultValue: 'openrouter/free' }))).toBe(false)
  })

  it('默认值含换行或超长 → 多行', () => {
    expect(shouldUseTextarea(field({ defaultValue: '你是一个评论助手\n请输出短评' }))).toBe(true)
    expect(shouldUseTextarea(field({ defaultValue: 'x'.repeat(61) }))).toBe(true)
  })

  it('当前值超长也会切多行', () => {
    expect(shouldUseTextarea(field(), 'y'.repeat(80))).toBe(true)
  })

  it('非文本类型不因长度切多行', () => {
    expect(shouldUseTextarea(field({ type: 'number' }), '1234567890')).toBe(false)
  })
})

describe('toVarInputText / parseVarInputText', () => {
  it('布尔转字符串', () => {
    expect(toVarInputText(true, 'boolean')).toBe('true')
    expect(toVarInputText(false, 'boolean')).toBe('false')
  })

  it('JSON 类型格式化输出', () => {
    expect(toVarInputText([{ model: 'a' }], 'array')).toBe(
      '[\n  {\n    "model": "a"\n  }\n]',
    )
  })

  it('往返一致', () => {
    const raw = toVarInputText([{ model: 'a', n: 1 }], 'array')
    expect(parseVarInputText(raw, 'array')).toEqual([{ model: 'a', n: 1 }])
  })

  it('空文本解析为 undefined（不发该键）', () => {
    expect(parseVarInputText('   ', 'string')).toBeUndefined()
  })

  it('数字解析', () => {
    expect(parseVarInputText('42', 'number')).toBe(42)
  })
})

describe('validateVarValue', () => {
  it('必填为空报错', () => {
    expect(validateVarValue(field({ required: true }), '  ')).toBe('必填变量未填写')
  })

  it('非必填为空通过', () => {
    expect(validateVarValue(field(), '')).toBe('')
  })

  it('数字类型校验', () => {
    expect(validateVarValue(field({ type: 'number' }), 'abc')).toBe('需要数字')
    expect(validateVarValue(field({ type: 'number' }), '12')).toBe('')
  })

  it('布尔类型校验', () => {
    expect(validateVarValue(field({ type: 'boolean' }), 'yes')).toBe('需要 true / false')
    expect(validateVarValue(field({ type: 'boolean' }), 'false')).toBe('')
  })

  it('JSON 非法', () => {
    expect(validateVarValue(field({ type: 'array' }), '[1,')).toBe('不是合法 JSON')
  })

  it('数组/对象类型不匹配', () => {
    expect(validateVarValue(field({ type: 'array' }), '{"a":1}')).toBe('需要 JSON 数组')
    expect(validateVarValue(field({ type: 'object' }), '[1]')).toBe('需要 JSON 对象')
  })

  it('合法 JSON 通过', () => {
    expect(validateVarValue(field({ type: 'array' }), '[]')).toBe('')
    expect(validateVarValue(field({ type: 'object' }), '{}')).toBe('')
  })
})

describe('formatJsonText', () => {
  it('合法 JSON 重排', () => {
    expect(formatJsonText('{"b":2,"a":1}')).toBe('{\n  "b": 2,\n  "a": 1\n}')
  })

  it('非法 JSON 返回 null', () => {
    expect(formatJsonText('[1,')).toBeNull()
  })
})

describe('buildVariablesPatch', () => {
  const base = (patch: Partial<WorkflowVarField> = {}): WorkflowVarField => ({
    name: 'llm_model',
    type: 'string',
    required: false,
    description: '',
    defaultValue: undefined,
    ...patch,
  })

  it('无字段时返回 undefined（契约未加载，不能清空）', () => {
    expect(buildVariablesPatch({ fields: [], values: {}, initial: {} })).toBeUndefined()
  })

  it('只提交发生变化的键', () => {
    const fields = [base({ name: 'a' }), base({ name: 'b' })]
    const patch = buildVariablesPatch({
      fields,
      values: { a: 'x', b: '2' },
      initial: { a: 'x', b: '1' },
    })
    expect(patch).toEqual({ b: '2' })
  })

  it('清空已存在的键 → null（删除语义）', () => {
    const patch = buildVariablesPatch({
      fields: [base({ name: 'a' })],
      values: { a: '   ' },
      initial: { a: 'x' },
    })
    expect(patch).toEqual({ a: null })
  })

  it('原本就为空、现在仍为空 → 不提交', () => {
    expect(
      buildVariablesPatch({ fields: [base({ name: 'a' })], values: { a: '' }, initial: { a: '' } }),
    ).toBeUndefined()
  })

  it('JSON 类型按类型解析后提交', () => {
    const patch = buildVariablesPatch({
      fields: [base({ name: 'pool', type: 'array' })],
      values: { pool: '[{"model":"b"}]' },
      initial: { pool: '[]' },
    })
    expect(patch).toEqual({ pool: [{ model: 'b' }] })
  })

  it('非法 JSON 被跳过（由校验拦保存）', () => {
    expect(
      buildVariablesPatch({
        fields: [base({ name: 'pool', type: 'array' })],
        values: { pool: '[1,' },
        initial: { pool: '[]' },
      }),
    ).toBeUndefined()
  })

  it('数字类型转 number', () => {
    const patch = buildVariablesPatch({
      fields: [base({ name: 'n', type: 'number' })],
      values: { n: '3' },
      initial: { n: '1' },
    })
    expect(patch).toEqual({ n: 3 })
  })

  it('无差异返回 undefined', () => {
    expect(
      buildVariablesPatch({
        fields: [base({ name: 'a' })],
        values: { a: 'same' },
        initial: { a: 'same' },
      }),
    ).toBeUndefined()
  })
})
