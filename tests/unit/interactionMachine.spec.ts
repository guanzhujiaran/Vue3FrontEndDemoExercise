import { describe, expect, it } from 'vitest'
import {
  createInteractionState,
  formatInteractionCount,
  reduce,
  stepInteractionCount,
  type InteractionState,
} from '@/utils/interaction/interactionMachine'

/**
 * 点赞 / 收藏状态机转移测试。
 *
 * 覆盖三类关键行为：
 * 1. 加载（SYNC → SYNC_OK）与加载失败静默复位；
 * 2. 乐观变更（TOGGLE → TOGGLE_OK / TOGGLE_FAIL 回滚快照）；
 * 3. 并发与非法转移被拒绝（返回同一引用，调用方据此跳过后续副作用）。
 */

/** 跑一串事件，返回最终状态 */
function run(events: Parameters<typeof reduce>[1][]): InteractionState {
  return events.reduce(reduce, createInteractionState())
}

describe('interactionMachine · 加载', () => {
  it('初始状态为 idle / 未激活 / 计数 0', () => {
    const s = createInteractionState()
    expect(s).toEqual({ phase: 'idle', active: false, count: 0, snapshot: null, error: null })
  })

  it('SYNC → SYNC_OK：以后端权威值落库', () => {
    const s = run([
      { type: 'SYNC' },
      { type: 'SYNC_OK', active: true, count: 12 },
    ])
    expect(s.phase).toBe('synced')
    expect(s.active).toBe(true)
    expect(s.count).toBe(12)
    expect(s.snapshot).toBeNull()
  })

  it('SYNC_OK 计数为负时归零', () => {
    const s = run([{ type: 'SYNC_OK', active: false, count: -3 }])
    expect(s.count).toBe(0)
  })

  it('SYNC_FAIL 静默复位：保留既有值，阶段回到 synced', () => {
    const s = run([
      { type: 'SYNC_OK', active: true, count: 5 },
      { type: 'SYNC' },
      { type: 'SYNC_FAIL' },
    ])
    expect(s.phase).toBe('synced')
    expect(s.active).toBe(true)
    expect(s.count).toBe(5)
  })

  it('TOGGLE 期间的 SYNC_FAIL 不会打断乐观变更（仍处于 mutating）', () => {
    const s = run([
      { type: 'SYNC_OK', active: false, count: 1 },
      { type: 'TOGGLE', nextActive: true },
      { type: 'SYNC_FAIL' },
    ])
    expect(s.phase).toBe('mutating')
    expect(s.active).toBe(true)
  })
})

describe('interactionMachine · 乐观变更', () => {
  it('TOGGLE 立即翻转激活态并 ±1 计数，同时落快照', () => {
    const s = run([
      { type: 'SYNC_OK', active: false, count: 7 },
      { type: 'TOGGLE', nextActive: true },
    ])
    expect(s.phase).toBe('mutating')
    expect(s.active).toBe(true)
    expect(s.count).toBe(8)
    expect(s.snapshot).toEqual({ active: false, count: 7 })
  })

  it('TOGGLE_OK 优先采用后端回包计数', () => {
    const s = run([
      { type: 'SYNC_OK', active: false, count: 7 },
      { type: 'TOGGLE', nextActive: true },
      { type: 'TOGGLE_OK', count: 9, active: true },
    ])
    expect(s.phase).toBe('synced')
    expect(s.count).toBe(9)
    expect(s.snapshot).toBeNull()
  })

  it('TOGGLE_OK 缺省计数时沿用乐观值', () => {
    const s = run([
      { type: 'SYNC_OK', active: false, count: 7 },
      { type: 'TOGGLE', nextActive: true },
      { type: 'TOGGLE_OK' },
    ])
    expect(s.count).toBe(8)
  })

  it('TOGGLE_FAIL 回滚到快照并进入 error（可继续下一次变更）', () => {
    const failed = run([
      { type: 'SYNC_OK', active: false, count: 7 },
      { type: 'TOGGLE', nextActive: true },
      { type: 'TOGGLE_FAIL', error: 'boom' },
    ])
    expect(failed.phase).toBe('error')
    expect(failed.active).toBe(false)
    expect(failed.count).toBe(7)
    expect(failed.error).toBe('boom')

    // error 阶段允许再次乐观变更（下次点击不被吞掉）
    const retry = reduce(failed, { type: 'TOGGLE', nextActive: true })
    expect(retry.phase).toBe('mutating')
    expect(retry.count).toBe(8)
  })

  it('取消点赞时计数不会变成负数', () => {
    const s = run([
      { type: 'SYNC_OK', active: true, count: 0 },
      { type: 'TOGGLE', nextActive: false },
    ])
    expect(s.count).toBe(0)
  })
})

describe('interactionMachine · 并发与非法转移', () => {
  it('mutating 期间再次 TOGGLE 被拒绝（返回同一引用）', () => {
    const mutating = run([
      { type: 'SYNC_OK', active: false, count: 1 },
      { type: 'TOGGLE', nextActive: true },
    ])
    const again = reduce(mutating, { type: 'TOGGLE', nextActive: false })
    expect(again).toBe(mutating)
  })

  it('syncing 期间 TOGGLE 被拒绝', () => {
    const syncing = reduce(createInteractionState(), { type: 'SYNC' })
    expect(reduce(syncing, { type: 'TOGGLE', nextActive: true })).toBe(syncing)
  })

  it('非 mutating 阶段的 TOGGLE_OK / TOGGLE_FAIL 被忽略', () => {
    const synced = run([{ type: 'SYNC_OK', active: false, count: 3 }])
    expect(reduce(synced, { type: 'TOGGLE_OK', count: 99 })).toBe(synced)
    expect(reduce(synced, { type: 'TOGGLE_FAIL' })).toBe(synced)
  })
})

describe('interactionMachine · APPLY / RESET', () => {
  it('APPLY 浅合并外部权威数据（弹窗回传）', () => {
    const s = run([
      { type: 'SYNC_OK', active: true, count: 10 },
      { type: 'APPLY', active: false },
    ])
    expect(s.active).toBe(false)
    expect(s.count).toBe(10)
    expect(s.phase).toBe('synced')
  })

  it('APPLY 缺省字段时保留原值', () => {
    const s = run([
      { type: 'SYNC_OK', active: true, count: 10 },
      { type: 'APPLY', count: 4 },
    ])
    expect(s.active).toBe(true)
    expect(s.count).toBe(4)
  })

  it('mutating 期间 APPLY 会清掉快照并落 synced', () => {
    const s = run([
      { type: 'SYNC_OK', active: false, count: 2 },
      { type: 'TOGGLE', nextActive: true },
      { type: 'APPLY', active: true, count: 2 },
    ])
    expect(s.phase).toBe('synced')
    expect(s.snapshot).toBeNull()
  })

  it('RESET 回到初始状态', () => {
    const s = run([
      { type: 'SYNC_OK', active: true, count: 8 },
      { type: 'RESET' },
    ])
    expect(s).toEqual(createInteractionState())
  })
})

describe('interactionMachine · 工具函数', () => {
  it('stepInteractionCount 增减且下限为 0', () => {
    expect(stepInteractionCount(3, 1)).toBe(4)
    expect(stepInteractionCount(3, -1)).toBe(2)
    expect(stepInteractionCount(0, -1)).toBe(0)
    expect(stepInteractionCount(null, 1)).toBe(1)
  })

  it('formatInteractionCount 万位缩写', () => {
    expect(formatInteractionCount(null)).toBe('0')
    expect(formatInteractionCount(345)).toBe('345')
    expect(formatInteractionCount(12345)).toBe('1.2w')
  })
})