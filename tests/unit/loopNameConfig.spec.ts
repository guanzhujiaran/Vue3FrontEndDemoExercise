import { describe, expect, it } from 'vitest'
import { stepsToDroppedItems } from '@/utils/rpa/jsonImport'
import { stepsToFlow } from '@/utils/rpa/actionFlow'

/**
 * 循环名称（loop name）配置测试。
 *
 * 背景：批量工作流里循环没有名称，运行消息 / 进度条只能显示 `循环「loop」`。
 * 新增 `LoopConfig.name`（支持 {{变量}} 模板，后端逐轮解析），这里固化：
 *   1. 后端 steps 还原为 DroppedItem 时，`params.name` 不丢（保存 ↔ 还原互为逆运算）；
 *   2. 画布节点徽标：设置了名称优先展示名称，否则维持来源摘要。
 * 见 `docs/frontend_requirements/loop_name_and_run_message_detail.md`。
 */

/** 构造一个带循环名称的 loop 步骤（后端 steps 形态） */
function loopStep(params: Record<string, unknown>) {
  return [
    {
      action_id: 'loop',
      action_type: 'loop',
      params: { loop_source: 'variable', loop_items_var: 'dyn_list', ...params },
    },
  ]
}

describe('stepsToDroppedItems：循环名称还原', () => {
  it('还原 params.name 到 loopConfig.name', () => {
    const [item] = stepsToDroppedItems(loopStep({ name: '处理 {{loop_item.title}}' }))
    expect(item.loopConfig?.name).toBe('处理 {{loop_item.title}}')
  })

  it('name 不残留在 formData 里（避免被当成普通参数再次序列化）', () => {
    const [item] = stepsToDroppedItems(loopStep({ name: '遍历动态列表' }))
    expect(item.formData).not.toHaveProperty('name')
  })

  it('没有 name 时为空串（默认值）', () => {
    const [item] = stepsToDroppedItems(loopStep({}))
    expect(item.loopConfig?.name).toBe('')
  })
})

describe('stepsToFlow：循环节点徽标', () => {
  it('设置了名称 → 徽标展示名称', () => {
    const graph = stepsToFlow(loopStep({ name: '遍历动态列表' }))
    const loopNode = graph.nodes.find(n => n.data?.kind === 'loop')
    expect(loopNode?.data?.badge).toBe('遍历动态列表')
  })

  it('没有名称 → 徽标维持来源摘要', () => {
    const graph = stepsToFlow(loopStep({}))
    const loopNode = graph.nodes.find(n => n.data?.kind === 'loop')
    expect(loopNode?.data?.badge).toBe('遍历 dyn_list')
  })
})
