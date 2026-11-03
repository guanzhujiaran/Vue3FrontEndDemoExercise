import { describe, expect, it } from 'vitest'
import type { WorkflowRunLogEvent } from '@/api/browser/workflow_run_api'
import {
  buildBodyRows,
  buildMessageTree,
  isTruncatedNode,
  locateLoopNode,
  pathKeysOf,
  type LoopNode,
} from '@/utils/rpa/workflowRunMessageTree'

/**
 * 运行消息「焦点轮次」渲染测试。
 *
 * 背景：一次运行的循环轮次可达数百个，旧方案把所有分组头都挂载，
 * 每条 SSE 消息都让整棵分组树重新 patch，消息量大时面板卡死。
 * 新方案任意时刻只完整渲染**一个轮次**（activeKey）及其祖先链，
 * 其余轮次由 `buildBodyRows` 折叠成占位行、不产生 DOM（类虚拟滚动）。
 * 这里固化树侧工具的行为：渲染路径、同层轮次导航、占位行合并。
 */

let seq = 0

function event(partial: Partial<WorkflowRunLogEvent>): WorkflowRunLogEvent {
  seq += 1
  return {
    run_id: 'run-1',
    seq,
    ts: 1_700_000_000 + seq,
    kind: 'step_finished',
    level: 'info',
    text: `消息 ${seq}`,
    detail: null,
    action_id: 'act',
    action_name: '动作',
    step_index: null,
    total_steps: 1,
    success: true,
    duration_ms: null,
    error: null,
    loop_index: 0,
    loop_total: 0,
    depth: 0,
    ...partial,
  }
}

/** 一轮循环：开轮消息 + `bodyCount` 条体内消息（depth 比循环深一级） */
function round(depth: number, loopIndex: number, bodyCount = 0, name = '循环') {
  const events = [
    event({
      kind: 'loop_iteration',
      depth,
      loop_index: loopIndex,
      loop_total: 3,
      action_name: name,
      text: `第 ${loopIndex} 轮`,
    }),
  ]
  for (let i = 0; i < bodyCount; i += 1) {
    events.push(event({ depth: depth + 1, text: `体内消息 ${i}` }))
  }
  return events
}

/** 先序取第 idx 个分组节点（顶层或嵌套统一按执行顺序） */
function loopAt(nodes: ReturnType<typeof buildMessageTree>, idx: number) {
  const loops = nodes.flatMap(node => (node.type === 'loop' ? [node] : []))
  return loops[idx]
}

describe('buildMessageTree：parentKey / chain', () => {
  it('嵌套分组记录父分组 key，顶层为空串', () => {
    const tree = buildMessageTree([
      ...round(1, 1, 1, '外层'),
      ...round(2, 1, 1, '内层'),
    ])
    const outer = tree[0]
    if (outer?.type !== 'loop') throw new Error('外层分组缺失')
    expect(outer.parentKey).toBe('')

    const inner = outer.children.find(child => child.type === 'loop')
    if (inner?.type !== 'loop') throw new Error('内层分组缺失')
    expect(inner.parentKey).toBe(outer.key)
    expect(inner.chain).toEqual([outer.key])
  })
})

describe('pathKeysOf：焦点轮次到根的渲染路径', () => {
  const tree = buildMessageTree([
    ...round(1, 1, 1, '外层'),
    ...round(2, 1, 1, '内层'),
    ...round(2, 2, 1, '内层'),
  ])

  it('深层焦点 = 自身 + 全部祖先，且只有这两级', () => {
    const outer = tree[0]
    if (outer?.type !== 'loop') throw new Error('外层分组缺失')
    const innerSecond = outer.children.filter(child => child.type === 'loop')[1]
    if (innerSecond?.type !== 'loop') throw new Error('内层第二轮缺失')

    const keys = pathKeysOf(tree, innerSecond.key)
    expect(keys.size).toBe(2)
    expect(keys.has(outer.key)).toBe(true)
    expect(keys.has(innerSecond.key)).toBe(true)
  })

  it('焦点不存在 / 为空时返回空集合（退回只渲染消息）', () => {
    expect(pathKeysOf(tree, 'not-exist').size).toBe(0)
    expect(pathKeysOf(tree, '').size).toBe(0)
  })
})

