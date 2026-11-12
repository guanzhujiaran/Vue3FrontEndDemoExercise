import { describe, expect, it } from 'vitest'
import {
  describeLlmModelState,
  llmStateView,
  llmStatsKey,
} from '@/utils/llmModelState'
import type { LlmStatsLike } from '@/utils/llmModelState'

/** 造一条统计（字段与 `CrawlerLlmStatsItem` 对齐，只保留状态展示用到的） */
function stat(overrides: Partial<LlmStatsLike> = {}): LlmStatsLike {
  return {
    base_url: 'https://api.example.com/v1',
    model_name: 'm1',
    state: 'healthy',
    disabled: false,
    disabled_reason: null,
    last_error: null,
    resume_at: null,
    ...overrides,
  }
}

describe('llmStatsKey', () => {
  it('归一化地址（去空白 / 尾斜杠）后与模型名拼接', () => {
    expect(llmStatsKey(' https://a.com/v1/ ', 'm1')).toBe('https://a.com/v1||m1')
    expect(llmStatsKey('https://a.com/v1', 'm1')).toBe(llmStatsKey('https://a.com/v1/', 'm1'))
  })

  it('同地址不同模型互不冲突', () => {
    expect(llmStatsKey('https://a.com/v1', 'm1')).not.toBe(llmStatsKey('https://a.com/v1', 'm2'))
  })
})

describe('llmStateView', () => {
  it('已知状态映射到中文文案与配色', () => {
    expect(llmStateView('healthy')).toEqual({ label: '健康', tagType: 'success' })
    expect(llmStateView('cooling')).toEqual({ label: '冷却中', tagType: 'warning' })
    expect(llmStateView('quota_wait')).toEqual({ label: '额度等待', tagType: 'warning' })
    expect(llmStateView('suspended')).toEqual({ label: '已暂停', tagType: 'danger' })
    expect(llmStateView('removed')).toEqual({ label: '已被移除', tagType: 'danger' })
  })

  it('未知状态原样回显且不误判为健康', () => {
    expect(llmStateView('some_new_state')).toEqual({ label: 'some_new_state', tagType: 'info' })
    expect(llmStateView('')).toEqual({ label: '未知', tagType: 'info' })
  })
})

describe('describeLlmModelState', () => {
  it('没有统计 = 还没进池，不显示为健康', () => {
    const view = describeLlmModelState(undefined)
    expect(view.tracked).toBe(false)
    expect(view.label).toBe('无统计')
    expect(view.tagType).toBe('info')
    expect(view.removed).toBe(false)
    expect(view.reason).toBe('')
  })

  it('健康模型不产生原因文案', () => {
    const view = describeLlmModelState(stat())
    expect(view.tracked).toBe(true)
    expect(view.removed).toBe(false)
    expect(view.reason).toBe('')
  })

  it('健康模型不展示上一次失败残留的原因', () => {
    const view = describeLlmModelState(
      stat({ state: 'healthy', disabled_reason: '上一次超时', last_error: 'TimeoutError' })
    )
    expect(view.reason).toBe('')
  })

  it('被移除的模型带出移除原因', () => {
    const view = describeLlmModelState(
      stat({ state: 'removed', disabled: true, disabled_reason: '模型已下线：model_not_found' })
    )
    expect(view.removed).toBe(true)
    expect(view.label).toBe('已被移除')
    expect(view.tagType).toBe('danger')
    expect(view.reason).toBe('模型已下线：model_not_found')
  })

  it('移除原因为空时兜底成可读文案，不留空白', () => {
    const view = describeLlmModelState(stat({ state: 'removed', disabled: true }))
    expect(view.reason).toBe('服务端未给出移除原因')
  })

  it('disabled_reason 缺失时用最近一次失败兜底', () => {
    const view = describeLlmModelState(
      stat({ state: 'removed', disabled: true, last_error: '401 Unauthorized' })
    )
    expect(view.reason).toBe('401 Unauthorized')
  })

  it('移除是终态，不展示自动恢复时间', () => {
    const view = describeLlmModelState(
      stat({ state: 'removed', disabled: true, resume_at: '1762000000' })
    )
    expect(view.resumeAt).toBeNull()
  })

  it('冷却 / 额度等待带出自动恢复时间（字符串时间戳转数字）', () => {
    const view = describeLlmModelState(
      stat({ state: 'cooling', disabled_reason: '连续失败进入冷却', resume_at: '1762000000' })
    )
    expect(view.state).toBe('cooling')
    expect(view.reason).toBe('连续失败进入冷却')
    expect(view.resumeAt).toBe(1762000000)
  })

  it('resume_at 为 null / 空串 / 非法值时为 null', () => {
    expect(describeLlmModelState(stat({ resume_at: null })).resumeAt).toBeNull()
    expect(describeLlmModelState(stat({ resume_at: '' })).resumeAt).toBeNull()
    expect(describeLlmModelState(stat({ resume_at: 'abc' })).resumeAt).toBeNull()
  })
})
