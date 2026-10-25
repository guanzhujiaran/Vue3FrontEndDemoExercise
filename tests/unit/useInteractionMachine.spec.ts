import { describe, expect, it } from 'vitest'
import { useInteractionMachine } from '@/composables/useInteractionMachine'

/**
 * 状态机 composable 测试：验证对外命令序列的语义
 * （组件正是通过这组命令驱动 UI 响应式变化）。
 */
describe('useInteractionMachine', () => {
  it('挂载后处于初始态，计数 0 / 未激活 / 非 pending', () => {
    const m = useInteractionMachine()
    expect(m.active.value).toBe(false)
    expect(m.count.value).toBe(0)
    expect(m.pending.value).toBe(false)
    expect(m.failed.value).toBe(false)
  })

  it('sync 灌入后端权威值', () => {
    const m = useInteractionMachine()
    m.sync(true, 8)
    expect(m.active.value).toBe(true)
    expect(m.count.value).toBe(8)
    expect(m.state.phase).toBe('synced')
  })

  it('syncStart 期间 pending=true，syncFail 后复位且保留旧值', () => {
    const m = useInteractionMachine()
    m.sync(false, 3)
    m.syncStart()
    expect(m.pending.value).toBe(true)
    m.syncFail()
    expect(m.pending.value).toBe(false)
    expect(m.count.value).toBe(3)
  })

  it('toggle 默认取反当前值并 ±1 计数', () => {
    const m = useInteractionMachine()
    m.sync(false, 3)
    expect(m.toggle()).toBe(true)
    expect(m.active.value).toBe(true)
    expect(m.count.value).toBe(4)
    // 变更在途期间拒绝并发
    expect(m.toggle()).toBe(false)
    expect(m.count.value).toBe(4)
  })

  it('toggle 可显式指定目标态', () => {
    const m = useInteractionMachine()
    m.sync(true, 5)
    expect(m.toggle(false)).toBe(true)
    expect(m.active.value).toBe(false)
    expect(m.count.value).toBe(4)
  })

  it('toggleOk 采用后端回包计数', () => {
    const m = useInteractionMachine()
    m.sync(false, 3)
    m.toggle(true)
    m.toggleOk(9)
    expect(m.count.value).toBe(9)
    expect(m.pending.value).toBe(false)
  })

  it('toggleOk 在非变更阶段为无意义回包，状态不变', () => {
    const m = useInteractionMachine()
    m.sync(false, 3)
    m.toggleOk(99)
    expect(m.count.value).toBe(3)
  })

  it('toggleFail 回滚到快照并置 failed', () => {
    const m = useInteractionMachine()
    m.sync(false, 3)
    m.toggle(true)
    m.toggleFail('boom')
    expect(m.active.value).toBe(false)
    expect(m.count.value).toBe(3)
    expect(m.failed.value).toBe(true)
    expect(m.state.error).toBe('boom')
  })

  it('apply 写入外部权威数据（收藏夹弹窗回传）', () => {
    const m = useInteractionMachine()
    m.sync(true, 10)
    m.apply(false, 9)
    expect(m.active.value).toBe(false)
    expect(m.count.value).toBe(9)
    expect(m.failed.value).toBe(false)
  })

  it('reset 回到初始态', () => {
    const m = useInteractionMachine()
    m.sync(true, 10)
    m.reset()
    expect(m.active.value).toBe(false)
    expect(m.count.value).toBe(0)
    expect(m.state.phase).toBe('idle')
  })

  it('支持初始值注入（列表复用场景）', () => {
    const m = useInteractionMachine({ active: true, count: 42 })
    expect(m.active.value).toBe(true)
    expect(m.count.value).toBe(42)
  })
})