describe('locateLoopNode：同层轮次导航', () => {
  it('返回同父分组的全部循环分组（执行顺序），供上一轮/下一轮', () => {
    const tree = buildMessageTree([
      ...round(1, 1, 0, '外层'),
      ...round(1, 2, 0, '外层'),
      ...round(1, 3, 0, '外层'),
    ])
    const location = locateLoopNode(tree, loopAt(tree, 0)!.key)
    expect(location?.siblings.map(node => node.roundIndex)).toEqual([1, 2, 3])
  })

  it('嵌套轮次的兄弟只在同一父分组内取', () => {
    const tree = buildMessageTree([
      ...round(1, 1, 0, '外层'),
      ...round(2, 1, 0, '内层'),
      ...round(2, 2, 0, '内层'),
      ...round(1, 2, 0, '外层'),
      ...round(2, 1, 0, '内层'),
    ])
    const outerFirst = tree[0]
    if (outerFirst?.type !== 'loop') throw new Error('外层分组缺失')
    const innerFirst = outerFirst.children.find(child => child.type === 'loop')
    if (innerFirst?.type !== 'loop') throw new Error('内层分组缺失')

    const location = locateLoopNode(tree, innerFirst.key)
    expect(location?.siblings.map(node => node.roundIndex)).toEqual([1, 2])
  })

  it('焦点 key 不存在时返回 null', () => {
    const tree = buildMessageTree([...round(1, 1)])
    expect(locateLoopNode(tree, 'not-exist')).toBeNull()
  })
})

describe('buildBodyRows：非路径轮次折叠为占位行', () => {
  const tree = buildMessageTree([
    event({ text: '顶层消息' }),
    ...round(1, 1, 2, '外层'),
    ...round(1, 2, 2, '外层'),
    ...round(1, 3, 2, '外层'),
  ])
  const loops = tree.flatMap(node => (node.type === 'loop' ? [node] : []))

  it('焦点 = 最后一轮：前两轮合并成一条占位行，消息保持原位', () => {
    const rows = buildBodyRows(tree, pathKeysOf(tree, loops[2]!.key))

    expect(rows.map(row => row.kind)).toEqual(['item', 'hidden', 'loop'])
    const hidden = rows[1]
    if (hidden?.kind !== 'hidden') throw new Error('占位行缺失')
    expect(hidden.count).toBe(2)
    // 占位行在焦点之前 → 点击跳「前一段的最后一轮」（离焦点最近）
    expect(hidden.focusKey).toBe(loops[1]!.key)
  })

  it('焦点 = 第一轮：后两轮合并成一条占位行，点击跳第一轮', () => {
    const rows = buildBodyRows(tree, pathKeysOf(tree, loops[0]!.key))

    expect(rows.map(row => row.kind)).toEqual(['item', 'loop', 'hidden'])
    const hidden = rows[2]
    if (hidden?.kind !== 'hidden') throw new Error('占位行缺失')
    expect(hidden.count).toBe(2)
    // 占位行在焦点之后 → 点击跳「后一段的第一轮」（离焦点最近）
    expect(hidden.focusKey).toBe(loops[1]!.key)
  })

  it('组内：路径子轮原样渲染，前后轮次各自折叠，消息不丢不错位', () => {
    const nested = buildMessageTree([
      ...round(1, 1, 1, '外层'),
      ...round(2, 1, 1, '内层'),
      ...round(2, 2, 1, '内层'),
      ...round(2, 3, 1, '内层'),
      // 内层收口后，外层体内继续跑动作：这条消息挂回外层分组
      event({ kind: 'loop_finished', depth: 2, text: '内层结束' }),
      event({ depth: 2, text: '收尾消息' }),
    ])
    const outer = nested[0]
    if (outer?.type !== 'loop') throw new Error('外层分组缺失')
    const innerLoops = outer.children.filter(child => child.type === 'loop')
    const active = innerLoops[1]! // 内层第二轮

    const rows = buildBodyRows(outer.children, pathKeysOf(nested, active.key))

    // [外层自己的消息, 折叠的内层第1轮, 内层第2轮(焦点), 折叠的内层第3轮, 收尾消息]
    expect(rows.map(row => row.kind)).toEqual([
      'item',
      'hidden',
      'loop',
      'hidden',
      'item',
    ])
    const before = rows[1]
    const after = rows[3]
    if (before?.kind !== 'hidden' || after?.kind !== 'hidden') {
      throw new Error('占位行缺失')
    }
    expect(before.count).toBe(1)
    expect(before.focusKey).toBe(innerLoops[0]!.key)
    expect(after.count).toBe(1)
    expect(after.focusKey).toBe(innerLoops[2]!.key)
  })

  it('无循环（普通工作流）：全部按消息渲染，不产生占位行', () => {
    const flat = buildMessageTree([event({ text: 'a' }), event({ text: 'b' })])
    const rows = buildBodyRows(flat, new Set())
    expect(rows.map(row => row.kind)).toEqual(['item', 'item'])
  })
})

