import { describe, expect, it } from 'vitest'
import {
  runResultText,
  runStatusTagType,
  runStatusText,
} from '@/utils/rpa/runDisplay'

/**
 * 工作流运行结果展示口径：
 * 不再给「成功/失败」结论，有资源按「成功循环 N 轮」，无资源按「成功 N 步」。
 */
describe('runResultText', () => {
  it('有资源记录时按资源成功数报成功循环轮次', () => {
    expect(
      runResultText({ resource_total: 77, resource_success: 62, success_count: 18, total_steps: 18 })
    ).toBe('成功循环 62 轮')
  })

  it('无资源记录时按成功步骤数报步骤', () => {
    expect(runResultText({ success_count: 4, total_steps: 4 })).toBe('成功 4 步')
  })

  it('步骤未跑满时带上总数', () => {
    expect(runResultText({ success_count: 3, total_steps: 5 })).toBe('成功 3/5 步')
  })

  it('没有计数快照时显示 -，不伪装成成功 0 步', () => {
    expect(runResultText({})).toBe('-')
    expect(runResultText({ success_count: 0, total_steps: 0 })).toBe('-')
  })
})

describe('runStatusText', () => {
  it('过程状态照旧展示状态词', () => {
    expect(runStatusText({ status: 'running' })).toBe('运行中')
    expect(runStatusText({ status: 'queued' })).toBe('排队中')
    expect(runStatusText({ status: 'interrupted' })).toBe('已中断')
    expect(runStatusText({ status: 'cancelled' })).toBe('已停止')
  })

  it('终态展示可数结果，success / failed 一视同仁', () => {
    const source = { success_count: 2, total_steps: 2, resource_total: 0 }
    expect(runStatusText({ status: 'success', ...source })).toBe('成功 2 步')
    expect(runStatusText({ status: 'failed', ...source })).toBe('成功 2 步')
  })
})

describe('runStatusTagType', () => {
  it('只有进行中/排队用 warning，其余一律 info（不表达成败）', () => {
    expect(runStatusTagType('running')).toBe('warning')
    expect(runStatusTagType('queued')).toBe('warning')
    expect(runStatusTagType('success')).toBe('info')
    expect(runStatusTagType('failed')).toBe('info')
    expect(runStatusTagType(null)).toBe('info')
  })
})