describe('窗口截断：失去分组头的体内消息必须归组', () => {
  it('depth>0 且无分组可挂时进入补位分组，不平铺成顶层消息', () => {
    const events = [
      // 消息窗口从某一轮中间开始：该轮的 loop_iteration 已被裁掉
      event({ depth: 1, loop_index: 7, loop_total: 20, text: '体内消息 a' }),
      event({ depth: 2, loop_index: 7, loop_total: 20, text: '分支消息 b' }),
      ...round(1, 8, 2, '循环'),
    ]
    const tree = buildMessageTree(events)
    const [truncated, latest] = tree

    if (truncated?.type !== 'loop') throw new Error('补位分组缺失')
    expect(isTruncatedNode(truncated)).toBe(true)
    // 轮次号沿用残段消息自带的 loop_index，分组头仍能显示第 7/20 轮
    expect(truncated.roundIndex).toBe(7)
    expect(truncated.roundTotal).toBe(20)
    expect(truncated.itemCount).toBe(2)
    expect(truncated.children).toHaveLength(2)

    if (latest?.type !== 'loop') throw new Error('当前轮次缺失')
    expect(isTruncatedNode(latest)).toBe(false)

    // 补位分组与普通历史轮次一样折叠成占位行，不把上百条残段铺到顶层
    const rows = buildBodyRows(tree, pathKeysOf(tree, latest.key))
    expect(rows.map(row => row.kind)).toEqual(['hidden', 'loop'])
    const hidden = rows[0]
    if (hidden?.kind !== 'hidden') throw new Error('占位行缺失')
    expect(hidden.count).toBe(1)
  })

  it('顶层消息（depth=0）仍是普通消息，不会被误收进补位分组', () => {
    const tree = buildMessageTree([
      event({ text: '开始步骤 1/18：navigate' }),
      ...round(1, 1, 1, '循环'),
    ])
    expect(tree.map(node => (node.type === 'item' ? 'item' : 'loop'))).toEqual([
      'item',
      'loop',
    ])
  })

  it('补位分组之后再出现顶层消息：残段收口，消息回到顶层', () => {
    const tree = buildMessageTree([
      event({ depth: 1, loop_index: 3, loop_total: 9, text: '残段' }),
      event({ depth: 0, text: '顶层消息' }),
    ])
    expect(tree.map(node => (node.type === 'item' ? 'item' : 'loop'))).toEqual([
      'loop',
      'item',
    ])
    const truncated = tree[0] as LoopNode
    expect(truncated.itemCount).toBe(1)
  })
})
